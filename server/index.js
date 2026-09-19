// ---------------------------------------------------------------------------
// Local development entry point.
//
// Runs alongside the Vite dev server; Vite proxies /api to this process (see
// vite.config.js), so the browser only ever talks to one origin.
// On Vercel this file is not used — api/index.js is the entry point there.
// ---------------------------------------------------------------------------
import 'dotenv/config'
import app from './app.js'
import { connectDB } from './db.js'

const PORT = Number(process.env.PORT) || 3000

try {
  await connectDB()
} catch (error) {
  console.error('❌ Ulanib bo\'lmadi:', error.message)
  process.exit(1)
}

const server = app.listen(PORT, () => {
  console.log(`✅ API tayyor: http://localhost:${PORT}/api`)
})

// Node closes idle keep-alive sockets after 5s by default, which is shorter
// than the Vite proxy keeps them around. When the proxy reuses a socket the
// server is closing at that exact moment, the request dies with ECONNRESET and
// the browser sees a 502. Outliving the proxy's idle window removes the race.
server.keepAliveTimeout = 65_000
server.headersTimeout = 70_000
