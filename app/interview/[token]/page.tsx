'use client';

/**
 * W3.1: 公开访谈页 — 免登录，token 验证
 * 路径: /interview/[token]
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, Send, MessageCircle, CheckCircle2 } from 'lucide-react';

/* ── 样式常量 ── */

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#0a0a0a',
    color: 'rgba(255,255,255,0.88)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600 as const,
    color: 'rgba(255,255,255,0.88)',
    margin: 0,
    marginBottom: 4,
  },
  headerTopic: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px 16px',
    maxWidth: 640,
    width: '100%',
    margin: '0 auto',
  },
  message: (isUser: boolean) => ({
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    marginBottom: 16,
  }),
  bubble: (isUser: boolean) => ({
    maxWidth: '80%',
    padding: '12px 16px',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: isUser ? '#F97316' : 'rgba(255,255,255,0.06)',
    color: isUser ? '#fff' : 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  }),
  inputBar: {
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: '#0a0a0a',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    maxWidth: 640,
    margin: '0 auto',
  },
  textarea: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    padding: '10px 14px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    outline: 'none',
    resize: 'none' as const,
    lineHeight: 1.5,
  },
  sendBtn: (disabled: boolean) => ({
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: disabled ? 'rgba(255,255,255,0.04)' : '#F97316',
    border: 'none',
    borderRadius: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'rgba(255,255,255,0.2)' : '#fff',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  }),
  // 开始表单
  startForm: {
    maxWidth: 400,
    margin: 'auto',
    padding: 32,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    textAlign: 'center' as const,
  },
  formIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'rgba(249,115,22,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 8px',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 600 as const,
    color: 'rgba(255,255,255,0.88)',
    margin: 0,
  },
  formDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.6,
    margin: 0,
  },
  formInput: {
    width: '100%',
    height: 44,
    padding: '0 14px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    outline: 'none',
  },
  formBtn: {
    height: 44,
    padding: '0 24px',
    fontSize: 14,
    fontWeight: 600 as const,
    color: '#000',
    background: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  endBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  completed: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
    textAlign: 'center' as const,
  },
} as const;

interface InterviewData {
  id: string;
  topic: string;
  guide_questions: string[];
  status: string;
  contributor_name: string | null;
  contributor_role: string | null;
  chat_history: { role: string; content: string; timestamp: string }[];
}

export default function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 开始表单
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [starting, setStarting] = useState(false);

  // 聊天
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 解析 token
  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  // 加载访谈
  useEffect(() => {
    if (!token) return;
    fetchInterview();
  }, [token]);

  const fetchInterview = async () => {
    try {
      const res = await fetch(`/api/knowledge/interviews/${token}/chat`);
      if (!res.ok) {
        setError('访谈不存在或已失效');
        return;
      }
      const data = await res.json();
      setInterview(data);
      setMessages(
        (data.chat_history || [])
          .filter((m: any) => m.role === 'assistant' || m.role === 'user')
          .map((m: any) => ({ role: m.role, content: m.content }))
      );
    } catch {
      setError('加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 开始访谈
  const handleStart = async () => {
    if (!name.trim() || starting) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/knowledge/interviews/${token}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          contributor_name: name.trim(),
          contributor_role: role.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([{ role: 'assistant', content: data.reply }]);
        setInterview(prev => prev ? { ...prev, status: 'in_progress', contributor_name: name.trim() } : null);
      }
    } catch {
      setError('开始访谈失败');
    } finally {
      setStarting(false);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);

    try {
      const res = await fetch(`/api/knowledge/interviews/${token}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', message: msg }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，发送失败，请重试。' }]);
    } finally {
      setSending(false);
    }
  };

  // 结束访谈
  const handleEnd = async () => {
    if (!confirm('确定要结束访谈吗？结束后无法继续对话。')) return;
    try {
      await fetch(`/api/knowledge/interviews/${token}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });
      setInterview(prev => prev ? { ...prev, status: 'completed' } : null);
    } catch {
      // ignore
    }
  };

  // Loading
  if (loading) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Error
  if (error || !interview) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>{error || '访谈不存在'}</p>
      </div>
    );
  }

  // Completed
  if (interview.status === 'completed' || interview.status === 'archived') {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <h1 style={S.headerTitle}>知识访谈</h1>
          <p style={S.headerTopic}>{interview.topic}</p>
        </div>
        <div style={S.completed as any}>
          <CheckCircle2 style={{ width: 48, height: 48, color: '#22C55E' }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
            访谈已结束
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 320, lineHeight: 1.6 }}>
            感谢您的参与！您的知识将被整理并用于团队知识库建设。
          </p>
        </div>
      </div>
    );
  }

  // Start form (pending state)
  if (interview.status === 'pending') {
    return (
      <div style={S.page}>
        <div style={S.startForm as any}>
          <div style={S.formIcon}>
            <MessageCircle style={{ width: 28, height: 28, color: '#F97316' }} />
          </div>
          <h1 style={S.formTitle}>知识访谈</h1>
          <p style={S.formDesc}>
            您被邀请参与关于「{interview.topic}」的知识访谈。AI 访谈员将围绕话题向您提问，帮助提取您的专业知识。
          </p>
          <input
            type="text"
            placeholder="您的姓名 *"
            value={name}
            onChange={e => setName(e.target.value)}
            style={S.formInput}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
          />
          <input
            type="text"
            placeholder="您的职位/角色（可选）"
            value={role}
            onChange={e => setRole(e.target.value)}
            style={S.formInput}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
          />
          <button
            style={{ ...S.formBtn, opacity: starting || !name.trim() ? 0.5 : 1 }}
            onClick={handleStart}
            disabled={starting || !name.trim()}
          >
            {starting ? '开始中...' : '开始访谈'}
          </button>
        </div>
      </div>
    );
  }

  // Chat UI (in_progress state)
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div>
            <h1 style={S.headerTitle}>知识访谈</h1>
            <p style={S.headerTopic}>{interview.topic}</p>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button style={S.endBtn} onClick={handleEnd}>
            <CheckCircle2 style={{ width: 14, height: 14 }} /> 结束访谈
          </button>
        </div>
      </div>

      <div style={S.chatArea as any}>
        {messages.map((msg, i) => (
          <div key={i} style={S.message(msg.role === 'user')}>
            <div style={S.bubble(msg.role === 'user') as any}>{msg.content}</div>
          </div>
        ))}
        {sending && (
          <div style={S.message(false)}>
            <div style={S.bubble(false) as any}>
              <Loader2 style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={S.inputBar}>
        <div style={S.inputRow}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的回答..."
            style={S.textarea}
            rows={1}
          />
          <button
            style={S.sendBtn(sending || !input.trim())}
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            <Send style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
