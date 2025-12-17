export declare class Project {
    id: string;
    userId: string;
    title: string;
    originalIdea: string;
    selectedConcept: {
        id: string;
        title: string;
        description: string;
        tone: string;
    } | null;
    storyboard: Array<{
        id: number;
        description: string;
        visualPrompt: string;
        voiceoverScript: string;
        imageUrl?: string;
        videoUrl?: string;
        audioUrl?: string;
        referenceAssetId?: string;
        referenceAssetUrl?: string;
        videoOperationId?: string;
        isGeneratingImage: boolean;
        isGeneratingVideo: boolean;
        isGeneratingAudio: boolean;
    }>;
    mergedVideoUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
