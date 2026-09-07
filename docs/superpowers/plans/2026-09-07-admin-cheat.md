# Admin cheat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Từ điện thoại thứ hai, gài trước để lần ấn tiếp theo ở game Răng cá sấu / Bắt ếch chắc chắn thua hoặc chắc chắn thoát.

**Architecture:** Cloudflare Worker định tuyến `wss://` vào một Durable Object mỗi phòng (phòng = secret). Toàn bộ state machine của phòng là hàm pure nằm trong `src/cheat/roomReducer.ts`, Worker chỉ đọc effect rồi đẩy ra socket thật. Client mở socket **chỉ khi máy đó đã cài secret**, ghi vào một `ref` đồng bộ; hai hàm pure `pressTooth` / `pressCell` nhận cờ qua **tham số optional**.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript strict, Vitest, Cloudflare Workers + Durable Objects (WebSocket Hibernation), `WebSocket` API sẵn của browser — **không thêm dependency runtime nào**.

**Spec:** [docs/superpowers/specs/2026-09-07-admin-cheat-design.md](../specs/2026-09-07-admin-cheat-design.md)

## Global Constraints

- **Không thêm dependency runtime.** Chỉ được thêm devDependency (`wrangler`, `@cloudflare/workers-types`). `audit:build` phải tiếp tục pass.
- **`forced` bỏ trống ⇒ hành vi y hệt hiện tại.** Mọi call site cũ gọi `pressTooth(state, index)` / `pressCell(state, index)` không đổi.
- **Nhánh `ignored` chạy trước `forced`.** Ấn không hợp lệ / ấn lại ô cũ / game đã kết thúc **không** tiêu thụ bẫy.
- **`mineIndices.length` luôn bằng `mineCount`** sau mọi nhánh.
- **Đường đi của cú ấn không `await` gì thêm.** Cờ đọc từ `ref` đồng bộ. Mốc phải giữ: 8 lần ấn liên tiếp ở game ếch **≤ 100ms** (số đo hiện tại: 44ms).
- **Mất mạng / chưa cài secret ⇒ game chạy y hệt hôm nay.**
- Test hiện có: **420 unit + 56 e2e phải tiếp tục pass.**
- Comment tiếng Anh, giải thích **WHY**, 1–2 dòng. Commit message **một dòng**.
- Prettier + ESLint sạch: `npm run lint`, `npm run type-check`.

## File Structure

| File                            | Trách nhiệm                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `src/cheat/cheatTypes.ts`       | Kiểu chung: `CheatGameId`, `ForcedOutcome`, `ArmedCheat`. Không logic                   |
| `src/cheat/cheatProtocol.ts`    | Kiểu message + `parseCheatMessage` phòng thủ. Pure                                      |
| `src/cheat/roomReducer.ts`      | State machine của phòng. Pure. **Worker import file này**                               |
| `src/cheat/cheatSecret.ts`      | Đọc/ghi secret + vai máy qua `AppStorage`                                               |
| `src/cheat/useCheatLink.ts`     | Vòng đời WebSocket → `ref` phản ứng. Socket factory inject được                         |
| `src/cheat/cheatArm.ts`         | Cầu nối đồng bộ giữa cờ và hàm pure. Pure                                               |
| `src/cheat/useCheatGameLink.ts` | Composable phía máy chơi: mở link chỉ khi vai là `game`                                 |
| `src/app/views/CheatView.vue`   | Trang `/x`                                                                              |
| `worker/index.ts`               | Worker fetch handler, upgrade WebSocket                                                 |
| `worker/CheatRoom.ts`           | Durable Object. Áp effect của reducer lên socket thật                                   |
| `tsconfig.worker.json`          | Project riêng cho `worker/` (ESLint `projectService` đòi mọi file TS thuộc một project) |
| `wrangler.toml`                 | Cấu hình deploy Worker                                                                  |

`roomReducer.ts` nằm trong `src/` **có chủ ý**: `vitest.config.ts` chỉ include `src/**/*.spec.ts`, nên đặt ở đây là test được bằng runner hiện có mà không phải sửa config, và app với worker dùng chung một định nghĩa.

---

### Task 1: Cờ forced cho game Răng cá sấu

**Files:**

- Create: `src/cheat/cheatTypes.ts`
- Modify: `src/games/crocodile/logic/crocodileGame.ts:53-77`
- Test: `src/games/crocodile/logic/crocodileGame.spec.ts`

**Interfaces:**

- Consumes: `CrocodileGameState`, `PressToothResult`, `RandomSource`, `clampTrapIndex`, `isValidToothIndex`, `isTerminal` — đều đã có trong `crocodileGame.ts`
- Produces:
  - `src/cheat/cheatTypes.ts` → `export type CheatGameId = 'crocodile' | 'mine'`, `export type ForcedOutcome = 'lose' | 'win'`, `export interface ArmedCheat { game: CheatGameId; outcome: ForcedOutcome }`
  - `pressTooth(state: CrocodileGameState, toothIndex: number, forced?: ForcedOutcome, rng?: RandomSource): PressToothResult`

- [ ] **Step 1: Tạo file kiểu chung**

`src/cheat/cheatTypes.ts`:

```ts
export type CheatGameId = 'crocodile' | 'mine'

export type ForcedOutcome = 'lose' | 'win'

export interface ArmedCheat {
  game: CheatGameId
  outcome: ForcedOutcome
}
```

- [ ] **Step 2: Viết test thất bại**

Thêm vào `describe('pressTooth', ...)` trong `src/games/crocodile/logic/crocodileGame.spec.ts`:

```ts
describe('forced outcomes', () => {
  it('makes the pressed tooth the trap when forced to lose', () => {
    const initial = { ...createInitialState(() => 0), trapIndex: 9 }
    const result = pressTooth(initial, 3, 'lose')

    expect(result.outcome).toBe('trap')
    expect(result.state.phase).toBe('bitten')
    expect(result.state.trapIndex).toBe(3)
    expect(result.state.pressedIndices).toEqual([3])
  })

  it('relocates the trap to an unpressed tooth when forced to win on it', () => {
    const initial = { ...createInitialState(() => 0), trapIndex: 0, pressedIndices: [5] }
    const result = pressTooth(initial, 0, 'win', () => 0)

    expect(result.outcome).toBe('safe')
    expect(result.state.phase).toBe('playing')
    expect(result.state.trapIndex).not.toBe(0)
    expect(result.state.pressedIndices).not.toContain(result.state.trapIndex)
  })

  it('leaves a safe tooth untouched when forced to win off the trap', () => {
    const initial = { ...createInitialState(() => 0), trapIndex: 7 }
    const result = pressTooth(initial, 2, 'win', () => 0)

    expect(result.outcome).toBe('safe')
    expect(result.state.trapIndex).toBe(7)
  })

  it('cannot rescue when every other tooth is already pressed', () => {
    const pressedIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    const initial = { ...createInitialState(() => 0), trapIndex: 0, pressedIndices }
    const result = pressTooth(initial, 0, 'win', () => 0)

    expect(result.outcome).toBe('trap')
    expect(result.state.phase).toBe('bitten')
  })

  it('does not consume the arm on an ignored press', () => {
    const initial = { ...createInitialState(() => 0), trapIndex: 4, pressedIndices: [2] }

    expect(pressTooth(initial, 2, 'lose').outcome).toBe('ignored')
    expect(pressTooth(initial, 99, 'lose').outcome).toBe('ignored')
    expect(pressTooth({ ...initial, phase: 'bitten' }, 5, 'lose').outcome).toBe('ignored')
  })

  it('behaves exactly as before when no outcome is forced', () => {
    const initial = { ...createInitialState(() => 0), trapIndex: 4 }

    expect(pressTooth(initial, 4)).toEqual(pressTooth(initial, 4, undefined))
    expect(pressTooth(initial, 1)).toEqual(pressTooth(initial, 1, undefined))
    expect(pressTooth(initial, 4).outcome).toBe('trap')
    expect(pressTooth(initial, 1).outcome).toBe('safe')
  })
})
```

