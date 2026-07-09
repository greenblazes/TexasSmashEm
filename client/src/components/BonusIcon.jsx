import cleanSweepImg from "../assets/icons/cleansweep.png";
import doubleCrossImg from "../assets/icons/double-crossed.png";
import bushwhackedImg from "../assets/icons/bushwhacked.png";
import showdownImg from "../assets/icons/showdown.png";
import tPickCorrectImg from "../assets/icons/tpick.png";

// Maps each end-of-tournament bonus/penalty type (as stored in player.bonusHistory)
// to its artwork and a human label, for the Scoreboard.
export const BONUS_INFO = {
  cleanSweep: { img: cleanSweepImg, label: "Clean Sweep" },
  doubleCross: { img: doubleCrossImg, label: "Double-Cross" },
  bushwhacked: { img: bushwhackedImg, label: "Bushwhacked" },
  showdown: { img: showdownImg, label: "Showdown" },
  tPickCorrect: { img: tPickCorrectImg, label: "Texas T-Pick Correct" },
};

export default function BonusIcon({ type, size = 26, className = "" }) {
  const info = BONUS_INFO[type];
  if (!info) return null;
  return (
    <img
      src={info.img}
      alt={info.label}
      title={info.label}
      height={size}
      className={className}
      draggable={false}
      style={{ width: "auto", verticalAlign: "middle" }}
    />
  );
}
