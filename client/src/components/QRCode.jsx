import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

// Renders a QR code for the given text as a canvas. No network calls —
// generated entirely client-side so it works offline and for private LAN URLs.
export default function QRCode({ value, size = 160 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#F0C84A", light: "#0F0C1C" },
    }).catch(() => {});
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: "block", borderRadius: 8 }} />;
}
