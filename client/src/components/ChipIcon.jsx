import { useId } from "react";

const NOTCH_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export default function ChipIcon({ size = 24, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const gold = "#D4A832";
  const dark = "#10091f";

  const notches = NOTCH_ANGLES.map((angle) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const r = 39.5;
    const cx = 50 + r * Math.cos(rad);
    const cy = 50 + r * Math.sin(rad);
    return { angle, cx, cy };
  });

  const rRight  = `${uid}R`;
  const rLeftT  = `${uid}LT`;
  const rLeftB  = `${uid}LB`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={rRight}><rect x="50" y="26" width="25" height="48" /></clipPath>
        <clipPath id={rLeftT}><rect x="25" y="26" width="25" height="24" /></clipPath>
        <clipPath id={rLeftB}><rect x="25" y="50" width="25" height="24" /></clipPath>
      </defs>

      {/* Outer ring (dark base) */}
      <circle cx="50" cy="50" r="47" fill={dark} />

      {/* 12 gold notch segments */}
      {notches.map(({ angle, cx, cy }) => (
        <rect
          key={angle}
          x={-4} y={-7} width={8} height={14} rx={1.5}
          fill={gold}
          transform={`translate(${cx} ${cy}) rotate(${angle})`}
        />
      ))}

      {/* Outer border ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke={gold} strokeWidth="2" />

      {/* Inner separator ring */}
      <circle cx="50" cy="50" r="31" fill="none" stroke={gold} strokeWidth="2" />

      {/* Center dark fill */}
      <circle cx="50" cy="50" r="30" fill={dark} />

      {/* ── Smash Bros emblem ── */}

      {/* Logo outer circle */}
      <circle cx="50" cy="50" r="22" fill="none" stroke={gold} strokeWidth="2.5" />

      {/* Right D-shape: outer ring clipped to right half, inner cutout */}
      <circle cx="50" cy="50" r="21" fill={gold} clipPath={`url(#${rRight})`} />
      <circle cx="50" cy="50" r="14" fill={dark}  clipPath={`url(#${rRight})`} />

      {/* Left top tab */}
      <circle cx="50" cy="50" r="21" fill={gold} clipPath={`url(#${rLeftT})`} />
      <circle cx="50" cy="50" r="14" fill={dark}  clipPath={`url(#${rLeftT})`} />

      {/* Left bottom tab */}
      <circle cx="50" cy="50" r="21" fill={gold} clipPath={`url(#${rLeftB})`} />
      <circle cx="50" cy="50" r="14" fill={dark}  clipPath={`url(#${rLeftB})`} />

      {/* Horizontal divider bar */}
      <rect x="27" y="48.5" width="46" height="3" fill={gold} />

      {/* Center dot */}
      <circle cx="50" cy="50" r="4" fill={gold} />
    </svg>
  );
}