- [ ] **Step 3: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/games/crocodile/logic/crocodileGame.spec.ts`
Expected: FAIL — `pressTooth` chưa nhận tham số thứ 3, forced lose trả `'safe'` thay vì `'trap'`.

- [ ] **Step 4: Implement**

Trong `src/games/crocodile/logic/crocodileGame.ts`, thêm import và helper, rồi thay `pressTooth`:

```ts
import type { ForcedOutcome } from '@/cheat/cheatTypes'
```

```ts
/** Uniform pick among teeth that are neither pressed nor the excluded one; null when none exist. */
function pickTrapRelocation(
  state: CrocodileGameState,
  excludedIndex: number,
  rng: RandomSource,
): number | null {
  const candidates: number[] = []
  for (let index = 0; index < state.toothCount; index += 1) {
    if (index !== excludedIndex && !state.pressedIndices.includes(index)) {
      candidates.push(index)
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // clampTrapIndex also absorbs a non-finite rng, which the rest of this module guards against too.
  const pick = clampTrapIndex(Math.floor(rng() * candidates.length), candidates.length)
  return candidates[pick] ?? null
}

export function pressTooth(
  state: CrocodileGameState,
  toothIndex: number,
  forced?: ForcedOutcome,
  rng: RandomSource = Math.random,
): PressToothResult {
  if (!isValidToothIndex(toothIndex, state.toothCount)) {
    return { state, outcome: 'ignored' }
  }

  if (isTerminal(state) || state.pressedIndices.includes(toothIndex)) {
    return { state, outcome: 'ignored' }
  }

  const pressedIndices = [...state.pressedIndices, toothIndex]

  if (forced === 'lose') {
    return {
      state: { ...state, phase: 'bitten', trapIndex: toothIndex, pressedIndices },
      outcome: 'trap',
    }
  }

  if (forced === 'win' && toothIndex === state.trapIndex) {
    const relocated = pickTrapRelocation(state, toothIndex, rng)
    if (relocated !== null) {
      return { state: { ...state, trapIndex: relocated, pressedIndices }, outcome: 'safe' }
    }
  }

  if (toothIndex === state.trapIndex) {
    return { state: { ...state, phase: 'bitten', pressedIndices }, outcome: 'trap' }
  }

  return { state: { ...state, pressedIndices }, outcome: 'safe' }
}
```

- [ ] **Step 5: Chạy test cho chắc là PASS**

Run: `npx vitest run src/games/crocodile/ && npm run type-check && npm run lint`
Expected: PASS, không lỗi type, không lỗi lint.

- [ ] **Step 6: Commit**

```bash
git add src/cheat/cheatTypes.ts src/games/crocodile/logic/crocodileGame.ts src/games/crocodile/logic/crocodileGame.spec.ts
git commit -m "feat: let the crocodile trap be forced onto or away from the pressed tooth"
```

---

### Task 2: Cờ forced cho game Bắt ếch

**Files:**

- Modify: `src/games/mine/logic/mineGame.ts:122-152`
- Test: `src/games/mine/logic/mineGame.spec.ts`

**Interfaces:**

- Consumes: `ForcedOutcome` từ `src/cheat/cheatTypes.ts` (Task 1); `MineGameState`, `PressCellResult`, `RandomSource`, `normalizeGridSize`, `normalizeRngValue`, `isValidCellIndex`, `isTerminal` — đã có trong `mineGame.ts`
- Produces: `pressCell(state: MineGameState, cellIndex: number, forced?: ForcedOutcome, rng?: RandomSource): PressCellResult`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `describe('pressCell', ...)` trong `src/games/mine/logic/mineGame.spec.ts`:

```ts
describe('forced outcomes', () => {
  function playingState(overrides: Partial<MineGameState> = {}): MineGameState {
    return {
      phase: 'playing',
      gridSize: 5,
      mineCount: 1,
      mineIndices: [20],
      revealedIndices: [],
      hitMineIndex: null,
      ...overrides,
    }
  }

  it('swaps a mine onto the pressed cell when forced to lose', () => {
    const result = pressCell(playingState(), 3, 'lose')

    expect(result.outcome).toBe('mine')
    expect(result.state.phase).toBe('exploded')
    expect(result.state.hitMineIndex).toBe(3)
    expect(result.state.mineIndices).toContain(3)
    expect(result.state.mineIndices).toHaveLength(result.state.mineCount)
  })

  it('keeps mine count intact when forced to lose on a cell that is already a mine', () => {
    const result = pressCell(playingState(), 20, 'lose')

    expect(result.outcome).toBe('mine')
    expect(result.state.hitMineIndex).toBe(20)
    expect(result.state.mineIndices).toEqual([20])
    expect(new Set(result.state.mineIndices).size).toBe(result.state.mineIndices.length)
    expect(result.state.mineIndices).toHaveLength(result.state.mineCount)
  })

  it('keeps mine count intact with three mines when forced to lose', () => {
    const state = playingState({ mineCount: 3, mineIndices: [5, 12, 20] })
    const result = pressCell(state, 7, 'lose')

    expect(result.state.mineIndices).toContain(7)
    expect(result.state.mineIndices).toHaveLength(3)
    expect(new Set(result.state.mineIndices).size).toBe(3)
  })

  it('relocates the mine when forced to win on it', () => {
    const result = pressCell(playingState(), 20, 'win', () => 0)

    expect(result.outcome).toBe('safe')
    expect(result.state.phase).toBe('playing')
    expect(result.state.mineIndices).not.toContain(20)
    expect(result.state.mineIndices).toHaveLength(1)
    expect(result.state.revealedIndices).toEqual([20])
  })

  it('leaves a safe cell untouched when forced to win off a mine', () => {
    const result = pressCell(playingState(), 4, 'win', () => 0)

    expect(result.outcome).toBe('safe')
    expect(result.state.mineIndices).toEqual([20])
  })

  it('cannot rescue when no free cell is left to hide the mine', () => {
    const revealedIndices = Array.from({ length: 25 }, (_, index) => index).filter(
      (index) => index !== 20,
    )
    const result = pressCell(playingState({ revealedIndices }), 20, 'win', () => 0)

    expect(result.outcome).toBe('mine')
    expect(result.state.phase).toBe('exploded')
  })

  it('does not consume the arm on an ignored press', () => {
    const state = playingState({ revealedIndices: [1] })

    expect(pressCell(state, 1, 'lose').outcome).toBe('ignored')
    expect(pressCell(state, 99, 'lose').outcome).toBe('ignored')
    expect(pressCell({ ...state, phase: 'exploded' }, 2, 'lose').outcome).toBe('ignored')
  })

  it('behaves exactly as before when no outcome is forced', () => {
    const state = playingState()

    expect(pressCell(state, 20)).toEqual(pressCell(state, 20, undefined))
    expect(pressCell(state, 3)).toEqual(pressCell(state, 3, undefined))
    expect(pressCell(state, 20).outcome).toBe('mine')
    expect(pressCell(state, 3).outcome).toBe('safe')
  })
})
```

Thêm `MineGameState` vào import type ở đầu file nếu chưa có:

```ts
import type { MineGameState } from '../types'
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/games/mine/logic/mineGame.spec.ts`
Expected: FAIL — forced lose trả `'safe'`.

- [ ] **Step 3: Implement**

Trong `src/games/mine/logic/mineGame.ts`, thêm import, helper, rồi thay `pressCell`:

```ts
import type { ForcedOutcome } from '@/cheat/cheatTypes'
```

```ts
/** Uniform pick among cells that are unrevealed, not a mine, and not the excluded one. */
function pickMineRelocation(
  state: MineGameState,
  excludedIndex: number,
  rng: RandomSource,
): number | null {
  const cellCount = normalizeGridSize(state.gridSize) ** 2
  const revealed = new Set(state.revealedIndices)
  const mines = new Set(state.mineIndices)
  const candidates: number[] = []

  for (let index = 0; index < cellCount; index += 1) {
    if (index !== excludedIndex && !revealed.has(index) && !mines.has(index)) {
      candidates.push(index)
    }
  }

  if (candidates.length === 0) {
    return null
  }

  const pick = Math.floor(normalizeRngValue(rng()) * candidates.length)
  return candidates[Math.min(candidates.length - 1, pick)] ?? null
}

export function pressCell(
  state: MineGameState,
  cellIndex: number,
  forced?: ForcedOutcome,
  rng: RandomSource = Math.random,
): PressCellResult {
  if (!isValidCellIndex(cellIndex, state.gridSize)) {
    return { state, outcome: 'ignored' }
  }

  if (isTerminal(state) || state.revealedIndices.includes(cellIndex)) {
    return { state, outcome: 'ignored' }
  }

  const revealedIndices = [...state.revealedIndices, cellIndex]
  const isMine = state.mineIndices.includes(cellIndex)

  if (forced === 'lose' && !isMine) {
    /*
     * Swap rather than append: computeNextRisk and the "đã bắt x/24" counter both read
     * mineIndices, so a changed length would visibly shift the odds in front of the table.
     */
    const [, ...rest] = state.mineIndices
    return {
      state: {
        ...state,
        phase: 'exploded',
        mineIndices: [...rest, cellIndex],
        revealedIndices,
        hitMineIndex: cellIndex,
      },
      outcome: 'mine',
    }
  }

  if (forced === 'win' && isMine) {
    const relocated = pickMineRelocation(state, cellIndex, rng)
    if (relocated !== null) {
      return {
        state: {
          ...state,
          mineIndices: state.mineIndices.map((index) => (index === cellIndex ? relocated : index)),
          revealedIndices,
        },
        outcome: 'safe',
      }
    }
  }

  if (isMine) {
    return {
      state: { ...state, phase: 'exploded', revealedIndices, hitMineIndex: cellIndex },
      outcome: 'mine',
    }
  }

  return { state: { ...state, revealedIndices }, outcome: 'safe' }
}
```

- [ ] **Step 4: Chạy test cho chắc là PASS**

Run: `npx vitest run src/games/mine/ && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/mine/logic/mineGame.ts src/games/mine/logic/mineGame.spec.ts
git commit -m "feat: let a frog be forced into or out of the pressed cell"
```

---

### Task 3: Giao thức message

**Files:**

- Create: `src/cheat/cheatProtocol.ts`
- Test: `src/cheat/cheatProtocol.spec.ts`

**Interfaces:**

- Consumes: `ArmedCheat`, `CheatGameId`, `ForcedOutcome` từ `src/cheat/cheatTypes.ts` (Task 1)
- Produces:
  - `export type SocketRole = 'game' | 'admin'`
  - `export type CheatMessage = { t: 'arm'; game: CheatGameId; outcome: ForcedOutcome } | { t: 'disarm' } | { t: 'consumed' } | { t: 'state'; gameOnline: boolean; armed: ArmedCheat | null }`
  - `export function parseCheatMessage(raw: unknown): CheatMessage | null`
  - `export function parseSocketRole(raw: string | null): SocketRole | null`

- [ ] **Step 1: Viết test thất bại**

`src/cheat/cheatProtocol.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseCheatMessage, parseSocketRole } from './cheatProtocol'

describe('parseCheatMessage', () => {
  it('parses every valid message shape', () => {
    expect(parseCheatMessage('{"t":"arm","game":"crocodile","outcome":"lose"}')).toEqual({
      t: 'arm',
      game: 'crocodile',
      outcome: 'lose',
    })
    expect(parseCheatMessage('{"t":"disarm"}')).toEqual({ t: 'disarm' })
    expect(parseCheatMessage('{"t":"consumed"}')).toEqual({ t: 'consumed' })
    expect(
      parseCheatMessage('{"t":"state","gameOnline":true,"armed":{"game":"mine","outcome":"win"}}'),
    ).toEqual({ t: 'state', gameOnline: true, armed: { game: 'mine', outcome: 'win' } })
    expect(parseCheatMessage('{"t":"state","gameOnline":false,"armed":null}')).toEqual({
      t: 'state',
      gameOnline: false,
      armed: null,
    })
  })

  it('returns null for anything malformed instead of throwing', () => {
    const bad = [
      '',
      'not json',
      '{',
      '[]',
      'null',
      '123',
      '{"t":"nope"}',
      '{"t":"arm"}',
      '{"t":"arm","game":"wheel","outcome":"lose"}',
      '{"t":"arm","game":"mine","outcome":"maybe"}',
      '{"t":"state","gameOnline":"yes","armed":null}',
      '{"t":"state","gameOnline":true}',
      '{"t":"state","gameOnline":true,"armed":{"game":"mine"}}',
      42,
      null,
      undefined,
      {},
    ]

    for (const raw of bad) {
      expect(parseCheatMessage(raw)).toBeNull()
    }
  })
})

describe('parseSocketRole', () => {
  it('accepts the two known roles and rejects everything else', () => {
    expect(parseSocketRole('game')).toBe('game')
    expect(parseSocketRole('admin')).toBe('admin')
    expect(parseSocketRole('Game')).toBeNull()
    expect(parseSocketRole('')).toBeNull()
    expect(parseSocketRole(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/cheat/cheatProtocol.spec.ts`
Expected: FAIL — không resolve được `./cheatProtocol`.

- [ ] **Step 3: Implement**

`src/cheat/cheatProtocol.ts`:

```ts
import type { ArmedCheat, CheatGameId, ForcedOutcome } from './cheatTypes'

export type SocketRole = 'game' | 'admin'

export type CheatMessage =
  | { t: 'arm'; game: CheatGameId; outcome: ForcedOutcome }
  | { t: 'disarm' }
  | { t: 'consumed' }
  | { t: 'state'; gameOnline: boolean; armed: ArmedCheat | null }

const GAME_IDS: readonly string[] = ['crocodile', 'mine']
const OUTCOMES: readonly string[] = ['lose', 'win']

export function parseSocketRole(raw: string | null): SocketRole | null {
  return raw === 'game' || raw === 'admin' ? raw : null
}

function parseArmed(raw: unknown): ArmedCheat | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }
  const { game, outcome } = raw as Record<string, unknown>
  if (typeof game !== 'string' || !GAME_IDS.includes(game)) {
    return null
  }
  if (typeof outcome !== 'string' || !OUTCOMES.includes(outcome)) {
    return null
  }
  return { game: game as CheatGameId, outcome: outcome as ForcedOutcome }
}

/** Every socket frame is untrusted input; a bad frame is dropped, never thrown. */
export function parseCheatMessage(raw: unknown): CheatMessage | null {
  if (typeof raw !== 'string') {
    return null
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return null
  }

  const payload = decoded as Record<string, unknown>

  if (payload.t === 'disarm' || payload.t === 'consumed') {
    return { t: payload.t }
  }

  if (payload.t === 'arm') {
    const armed = parseArmed(payload)
    return armed ? { t: 'arm', ...armed } : null
  }

  if (payload.t === 'state') {
    if (typeof payload.gameOnline !== 'boolean' || !('armed' in payload)) {
      return null
    }
    if (payload.armed === null) {
      return { t: 'state', gameOnline: payload.gameOnline, armed: null }
    }
    const armed = parseArmed(payload.armed)
    return armed ? { t: 'state', gameOnline: payload.gameOnline, armed } : null
  }

  return null
}
```

- [ ] **Step 4: Chạy test cho chắc là PASS**

Run: `npx vitest run src/cheat/ && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cheat/cheatProtocol.ts src/cheat/cheatProtocol.spec.ts
git commit -m "feat: add the cheat socket protocol with defensive parsing"
```

---

### Task 4: State machine của phòng

**Files:**

- Create: `src/cheat/roomReducer.ts`
- Test: `src/cheat/roomReducer.spec.ts`

**Interfaces:**

- Consumes: `CheatMessage`, `SocketRole` từ `src/cheat/cheatProtocol.ts` (Task 3); `ArmedCheat` từ `cheatTypes.ts`
- Produces:
  - `export interface RoomState { armed: ArmedCheat | null; gameSocketCount: number }`
  - `export type RoomEvent = { type: 'connect'; role: SocketRole } | { type: 'disconnect'; role: SocketRole } | { type: 'message'; role: SocketRole; message: CheatMessage }`
  - `export interface RoomEffect { to: 'game' | 'admin' | 'sender'; message: CheatMessage }`
  - `export interface RoomTransition { state: RoomState; effects: readonly RoomEffect[] }`
  - `export const INITIAL_ROOM_STATE: RoomState`
  - `export function reduceRoom(state: RoomState, event: RoomEvent): RoomTransition`

- [ ] **Step 1: Viết test thất bại**

`src/cheat/roomReducer.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { INITIAL_ROOM_STATE, reduceRoom } from './roomReducer'
import type { RoomState } from './roomReducer'

const ARMED = { game: 'crocodile', outcome: 'lose' } as const

describe('reduceRoom', () => {
  it('starts with nothing armed and no game device', () => {
    expect(INITIAL_ROOM_STATE).toEqual({ armed: null, gameSocketCount: 0 })
  })

  it('stores an arm from admin and pushes it to the game device', () => {
    const result = reduceRoom(
      { armed: null, gameSocketCount: 1 },
      {
        type: 'message',
        role: 'admin',
        message: { t: 'arm', ...ARMED },
      },
    )

    expect(result.state.armed).toEqual(ARMED)
    expect(result.effects).toEqual([
      { to: 'game', message: { t: 'arm', ...ARMED } },
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: ARMED } },
    ])
  })

  it('replays a pending arm to a game device that connects later', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 0 },
      {
        type: 'connect',
        role: 'game',
      },
    )

    expect(result.state.gameSocketCount).toBe(1)
    expect(result.effects).toEqual([
      { to: 'sender', message: { t: 'arm', ...ARMED } },
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: ARMED } },
    ])
  })

  it('sends only presence to a game device when nothing is armed', () => {
    const result = reduceRoom(INITIAL_ROOM_STATE, { type: 'connect', role: 'game' })

    expect(result.effects).toEqual([
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: null } },
    ])
  })

  it('greets a connecting admin with current state', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      {
        type: 'connect',
        role: 'admin',
      },
    )

    expect(result.state).toEqual({ armed: ARMED, gameSocketCount: 1 })
    expect(result.effects).toEqual([
      { to: 'sender', message: { t: 'state', gameOnline: true, armed: ARMED } },
    ])
  })

  it('clears the arm on disarm and tells both sides', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      {
        type: 'message',
        role: 'admin',
        message: { t: 'disarm' },
      },
    )

    expect(result.state.armed).toBeNull()
    expect(result.effects).toEqual([
      { to: 'game', message: { t: 'disarm' } },
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: null } },
    ])
  })

  it('clears the arm when the game device reports it was consumed', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      {
        type: 'message',
        role: 'game',
        message: { t: 'consumed' },
      },
    )

    expect(result.state.armed).toBeNull()
    expect(result.effects).toEqual([
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: null } },
    ])
  })

  it('ignores messages coming from the wrong role', () => {
    const armedState: RoomState = { armed: null, gameSocketCount: 1 }

    const armFromGame = reduceRoom(armedState, {
      type: 'message',
      role: 'game',
      message: { t: 'arm', ...ARMED },
    })
    expect(armFromGame.state).toEqual(armedState)
    expect(armFromGame.effects).toEqual([])

    const consumedFromAdmin = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      {
        type: 'message',
        role: 'admin',
        message: { t: 'consumed' },
      },
    )
    expect(consumedFromAdmin.state.armed).toEqual(ARMED)
    expect(consumedFromAdmin.effects).toEqual([])
  })

  it('ignores a state frame sent by a client', () => {
    const result = reduceRoom(
      { armed: null, gameSocketCount: 1 },
      {
        type: 'message',
        role: 'admin',
        message: { t: 'state', gameOnline: false, armed: null },
      },
    )

    expect(result.effects).toEqual([])
  })

  it('drops presence when the game device disconnects', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      {
        type: 'disconnect',
        role: 'game',
      },
    )

    expect(result.state).toEqual({ armed: ARMED, gameSocketCount: 0 })
    expect(result.effects).toEqual([
      { to: 'admin', message: { t: 'state', gameOnline: false, armed: ARMED } },
    ])
  })

  it('never lets the game socket count go negative', () => {
    const result = reduceRoom(INITIAL_ROOM_STATE, { type: 'disconnect', role: 'game' })

    expect(result.state.gameSocketCount).toBe(0)
  })

  it('emits nothing when an admin disconnects', () => {
    const result = reduceRoom(
      { armed: null, gameSocketCount: 1 },
      {
        type: 'disconnect',
        role: 'admin',
      },
    )

    expect(result.effects).toEqual([])
  })
})
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/cheat/roomReducer.spec.ts`
Expected: FAIL — không resolve được `./roomReducer`.

- [ ] **Step 3: Implement**

`src/cheat/roomReducer.ts`:

```ts
import type { CheatMessage, SocketRole } from './cheatProtocol'
import type { ArmedCheat } from './cheatTypes'

