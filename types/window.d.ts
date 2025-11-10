// Window 对象扩展类型定义
interface Window {
  __CDN_BASE__?: string;
  __STORAGE_MODE__?: 'oss';
  __OSS_CONFIG__?: {
    bucket: string;
    region: string;
  };
}


