import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { AuthProvider } from '@/contexts/auth-context';
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
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
