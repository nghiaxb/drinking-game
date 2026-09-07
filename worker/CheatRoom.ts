import { parseCheatMessage, parseSocketRole, type SocketRole } from '../src/cheat/cheatProtocol'
import {
  reduceRoom,
  type RoomEffect,
  type RoomEvent,
  type RoomState,
} from '../src/cheat/roomReducer'

const STATE_KEY = 'room'

export class CheatRoom implements DurableObject {
  constructor(private readonly ctx: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const role = parseSocketRole(new URL(request.url).searchParams.get('role'))
    if (!role) {
      return new Response('bad role', { status: 400 })
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

    // Hibernation keeps an idle room free; the tag is how the role survives a hibernate.
    this.ctx.acceptWebSocket(server, [role])
    await this.apply(server, { type: 'connect', role })

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const role = this.roleOf(socket)
    const message = parseCheatMessage(typeof raw === 'string' ? raw : null)
    if (!role || !message) {
      return
    }
    await this.apply(socket, { type: 'message', role, message })
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    const role = this.roleOf(socket)
    if (role) {
      await this.apply(socket, { type: 'disconnect', role })
    }
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.webSocketClose(socket)
  }

  private roleOf(socket: WebSocket): SocketRole | null {
    return parseSocketRole(this.ctx.getTags(socket)[0] ?? null)
  }

  private async load(): Promise<RoomState> {
    const stored = await this.ctx.storage.get<Pick<RoomState, 'armed'>>(STATE_KEY)
    // Presence is counted from live sockets, never restored from storage.
    return { armed: stored?.armed ?? null, gameSocketCount: this.ctx.getWebSockets('game').length }
  }

  private async apply(sender: WebSocket, event: RoomEvent): Promise<void> {
    const current = await this.load()
    const { state, effects } = reduceRoom(current, event)

    if (state.armed !== current.armed) {
      await this.ctx.storage.put(STATE_KEY, { armed: state.armed })
    }

    for (const effect of effects) {
      this.dispatch(sender, effect)
    }
  }

  private dispatch(sender: WebSocket, effect: RoomEffect): void {
    const payload = JSON.stringify(effect.message)
    const targets = effect.to === 'sender' ? [sender] : this.ctx.getWebSockets(effect.to)

    for (const target of targets) {
      try {
        target.send(payload)
      } catch {
        // A socket that died between reduce and dispatch is handled by its own close event.
      }
    }
  }
}
