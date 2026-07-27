"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  /** The user (or policy) refused access. */
  | "denied"
  /** No camera, or the browser has no `getUserMedia` — e.g. a non-secure origin. */
  | "unavailable";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraState {
  status: CameraStatus;
  stream: MediaStream | null;
  devices: CameraDevice[];
  deviceId: string | null;
  error: string | null;
}

const INITIAL: CameraState = {
  status: "idle",
  stream: null,
  devices: [],
  deviceId: null,
  error: null,
};

function supportsCamera() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/**
 * Owns the webcam MediaStream: permission, device switching, and teardown.
 *
 * Tracks are stopped on every swap and on unmount — a stream left running keeps
 * the camera light on, which reads as a privacy bug to users.
 */
export function useCamera() {
  const [state, setState] = useState<CameraState>(INITIAL);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      if (!supportsCamera()) {
        setState((current) => ({
          ...current,
          status: "unavailable",
          error:
            "Browser ini tidak mendukung akses kamera, atau halaman tidak dibuka lewat HTTPS.",
        }));
        return;
      }

      setState((current) => ({ ...current, status: "requesting", error: null }));
      stop();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: "user",
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
          audio: false,
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // Device labels stay blank until permission is granted, so the list is
        // only worth reading once we have a stream.
        const all = await navigator.mediaDevices.enumerateDevices();
        const devices = all
          .filter((device) => device.kind === "videoinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Kamera ${index + 1}`,
          }));

        if (!mountedRef.current) return;

        setState({
          status: "ready",
          stream,
          devices,
          deviceId:
            deviceId ??
            stream.getVideoTracks()[0]?.getSettings().deviceId ??
            devices[0]?.deviceId ??
            null,
          error: null,
        });
      } catch (error) {
        if (!mountedRef.current) return;

        const denied =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "SecurityError");

        setState((current) => ({
          ...current,
          status: denied ? "denied" : "unavailable",
          stream: null,
          error: denied
            ? "Akses kamera ditolak. Izinkan kamera di pengaturan browser, lalu coba lagi."
            : "Kamera tidak ditemukan atau sedang dipakai aplikasi lain.",
        }));
      }
    },
    [stop],
  );

  const selectDevice = useCallback(
    (deviceId: string) => {
      void start(deviceId);
    },
    [start],
  );

  const release = useCallback(() => {
    stop();
    setState(INITIAL);
  }, [stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  return { ...state, start, selectDevice, release };
}
