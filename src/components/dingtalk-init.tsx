'use client';

import { useEffect } from 'react';

// Declare DingTalk types
declare global {
  interface Window {
    dd?: {
      ready: (callback: () => void) => void;
      error: (callback: (err: unknown) => void) => void;
      biz: {
        util: {
          openLink: (options: {
            url: string;
            onSuccess?: (result: unknown) => void;
            onFail?: (err: unknown) => void;
          }) => void;
        };
      };
    };
  }
}

export function DingTalkInit() {
  useEffect(() => {
    const initDingTalk = () => {
      if (typeof window.dd === 'undefined') {
        alert('当前不在钉钉环境');
        return;
      }

      window.dd.ready(() => {
        console.log('钉钉环境加载完成');

        // Setup friend links click handlers
        document.querySelectorAll('.friend-links').forEach((btn) => {
          (btn as HTMLElement).onclick = () => {
            window.dd?.biz.util.openLink({
              url: 'https://kojfwd.aliwork.com/APP_H3NOAOEJWMGQB1ZT7GPQ/manage/FORM-F8356C0E992F4748A9F13528FF4D00C7KO1I?corpid=ding216d3a4e9fdd44cef5bf40eda33b7ba0&viewUuid=VIEW-6E0F07DEDE4C428FB47FABF66266D48E&dtcode=1da9446dcb8b35668d9d5f6ab4ff9280',
              onSuccess: (result) => {
                console.log('链接打开成功', result);
              },
              onFail: (err) => {
                console.error('链接打开失败', err);
              },
            });
          };
        });
      });

      window.dd.error((err) => {
        console.log('dd error:', err);
      });
    };

    // Wait for DOM and DingTalk SDK to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDingTalk);
    } else {
      initDingTalk();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initDingTalk);
    };
  }, []);

  return null;
}
