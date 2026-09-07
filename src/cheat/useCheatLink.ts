import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import { parseCheatMessage, type CheatMessage, type SocketRole } from './cheatProtocol'
import type { ArmedCheat, WheelLabel } from './cheatTypes'

export const CHEAT_RECONNECT_DELAY_MS = 2_000

export interface CheatSocket {
  send(data: string): void
  close(): void
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    handler: (event: { data?: unknown }) => void,
  ): void
}

export interface CheatLinkOptions {
  url: string
  role: SocketRole
  createSocket?: (url: string) => CheatSocket
  reconnectDelayMs?: number
  scheduleReconnect?: (run: () => void, delayMs: number) => void
}

export interface CheatLink {
  armed: DeepReadonly<Ref<ArmedCheat | null>>
  wheelItems: DeepReadonly<Ref<readonly WheelLabel[]>>
  gameOnline: DeepReadonly<Ref<boolean>>
  connected: DeepReadonly<Ref<boolean>>
  arm: (armed: ArmedCheat) => void
  disarm: () => void
  consume: () => void
  publishWheel: (items: readonly WheelLabel[]) => void
  close: () => void
}

export function buildCheatSocketUrl(baseUrl: string, secret: string, role: SocketRole): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/room/${encodeURIComponent(secret)}?role=${role}`
}

function defaultCreateSocket(url: string): CheatSocket {
  return new WebSocket(url) as unknown as CheatSocket
}

function defaultSchedule(run: () => void, delayMs: number): void {
  globalThis.setTimeout(run, delayMs)
}

export function createCheatLink(options: CheatLinkOptions): CheatLink {
  const createSocket = options.createSocket ?? defaultCreateSocket
  const schedule = options.scheduleReconnect ?? defaultSchedule
  const delayMs = options.reconnectDelayMs ?? CHEAT_RECONNECT_DELAY_MS

  const armed = ref<ArmedCheat | null>(null)
  const wheelItems = ref<WheelLabel[]>([])
  const gameOnline = ref(false)
  const connected = ref(false)
  let socket: CheatSocket | null = null
  let closedOnPurpose = false

  function send(message: CheatMessage): void {
    if (!socket || !connected.value) {
      return
    }
    try {
      socket.send(JSON.stringify(message))
    } catch {
      // A dead socket must never surface as a gameplay error; the reconnect below covers it.
    }
  }

  function onMessage(event: { data?: unknown }): void {
    const message = parseCheatMessage(event.data)
    if (!message) {
      return
    }

    if (message.t === 'arm') {
      const { t: _t, ...next } = message
      armed.value = next
      return
    }
    if (message.t === 'disarm') {
      armed.value = null
      return
    }
    if (message.t === 'wheel') {
      wheelItems.value = message.items
      return
    }
    if (message.t === 'state') {
      gameOnline.value = message.gameOnline
      armed.value = message.armed
    }
  }

  function connect(): void {
    socket = createSocket(options.url)
    socket.addEventListener('open', () => {
      connected.value = true
    })
    socket.addEventListener('message', onMessage)
    socket.addEventListener('close', () => {
      connected.value = false
      if (!closedOnPurpose) {
        schedule(connect, delayMs)
      }
    })
    socket.addEventListener('error', () => {
      connected.value = false
    })
  }

  connect()

  return {
    armed: readonly(armed),
    wheelItems: readonly(wheelItems),
    gameOnline: readonly(gameOnline),
    connected: readonly(connected),
    arm(next) {
      send({ t: 'arm', ...next })
    },
    disarm() {
      send({ t: 'disarm' })
    },
    consume() {
      // Clear locally first: the press already happened and must not fire twice if the socket lags.
      armed.value = null
      send({ t: 'consumed' })
    },
    publishWheel(items) {
      send({ t: 'wheel', items: [...items] })
    },
    close() {
      closedOnPurpose = true
      connected.value = false
      socket?.close()
      socket = null
    },
  }
}