export interface RoomState {
  armed: ArmedCheat | null
  gameSocketCount: number
}

export type RoomEvent =
  | { type: 'connect'; role: SocketRole }
  | { type: 'disconnect'; role: SocketRole }
  | { type: 'message'; role: SocketRole; message: CheatMessage }

export interface RoomEffect {
  to: 'game' | 'admin' | 'sender'
  message: CheatMessage
}

export interface RoomTransition {
  state: RoomState
  effects: readonly RoomEffect[]
}

export const INITIAL_ROOM_STATE: RoomState = { armed: null, gameSocketCount: 0 }

function stateFrame(state: RoomState): CheatMessage {
  return { t: 'state', gameOnline: state.gameSocketCount > 0, armed: state.armed }
}

/*
 * The room, not the phone, owns `armed`. That is what lets the game device reload mid-party and
 * still receive the pending trap, and what keeps the admin screen showing the truth.
 */
export function reduceRoom(state: RoomState, event: RoomEvent): RoomTransition {
  if (event.type === 'connect') {
    if (event.role === 'admin') {
      return { state, effects: [{ to: 'sender', message: stateFrame(state) }] }
    }

    const next: RoomState = { ...state, gameSocketCount: state.gameSocketCount + 1 }
    const effects: RoomEffect[] = []
    if (next.armed) {
      effects.push({ to: 'sender', message: { t: 'arm', ...next.armed } })
    }
    effects.push({ to: 'admin', message: stateFrame(next) })
    return { state: next, effects }
  }

  if (event.type === 'disconnect') {
    if (event.role === 'admin') {
      return { state, effects: [] }
    }

    const next: RoomState = {
      ...state,
      gameSocketCount: Math.max(0, state.gameSocketCount - 1),
    }
    return { state: next, effects: [{ to: 'admin', message: stateFrame(next) }] }
  }

  const { message, role } = event

  if (message.t === 'arm' && role === 'admin') {
    const next: RoomState = { ...state, armed: { game: message.game, outcome: message.outcome } }
    return {
      state: next,
      effects: [
        { to: 'game', message: { t: 'arm', game: message.game, outcome: message.outcome } },
        { to: 'admin', message: stateFrame(next) },
      ],
    }
  }

  if (message.t === 'disarm' && role === 'admin') {
    const next: RoomState = { ...state, armed: null }
    return {
      state: next,
      effects: [
        { to: 'game', message: { t: 'disarm' } },
        { to: 'admin', message: stateFrame(next) },
      ],
    }
  }

  if (message.t === 'consumed' && role === 'game') {
    const next: RoomState = { ...state, armed: null }
    return { state: next, effects: [{ to: 'admin', message: stateFrame(next) }] }
  }

  return { state, effects: [] }
}
```

- [ ] **Step 4: Chạy test cho chắc là PASS**

Run: `npx vitest run src/cheat/ && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cheat/roomReducer.ts src/cheat/roomReducer.spec.ts
git commit -m "feat: add the cheat room state machine as a pure reducer"
```

---

### Task 5: Lưu secret và vai của máy

**Files:**

- Create: `src/cheat/cheatSecret.ts`
- Test: `src/cheat/cheatSecret.spec.ts`

**Interfaces:**

- Consumes: `AppStorage` từ `src/services/storage.ts` (đã có: `get<T>(key, fallback)`, `set<T>(key, value)`, `remove(key)`); `SocketRole` từ `cheatProtocol.ts` (Task 3)
- Produces:
  - `export const CHEAT_STORAGE_KEY = 'cheat'`
  - `export interface CheatConfig { secret: string; role: SocketRole }`
  - `export function normalizeCheatConfig(raw: unknown): CheatConfig | null`
  - `export function createCheatSecretStore(storage?: AppStorage): { load: () => Promise<CheatConfig | null>; save: (config: CheatConfig) => Promise<boolean>; clear: () => Promise<boolean> }`

- [ ] **Step 1: Viết test thất bại**

`src/cheat/cheatSecret.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createCheatSecretStore, normalizeCheatConfig } from './cheatSecret'
import type { AppStorage } from '@/services/storage'

