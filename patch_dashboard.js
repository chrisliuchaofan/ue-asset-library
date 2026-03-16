const fs = require('fs');
const path = require('path');

const targetFile = path.join('/Users/chrisliu/Documents/爆款工坊/资产库web/components/admin/admin-materials-dashboard.tsx');
let content = fs.readFileSync(targetFile, 'utf-8');

// 1. Update FormState
const formStateOriginal = `interface FormState {
  name: string;
  type: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片';
  project: '项目A' | '项目B' | '项目C' | '';
  tag: '爆款' | '优质' | '达标';
  quality: ('高品质' | '常规' | '迭代')[];
  thumbnail: string;
  src: string;
  gallery: string;
  filesize: string;
  width: string;
  height: string;
  duration: string;
}`;

const formStateNew = `interface FormState {
  name: string;
  type: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片';
  project: '项目A' | '项目B' | '项目C' | '';
  tag: '爆款' | '优质' | '达标';
  quality: ('高品质' | '常规' | '迭代')[];
  source: 'internal' | 'competitor';
  consumption: string;
  conversions: string;
  roi: string;
  platform: string;
  advertiser: string;
  estimatedSpend: string;
  firstSeen: string;
  lastSeen: string;
  thumbnail: string;
  src: string;
  gallery: string;
  filesize: string;
  width: string;
  height: string;
  duration: string;
}`;
content = content.replace(formStateOriginal, formStateNew);

// 2. Update initialFormState
const initialFormStateOriginal = `const initialFormState: FormState = {
  name: '',
  type: 'UE视频',
  project: '',
  tag: '达标',
  quality: ['常规'],
  thumbnail: '',
  src: '',
  gallery: '',
  filesize: '',
  width: '',
  height: '',
  duration: '',
};`;

const initialFormStateNew = `const initialFormState: FormState = {
  name: '',
  type: 'UE视频',
  project: '',
  tag: '达标',
  quality: ['常规'],
  source: 'internal',
  consumption: '',
  conversions: '',
  roi: '',
  platform: '',
  advertiser: '',
  estimatedSpend: '',
  firstSeen: '',
  lastSeen: '',
  thumbnail: '',
  src: '',
  gallery: '',
  filesize: '',
  width: '',
  height: '',
  duration: '',
};`;
content = content.replace(initialFormStateOriginal, initialFormStateNew);

// 3. Update handleCreate payload
const handleCreatePayloadOriginal = `const payload = {
        name: form.name.trim(),
        type: form.type,
        project: form.project,
        tag: form.tag,
        quality: form.quality,`;

const handleCreatePayloadNew = `const payload = {
        name: form.name.trim(),
        type: form.type,
        project: form.project,
        tag: form.tag,
        quality: form.quality,
        source: form.source,
        consumption: form.consumption ? Number(form.consumption) : undefined,
        conversions: form.conversions ? Number(form.conversions) : undefined,
        roi: form.roi ? Number(form.roi) : undefined,
        platform: form.platform,
        advertiser: form.advertiser,
        estimatedSpend: form.estimatedSpend ? Number(form.estimatedSpend) : undefined,
        firstSeen: form.firstSeen ? new Date(form.firstSeen).getTime() : undefined,
        lastSeen: form.lastSeen ? new Date(form.lastSeen).getTime() : undefined,`;
if (!content.includes(handleCreatePayloadNew)) {
    content = content.replace(handleCreatePayloadOriginal, handleCreatePayloadNew);
}

// 4. Update handleUpdate payload
const handleUpdatePayloadOriginal = `const payload = {
        id: editingMaterialId,
        name: form.name.trim(),
        type: form.type,
        project: form.project || undefined,
        tag: form.tag,
        quality: form.quality,`;

const handleUpdatePayloadNew = `const payload = {
        id: editingMaterialId,
        name: form.name.trim(),
        type: form.type,
        project: form.project || undefined,
        tag: form.tag,
        quality: form.quality,
        source: form.source,
        consumption: form.consumption ? Number(form.consumption) : undefined,
        conversions: form.conversions ? Number(form.conversions) : undefined,
        roi: form.roi ? Number(form.roi) : undefined,
        platform: form.platform || undefined,
        advertiser: form.advertiser || undefined,
        estimatedSpend: form.estimatedSpend ? Number(form.estimatedSpend) : undefined,
        firstSeen: form.firstSeen ? new Date(form.firstSeen).getTime() : undefined,
        lastSeen: form.lastSeen ? new Date(form.lastSeen).getTime() : undefined,`;
if (!content.includes(handleUpdatePayloadNew)) {
    content = content.replace(handleUpdatePayloadOriginal, handleUpdatePayloadNew);
}

// 5. Update handleEdit form setting
const handleEditOriginal = `setForm({
      name: material.name,
      type: material.type,
      project: material.project as '项目A' | '项目B' | '项目C',
      tag: material.tag,
      quality: material.quality,`;

const handleEditNew = `setForm({
      name: material.name,
      type: material.type,
      project: material.project as '项目A' | '项目B' | '项目C',
      tag: material.tag,
      quality: material.quality,
      source: material.source || 'internal',
      consumption: material.consumption ? String(material.consumption) : '',
      conversions: material.conversions ? String(material.conversions) : '',
      roi: material.roi ? String(material.roi) : '',
      platform: material.platform || '',
      advertiser: material.advertiser || '',
      estimatedSpend: material.estimatedSpend ? String(material.estimatedSpend) : '',
      firstSeen: material.firstSeen ? new Date(material.firstSeen).toISOString().split('T')[0] : '',
      lastSeen: material.lastSeen ? new Date(material.lastSeen).toISOString().split('T')[0] : '',`;
if (!content.includes(handleEditNew)) {
    content = content.replace(handleEditOriginal, handleEditNew);
}

// 6. Add UI fields in the form (search for tags dropdown)
const uiInsertPoint = `            <div className="space-y-2">
              <label className="text-sm font-medium">标签 <span className="text-red-500">*</span></label>
              <select
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={form.tag}
                onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value as any }))}
                disabled={loading}
              >
                {MATERIAL_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>`;

const uiFieldsNew = `
            <div className="space-y-2">
              <label className="text-sm font-medium">来源 <span className="text-red-500">*</span></label>
              <select
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value as any }))}
                disabled={loading}
              >
                <option value="internal">内部</option>
                <option value="competitor">竞品</option>
              </select>
            </div>
            {form.source === 'internal' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">消耗金额</label>
                  <Input type="number" placeholder="例如: 1000" value={form.consumption} onChange={handleInputChange('consumption')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">转化数</label>
                  <Input type="number" placeholder="例如: 50" value={form.conversions} onChange={handleInputChange('conversions')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ROI</label>
                  <Input type="number" step="0.01" placeholder="例如: 1.5" value={form.roi} onChange={handleInputChange('roi')} />
                </div>
              </>
            )}
            {form.source === 'competitor' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">来源平台</label>
                  <Input placeholder="例如: 抖音" value={form.platform} onChange={handleInputChange('platform')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">广告主</label>
                  <Input placeholder="广告主名称" value={form.advertiser} onChange={handleInputChange('advertiser')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">预估消耗</label>
                  <Input type="number" placeholder="预估金额" value={form.estimatedSpend} onChange={handleInputChange('estimatedSpend')} />
                </div>
              </>
            )}
`;

if (content.includes(uiInsertPoint) && !content.includes('<option value="internal">内部</option>')) {
    content = content.replace(uiInsertPoint, uiInsertPoint + uiFieldsNew);
}

fs.writeFileSync(targetFile, content, 'utf-8');
console.log('Successfully patched admin-materials-dashboard.tsx');
