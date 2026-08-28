import "server-only";

import { createHash } from "node:crypto";

/**
 * Taking money, behind one seam.
 *
 * No provider is wired up on a fresh install, and that fact must not be papered
 * over: a checkout that silently pretends to charge somebody is the shortcut
 * that stays invisible until the month the invoices do not add up. So an
 * unconfigured install refuses the charge and says why, exactly as an
 * unconfigured mailer refuses to send.
 *
 * The interface is small on purpose. A gateway does two things this app cares
 * about — start a payment, and tell us later that it completed — and everything
 * else about it (which SDK, which fields, which currency codes) is that driver's
 * business.
 */

export interface ChargeRequest {
  /** Our id for the payment, which the provider echoes back on its webhook. */
  reference: string;
  /**
   * What is being sold, in the two forms a gateway asks for: an id for its
   * records and a name for the customer's.
   *
   * Not a plan and a cycle. A gateway takes money; whether that money is a
   * month of Pro or somebody's photostrip template is this app's business, and
   * a driver that knew the difference would have to be edited every time we
   * sell something new.
   */
  item: { id: string; name: string };
  /** Whole rupiah for the entire invoice. */
  amountIdr: number;
  email: string;
  /** Where the browser lands once the provider is finished with it. */
  returnUrl: string;
}

export interface ChargeStarted {
  /** Where to send the browser to pay. */
  redirectUrl: string;
  /** The provider's own id, stored so its webhook can be matched to a row. */
  providerRef: string;
}

export type ChargeResult =
  | { ok: true; charge: ChargeStarted }
  | { ok: false; reason: string };

/** What a verified webhook told us. */
export interface PaymentNotice {
  /** Our reference, as handed to `charge`. */
  reference: string;
  providerRef: string;
  status: "paid" | "failed" | "expired" | "pending";
  amountIdr: number;
}

export interface PaymentGateway {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  /**
   * Reads a webhook body, or refuses it.
   *
   * Returns null when the payload is not authentic. This is the only place that
   * decides whether a request that claims a payment succeeded is telling the
   * truth, so it fails closed: anything it cannot verify is not a payment.
   */
  verify(body: unknown, headers: Headers): PaymentNotice | null;
}

/**
 * The driver for an install with nothing configured.
 *
 * It refuses rather than simulating. A fake success here would promote accounts
 * that never paid, and the failure would surface as a revenue discrepancy weeks
 * later rather than as an error at the moment somebody pressed the button.
 */
const unconfigured: PaymentGateway = {
  name: "none",
  async charge() {
    return {
      ok: false,
      reason:
        "Tidak ada penyedia pembayaran yang dikonfigurasi (PAYMENT_PROVIDER).",
    };
  },
  verify() {
    return null;
  },
};

/**
 * Midtrans, via Snap.
 *
 * Chosen as the first real driver because it is what an Indonesian booth
 * operator is most likely to already have. Two halves:
 *
 *   - `charge` asks Snap for a transaction and gets back a redirect URL. Basic
 *     auth with the server key, which is why this module is server-only.
 *   - `verify` checks the notification's `signature_key`, which Midtrans
 *     documents as sha512(order_id + status_code + gross_amount + server_key).
 *     Everything else in the body is attacker-supplied until that matches.
 */
function midtrans(serverKey: string, production: boolean): PaymentGateway {
  const snapUrl = production
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  return {
    name: "midtrans",

    async charge(request) {
      const auth = Buffer.from(`${serverKey}:`).toString("base64");

      let response: Response;
      try {
        response = await fetch(snapUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: request.reference,
              // Midtrans wants the gross amount as an integer in rupiah, which
              // is what we store — no conversion, and nothing to round.
              gross_amount: request.amountIdr,
            },
            customer_details: { email: request.email },
            item_details: [
              {
                id: request.item.id,
                name: request.item.name,
                price: request.amountIdr,
                quantity: 1,
              },
            ],
            callbacks: { finish: request.returnUrl },
          }),
        });
      } catch {
        return { ok: false, reason: "Gateway pembayaran tidak bisa dihubungi." };
      }

      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};

      if (!response.ok || typeof body.redirect_url !== "string") {
        const detail = Array.isArray(body.error_messages)
          ? body.error_messages.join("; ")
          : `HTTP ${response.status}`;
        return { ok: false, reason: `Gateway menolak transaksi: ${detail}.` };
      }

      return {
        ok: true,
        charge: {
          redirectUrl: body.redirect_url,
          // Snap's token identifies the transaction on the provider's side. The
          // order id is ours and is not a second reference to keep in step.
          providerRef:
            typeof body.token === "string" ? body.token : request.reference,
        },
      };
    },

    verify(body) {
      if (typeof body !== "object" || body === null) return null;
      const notice = body as Record<string, unknown>;

      const orderId = notice.order_id;
      const statusCode = notice.status_code;
      const grossAmount = notice.gross_amount;
      const signature = notice.signature_key;

      if (
        typeof orderId !== "string" ||
        typeof statusCode !== "string" ||
        typeof grossAmount !== "string" ||
        typeof signature !== "string"
      ) {
        return null;
      }

      const expected = createHash("sha512")
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest("hex");

      // Length-safe comparison is unnecessary here — both sides are hex digests
      // of a fixed length — but a mismatch must be the end of it either way.
      if (expected !== signature) return null;

      const amount = Math.round(Number(grossAmount));
      if (!Number.isFinite(amount) || amount <= 0) return null;

      return {
        reference: orderId,
        providerRef:
          typeof notice.transaction_id === "string"
            ? notice.transaction_id
            : orderId,
        status: readStatus(notice),
        amountIdr: amount,
      };
    },
  };
}

/**
 * Midtrans' transaction status, in our four words.
 *
 * `capture` is only a payment once its fraud check has passed; treating an
 * unaccepted capture as paid is how a chargeback becomes a free account.
 */
function readStatus(notice: Record<string, unknown>): PaymentNotice["status"] {
  const status = notice.transaction_status;
  const fraud = notice.fraud_status;

  if (status === "settlement") return "paid";
  if (status === "capture") return fraud === "accept" ? "paid" : "pending";
  if (status === "pending") return "pending";
  if (status === "expire") return "expired";
  return "failed";
}

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_PROVIDER?.trim();
  if (!provider) return unconfigured;

  if (provider === "midtrans") {
    const key = process.env.MIDTRANS_SERVER_KEY?.trim();
    if (!key) {
      console.error(
        "[billing] PAYMENT_PROVIDER=midtrans but MIDTRANS_SERVER_KEY is unset — refusing to charge.",
      );
      return unconfigured;
    }
    return midtrans(key, process.env.MIDTRANS_PRODUCTION === "true");
  }

  console.error(`[billing] unknown PAYMENT_PROVIDER: ${provider}`);
  return unconfigured;
}
