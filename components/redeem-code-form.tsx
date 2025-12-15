'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, createStandardError, ErrorCode } from '@/lib/errors/error-handler';
import { Gift, CheckCircle2, XCircle } from 'lucide-react';

interface RedeemCodeFormProps {
  onSuccess?: (balance: number) => void;
}

export function RedeemCodeForm({ onSuccess }: RedeemCodeFormProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<any>(null);
  const [success, setSuccess] = useState<{ amount: number; balance: number } | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; amount?: number } | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) {
      setError(createStandardError(ErrorCode.VALIDATION_ERROR, '请输入兑换码'));
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch(`/api/credits/redeem?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      const result = await response.json();
      setValidationResult(result);
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setValidating(false);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError(createStandardError(ErrorCode.VALIDATION_ERROR, '请输入兑换码'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/credits/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      const result = await response.json();
      setSuccess({
        amount: validationResult?.amount || 0,
        balance: result.balance,
      });
      setCode('');
      setValidationResult(null);
      
      if (onSuccess) {
        onSuccess(result.balance);
      }
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Gift className="w-6 h-6 text-indigo-400" />
        <h3 className="text-lg font-bold">兑换码充值</h3>
      </div>

      {error && (
        <ErrorDisplay error={error} onDismiss={() => setError(null)} />
      )}

      {success && (
        <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-400 font-semibold">兑换成功！</p>
            <p className="text-sm text-slate-300 mt-1">
              已充值 {success.amount} 积分，当前余额：{success.balance} 积分
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="redeem-code">兑换码</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="redeem-code"
              type="text"
              placeholder="输入兑换码（如：ABC12345）"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
                setSuccess(null);
                setValidationResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && !validating) {
                  if (validationResult?.valid) {
                    handleRedeem();
                  } else {
                    handleValidate();
                  }
                }
              }}
              className="flex-1"
              disabled={loading || validating}
            />
            <Button
              onClick={handleValidate}
              disabled={loading || validating || !code.trim()}
              variant="outline"
            >
              {validating ? '验证中...' : '验证'}
            </Button>
          </div>
        </div>

        {validationResult && (
          <div className={`p-3 rounded-lg border ${
            validationResult.valid
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-red-900/20 border-red-700/50'
          }`}>
            <div className="flex items-center gap-2">
              {validationResult.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    兑换码有效，可充值 {validationResult.amount} 积分
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">兑换码无效</span>
                </>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleRedeem}
          disabled={loading || validating || !code.trim() || !validationResult?.valid}
          className="w-full"
        >
          {loading ? '兑换中...' : '兑换'}
        </Button>
      </div>
    </div>
  );
}


