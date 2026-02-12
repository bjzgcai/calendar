import type { Metadata } from 'next';
import Script from 'next/script';
import { Inspector } from 'react-dev-inspector';
import { AuthProvider } from '@/contexts/auth-context';
import { DingTalkInit } from '@/components/dingtalk-init';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '中关村学院活动日历',
    template: '%s | 中关村学院',
  },
  description:
    '中关村学院活动日历 - 查看和管理学院各类活动、讲座、竞赛等日程安排。',
  keywords: [
    '中关村学院',
    '活动日历',
    '校园活动',
    '日程管理',
  ],
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    title: '中关村学院活动日历',
    description:
      '查看和管理中关村学院各类活动、讲座、竞赛等日程安排。',
    siteName: '中关村学院活动日历',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: '中关村学院活动日历',
    //   },
    // ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <head>
        <Script
          src="https://g.alicdn.com/dingding/dingtalk-jsapi/2.14.1/dingtalk.open.js"
          strategy="beforeInteractive"
        />
        <script dangerouslySetInnerHTML={{__html: `
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof dd === 'undefined') {
            console.log("当前不在钉钉环境");
            return;
        }

        dd.ready(function () {
            console.log("钉钉环境加载完成");

            document.querySelectorAll('.meeting-form-btn').forEach(btn => {
                btn.onclick = function () {
                    dd.biz.util.openLink({
                        url: "https://kojfwd.aliwork.com/APP_H3NOAOEJWMGQB1ZT7GPQ/manage/FORM-F8356C0E992F4748A9F13528FF4D00C7KO1I?corpid=ding216d3a4e9fdd44cef5bf40eda33b7ba0&viewUuid=VIEW-6E0F07DEDE4C428FB47FABF66266D48E&dtcode=1da9446dcb8b35668d9d5f6ab4ff9280",
                        onSuccess: function(result) {
                            console.log('链接打开成功', result);
                        },
                        onFail: function(err) {
                            console.error('链接打开失败', err);
                        }
                    });
                };
            });
        });

        dd.error(function(err){
            console.log('dd error:', err);
        });
    });
`}} />
      </head>
      {/* @ts-ignore */}
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <DingTalkInit />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
