import { getAccountId } from "@/lib/api/account";
import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import {
  isSellablePrice,
  PRICE_CEILING_IDR,
  PRICE_FLOOR_IDR,
  setTemplatePrice,
} from "@/lib/db/marketplace";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const rupiah = (amount: number) =>
  `Rp${new Intl.NumberFormat("id-ID").format(amount)}`;

/**
 * Prices one of the caller's templates, or makes it free again.
 *
 * `PATCH` because the price is one field of a publication that has several, and
 * the other ones — its title, its category, its tags — are edited by publishing
 * again. A `PUT` here would invite a client to send the rest and have them
 * quietly ignored.
 *
 * The bounds are refused rather than clamped. Somebody who meant Rp25.000 and
 * typed Rp250 should be told, not silently sold at the floor: a price is the one
 * number where guessing what was meant is the most expensive thing to get wrong.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/creator/templates/[slug]">,
): Promise<Response> {
  const { slug } = await context.params;

  const accountId = await getAccountId();
  if (!accountId) return jsonError(401, "Masuk dulu untuk mengelola template.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek.");

  const extra = Object.keys(body.value).filter((key) => key !== "price");
  if (extra.length > 0) {
    return jsonError(400, `Bidang tidak dikenal: ${extra.join(", ")}.`);
  }

  const price = body.value.price;
  if (typeof price !== "number") {
    return jsonError(400, "`price` wajib berupa angka rupiah.");
  }
  if (!isSellablePrice(price)) {
    return jsonError(
      400,
      `Harga harus 0 (gratis) atau antara ${rupiah(PRICE_FLOOR_IDR)} dan ${rupiah(PRICE_CEILING_IDR)}, dalam rupiah bulat.`,
    );
  }

  try {
    const result = await setTemplatePrice(accountId, slug, price);
    // The same answer whether the slug is somebody else's or does not exist.
    // Neither is worth telling apart to a caller trying slugs.
    if (!result.ok) return jsonError(404, "Template tidak ditemukan.");

    return Response.json({ template: result.template });
  } catch (error) {
    console.error(`PATCH /api/creator/templates/${slug} failed`, error);
    return jsonError(500, "Harga gagal disimpan.");
  }
}