function fakeStorage(initial: Record<string, unknown> = {}): AppStorage {
  const data = new Map(Object.entries(initial))
  return {
    get: vi.fn(async (key: string, fallback: unknown) => data.get(key) ?? fallback),
    set: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value)
      return true
    }),
    remove: vi.fn(async (key: string) => {
      data.delete(key)
      return true
    }),
    clearPrefix: vi.fn(async () => true),
    clearNamespace: vi.fn(async () => true),
  } as unknown as AppStorage
}

describe('normalizeCheatConfig', () => {
  it('accepts a trimmed secret with a known role', () => {
    expect(normalizeCheatConfig({ secret: '  hi there  ', role: 'admin' })).toEqual({
      secret: 'hi there',
      role: 'admin',
    })
  })

  it('rejects an empty secret or an unknown role', () => {
    const bad = [
      null,
      undefined,
      'string',
      {},
      { secret: '', role: 'admin' },
      { secret: '   ', role: 'admin' },
      { secret: 'ok', role: 'boss' },
      { secret: 'ok' },
      { role: 'game' },
      { secret: 42, role: 'game' },
    ]

    for (const raw of bad) {
      expect(normalizeCheatConfig(raw)).toBeNull()
    }
  })
})

describe('createCheatSecretStore', () => {
  it('returns null when nothing is configured — the default state for every device', async () => {
    const store = createCheatSecretStore(fakeStorage())

    await expect(store.load()).resolves.toBeNull()
  })

  it('round-trips a saved config', async () => {
    const storage = fakeStorage()
    const store = createCheatSecretStore(storage)

    await expect(store.save({ secret: 'nhaucc', role: 'game' })).resolves.toBe(true)
    await expect(store.load()).resolves.toEqual({ secret: 'nhaucc', role: 'game' })
  })

  it('refuses to save an invalid config', async () => {
    const storage = fakeStorage()
    const store = createCheatSecretStore(storage)

    await expect(store.save({ secret: '  ', role: 'game' })).resolves.toBe(false)
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('discards stored junk instead of returning it', async () => {
    const store = createCheatSecretStore(fakeStorage({ cheat: { secret: '', role: 'nope' } }))

    await expect(store.load()).resolves.toBeNull()
  })

  it('clears the config', async () => {
    const storage = fakeStorage({ cheat: { secret: 'nhaucc', role: 'admin' } })
    const store = createCheatSecretStore(storage)

    await expect(store.clear()).resolves.toBe(true)
    await expect(store.load()).resolves.toBeNull()
  })
})
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/cheat/cheatSecret.spec.ts`
Expected: FAIL — không resolve được `./cheatSecret`.

- [ ] **Step 3: Implement**

`src/cheat/cheatSecret.ts`:

```ts
import { storage as defaultStorage, type AppStorage } from '@/services/storage'
import { parseSocketRole, type SocketRole } from './cheatProtocol'

export const CHEAT_STORAGE_KEY = 'cheat'

export interface CheatConfig {
  secret: string
  role: SocketRole
}

export function normalizeCheatConfig(raw: unknown): CheatConfig | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const { secret, role } = raw as Record<string, unknown>
  if (typeof secret !== 'string') {
    return null
  }

  const trimmed = secret.trim()
  const parsedRole = parseSocketRole(typeof role === 'string' ? role : null)
  if (trimmed.length === 0 || parsedRole === null) {
    return null
  }

  return { secret: trimmed, role: parsedRole }
}

export interface CheatSecretStore {
  load: () => Promise<CheatConfig | null>
  save: (config: CheatConfig) => Promise<boolean>
  clear: () => Promise<boolean>
}

export function createCheatSecretStore(storage: AppStorage = defaultStorage): CheatSecretStore {
  return {
    async load() {
      const raw = await storage.get<unknown>(CHEAT_STORAGE_KEY, null)
      return normalizeCheatConfig(raw)
    },
    async save(config) {
      const normalized = normalizeCheatConfig(config)
      if (!normalized) {
        return false
      }
      return storage.set(CHEAT_STORAGE_KEY, normalized)
    },
    async clear() {
      return storage.remove(CHEAT_STORAGE_KEY)
    },
  }
}
```

- [ ] **Step 4: Chạy test cho chắc là PASS**

Run: `npx vitest run src/cheat/ && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cheat/cheatSecret.ts src/cheat/cheatSecret.spec.ts
git commit -m "feat: store the cheat secret and device role in app storage"
```

---

### Task 6: Vòng đời WebSocket phía client

**Files:**

- Create: `src/cheat/useCheatLink.ts`
- Test: `src/cheat/useCheatLink.spec.ts`

**Interfaces:**

- Consumes: `parseCheatMessage`, `CheatMessage`, `SocketRole` (Task 3); `ArmedCheat` (Task 1)
- Produces:
  - `export interface CheatSocket { send(data: string): void; close(): void; addEventListener(type: 'open' | 'message' | 'close' | 'error', handler: (event: { data?: unknown }) => void): void }`
  - `export interface CheatLinkOptions { url: string; role: SocketRole; createSocket?: (url: string) => CheatSocket; reconnectDelayMs?: number; scheduleReconnect?: (run: () => void, delayMs: number) => void }`
  - `export interface CheatLink { armed: DeepReadonly<Ref<ArmedCheat | null>>; gameOnline: DeepReadonly<Ref<boolean>>; connected: DeepReadonly<Ref<boolean>>; arm: (armed: ArmedCheat) => void; disarm: () => void; consume: () => void; close: () => void }`
  - `export function createCheatLink(options: CheatLinkOptions): CheatLink`
  - `export function buildCheatSocketUrl(baseUrl: string, secret: string, role: SocketRole): string`

- [ ] **Step 1: Viết test thất bại**

`src/cheat/useCheatLink.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { buildCheatSocketUrl, createCheatLink, type CheatSocket } from './useCheatLink'

function fakeSocket() {
  const handlers = new Map<string, (event: { data?: unknown }) => void>()
  const sent: string[] = []
  const socket: CheatSocket = {
    send: (data) => sent.push(data),
    close: vi.fn(),
    addEventListener: (type, handler) => handlers.set(type, handler),
  }
  return {
    socket,
    sent,
    emit: (type: string, data?: unknown) => handlers.get(type)?.({ data }),
    hasHandler: (type: string) => handlers.has(type),
  }
}

describe('buildCheatSocketUrl', () => {
  it('encodes the secret into the path and the role into the query', () => {
    expect(buildCheatSocketUrl('wss://x.workers.dev', 'nhau cc', 'admin')).toBe(
      'wss://x.workers.dev/room/nhau%20cc?role=admin',
    )
  })

  it('tolerates a trailing slash on the base url', () => {
    expect(buildCheatSocketUrl('wss://x.workers.dev/', 'a', 'game')).toBe(
      'wss://x.workers.dev/room/a?role=game',
    )
  })
})

describe('createCheatLink', () => {
  it('applies an arm frame to the reactive ref', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x/room/a?role=game',
      role: 'game',
      createSocket: () => fake.socket,
    })

    fake.emit('open')
    expect(link.connected.value).toBe(true)

    fake.emit('message', '{"t":"arm","game":"mine","outcome":"lose"}')
    expect(link.armed.value).toEqual({ game: 'mine', outcome: 'lose' })

    fake.emit('message', '{"t":"disarm"}')
    expect(link.armed.value).toBeNull()
  })

  it('ignores malformed frames without throwing', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'game',
      createSocket: () => fake.socket,
    })

    expect(() => fake.emit('message', 'garbage')).not.toThrow()
    expect(() => fake.emit('message', 42)).not.toThrow()
    expect(link.armed.value).toBeNull()
  })

  it('tracks presence and armed state from a state frame', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'admin',
      createSocket: () => fake.socket,
    })

    fake.emit(
      'message',
      '{"t":"state","gameOnline":true,"armed":{"game":"crocodile","outcome":"win"}}',
    )

    expect(link.gameOnline.value).toBe(true)
    expect(link.armed.value).toEqual({ game: 'crocodile', outcome: 'win' })
  })

  it('serialises the admin commands', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'admin',
      createSocket: () => fake.socket,
    })

    fake.emit('open')
    link.arm({ game: 'mine', outcome: 'win' })
    link.disarm()

    expect(fake.sent).toEqual(['{"t":"arm","game":"mine","outcome":"win"}', '{"t":"disarm"}'])
  })

  it('clears the local arm as soon as it is consumed, before the server confirms', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'game',
      createSocket: () => fake.socket,
    })

    fake.emit('open')
    fake.emit('message', '{"t":"arm","game":"mine","outcome":"lose"}')
    link.consume()

    expect(link.armed.value).toBeNull()
    expect(fake.sent).toEqual(['{"t":"consumed"}'])
  })

  it('drops sends while the socket is closed instead of throwing', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'admin',
      createSocket: () => fake.socket,
    })

    expect(() => link.arm({ game: 'mine', outcome: 'lose' })).not.toThrow()
    expect(fake.sent).toEqual([])
  })

  it('reconnects after a close and stops once closed on purpose', () => {
    const sockets: ReturnType<typeof fakeSocket>[] = []
    const scheduled: (() => void)[] = []
    const link = createCheatLink({
      url: 'wss://x',
      role: 'game',
      createSocket: () => {
        const next = fakeSocket()
        sockets.push(next)
        return next.socket
      },
      scheduleReconnect: (run) => scheduled.push(run),
    })

    expect(sockets).toHaveLength(1)
    sockets[0]!.emit('open')
    sockets[0]!.emit('close')

    expect(link.connected.value).toBe(false)
    expect(scheduled).toHaveLength(1)
    scheduled[0]!()
    expect(sockets).toHaveLength(2)

    link.close()
    sockets[1]!.emit('close')
    expect(scheduled).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/cheat/useCheatLink.spec.ts`
Expected: FAIL — không resolve được `./useCheatLink`.

- [ ] **Step 3: Implement**

`src/cheat/useCheatLink.ts`:

```ts
import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import { parseCheatMessage, type CheatMessage, type SocketRole } from './cheatProtocol'
import type { ArmedCheat } from './cheatTypes'

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
  gameOnline: DeepReadonly<Ref<boolean>>
  connected: DeepReadonly<Ref<boolean>>
  arm: (armed: ArmedCheat) => void
  disarm: () => void
  consume: () => void
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
      armed.value = { game: message.game, outcome: message.outcome }
      return
    }
    if (message.t === 'disarm') {
      armed.value = null
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
    gameOnline: readonly(gameOnline),
    connected: readonly(connected),
    arm(next) {
      send({ t: 'arm', game: next.game, outcome: next.outcome })
    },
    disarm() {
      send({ t: 'disarm' })
    },
    consume() {
      // Clear locally first: the press already happened and must not fire twice if the socket lags.
      armed.value = null
      send({ t: 'consumed' })
    },
    close() {
      closedOnPurpose = true
      connected.value = false
      socket?.close()
      socket = null
    },
  }
}
```

- [ ] **Step 4: Chạy test cho chắc là PASS**

Run: `npx vitest run src/cheat/ && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cheat/useCheatLink.ts src/cheat/useCheatLink.spec.ts
git commit -m "feat: add the cheat websocket link with reconnect and defensive sends"
```

---

### Task 7: Nối cờ vào hai composable game

**Files:**

- Create: `src/cheat/cheatArm.ts`
- Modify: `src/games/crocodile/composables/useCrocodileGame.ts:79-88`
- Modify: `src/games/mine/composables/useMineGame.ts`
- Test: `src/cheat/cheatArm.spec.ts`, `src/games/crocodile/composables/useCrocodileGame.spec.ts`, `src/games/mine/composables/useMineGame.spec.ts`

**Interfaces:**

- Consumes: `ArmedCheat`, `CheatGameId`, `ForcedOutcome` (Task 1); `pressTooth` (Task 1); `pressCell` (Task 2)
- Produces:
  - `export interface CheatArmSource { takeForcedOutcome: (game: CheatGameId) => ForcedOutcome | undefined; settle: (landed: boolean) => void }`
  - `export function createCheatArmSource(armed: () => ArmedCheat | null, consume: () => void): CheatArmSource`
  - `CrocodileGameOptions` và `MineGameOptions` nhận thêm field optional `cheat?: CheatArmSource`

**Ghi chú kiến trúc — đọc trước khi code:** `useCrocodileGame.handlePress` hiện gọi `pressTooth` **bên trong** `pressChain.then(...)`. Đó chính là pattern đã gây lag ở game ếch và đã được sửa ở `useMineGame` phiên trước. Đọc cờ cheat trong `.then()` là đọc muộn — sai thời điểm, và nếu người chơi ấn hai ô liên tiếp thì cờ có thể áp vào ô sai. Task này **đồng bộ crocodile theo đúng cách đã sửa cho mine**: gọi hàm pure đồng bộ, chỉ đưa phần feedback vào chain.

- [ ] **Step 1: Viết test thất bại cho `cheatArm`**

`src/cheat/cheatArm.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createCheatArmSource } from './cheatArm'
import type { ArmedCheat } from './cheatTypes'

