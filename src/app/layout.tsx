import type { Metadata } from 'next'
import { Roboto, Black_Han_Sans, Montserrat, Source_Code_Pro } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
})

const blackHanSans = Black_Han_Sans({
  variable: '--font-black-han-sans',
  subsets: ['latin'],
  weight: ['400'],
})

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const sourceCodePro = Source_Code_Pro({
  variable: '--font-source-code-pro',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Sales Analytics Platform',
  description: 'AI-powered sales data analytics with natural language querying',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${blackHanSans.variable} ${montserrat.variable} ${sourceCodePro.variable} font-roboto antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
