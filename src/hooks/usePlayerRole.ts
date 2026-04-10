import { useState, useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";

export function usePlayerRole() {
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");

  useEffect(() => {
    const fetchRole = async () => {
      const r = await OBR.player.getRole();
      setRole(r);
    };
    fetchRole();
    return OBR.player.onChange((player) => {
      setRole(player.role);
    });
  }, []);

  return role;
}