describe('createCheatArmSource', () => {
  it('returns nothing when no cheat is armed', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => null, consume)

    expect(source.takeForcedOutcome('crocodile')).toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it('returns nothing when the arm targets the other game', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => ({ game: 'mine', outcome: 'lose' }), consume)

    expect(source.takeForcedOutcome('crocodile')).toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it('hands over the outcome for a matching game without consuming it yet', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => ({ game: 'mine', outcome: 'win' }), consume)

    expect(source.takeForcedOutcome('mine')).toBe('win')
    expect(consume).not.toHaveBeenCalled()
  })

  it('consumes only when told the press actually landed', () => {
    let armed: ArmedCheat | null = { game: 'mine', outcome: 'lose' }
    const consume = vi.fn(() => {
      armed = null
    })
    const source = createCheatArmSource(() => armed, consume)

    source.takeForcedOutcome('mine')
    source.settle(true)

    expect(consume).toHaveBeenCalledTimes(1)
    expect(source.takeForcedOutcome('mine')).toBeUndefined()
  })

  it('keeps the arm when the press was ignored', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => ({ game: 'mine', outcome: 'lose' }), consume)

    source.takeForcedOutcome('mine')
    source.settle(false)

    expect(consume).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/cheat/cheatArm.spec.ts`
Expected: FAIL — không resolve được `./cheatArm`.

- [ ] **Step 3: Implement `cheatArm`**

`src/cheat/cheatArm.ts`:

```ts
import type { ArmedCheat, CheatGameId, ForcedOutcome } from './cheatTypes'

