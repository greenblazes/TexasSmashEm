import trumpImg from "../assets/icons/trumpcard.png";

// Trump Card icon (Ace of Spades artwork). Sized by height; width auto-preserves
// the tall card aspect ratio. Aligns inline with adjacent text.
export default function TrumpIcon({ size = 18, className = "", style }) {
  return (
    <img
      src={trumpImg}
      alt="Trump Card"
      height={size}
      className={className}
      draggable={false}
      style={{ width: "auto", verticalAlign: "middle", ...style }}
    />
  );
}
