import cleanSweepImg from "../assets/icons/cleansweep.png";
import doubleCrossImg from "../assets/icons/double-crossed.png";
import bushwhackedImg from "../assets/icons/bushwhacked.png";
import showdownImg from "../assets/icons/showdown.png";
import tPickCorrectImg from "../assets/icons/tpick.png";

// Maps each end-of-tournament bonus/penalty type (as stored in player.bonusHistory)
// to its artwork and a human label, for the Scoreboard.
// ruleTitle is the exact rule.title string in RulesPanel's SECTIONS data —
// used to jump the rules sidebar to the matching entry when an icon is clicked.
export const BONUS_INFO = {
  cleanSweep: { img: cleanSweepImg, label: "Clean Sweep", ruleTitle: "Clean Sweep" },
  doubleCross: { img: doubleCrossImg, label: "Double-Cross", ruleTitle: "Double-Cross" },
  bushwhacked: { img: bushwhackedImg, label: "Bushwhacked", ruleTitle: "Bushwhacked" },
  showdown: { img: showdownImg, label: "Showdown", ruleTitle: "Showdown" },
  tPickCorrect: { img: tPickCorrectImg, label: "Texas T-Pick Correct", ruleTitle: "Texas T-Pick" },
};

export default function BonusIcon({ type, size = 26, className = "", onClick }) {
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
      onClick={onClick}
      style={{ width: "auto", verticalAlign: "middle", cursor: onClick ? "pointer" : undefined }}
    />
  );
}
