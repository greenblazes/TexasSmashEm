import tpickImg from "../assets/icons/tpick.png";

export default function TPickIcon({ size = 24, className = "", style }) {
  return (
    <img
      src={tpickImg}
      alt="texas t-pick"
      height={size}
      className={className}
      style={{ width: "auto", ...style }}
      draggable={false}
    />
  );
}
