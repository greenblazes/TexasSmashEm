import { useEffect, useRef, useState } from "react";
import { useLobby } from "../lib/LobbyContext.jsx";

const TARGET_SELECTOR = { chips: ".chip-pill" };
const LABEL = { chips: "Chips" };

// Exported so the /test tournament simulator can reuse the exact same popup
// rendering/animation without needing the real LobbyContext.
export function RewardPopup({ reward, index, onDone }) {
  const [vars, setVars] = useState(null);

  useEffect(() => {
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2 + index * 74;
    const target = document.querySelector(TARGET_SELECTOR[reward.kind]);
    let dx = 0;
    let dy = -window.innerHeight * 0.35; // fall back to floating straight up
    if (target) {
      const r = target.getBoundingClientRect();
      dx = r.left + r.width / 2 - originX;
      dy = r.top + r.height / 2 - originY;
    }
    setVars({ top: originY, left: originX, "--dx": `${dx}px`, "--dy": `${dy}px` });
  }, [reward.kind, index]);

  if (!vars) return null;

  return (
    <div className={`reward-popup reward-popup-${reward.kind}`} style={vars} onAnimationEnd={onDone}>
      <span className="reward-popup-amount">+{reward.amount}</span>
      <span className="reward-popup-label">{LABEL[reward.kind]}</span>
    </div>
  );
}

// Renders any queued chip reward popups. Mount this once on the page where the
// chip-pill header target is visible (Lobby.jsx).
export default function RewardPopups() {
  const { rewards, dismissReward } = useLobby();
  return (
    <>
      {rewards.map((r, i) => (
        <RewardPopup key={r.id} reward={r} index={i} onDone={() => dismissReward(r.id)} />
      ))}
    </>
  );
}
