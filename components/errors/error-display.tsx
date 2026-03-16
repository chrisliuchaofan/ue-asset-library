/**
 * 统一错误显示组件
 * 
 * 根据错误类型显示不同的错误提示
 */

'use client';

import React, { useMemo } from 'react';
import { ErrorCode, ErrorMessages } from '@/lib/errors/error-codes';
import { StandardError, getUserFriendlyMessage, requiresUserAction, normalizeError } from '@/lib/errors/error-handler';

interface ErrorDisplayProps {
  error: StandardError | Error | string | null;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  context, 
  onRetry, 
  onDismiss,
  className = '' 
}: ErrorDisplayProps) {
  // 标准化错误（使用 useMemo 避免重复计算）
  const standardError = useMemo(() => {
    if (!error) return null;
    
    if (typeof error === 'string') {
      return normalizeError(error);
    } else if (error instanceof Error) {
      return normalizeError(error);
    } else {
      return error as StandardError;
    }
  }, [error]);
  
  if (!standardError) return null;
  
  const userMessage = getUserFriendlyMessage(standardError);
  const needsAction = requiresUserAction(standardError);
  
  // 根据错误类型选择样式（更明显的样式）
  const getErrorStyle = () => {
    switch (standardError.code) {
      case ErrorCode.INSUFFICIENT_CREDITS:
      case ErrorCode.PAYMENT_REQUIRED:
        return 'bg-yellow-900/80 border-yellow-400 text-yellow-100 shadow-yellow-500/50';
      case ErrorCode.AUTH_FAILED:
      case ErrorCode.AUTH_REQUIRED:
      case ErrorCode.AUTH_TOKEN_EXPIRED:
        return 'bg-orange-900/80 border-orange-400 text-orange-100 shadow-orange-500/50';
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.BACKEND_UNAVAILABLE:
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'bg-blue-900/80 border-blue-400 text-blue-100 shadow-blue-500/50';
      case ErrorCode.MODEL_ERROR:
      case ErrorCode.MODEL_API_CALL_FAILED:
        return 'bg-purple-900/80 border-purple-400 text-purple-100 shadow-purple-500/50';
      default:
        return 'bg-red-900/80 border-red-400 text-red-100 shadow-red-500/50';
    }
  };
  
  // 根据错误类型选择图标
  const getErrorIcon = () => {
    switch (standardError.code) {
      case ErrorCode.INSUFFICIENT_CREDITS:
      case ErrorCode.PAYMENT_REQUIRED:
        return '💰';
      case ErrorCode.AUTH_FAILED:
      case ErrorCode.AUTH_REQUIRED:
        return '🔐';
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.BACKEND_UNAVAILABLE:
        return '🌐';
      case ErrorCode.MODEL_ERROR:
        return '🤖';
      default:
        return '❌';
    }
  };
  
  return (
    <div className={`p-5 rounded-xl border-2 shadow-2xl backdrop-blur-md ${getErrorStyle()} ${className} animate-fade-in`}>
      <div className="flex items-start gap-4">
        <div className="text-4xl flex-shrink-0 animate-bounce">{getErrorIcon()}</div>
        <div className="flex-grow min-w-0">
          <div className="font-bold text-lg mb-2 leading-tight">{userMessage}</div>
          {context && (
            <div className="text-sm opacity-95 mb-3 font-medium">{context}</div>
          )}
          {standardError.details && (
            <div className="text-sm opacity-95 mt-3 space-y-2 bg-muted/50 p-3 rounded-lg">
              {standardError.details.balance !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">💰 当前余额:</span>
                  <span className="font-mono font-bold text-lg">{standardError.details.balance}</span>
                </div>
              )}
              {standardError.details.required !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">📊 需要:</span>
                  <span className="font-mono font-bold text-lg">{standardError.details.required}</span>
                </div>
              )}
            </div>
          )}
          {standardError.traceId && process.env.NODE_ENV === 'development' && (
            <div className="text-xs opacity-70 mt-3 pt-3 border-t border-border font-mono break-all">
              🔍 追踪 ID: {standardError.traceId}
            </div>
          )}
          {(onRetry || onDismiss) && (
            <div className="flex gap-3 mt-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-5 py-2.5 text-sm rounded-lg bg-white/25 hover:bg-white/35 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  🔄 重试
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-5 py-2.5 text-sm rounded-lg bg-white/25 hover:bg-white/35 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  ✕ 关闭
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 错误提示组件（用于 Toast 或内联显示）
 */
export function ErrorAlert({ 
  error, 
  onDismiss 
}: { 
  error: StandardError | Error | string | null;
  onDismiss?: () => void;
}) {
  return <ErrorDisplay error={error} onDismiss={onDismiss} />;
}

