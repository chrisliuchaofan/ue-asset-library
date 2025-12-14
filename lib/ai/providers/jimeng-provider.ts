import type { AIProvider, AIGenerateVideoRequest, AIGenerateVideoResponse } from '../types';
import crypto from 'crypto';

export class JimengProvider implements AIProvider {
  name = '即梦 (Jimeng)';
  type = 'jimeng' as const;
  
  private accessKey = process.env.JIMENG_ACCESS_KEY;
  private secretKey = process.env.JIMENG_SECRET_KEY;
  private endpoint = process.env.JIMENG_API_ENDPOINT || 'https://visual.volcengineapi.com';
  private region = process.env.JIMENG_REGION || 'cn-north-1';
  private reqKey = process.env.JIMENG_REQ_KEY || 'jimeng_i2v_first_v30';
  
  /**
   * 生成火山引擎 API 签名
   */
  private generateSignature(method: string, uri: string, query: string, headers: Record<string, string>, body: string): string {
    const algorithm = 'HMAC-SHA256';
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().substring(0, 10).replace(/-/g, '');
    
    // 构建待签名字符串
    const canonicalRequest = [
      method,
      uri,
      query,
      Object.keys(headers).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join('\n'),
      '',
      Object.keys(headers).sort().map(k => k.toLowerCase()).join(';'),
      crypto.createHash('sha256').update(body).digest('hex'),
    ].join('\n');
    
    const stringToSign = [
      algorithm,
      timestamp.toString(),
      date + '/' + this.region + '/visual/request',
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    
    const kDate = crypto.createHmac('sha256', this.secretKey!).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('visual').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('request').digest();
    
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    
    return signature;
  }
  
  async generateVideo(request: AIGenerateVideoRequest): Promise<AIGenerateVideoResponse> {
    if (!this.accessKey || !this.secretKey) {
      throw new Error('即梦API密钥未配置，请设置 JIMENG_ACCESS_KEY 和 JIMENG_SECRET_KEY');
    }
    
    try {
      const uri = '/';
      const method = 'POST';
      const query = '';
      
      // 构建请求体
      const requestBody = {
        req_key: this.reqKey,
        image_url: request.imageUrl,
        prompt: request.prompt || '',
        duration: request.duration || 5,
        resolution: request.resolution || '1080p',
      };
      
      const body = JSON.stringify(requestBody);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Host': new URL(this.endpoint).hostname,
        'X-Date': new Date(timestamp * 1000).toISOString().replace(/[:\-]|\.\d{3}/g, ''),
      };
      
      // 生成签名
      const signature = this.generateSignature(method, uri, query, headers, body);
      
      // 构建 Authorization 头
      const authorization = `HMAC-SHA256 Credential=${this.accessKey}/${new Date(timestamp * 1000).toISOString().substring(0, 10).replace(/-/g, '')}/${this.region}/visual/request, SignedHeaders=${Object.keys(headers).sort().map(k => k.toLowerCase()).join(';')}, Signature=${signature}`;
      
      headers['Authorization'] = authorization;
      
      // 调用 API
      const response = await fetch(`${this.endpoint}${uri}`, {
        method,
        headers,
        body,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`即梦API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // 火山引擎返回格式：{ ResponseMetadata: {...}, Result: { task_id: "...", ... } }
      const taskId = data.Result?.task_id || data.task_id;
      
      return {
        videoUrl: '', // 异步任务，需要轮询获取结果
        operationId: taskId,
        status: 'pending',
        raw: data,
      };
    } catch (error) {
      console.error('[JimengProvider] 视频生成失败:', error);
      throw error instanceof Error ? error : new Error('即梦视频生成失败');
    }
  }
  
  async healthCheck(): Promise<boolean> {
    return !!(this.accessKey && this.secretKey);
  }
}

