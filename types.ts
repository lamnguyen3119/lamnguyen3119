export interface LoreRule {
    text: string;
    isActive: boolean;
    id?: string;
}

export interface Skill {
    id?: string;
    name: string;
    description: string;
    evolutionDescription?: string;
}

export interface VoLamArts {
    congPhap: string;
    chieuThuc: string;
    khiCong: string;
    thuat: string;
}

export interface WorldSettings {
    genre: string;
    setting: string;
    idea: string;
    details: string;
    name:string;
    personalityOuter: string;
    personalityCore: string;
    species: string;
    gender: string;
    linhCan?: string;
    backstory: string;
    skills: Skill[];
    voLamArts?: VoLamArts;
    skillName?: string;
    skillDescription?: string;
    skillEvolutionDescription?: string;
    writingStyle: string;
    narrativeVoice: string;
    difficulty: string;
    newQuest?: boolean;
    allow18Plus: boolean;
    enableTimeSystem: boolean;
    loreRules: LoreRule[];
}

export interface Effect {
    name: string;
    description: string;
    duration: number;
    type: 'buff' | 'debuff' | 'injury' | 'neutral';
    cure?: string;
}

export type ItemRarity = 'Phổ thông' | 'Không phổ thông' | 'Hiếm' | 'Sử thi' | 'Huyền thoại' | 'Thần khí';

export interface Item {
    name: string;
    description: string;
    quantity: number;
    rarity: ItemRarity;
}

export interface Relationship {
    name: string;
    type: string;
    description: string;
}

export interface Character {
    name: string;
    displayName?: string;
    species: string;
    age: string;
    gender: string;
    linhCan?: string;
    personality: string;
    description: string;
    backstory: string;
    adventurerRank?: string;
    status: {
        effects: Effect[];
    };
    inventory: {
        money: number;
        items: Item[];
    };
    skills: Skill[];
    voLamArts?: VoLamArts;
    abilities: { name: string; description: string }[];
    relationships: Relationship[];
    lootTable?: LootItem[];
    // NPC specific
    relationship?: number;
    mood?: string;
    known?: boolean;
    goals?: string[];
}

export interface KnowledgeEntity {
    name: string;
    description: string;
    known: boolean;
}

export interface LootItem {
  itemName: string;
  description: string;
  dropChance: number; // 0-100
  minQuantity: number;
  maxQuantity: number;
  rarity: ItemRarity;
}

export interface Monster extends KnowledgeEntity {
  lootTable: LootItem[];
}

export interface Quest {
    id: string;
    name: string;
    description: string;
    status: 'Ongoing' | 'Completed' | 'Failed';
    reward?: string;
    punishment?: string;
}

export interface GameTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

export interface Message {
    id: string;
    text: string;
}

export interface Turn {
    id:string;
    story: string;
    messages: Message[];
    chosenAction: string | null;
    tokenCount: number;
    summary?: string;
}

export interface GameAction {
    id: string;
    description: string;
    timeCost?: number;
    successChance?: number;
    benefit?: string;
    risk?: string;
}

export interface Memory {
    id: string;
    text: string;
    pinned: boolean;
}

export interface GameState {
    saveId?: string;
    title: string;
    character: Character;
    turns: Turn[];
    actions: GameAction[];
    knowledgeBase: {
        pcs: KnowledgeEntity[];
        npcs: Character[];
        items: KnowledgeEntity[];
        locations: KnowledgeEntity[];
        factions: KnowledgeEntity[];
        monsters: Monster[];
    };
    quests: Quest[];
    memories: Memory[];
    history: GameState[];
    currentTime: GameTime | null;
    isIntercourseScene?: boolean;
    intercourseStep?: number;
    totalTokenCount: number;
}


export interface SaveFile {
    id: string;
    name: string;
    timestamp: string;
    gameState: GameState;
    worldSettings: WorldSettings;
}

export interface AppSettings {
    theme: string;
    fontFamily: string;
    fontSize: number;
    storyLength: string;
    autoPinMemory: boolean;
    enableCheats: boolean;
    textColor: string;
}

export interface ToastData {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export interface EntityTooltipData {
    name: string;
    type: string;
    description: string;
    known: boolean;
    displayName?: string;
    position: {
        top: number;
        left: number;
    };
}