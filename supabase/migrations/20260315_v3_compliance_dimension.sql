-- V3 W1.3: 合规初审维度种子数据
-- 日期: 2026-03-15
-- 说明: 在 knowledge_entries 表中插入「合规初审」审核维度
-- 注意: 需在 Supabase Dashboard SQL Editor 中手动执行

INSERT INTO knowledge_entries (
  title,
  content,
  category,
  status,
  check_type,
  criteria,
  prompt_template,
  source_type,
  tags
) VALUES (
  '合规初审',
  E'游戏广告素材渠道合规性审核，包含以下 7 条规则：\n\n' ||
  E'【C-1】禁止出现美国山海经及木棍人形象（字节禁投，涉及邪典）\n' ||
  E'  - 渠道：头条\n' ||
  E'  - 等级：🔴 封禁\n\n' ||
  E'【C-2】禁止出现"炮弹""坦克""枪支""战车""战争"等战争敏感词\n' ||
  E'  - 渠道：全渠道\n' ||
  E'  - 等级：🔴 拒审\n\n' ||
  E'【C-3】禁止出现中国地图、国旗相关内容\n' ||
  E'  - 渠道：全渠道\n' ||
  E'  - 等级：🔴 封禁\n\n' ||
  E'【C-4】禁止出现虚假按钮："x"、播放logo、福袋、红包等\n' ||
  E'  - 渠道：广点通\n' ||
  E'  - 等级：🟡 二级违规\n\n' ||
  E'【C-5】禁止使用 SLG/RPG 等字母缩写，需用全称（策略类游戏/角色扮演类游戏）\n' ||
  E'  - 渠道：头条\n' ||
  E'  - 等级：🟡 拒审\n\n' ||
  E'【C-6】广点通素材违规元素规避（详见平台指引文档）\n' ||
  E'  - 渠道：广点通\n' ||
  E'  - 等级：🟡 罚款\n\n' ||
  E'【C-7】头条审核违禁词汇总（详见平台违禁词列表）\n' ||
  E'  - 渠道：头条\n' ||
  E'  - 等级：🟡 拒审',
  'dimension',
  'approved',
  'ai_text',
  '{"priority": 0, "severity": "block"}'::jsonb,
  E'你是一名游戏广告合规审核专家。请根据以下 7 条合规规则，逐条检查该素材是否违规。\n\n' ||
  E'合规规则：\n' ||
  E'C-1: 禁止出现美国山海经及木棍人形象（涉及邪典，字节封禁）\n' ||
  E'C-2: 禁止出现"炮弹""坦克""枪支""战车""战争"等战争敏感词\n' ||
  E'C-3: 禁止出现中国地图、国旗相关内容\n' ||
  E'C-4: 禁止出现虚假按钮（"x"关闭按钮、播放logo、福袋、红包等）\n' ||
  E'C-5: 禁止使用 SLG/RPG 等字母缩写，需用全称\n' ||
  E'C-6: 广点通素材违规元素规避\n' ||
  E'C-7: 头条审核违禁词汇总\n\n' ||
  E'素材信息：\n' ||
  E'- 名称: {{material_name}}\n' ||
  E'- 类型: {{material_type}}\n' ||
  E'- 项目: {{project}}\n\n' ||
  E'请逐条检查并输出 JSON：\n' ||
  E'{\n' ||
  E'  "pass": true/false,\n' ||
  E'  "rationale": "检查结论",\n' ||
  E'  "violations": [{"rule": "C-X", "detail": "具体违规描述"}]\n' ||
  E'}',
  'manual',
  ARRAY['合规', '审核', '违规', '敏感词']
)
ON CONFLICT DO NOTHING;
