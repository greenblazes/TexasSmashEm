import chipImg from "../assets/icons/chip.png";

// Poker-chip icon used in the chip-pill (lobby header, testbed).
// Renders the provided artwork; the spin + glow come from the `.chip-icon` CSS class.
export default function ChipIcon({ size = 24, className = "" }) {
  return (
    <img
      src={chipImg}
      alt="chip"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
