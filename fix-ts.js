const fs = require('fs');
const path = require('path');
const glob = require('glob');

const libDir = '/Users/chrisliu/Documents/爆款工坊/资产库web/lib/deduplication';

// 1. legacySupabase.ts
let legacyText = fs.readFileSync(path.join(libDir, 'legacySupabase.ts'), 'utf-8');
legacyText = legacyText.replace(/import \{ createClient, SupabaseClient \} from '@supabase\/supabase-js';/, "import { SupabaseClient } from '@supabase/supabase-js';\nimport { createBrowserSupabaseClient } from '@/lib/supabase/browser';");
legacyText = legacyText.replace(/import \{ AuditRule, User, AnalysisReport, HistoryRecord, ChatMessage \} from '\.\.\/types';/, "import { AuditRule, User, AnalysisReport, HistoryRecord, ChatMessage } from './types';");
legacyText = legacyText.replace(/import \{ extractErrorMessage \} from '\.\.\/services\/aiService';/, "import { extractErrorMessage } from './aiService';");
legacyText = legacyText.replace(/import \{ devLog, devWarn \} from '\.\.\/utils\/devLog';/, "import { devLog, devWarn } from './utils/devLog';");
legacyText = legacyText.replace(/function getSupabaseClient\(\): SupabaseClient \{[\s\S]*?return client;\n\}/, "function getSupabaseClient(): SupabaseClient {\n  return createBrowserSupabaseClient() as any;\n}");
fs.writeFileSync(path.join(libDir, 'legacySupabase.ts'), legacyText);

// 2. complianceService.ts
let compText = fs.readFileSync(path.join(libDir, 'complianceService.ts'), 'utf-8');
compText = compText.replace(/from '\.\.\/types'/, "from './types'");
compText = compText.replace(/import\('\.\.\/lib\/supabase'\)/g, "import('./legacySupabase')");
fs.writeFileSync(path.join(libDir, 'complianceService.ts'), compText);

// 3. deduplicationSupabaseService.ts
let dedupText = fs.readFileSync(path.join(libDir, 'deduplicationSupabaseService.ts'), 'utf-8');
dedupText = dedupText.replace(/from '\.\.\/lib\/supabase'/, "from './legacySupabase'");
fs.writeFileSync(path.join(libDir, 'deduplicationSupabaseService.ts'), dedupText);

// 4. embeddingService.ts
let embedText = fs.readFileSync(path.join(libDir, 'embeddingService.ts'), 'utf-8');
embedText = embedText.replace(/from '\.\.\/utils\/devLog'/, "from './utils/devLog'");
fs.writeFileSync(path.join(libDir, 'embeddingService.ts'), embedText);

// 5. excelService.ts
let excelText = fs.readFileSync(path.join(libDir, 'excelService.ts'), 'utf-8');
excelText = excelText.replace(/promotionType: typeCostMap/, "promotionTypes: typeCostMap");
fs.writeFileSync(path.join(libDir, 'excelService.ts'), excelText);

// 6. aiService.ts
let aiText = fs.readFileSync(path.join(libDir, 'aiService.ts'), 'utf-8');
aiText = aiText.replace(/from '\.\.\/types'/g, "from './types'");
fs.writeFileSync(path.join(libDir, 'aiService.ts'), aiText);

// 7. geminiService.ts
let geminiText = fs.readFileSync(path.join(libDir, 'geminiService.ts'), 'utf-8');
geminiText = geminiText.replace(/from '\.\.\/types'/g, "from './types'");
geminiText = geminiText.replace(/\(item\) =>/g, "(item: any) =>");
fs.writeFileSync(path.join(libDir, 'geminiService.ts'), geminiText);

// 8. tuyooGatewayService.ts
let tuyooText = fs.readFileSync(path.join(libDir, 'tuyooGatewayService.ts'), 'utf-8');
tuyooText = tuyooText.replace(/from '\.\.\/config\/tuyoo-models'/g, "from './config/tuyoo-models'");
tuyooText = tuyooText.replace(/from '\.\.\/utils\/devLog'/g, "from './utils/devLog'");
fs.writeFileSync(path.join(libDir, 'tuyooGatewayService.ts'), tuyooText);

// 9. openRouterService.ts
let openRouterText = fs.readFileSync(path.join(libDir, 'openRouterService.ts'), 'utf-8');
openRouterText = openRouterText.replace(/from '\.\.\/types'/g, "from './types'");
openRouterText = openRouterText.replace(/from '\.\.\/utils\/devLog'/g, "from './utils/devLog'");
openRouterText = openRouterText.replace(/import\('\.\.\/types'\)/g, "import('./types')");
openRouterText = openRouterText.replace(/\(item\) =>/g, "(item: any) =>");
openRouterText = openRouterText.replace(/image_url: \{ url: item\.image_url\.url \}/g, "image_url: { url: item.image_url.url } as any");
openRouterText = openRouterText.replace(/video_url: \{ url: item\.image_url\.url \}/g, "video_url: { url: item.image_url.url } as any");
openRouterText = openRouterText.replace(/type: 'video_url',/g, "type: 'video_url' as string,");
openRouterText = openRouterText.replace(/type: 'image_url',/g, "type: 'image_url' as string,");
openRouterText = openRouterText.replace(/video_url: \{/g, "video_url: {");
openRouterText = openRouterText.replace(/let result:/g, "let result: any; //");
openRouterText = openRouterText.replace(/const extractPartialFlowData = \(jsonText: string\): import\('\.\/types'\)\.FlowAnalysisResult => \{/g, "const extractPartialFlowData = (jsonText: string): import('./types').FlowAnalysisResult | undefined => {");
openRouterText = openRouterText.replace(/\(point, index\) =>/g, "(point: any, index: any) =>");
openRouterText = openRouterText.replace(/\(p\) =>/g, "(p: any) =>");
openRouterText = openRouterText.replace(/\(acc, p\) =>/g, "(acc: any, p: any) =>");
fs.writeFileSync(path.join(libDir, 'openRouterService.ts'), openRouterText);

// 10. videoDeduplicationService.ts
let videoDeduplicationText = fs.readFileSync(path.join(libDir, 'videoDeduplicationService.ts'), 'utf-8');
videoDeduplicationText = videoDeduplicationText.replace(/messages: \[\s*\{ role: 'system', content: systemPrompt \},/g, "messages: [\n      { role: 'system', content: systemPrompt },");
videoDeduplicationText = videoDeduplicationText.replace(/\] as const,/g, "] as any,");
fs.writeFileSync(path.join(libDir, 'videoDeduplicationService.ts'), videoDeduplicationText);

// 11. zhipuService.ts
let zhipuText = fs.readFileSync(path.join(libDir, 'zhipuService.ts'), 'utf-8');
zhipuText = zhipuText.replace(/from '\.\.\/types'/g, "from './types'");
zhipuText = zhipuText.replace(/\(item\) =>/g, "(item: any) =>");
zhipuText = zhipuText.replace(/else if \(isTextVideoUrl\)/g, "else if (text.match(/https?:\\/\\/[^\\s]+/))");
fs.writeFileSync(path.join(libDir, 'zhipuService.ts'), zhipuText);

// 12. page.tsx
const pagePath = '/Users/chrisliu/Documents/爆款工坊/资产库web/app/analysis/page.tsx';
let pageText = fs.readFileSync(pagePath, 'utf-8');
if (!pageText.includes('"use client"')) {
  pageText = '"use client";\n' + pageText;
}
fs.writeFileSync(pagePath, pageText);

console.log('Script completed');
