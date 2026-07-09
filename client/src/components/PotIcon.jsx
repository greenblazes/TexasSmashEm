import potImg from "../assets/icons/pot.png";

export default function PotIcon({ size = 24, className = "" }) {
  return (
    <img
      src={potImg}
      alt="pot"
      height={size}
      className={className}
      style={{ width: "auto" }}
      draggable={false}
    />
  );
}
