export interface InitiativeData {
  count: number;
  active: boolean;
  rolled?: boolean;
}

export interface InitiativeItem {
  id: string;
  name: string;
  count: number;
  modifier: number;
  active: boolean;
  rolled: boolean;
  visible: boolean;
  imageUrl: string;
}

export interface CombatState {
  inCombat: boolean;
  preparing: boolean;
  round: number;
}
