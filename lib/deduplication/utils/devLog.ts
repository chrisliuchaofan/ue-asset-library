/** 仅在开发环境输出的日志，生产构建中不输出 */
const isDev = process.env.NODE_ENV !== 'production';

export const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: unknown[]) => {
  if (isDev) console.error(...args);
};
