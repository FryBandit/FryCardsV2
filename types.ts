
export enum CardType {
  Unit = 'Unit',
  Location = 'Location',
  Event = 'Event',
  Artifact = 'Artifact',
}

export enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  SuperRare = 'Super-Rare',
  Mythic = 'Mythic',
  Divine = 'Divine',
}

export interface CardData {
  id: number;
  name: string;
  description: string;
  type: CardType;
  rarity: Rarity;
  imageUrl: string;
  set: string;
  author: string;
}
