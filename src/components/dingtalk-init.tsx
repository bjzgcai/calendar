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
    console.log('[DingTalkInit] Component mounted, initializing...');

    const initDingTalk = () => {
      console.log('[DingTalkInit] Running initialization check');
      console.log('[DingTalkInit] window.dd available:', typeof window.dd !== 'undefined');

      if (typeof window.dd === 'undefined') {
        console.warn('[DingTalkInit] DingTalk SDK not available - not in DingTalk environment');
        alert('当前不在钉钉环境');
        return;
      }

      console.log('[DingTalkInit] DingTalk SDK detected, setting up ready callback');

      window.dd.ready(() => {
        console.log('[DingTalkInit] 钉钉环境加载完成');

        // Function to handle friend link clicks
        const handleFriendLinkClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[DingTalkInit] Friend link clicked, opening in DingTalk');

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

        // Setup friend links click handlers for existing elements
        const friendLinks = document.querySelectorAll('.friend-links');
        console.log('[DingTalkInit] Setting up friend links handlers, found:', friendLinks.length);

        friendLinks.forEach((btn) => {
          (btn as HTMLElement).onclick = handleFriendLinkClick;
        });

        // Use event delegation to handle dynamically added friend links
        document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('friend-links')) {
            handleFriendLinkClick(e);
          }
        });

        console.log('[DingTalkInit] Event delegation setup complete');
      });

      window.dd.error((err) => {
        console.error('[DingTalkInit] DingTalk error:', err);
      });
    };

    // Wait for DOM and DingTalk SDK to load
    if (document.readyState === 'loading') {
      console.log('[DingTalkInit] Document still loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', initDingTalk);
    } else {
      console.log('[DingTalkInit] Document already loaded, initializing immediately');
      initDingTalk();
    }

    return () => {
      console.log('[DingTalkInit] Component unmounting, cleaning up');
      document.removeEventListener('DOMContentLoaded', initDingTalk);
    };
  }, []);

  return null;
}
