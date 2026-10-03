import type { Metadata, Viewport } from 'next';
import { Dancing_Script } from 'next/font/google';
import './globals.css';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
  variable: '--font-script',
});

export const metadata: Metadata = {
  title: 'Chiranjeeb Dash — Portfolio',
  description: 'MERN stack developer & AI agent builder portfolio based in Bhubaneswar.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dancingScript.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,700&family=Manrope:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Source+Sans+3:wght@400;600;700&family=Merriweather:wght@400;700&family=EB+Garamond:wght@400;500;600&family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700;800&family=Orbitron:wght@700;900&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

