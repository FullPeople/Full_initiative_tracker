import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import { CombatEffect } from "./components/CombatEffect";
import { COMBAT_EFFECT_MODAL_ID } from "./utils/constants";
import "./styles/effects.css";

function CombatEffectPage() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    OBR.onReady(() => setShow(true));
  }, []);

  const handleComplete = useCallback(() => {
    OBR.modal.close(COMBAT_EFFECT_MODAL_ID);
  }, []);

  if (!show) return null;

  return <CombatEffect onComplete={handleComplete} />;
}

const root = createRoot(document.getElementById("root")!);
root.render(<CombatEffectPage />);
