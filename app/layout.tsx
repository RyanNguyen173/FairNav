import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'FairNav — Recruitment Reimagined',
  description:
    'FairNav matches your resume to career fair companies, aids your research, and guides your booth route.',
  icons: { icon: '/favicon.svg' },
}

// Runs before hydration so a stored/preferred dark theme applies on first
// paint instead of flashing light first - ThemeContext.tsx can't do this
// itself since its effect only runs client-side, after the initial render.
const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem('fairnav-theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();`

export default function RootLayout({ children }: { children: ReactNode }) {
  // suppressHydrationWarning: THEME_INIT_SCRIPT above intentionally sets
  // class="dark" on <html> before React hydrates, which the server has no
  // way to predict - this is the standard, documented way to tell React
  // that specific, expected mismatch is fine rather than a real bug.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
