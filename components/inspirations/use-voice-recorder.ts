'use client';

import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface UseVoiceRecorderReturn {
  state: RecordingState;
  duration: number; // 秒
  audioBlob: Blob | null;
  audioUrl: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  isSupported: boolean;
}

/**
 * 语音录制 Hook
 * 使用 MediaRecorder API
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'mediaDevices' in navigator;

  const start = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setDuration(0);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      // 选择支持的音频格式
      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg']
        .find(type => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('stopped');

        // 清理
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      recorder.start(1000); // 每秒收集一次数据
      setState('recording');

      // 计时器
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('麦克风访问失败:', err);
      setState('idle');
    }
  }, [isSupported, audioUrl]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  const reset = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    chunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState('idle');
  }, [state, audioUrl]);

  return {
    state,
    duration,
    audioBlob,
    audioUrl,
    start,
    stop,
    reset,
    isSupported,
  };
}
