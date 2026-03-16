/**
 * 可灵 (Kling) AI Provider
 *
 * 支持图生视频(i2v) + 文生视频(t2v)
 * 认证方式: JWT (HS256) — AccessKey + SecretKey 生成 Bearer token
 * 异步任务: POST 创建 → GET 轮询 task_id 状态
 */

import type { AIProvider, AIGenerateVideoRequest, AIGenerateVideoResponse } from '../types';

/** 可灵任务状态查询结果 */
export interface KlingTaskStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
}

export class KlingProvider implements AIProvider {
    name = '可灵 (Kling)';
    type = 'kling' as const;

    private accessKey = process.env.KLING_API_KEY || '';
    private secretKey = process.env.KLING_API_SECRET || '';
    private baseUrl = process.env.KLING_API_ENDPOINT || 'https://api.klingai.com/v1';

    /**
     * 生成 JWT Token (HS256)
     */
    private async generateToken(): Promise<string> {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.accessKey,
            exp: now + 1800, // 30 分钟过期
            nbf: now - 5,
        };

        const enc = (obj: Record<string, unknown>) =>
            Buffer.from(JSON.stringify(obj)).toString('base64url');

        const headerB64 = enc(header);
        const payloadB64 = enc(payload);
        const signingInput = `${headerB64}.${payloadB64}`;

        const crypto = await import('crypto');
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(signingInput)
            .digest('base64url');

        return `${signingInput}.${signature}`;
    }

    /**
     * 图生视频（主入口：分镜图 → 视频）
     */
    async generateVideo(request: AIGenerateVideoRequest): Promise<AIGenerateVideoResponse> {
        if (!this.accessKey || !this.secretKey) {
            throw new Error('可灵 API 密钥未配置，请设置 KLING_API_KEY 和 KLING_API_SECRET');
        }

        const token = await this.generateToken();

        // 构建请求体
        const body: Record<string, unknown> = {
            model_name: 'kling-v1',
            mode: 'std',
            duration: String(Math.min(request.duration || 5, 10)),
            image: request.imageUrl,
        };
        if (request.prompt) body.prompt = request.prompt;
        if (request.aspectRatio) body.aspect_ratio = request.aspectRatio;

        const endpoint = `${this.baseUrl}/videos/image2video`;
        console.log(`[KlingProvider] 提交图生视频任务: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`可灵 API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        // 可灵返回: { code: 0, data: { task_id, task_status } }
        const taskId = data.data?.task_id;
        if (!taskId) {
            throw new Error(`可灵 API 返回异常: 未获取到 task_id — ${JSON.stringify(data)}`);
        }

        console.log(`[KlingProvider] 任务已提交: taskId=${taskId}`);

        return {
            videoUrl: '',
            operationId: taskId,
            status: 'pending',
            raw: data,
        };
    }

    /**
     * 查询异步任务状态（供外部轮询调用）
     */
    async queryTaskStatus(taskId: string): Promise<KlingTaskStatus> {
        if (!this.accessKey || !this.secretKey) {
            throw new Error('可灵 API 密钥未配置');
        }

        const token = await this.generateToken();
        const endpoint = `${this.baseUrl}/videos/image2video/${taskId}`;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`可灵任务查询失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const taskStatus = data.data?.task_status;
        const taskResult = data.data?.task_result;

        // 状态映射: submitted/processing/succeed/failed
        switch (taskStatus) {
            case 'succeed': {
                const videoUrl = taskResult?.videos?.[0]?.url || '';
                return { status: 'completed', videoUrl };
            }
            case 'failed': {
                const errorMsg = taskResult?.error_msg || data.data?.task_status_msg || '视频生成失败';
                return { status: 'failed', error: errorMsg };
            }
            case 'processing':
                return { status: 'processing' };
            case 'submitted':
            default:
                return { status: 'pending' };
        }
    }

    async healthCheck(): Promise<boolean> {
        return !!(this.accessKey && this.secretKey);
    }
}
