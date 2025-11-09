declare module 'ali-oss' {
  interface OSSOptions {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    endpoint?: string;
  }

  interface PutObjectOptions {
    contentType?: string;
    [key: string]: any;
  }

  interface GetObjectResult {
    content: Buffer;
    [key: string]: any;
  }

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer | string, options?: PutObjectOptions): Promise<any>;
    get(name: string): Promise<GetObjectResult>;
    delete(name: string): Promise<any>;
    list(options?: any): Promise<any>;
  }

  export = OSS;
}


