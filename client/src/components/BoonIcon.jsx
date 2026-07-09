import boonImg from "../assets/icons/boon.png";

export default function BoonIcon({ size = 24, className = "" }) {
  return (
    <img
      src={boonImg}
      alt="boon"
      height={size}
      className={className}
      style={{ width: "auto" }}
      draggable={false}
    />
  );
}
