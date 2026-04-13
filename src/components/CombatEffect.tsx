import { useEffect, useState } from "preact/compat";

interface Props {
  onComplete: () => void;
  lang: string;
  type: "prepare" | "combat";
}

export function CombatEffect({ onComplete, lang, type }: Props) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  const isZh = lang === "zh";
  const isPrepare = type === "prepare";

  const title = isZh
    ? (isPrepare ? "战斗准备" : "战斗开始")
    : (isPrepare ? "PREPARE FOR COMBAT" : "COMBAT BEGINS");
  const subtitle = isZh ? "投掷先攻！" : "Roll for Initiative!";

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
    <div className={`combat-effect-overlay phase-${phase} effect-${type}`}>
      <div className="effect-flash" />
      <div className="effect-vignette" />
      <div className="effect-content">
        <div className="swords-container">
          <div className="sword sword-left">⚔</div>
        </div>
        <div className="combat-text">{title}</div>
        <div className="combat-subtext">{subtitle}</div>
      </div>
    </div>
  );
}
