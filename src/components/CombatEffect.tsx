import React, { useEffect, useState } from "react";

export function CombatEffect({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(() => onComplete(), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className={`combat-effect-overlay phase-${phase}`}>
      <div className="effect-flash" />
      <div className="effect-vignette" />
      <div className="effect-content">
        <div className="swords-container">
          <div className="sword sword-left">⚔</div>
        </div>
        <div className="combat-text">COMBAT BEGINS</div>
        <div className="combat-subtext">Roll for Initiative!</div>
      </div>
    </div>
  );
}
