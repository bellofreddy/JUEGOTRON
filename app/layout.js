export const metadata = {
  title: 'JUEGOTRON',
  description: 'Cyberpunk Racing Game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  )
}