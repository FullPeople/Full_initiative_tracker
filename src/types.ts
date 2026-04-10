export interface InitiativeData {
  count: number;
  active: boolean;
}

export interface InitiativeItem {
  id: string;
  name: string;
  count: number;
  active: boolean;
  visible: boolean;
  imageUrl: string;
}

export interface CombatState {
  inCombat: boolean;
  round: number;
}