export interface CheatArmSource {
  /** Synchronous by contract: the press path must never await to learn the forced outcome. */
  takeForcedOutcome: (game: CheatGameId) => ForcedOutcome | undefined
  /** Called with whether the press landed; an ignored press must not burn the arm. */
  settle: (landed: boolean) => void
}

export function createCheatArmSource(
  armed: () => ArmedCheat | null,
  consume: () => void,
): CheatArmSource {
  let pending = false

  return {
    takeForcedOutcome(game) {
      const current = armed()
      pending = current !== null && current.game === game
      return pending ? current!.outcome : undefined
    },
    settle(landed) {
      if (pending && landed) {
        consume()
      }
      pending = false
    },
  }
}
```

- [ ] **Step 4: Chạy test cho chắc là PASS**

Run: `npx vitest run src/cheat/cheatArm.spec.ts`
Expected: PASS.

- [ ] **Step 5: Viết test thất bại cho hai composable**

Thêm vào `src/games/crocodile/composables/useCrocodileGame.spec.ts`:

```ts
it('bites the pressed tooth when the cheat source forces a loss', async () => {
  const game = createCrocodileGame({
    rng: () => 0,
    feedback: createFeedback(),
    cheat: {
      takeForcedOutcome: () => 'lose',
      settle: () => {},
    },
  })

  await game.pressTooth(5)

  expect(game.phase.value).toBe('bitten')
  expect(game.trapIndex.value).toBe(5)
})

it('does not consume the arm when the press is ignored', async () => {
  const settle = vi.fn()
  const game = createCrocodileGame({
    rng: () => 0,
    feedback: createFeedback(),
    cheat: { takeForcedOutcome: () => 'lose', settle },
  })

  await game.pressTooth(99)

  expect(settle).toHaveBeenCalledWith(false)
})
```

Thêm vào `src/games/mine/composables/useMineGame.spec.ts`:

```ts
it('explodes on the pressed cell when the cheat source forces a loss', async () => {
  const game = createMineGame({
    rng: () => 0,
    feedback: createFeedback(),
    cheat: { takeForcedOutcome: () => 'lose', settle: () => {} },
  })

  await game.pressCell(7)

  expect(game.phase.value).toBe('exploded')
  expect(game.hitMineIndex.value).toBe(7)
})
```

> `createFeedback()` là helper đã có sẵn trong cả hai spec file — dùng lại, đừng dựng object mới.

- [ ] **Step 6: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/games/crocodile/composables src/games/mine/composables`
Expected: FAIL — `cheat` không phải field hợp lệ của options.

- [ ] **Step 7: Implement trong `useCrocodileGame.ts`**

Thêm vào interface options:

```ts
import type { CheatArmSource } from '@/cheat/cheatArm'
```

```ts
export interface CrocodileGameOptions {
  rng?: RandomSource
  feedback: CrocodileFeedback
  primeAudio?: () => void
  cheat?: CheatArmSource
}
```

Thay `handlePress` — hàm pure chạy đồng bộ, chỉ feedback vào chain (giống `useMineGame`):

```ts
function handlePress(index: number): Promise<void> {
  const forced = options.cheat?.takeForcedOutcome('crocodile')
  const result = pressTooth(state.value, index, forced, rng)
  const outcome = result.outcome
  options.cheat?.settle(outcome !== 'ignored')

  if (outcome === 'ignored') {
    return pressChain
  }

  state.value = result.state
  pressChain = pressChain.then(() => deliverFeedback(outcome)).catch(() => {})
  return pressChain
}
```

- [ ] **Step 8: Implement trong `useMineGame.ts`**

Thêm `cheat?: CheatArmSource` vào interface options giống trên, rồi thay đầu `handlePress`:

```ts
function handlePress(index: number): Promise<void> {
  const forced = options.cheat?.takeForcedOutcome('mine')
  const result = pressCell(state.value, index, forced, rng)
  const outcome = result.outcome
  options.cheat?.settle(outcome !== 'ignored')

  if (outcome === 'ignored') {
    return pressChain
  }

  state.value = result.state
  pressChain = pressChain.then(() => deliverFeedback(outcome)).catch(() => {})
  return pressChain
}
```

> `rng` là biến đã có trong cả hai composable (`options.rng ?? defaultRng`). Truyền nó vào để nhánh di dời dùng cùng nguồn ngẫu nhiên mà test đang inject.

- [ ] **Step 9: Nối `CheatArmSource` thật vào hai View**

Trong `src/games/crocodile/CrocodileView.vue` và `src/games/mine/MineView.vue`, chỗ đang gọi `useCrocodileGame({...})` / `useMineGame({...})`, thêm:

```ts
import { createCheatArmSource } from '@/cheat/cheatArm'
import { useCheatGameLink } from '@/cheat/useCheatGameLink'
```

```ts
const cheatLink = useCheatGameLink()
const game = useCrocodileGame({
  feedback,
  cheat: createCheatArmSource(
    () => cheatLink.armed.value,
    () => cheatLink.consume(),
  ),
})
```

`src/cheat/useCheatGameLink.ts` — composable mỏng, mở link **chỉ khi** máy này đã cài secret với vai `game`:

```ts
import { onUnmounted, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue'
import { getCheatSocketUrl } from '@/config/site'
import { createCheatSecretStore } from './cheatSecret'
import { buildCheatSocketUrl, createCheatLink, type CheatLink } from './useCheatLink'
import type { ArmedCheat } from './cheatTypes'

export interface CheatGameLink {
  armed: DeepReadonly<Ref<ArmedCheat | null>>
  consume: () => void
}

/** No secret stored, or no socket url configured, means no socket at all — the default. */
export function useCheatGameLink(): CheatGameLink {
  const armed = ref<ArmedCheat | null>(null)
  let link: CheatLink | null = null
  let stopMirror: (() => void) | null = null

  void createCheatSecretStore()
    .load()
    .then((config) => {
      const baseUrl = getCheatSocketUrl()
      if (!config || config.role !== 'game' || baseUrl.length === 0) {
        return
      }

      const opened = createCheatLink({
        url: buildCheatSocketUrl(baseUrl, config.secret, 'game'),
        role: 'game',
      })
      link = opened
      /*
       * Mirror into a local ref so the press path reads one synchronous source. The watcher is
       * created after setup returned, so it is not auto-disposed — hence stopMirror.
       */
      stopMirror = watch(
        () => opened.armed.value,
        (next) => {
          armed.value = next
        },
        { immediate: true },
      )
    })
    .catch(() => {})

  onUnmounted(() => {
    stopMirror?.()
    link?.close()
    link = null
  })

  return {
    armed: readonly(armed),
    consume() {
      armed.value = null
      link?.consume()
    },
  }
}
```

Thêm vào `src/config/site.ts`, theo đúng khuôn `getSiteUrl` đã có trong file (nhận env qua tham số để test inject được, không đọc `import.meta.env` trực tiếp trong thân hàm):

