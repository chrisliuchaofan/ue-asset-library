export type ReviewerRole = 'art' | 'creative' | 'growth';
export type ScoreLevel = 'excellent' | 'pass' | 'revise' | 'veto';

export interface RubricItem {
    label: string;
    points: number;
    standard: string;
}

export interface ReviewerStandard {
    role: ReviewerRole;
    title: string;
    shortTitle: string;
    max: number;
    mission: string;
    dimensions: string[];
    rubric: RubricItem[];
}

export interface ScoreLevelStandard {
    label: string;
    commonScore: number;
    ratio: number;
    veto: boolean;
    tone: string;
    range: string;
    standard: string;
    evidence: string;
    requiresNote?: boolean;
}

export interface ReviewStandardsConfig {
    commonRubric: RubricItem[];
    reviewers: ReviewerStandard[];
    scoreLevels: Record<ScoreLevel, ScoreLevelStandard>;
    passLine: number;
    revisionLine: number;
}

export const REVIEW_STANDARDS_TAG = 'review-standards-config';
export const REVIEWER_ROLE_ORDER: ReviewerRole[] = ['art', 'creative', 'growth'];
export const SCORE_LEVEL_ORDER: ScoreLevel[] = ['excellent', 'pass', 'revise', 'veto'];

export const DEFAULT_REVIEW_STANDARDS: ReviewStandardsConfig = {
    commonRubric: [
        { label: '合规底线', points: 10, standard: '无敏感词、误导表达、版权或平台硬性风险。' },
        { label: '信息完整', points: 8, standard: '项目、卖点、字幕、画面信息能互相印证。' },
        { label: '前三秒钩子', points: 6, standard: '开头能快速给出冲突、利益点或强画面。' },
        { label: 'CTA 行动', points: 6, standard: '结尾或关键节点有明确行动指向，不含糊。' },
    ],
    reviewers: [
        {
            role: 'art',
            title: '美术负责人',
            shortTitle: '美术',
            max: 25,
            mission: '确认画面是否达到可上线品质，重点看美术完成度、资产一致性和技术瑕疵。',
            dimensions: ['画面完成度', '资产一致性', '动效节奏', '技术瑕疵'],
            rubric: [
                { label: '画面完成度', points: 7, standard: '构图、光影、主体识别清楚，没有粗糙拼贴感。' },
                { label: '资产一致性', points: 6, standard: '角色、场景、UI、品牌资产与项目规范一致。' },
                { label: '动效节奏', points: 6, standard: '镜头衔接顺畅，关键动作不拖沓、不突兀。' },
                { label: '技术瑕疵', points: 6, standard: '无穿帮、黑帧、比例异常、压缩损坏、字幕遮挡。' },
            ],
        },
        {
            role: 'creative',
            title: '创意负责人',
            shortTitle: '创意',
            max: 25,
            mission: '判断创意是否有清晰卖点和传播记忆点，重点看叙事、差异化和前三秒吸引力。',
            dimensions: ['卖点表达', '差异化', '叙事转折', '记忆点'],
            rubric: [
                { label: '卖点表达', points: 7, standard: '用户能在短时间内理解核心利益点。' },
                { label: '差异化', points: 6, standard: '不是通用套路，有可辨识的创意角度。' },
                { label: '叙事转折', points: 6, standard: '冲突、反差或信息递进成立，没有断裂感。' },
                { label: '记忆点', points: 6, standard: '有可复述的画面、台词、梗或强情绪瞬间。' },
            ],
        },
        {
            role: 'growth',
            title: '投放负责人',
            shortTitle: '投放',
            max: 20,
            mission: '判断素材是否适合进入投放测试，重点看平台适配、点击意图和可复盘性。',
            dimensions: ['平台适配', '点击意图', '受众清晰', '可测试性'],
            rubric: [
                { label: '平台适配', points: 5, standard: '节奏、字幕、安全表达符合抖音投放环境。' },
                { label: '点击意图', points: 5, standard: '开头和结尾有明确观看或行动动机。' },
                { label: '受众清晰', points: 5, standard: '能判断素材主要打哪类用户、哪类场景。' },
                { label: '可测试性', points: 5, standard: '变量清楚，方便和其他版本做 A/B 对照。' },
            ],
        },
    ],
    scoreLevels: {
        excellent: {
            label: '优秀',
            commonScore: 28,
            ratio: 1,
            veto: false,
            tone: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
            range: '90-100%',
            standard: '核心维度超预期，可直接作为优先测试素材。',
            evidence: '建议写明最强亮点，便于复盘放大。',
        },
        pass: {
            label: '达标',
            commonScore: 24,
            ratio: 0.84,
            veto: false,
            tone: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
            range: '75-89%',
            standard: '没有阻断问题，达到上线或小流量测试标准。',
            evidence: '可补充轻微优化建议。',
        },
        revise: {
            label: '需改',
            commonScore: 18,
            ratio: 0.62,
            veto: false,
            tone: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
            range: '60-74%',
            standard: '存在影响表现的问题，修改后再进入人工复审。',
            evidence: '必须写清具体问题和修改方向。',
            requiresNote: true,
        },
        veto: {
            label: '否决',
            commonScore: 12,
            ratio: 0.4,
            veto: true,
            tone: 'border-red-500/50 bg-red-500/10 text-red-300',
            range: '<60%',
            standard: '存在硬伤或高风险，不建议继续上传当前版本。',
            evidence: '必须写清否决依据，方便设计师决定返修或放弃。',
            requiresNote: true,
        },
    },
    passLine: 75,
    revisionLine: 60,
};

