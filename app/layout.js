import './globals.css'

export const metadata = {
  title: 'Minhas Finanças',
  description: 'Controle financeiro pessoal',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Finanças' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