```ts
/**
 * Cheat control channel base url. Empty means the feature is off: no socket is ever opened.
 */
export function getCheatSocketUrl(
  envValue: string | undefined = import.meta.env.VITE_CHEAT_SOCKET_URL,
): string {
  return envValue?.trim().replace(/\/+$/, '') ?? ''
}
```

Test kèm theo, thêm vào `src/config/site.spec.ts` nếu file đã có, không thì tạo mới:

```ts
it('treats a missing or blank cheat socket url as disabled', () => {
  expect(getCheatSocketUrl(undefined)).toBe('')
  expect(getCheatSocketUrl('   ')).toBe('')
  expect(getCheatSocketUrl('wss://x.workers.dev/')).toBe('wss://x.workers.dev')
})
```

Thêm vào `.env.example`:

```
# Cheat control channel (Cloudflare Worker). Leave empty to disable the feature entirely.
VITE_CHEAT_SOCKET_URL=
```

- [ ] **Step 10: Chạy toàn bộ test**

Run: `npx vitest run && npm run type-check && npm run lint`
Expected: PASS, tổng số test tăng, không test cũ nào fail.

- [ ] **Step 11: Commit**

```bash
git add src/cheat src/games/crocodile src/games/mine src/config/site.ts .env.example
git commit -m "feat: apply an armed cheat to the next crocodile or frog press"
```

---

### Task 8: Trang ẩn `/x`

**Files:**

- Create: `src/app/views/CheatView.vue`
- Create: `src/app/views/CheatView.spec.ts`
- Modify: `src/router/routes.ts:146-152`

**Interfaces:**

- Consumes: `createCheatSecretStore` (Task 5); `createCheatLink`, `buildCheatSocketUrl` (Task 6); `getCheatSocketUrl` (Task 7)
- Produces: route `{ path: '/x', name: 'cheat', noIndex: true }`

- [ ] **Step 1: Viết test thất bại**

`src/app/views/CheatView.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CheatView from './CheatView.vue'

describe('CheatView', () => {
  it('asks for a secret and a role before showing any control', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-secret-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(false)
  })

  it('shows the four arm buttons once configured as the admin device', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    await wrapper.find('[data-testid="cheat-secret-input"]').setValue('nhaucc')
    await wrapper.find('[data-testid="cheat-role-admin"]').setValue(true)
    await wrapper.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-crocodile-win"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-mine-lose"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-mine-win"]').exists()).toBe(true)
  })

  it('hides the arm buttons when this device is the game device', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    await wrapper.find('[data-testid="cheat-secret-input"]').setValue('nhaucc')
    await wrapper.find('[data-testid="cheat-role-game"]').setValue(true)
    await wrapper.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cheat-role-note"]').text()).toContain('máy chơi')
  })
})
```

- [ ] **Step 2: Chạy test cho chắc là FAIL**

Run: `npx vitest run src/app/views/CheatView.spec.ts`
Expected: FAIL — không resolve được `./CheatView.vue`.

> Test này **không cần mock `WebSocket`**, và đó là điều nó chứng minh: trong môi trường test `VITE_CHEAT_SOCKET_URL` rỗng nên `getCheatSocketUrl()` trả `''`, `openLink` thoát sớm, không socket nào được tạo. Nếu test bỗng đòi mock `WebSocket` thì nghĩa là nhánh tắt-mặc-định đã bị hỏng — sửa nhánh đó, đừng thêm mock.

- [ ] **Step 3: Implement `CheatView.vue`**

Theo đúng khuôn `SettingsView.vue`: `<section>` gốc, `flex flex-col gap-6`, `data-testid`, class `btn-tactile`.

```vue
<template>
  <section data-testid="cheat-view" class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <h1 class="font-display text-2xl font-semibold text-ink">Điều khiển</h1>
      <p class="text-sm text-ink-muted">Cài một lần cho mỗi máy.</p>
    </header>

    <div class="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface-elevated p-4">
      <label class="flex flex-col gap-1">
        <span class="font-semibold text-ink">Mã</span>
        <input
          v-model="secretDraft"
          type="password"
          autocomplete="off"
          class="min-h-11 rounded-xl border-2 border-border bg-surface px-3 text-ink"
          data-testid="cheat-secret-input"
        />
      </label>

      <label class="flex min-h-11 items-center justify-between gap-3">
        <span class="text-ink">Máy này là máy chơi</span>
        <input
          v-model="roleDraft"
          type="radio"
          value="game"
          class="h-5 w-5 accent-teal"
          data-testid="cheat-role-game"
        />
      </label>
      <label class="flex min-h-11 items-center justify-between gap-3">
        <span class="text-ink">Máy này là máy điều khiển</span>
        <input
          v-model="roleDraft"
          type="radio"
          value="admin"
          class="h-5 w-5 accent-teal"
          data-testid="cheat-role-admin"
        />
      </label>

      <button type="button" class="btn-tactile w-full" data-testid="cheat-save" @click="save">
        Lưu
      </button>
    </div>

    <p v-if="savedRole === 'game'" class="toast-banner" data-testid="cheat-role-note" role="status">
      Máy này đang là máy chơi. Không có nút gài ở đây.
    </p>

    <div v-else-if="savedRole === 'admin'" class="flex flex-col gap-4">
      <p class="text-sm text-ink-muted" data-testid="cheat-status">{{ statusText }}</p>

      <div v-for="group in ARM_GROUPS" :key="group.game" class="flex flex-col gap-2">
        <span class="font-semibold text-ink">{{ group.label }}</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn-tactile btn-tactile-primary flex-1"
            :data-testid="`cheat-arm-${group.game}-lose`"
            @click="arm(group.game, 'lose')"
          >
            Cho thua
          </button>
          <button
            type="button"
            class="btn-tactile flex-1"
            :data-testid="`cheat-arm-${group.game}-win`"
            @click="arm(group.game, 'win')"
          >
            Cho thoát
          </button>
        </div>
      </div>

      <button type="button" class="btn-tactile w-full" data-testid="cheat-disarm" @click="disarm">
        Huỷ bẫy
      </button>
    </div>
  </section>
</template>
```

Phần `<script setup lang="ts">`:

```ts
import { computed, onUnmounted, ref } from 'vue'
import { getCheatSocketUrl } from '@/config/site'
import { createCheatSecretStore } from '@/cheat/cheatSecret'
import { buildCheatSocketUrl, createCheatLink, type CheatLink } from '@/cheat/useCheatLink'
import type { CheatGameId, ForcedOutcome } from '@/cheat/cheatTypes'
import type { SocketRole } from '@/cheat/cheatProtocol'

const ARM_GROUPS: readonly { game: CheatGameId; label: string }[] = [
  { game: 'crocodile', label: 'Răng cá sấu' },
  { game: 'mine', label: 'Bắt ếch' },
]

const store = createCheatSecretStore()
const secretDraft = ref('')
const roleDraft = ref<SocketRole>('admin')
const savedRole = ref<SocketRole | null>(null)
const link = ref<CheatLink | null>(null)

const statusText = computed(() => {
  const current = link.value
  if (!current) {
    return 'Chưa cấu hình kênh điều khiển.'
  }
  if (!current.connected.value) {
    return 'Đang kết nối…'
  }
  if (!current.gameOnline.value) {
    return 'Máy chơi chưa online.'
  }
  const armed = current.armed.value
  return armed ? `Đang gài: ${armed.game} / ${armed.outcome}` : 'Máy chơi online — chưa gài gì.'
})

void store.load().then((config) => {
  if (!config) {
    return
  }
  secretDraft.value = config.secret
  roleDraft.value = config.role
  savedRole.value = config.role
  openLink(config.secret, config.role)
})

function openLink(secret: string, role: SocketRole): void {
  link.value?.close()
  link.value = null
  const baseUrl = getCheatSocketUrl()
  if (role !== 'admin' || baseUrl.length === 0) {
    return
  }
  link.value = createCheatLink({
    url: buildCheatSocketUrl(baseUrl, secret, 'admin'),
    role: 'admin',
  })
}

async function save(): Promise<void> {
  const config = { secret: secretDraft.value, role: roleDraft.value }
  const ok = await store.save(config)
  if (!ok) {
    return
  }
  savedRole.value = roleDraft.value
  openLink(secretDraft.value.trim(), roleDraft.value)
}

function arm(game: CheatGameId, outcome: ForcedOutcome): void {
  link.value?.arm({ game, outcome })
}

function disarm(): void {
  link.value?.disarm()
}

onUnmounted(() => {
  link.value?.close()
})
```

- [ ] **Step 4: Thêm route**

Trong `src/router/routes.ts`, chèn **trước** route `not-found`:

```ts
  {
    path: '/x',
    name: 'cheat',
    seo: APP_SEO.notFound,
    noIndex: true,
    component: () => import('@/app/views/CheatView.vue'),
  },
```

> Dùng lại `APP_SEO.notFound` có chủ ý: trang này `noIndex` nên metadata không bao giờ được index, và không cần thêm một khối SEO chỉ để mô tả một trang ẩn. **Không** thêm `/x` vào `PRERENDER_PATHS` — `public/_redirects` đã có SPA fallback lo phần hosting, y như `/settings`.

- [ ] **Step 5: Chạy test cho chắc là PASS**

