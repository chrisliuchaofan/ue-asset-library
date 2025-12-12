// 梦工厂类型定义
export enum AppStep {
  API_CHECK = 0,
  IDEA_INPUT = 1,
  CONCEPT_SELECTION = 2,
  STORYBOARD_GENERATION = 3,
  VISUALIZATION = 4, // Image Gen
  PRODUCTION = 5,    // Video Gen
  POST_PRODUCTION = 6, // Audio & Final
  COMPLETED = 7
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  tone: string;
}

export interface Scene {
  id: number;
  description: string;
  visualPrompt: string;
  voiceoverScript: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  referenceAssetId?: string; // ID of the selected asset from OSS
  referenceAssetUrl?: string; // Display URL
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isGeneratingAudio: boolean;
}

export interface ProjectState {
  originalIdea: string;
  selectedConcept: Concept | null;
  storyboard: Scene[];
}

