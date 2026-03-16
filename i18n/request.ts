import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value;
  const locale: Locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Shanghai',
    onError(error) {
      // 仅在开发环境打印缺失 key 警告
      if (process.env.NODE_ENV === 'development') {
        console.warn('[i18n]', error.message);
      }
    },
    getMessageFallback({ namespace, key }) {
      return `${namespace}.${key}`;
    },
  };
});