Run: `npx vitest run && npm run type-check && npm run lint && npm run build && npm run verify:dist`
Expected: PASS. `verify:dist` vẫn báo **6** file HTML lồng nhau — `/x` không được prerender.

- [ ] **Step 6: Commit**

```bash
git add src/app/views/CheatView.vue src/app/views/CheatView.spec.ts src/router/routes.ts
git commit -m "feat: add the hidden cheat control page at /x"
```

---

### Task 9: Worker + Durable Object

**Files:**

- Create: `worker/index.ts`
- Create: `worker/CheatRoom.ts`
- Create: `tsconfig.worker.json`
- Create: `wrangler.toml`
- Modify: `tsconfig.json`
- Modify: `package.json`
- Modify: `README.md:13`

**Interfaces:**

- Consumes: `reduceRoom`, `INITIAL_ROOM_STATE`, `RoomState`, `RoomEffect` (Task 4); `parseCheatMessage`, `parseSocketRole` (Task 3)
- Produces: endpoint `wss://<worker>/room/<secret>?role=game|admin`

- [ ] **Step 1: Thêm devDependency**

```bash
npm install --save-dev wrangler @cloudflare/workers-types
```

Xác nhận không có dependency runtime nào bị thêm:

Run: `node -e "const p=require('./package.json');console.log(Object.keys(p.dependencies).length)"`
Expected: **11** — số lượng như trước.

- [ ] **Step 2: Tạo tsconfig cho worker**

`tsconfig.worker.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "worker/**/*.ts",
    "src/cheat/cheatTypes.ts",
    "src/cheat/cheatProtocol.ts",
    "src/cheat/roomReducer.ts"
  ]
}
```

Trong `tsconfig.json`, thêm reference:

```json
{ "path": "./tsconfig.worker.json" }
```

> ESLint dùng `projectService: true`, nên mọi file `.ts` phải thuộc một project. Không có bước này, `npm run lint` sẽ báo `worker/index.ts` không nằm trong project nào.

- [ ] **Step 3: Viết Durable Object**

`worker/CheatRoom.ts`:

```ts
import { parseCheatMessage, parseSocketRole, type SocketRole } from '../src/cheat/cheatProtocol'
import {
  INITIAL_ROOM_STATE,
  reduceRoom,
  type RoomEffect,
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

    // Hibernation: an idle room costs nothing, and the tag is how the role survives a hibernate.
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
    const stored = await this.ctx.storage.get<RoomState>(STATE_KEY)
    // gameSocketCount is live presence, never restored from storage.
    return { armed: stored?.armed ?? null, gameSocketCount: this.ctx.getWebSockets('game').length }
  }

  private async apply(sender: WebSocket, event: Parameters<typeof reduceRoom>[1]): Promise<void> {
    const current = await this.load()
    const { state, effects } = reduceRoom(current, event)

    if (state.armed !== current.armed) {
      await this.ctx.storage.put(STATE_KEY, { armed: state.armed, gameSocketCount: 0 })
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
```

- [ ] **Step 4: Viết Worker entry**

`worker/index.ts`:

```ts
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
```

- [ ] **Step 5: Cấu hình wrangler**

`wrangler.toml`:

```toml
name = "drinking-games-cheat"
main = "worker/index.ts"
compatibility_date = "2026-01-01"

[[durable_objects.bindings]]
name = "CHEAT_ROOM"
class_name = "CheatRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["CheatRoom"]
```

> `new_sqlite_classes`, không phải `new_classes`: DO nền SQLite là loại có trong free plan.

- [ ] **Step 6: Thêm script deploy**

Trong `package.json` `scripts`:

```json
"worker:dev": "wrangler dev",
"worker:deploy": "wrangler deploy"
```

- [ ] **Step 7: Sửa README**

`README.md` dòng 13 đang nói **"client-only, không backend"** — không còn đúng. Thay bằng:

```markdown
**Phạm vi tính năng:** client-only cho toàn bộ 5 game — không tài khoản, không đồng bộ đám mây, dữ liệu lưu cục bộ (localStorage / Capacitor Preferences). Âm thanh Web Audio, rung qua Capacitor Haptics trên native.

Ngoại lệ duy nhất là kênh điều khiển ở `/x` (Cloudflare Worker + Durable Object). Nó **tắt hoàn toàn** khi `VITE_CHEAT_SOCKET_URL` rỗng hoặc máy chưa cài mã, nên bản mặc định vẫn không mở kết nối nào.
```

- [ ] **Step 8: Kiểm tra type và lint**

Run: `npm run type-check && npx vue-tsc --noEmit -p tsconfig.worker.json && npm run lint`
Expected: không lỗi. Nếu `worker/**` báo "not found in any project", kiểm lại reference ở Step 2.

- [ ] **Step 9: Chạy Worker cục bộ và thử tay hai socket**

Run: `npm run worker:dev`

Trong một tab Node khác, dán đoạn này để giả lập hai máy (thay port nếu wrangler báo khác):

```bash
node -e "
const admin = new WebSocket('ws://127.0.0.1:8787/room/test?role=admin');
const game  = new WebSocket('ws://127.0.0.1:8787/room/test?role=game');
game.onmessage  = (e) => console.log('GAME  <-', e.data);
admin.onmessage = (e) => console.log('ADMIN <-', e.data);
admin.onopen = () => setTimeout(() => admin.send('{\"t\":\"arm\",\"game\":\"mine\",\"outcome\":\"lose\"}'), 300);
setTimeout(() => process.exit(0), 2000);
"
```

Expected: `GAME <- {"t":"arm","game":"mine","outcome":"lose"}` và một dòng `ADMIN <- {"t":"state",...,"armed":{...}}`.

- [ ] **Step 10: Commit**

```bash
git add worker tsconfig.worker.json tsconfig.json wrangler.toml package.json package-lock.json README.md
git commit -m "feat: add the cheat room worker backed by a durable object"
```

---

### Task 10: Cổng chống hồi quy

**Files:**

- Test: chạy toàn bộ, không tạo file mới trừ script đo tạm

- [ ] **Step 1: Chạy đủ bộ verify**

Run: `npm run verify`
Expected: type-check, lint, unit, build, verify:dist — tất cả pass. Số test **> 420**.

- [ ] **Step 2: Chạy e2e**

Run: `npm run test:e2e`
Expected: **56 passed**. Không test nào mới fail.

- [ ] **Step 3: Đo lại độ trễ ấn ở game ếch**

Mốc phải giữ: 8 lần ấn liên tiếp **≤ 100ms** (số đo trước khi làm task này: 44ms).

```bash
cat > probe-latency.tmp.mjs <<'EOF'
import { chromium, devices } from '@playwright/test'
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
await page.goto('http://localhost:4173/games/mine', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const cells = page.locator('[data-testid^="mine-cell-"]')
const start = Date.now()
for (let i = 0; i < 8; i += 1) {
  await cells.nth(i).dispatchEvent('pointerdown')
}
console.log(`8 presses in ${Date.now() - start}ms`)
await browser.close()
EOF
npx vite preview --port 4173 --strictPort >/dev/null 2>&1 &
sleep 2
node probe-latency.tmp.mjs
rm probe-latency.tmp.mjs
```

Expected: `8 presses in <100ms`. Nếu vượt, `handlePress` đã lọt `await` vào đường ấn — xem lại Task 7 Step 7/8.

> Selector đã xác minh trong `MineGrid.vue`: `:data-testid="`mine-cell-${index}`"`.

- [ ] **Step 4: Xác nhận mặc định không mở socket**

```bash
grep -c "VITE_CHEAT_SOCKET_URL" .env.example
grep -rn "new WebSocket" dist/assets/*.js | head
```

Expected: `.env.example` có khai báo; và với `VITE_CHEAT_SOCKET_URL` rỗng, không máy nào mở socket vì `getCheatSocketUrl()` trả về chuỗi rỗng và chặn trước (Task 7).

- [ ] **Step 5: Commit nếu có gì phải sửa**

```bash
git add -A
git commit -m "test: lock the press latency budget and cheat-off default"
```

---

## Việc thủ công còn lại — không tự động hoá được

Sau Task 10, những việc sau **bắt buộc người dùng làm**, không kiểm được ở máy dev:

1. **Xác nhận Durable Objects trên account Cloudflare.** Nếu không dùng được, đổi sang Supabase Realtime — khi đó Task 9 bị thay hoàn toàn và phải kiểm lại `audit:build` vì bundle tăng ~40KB.
2. `npm run worker:deploy`, lấy URL `*.workers.dev` trả về.
3. Đặt `VITE_CHEAT_SOCKET_URL=wss://<url đó>` trong biến môi trường của Cloudflare Pages, rồi deploy lại Pages.
4. Mở `/x` trên **cả hai** máy, nhập cùng một mã, chọn vai tương ứng.
5. Thử tay, đúng 4 việc:
   - gài **cho thua** → ấn một ô bất kỳ → thua đúng ô vừa ấn
   - gài **cho thoát** → ấn đúng ô bẫy → thoát, game tiếp tục
   - **reload máy chơi** khi đang gài → bẫy vẫn còn
   - **tắt mạng máy chơi** → game chạy bình thường, không treo, không chậm
