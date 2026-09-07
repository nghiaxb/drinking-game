export { CheatRoom } from './CheatRoom'

interface Env {
  CHEAT_ROOM: DurableObjectNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const match = /^\/room\/(.+)$/.exec(url.pathname)
    if (!match) {
      return new Response('not found', { status: 404 })
    }

    const secret = decodeURIComponent(match[1]!)
    if (secret.trim().length === 0) {
      return new Response('bad room', { status: 400 })
    }

    // The secret is the room name and the only credential; wss encrypts it in transit.
    const id = env.CHEAT_ROOM.idFromName(secret)
    return env.CHEAT_ROOM.get(id).fetch(request)
  },
}
