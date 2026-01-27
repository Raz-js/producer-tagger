import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Producer Tagger',
  description: 'Mark your beats with your tag without ruining the listening experience',
  icons: {
    icon: [
      {
        url: 'https://static.vecteezy.com/system/resources/thumbnails/026/547/572/small_2x/an-8-bit-retro-styled-pixel-art-illustration-of-a-green-apple-free-png.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: 'https://static.vecteezy.com/system/resources/thumbnails/026/547/572/small_2x/an-8-bit-retro-styled-pixel-art-illustration-of-a-green-apple-free-png.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: 'https://static.vecteezy.com/system/resources/thumbnails/026/547/572/small_2x/an-8-bit-retro-styled-pixel-art-illustration-of-a-green-apple-free-png.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