function cleanRubricItem(item: Partial<RubricItem> | undefined, fallback: RubricItem): RubricItem {
    return {
        label: String(item?.label || fallback.label || '评分项').trim(),
        points: Number.isFinite(Number(item?.points)) ? Number(item?.points) : fallback.points,
        standard: String(item?.standard || fallback.standard || '').trim(),
    };
}

export function normalizeReviewStandards(input?: Partial<ReviewStandardsConfig> | null): ReviewStandardsConfig {
    const source = input && typeof input === 'object' ? input : {};
    const reviewersInput = Array.isArray(source.reviewers) ? source.reviewers : [];
    const commonInput = Array.isArray(source.commonRubric) ? source.commonRubric : [];

    return {
        commonRubric: (commonInput.length ? commonInput : DEFAULT_REVIEW_STANDARDS.commonRubric)
            .map((item, index) => cleanRubricItem(item, DEFAULT_REVIEW_STANDARDS.commonRubric[index] || DEFAULT_REVIEW_STANDARDS.commonRubric[0])),
        reviewers: REVIEWER_ROLE_ORDER.map(role => {
            const fallback = DEFAULT_REVIEW_STANDARDS.reviewers.find(item => item.role === role)!;
            const current = (reviewersInput.find(item => item?.role === role) || {}) as Partial<ReviewerStandard>;
            const rubricInput = Array.isArray(current.rubric) ? current.rubric : [];
            return {
                role,
                title: String(current.title || fallback.title).trim(),
                shortTitle: String(current.shortTitle || fallback.shortTitle).trim(),
                max: Number.isFinite(Number(current.max)) ? Number(current.max) : fallback.max,
                mission: String(current.mission || fallback.mission).trim(),
                dimensions: Array.isArray(current.dimensions) && current.dimensions.length
                    ? current.dimensions.map((item: unknown) => String(item).trim()).filter(Boolean)
                    : fallback.dimensions,
                rubric: (rubricInput.length ? rubricInput : fallback.rubric)
                    .map((item: Partial<RubricItem>, index: number) => cleanRubricItem(item, fallback.rubric[index] || fallback.rubric[0])),
            };
        }),
        scoreLevels: SCORE_LEVEL_ORDER.reduce((acc, level) => {
            const fallback = DEFAULT_REVIEW_STANDARDS.scoreLevels[level];
            const current = (source.scoreLevels?.[level] || {}) as Partial<ScoreLevelStandard>;
            acc[level] = {
                ...fallback,
                label: String(current.label || fallback.label).trim(),
                commonScore: Number.isFinite(Number(current.commonScore)) ? Number(current.commonScore) : fallback.commonScore,
                ratio: Number.isFinite(Number(current.ratio)) ? Number(current.ratio) : fallback.ratio,
                veto: typeof current.veto === 'boolean' ? current.veto : fallback.veto,
                tone: fallback.tone,
                range: String(current.range || fallback.range).trim(),
                standard: String(current.standard || fallback.standard).trim(),
                evidence: String(current.evidence || fallback.evidence).trim(),
                requiresNote: typeof current.requiresNote === 'boolean' ? current.requiresNote : fallback.requiresNote,
            };
            return acc;
        }, {} as Record<ScoreLevel, ScoreLevelStandard>),
        passLine: Number.isFinite(Number(source.passLine)) ? Number(source.passLine) : DEFAULT_REVIEW_STANDARDS.passLine,
        revisionLine: Number.isFinite(Number(source.revisionLine)) ? Number(source.revisionLine) : DEFAULT_REVIEW_STANDARDS.revisionLine,
    };
}
