import './globals.css'
import { Inter } from 'next/font/google'
import ClientLayout from '@/components/ClientLayout'
import NextAuthProvider from '@/components/NextAuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'pickleglass - AI Assistant',
  description: 'Personalized AI Assistant for various contexts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </NextAuthProvider>
      </body>
    </html>
  )
} 