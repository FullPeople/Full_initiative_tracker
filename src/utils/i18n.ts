export type Lang = "en" | "zh";

const translations = {
  en: {
    initiative: "Initiative",
    round: "Round",
    startCombat: "Start Combat",
    prev: "◀ Prev",
    next: "Next ▶",
    endCombat: "⏹ End Combat",
    noCharacters: "No characters in initiative",
    rightClickHint: "Right-click a token to add",
    addToInitiative: "Add to Initiative",
    removeFromInitiative: "Remove from Initiative",
    added: "Added to initiative",
    removed: "Removed from initiative",
    setInitiative: "Set Initiative",
    add: "Add",
    skip: "Skip",
    initiativeValue: "Initiative value",
    loading: "Loading...",
    addFirst: "Add characters first",
    dragHint: "Drag a Character into the scene during combat to quickly add it to the initiative list",
  },
  zh: {
    initiative: "先攻",
    round: "回合",
    startCombat: "开始战斗",
    prev: "◀ 上一个",
    next: "下一个 ▶",
    endCombat: "⏹ 结束战斗",
    noCharacters: "先攻列表为空",
    rightClickHint: "右键点击角色加入先攻",
    addToInitiative: "加入先攻",
    removeFromInitiative: "移出先攻",
    added: "已加入先攻",
    removed: "已移出先攻",
    setInitiative: "设置先攻",
    add: "添加",
    skip: "跳过",
    initiativeValue: "先攻值",
    loading: "加载中...",
    addFirst: "请先添加角色",
    dragHint: "在战斗中拖拽 Character 角色到场景中，可以快速加入先攻列表",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key];
}

export function getStoredLang(): Lang {
  try {
    const stored = localStorage.getItem("initiative-tracker-lang");
    if (stored === "zh" || stored === "en") return stored;
  } catch {}
  return "zh";
}

export function setStoredLang(lang: Lang) {
  try {
    localStorage.setItem("initiative-tracker-lang", lang);
  } catch {}
}
