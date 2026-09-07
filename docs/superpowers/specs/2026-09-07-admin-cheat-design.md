# Admin cheat — thiết kế

- Ngày: 2026-09-07
- Trạng thái: chờ review
- Phạm vi: game **Răng cá sấu** và **Bắt ếch**

## 1. Mục tiêu

Từ một điện thoại thứ hai, gài trước để **lần ấn tiếp theo** trên máy đang chơi chắc chắn thua, hoặc chắc chắn thoát. Dùng làm mẹo vui trong tiệc.

Yêu cầu bất biến: **không ai ở bàn nhận ra**. Nghĩa là mọi con số hiển thị phải vẫn khớp, và tốc độ phản hồi khi ấn không được thay đổi.

## 2. Ngoài phạm vi

- Trang admin **không** hiện bàn game (đã chốt: luồng một chiều).
- Không cheat cho Vòng quay, Kéo cần, Bốc bài.
- Không lưu lịch sử, không log.
- Không có xác thực nào ngoài secret dùng chung.

## 3. Quyết định đã chốt

| Quyết định                                            | Lý do                                                                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Worker + Durable Object, `WebSocket` thuần | Cùng account với Pages đang deploy. **0 byte dependency runtime** — `@supabase/supabase-js` nặng ~40KB gzip và có thể làm fail `audit:build` |
| Secret cố định, nhập một lần mỗi máy                  | Lúc đang chơi không phải thao tác gì — quan trọng vì khi đó có người nhìn                                                                    |
| Một chiều, chỉ báo "đã gài được"                      | Máy chơi không bao giờ gửi state lên. Ít code, ít bề mặt lỗi                                                                                 |
| Có cả "cho thua" và "cho thoát"                       | Chung cơ chế, chung protocol                                                                                                                 |
| Cheat **tắt hoàn toàn** khi chưa cài secret           | Người lạ vào web và bản Android/iOS không kết nối gì. App giữ nguyên tính offline                                                            |
| Cờ đi vào logic bằng **tham số**, không đọc global    | Giữ `crocodileGame.ts` / `mineGame.ts` pure và test được độc lập — đúng kiến trúc hiện tại                                                   |

## 4. Kiến trúc

```
Máy điều khiển                 Cloudflare                 Máy đang chơi
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│ /x           │          │ Worker           │          │ /games/...   │
│ role=admin   │◄────────►│   ↓ idFromName   │◄────────►│ role=game    │
│              │   wss    │ Durable Object   │   wss    │              │
│ [THUA][THOÁT]│          │  armed: {...}    │          │ ref armed    │
└──────────────┘          └──────────────────┘          └──────┬───────┘
                                                               │ đồng bộ
                                                        ┌──────▼───────┐
                                                        │ pressTooth() │
                                                        │ pressCell()  │
                                                        └──────────────┘
```

Ba phần:

**`worker/`** (mới) — Worker định tuyến `wss://` vào một Durable Object. Mỗi secret ánh xạ thành một phòng qua `idFromName(secret)`. Dùng WebSocket Hibernation API để phòng rảnh không tốn gì.

**`src/cheat/`** (mới) — client. Chỉ mở socket **nếu máy đó đã cài secret**. Đưa ra một `ref` phản ứng chứa cờ đang gài.

**Logic game** — thêm tham số optional vào hai hàm pure đã có.

## 5. Giao thức

JSON, 4 loại message. Mọi message không parse được hoặc sai shape đều bị **bỏ qua im lặng** (không crash, không trả lỗi).

```
admin  → server   {"t":"arm","game":"crocodile","outcome":"lose"}
admin  → server   {"t":"disarm"}
game   → server   {"t":"consumed"}
server → game     {"t":"arm","game":"crocodile","outcome":"lose"}
server → game     {"t":"disarm"}
server → admin    {"t":"state","gameOnline":true,"armed":{"game":"mine","outcome":"win"}}
```

- `game`: `"crocodile" | "mine"`
- `outcome`: `"lose" | "win"`
- `armed`: object hoặc `null`

**Durable Object là nguồn sự thật duy nhất cho `armed`.** Hệ quả có chủ ý:

- Máy chơi reload, hoặc app bị kill giữa tiệc → bẫy **vẫn còn**, server gửi lại khi socket nối lại.
- Màn admin luôn hiện trạng thái thật, không đoán.

### State machine của Durable Object

State bền: `armed: {game, outcome} | null`.
Presence: `gameOnline` = có socket nào role `game` đang mở.

| Sự kiện                | Hành động                                                           |
| ---------------------- | ------------------------------------------------------------------- |
| socket `game` kết nối  | Nếu `armed` khác null → gửi `arm` cho nó. Gửi `state` cho mọi admin |
| socket `admin` kết nối | Gửi `state` cho nó                                                  |
| `arm` từ admin         | Ghi `armed`, phát `arm` cho mọi game, phát `state` cho mọi admin    |
| `disarm` từ admin      | Xoá `armed`, phát `disarm` cho game, `state` cho admin              |
| `consumed` từ game     | Xoá `armed`, phát `state` cho admin                                 |
| socket đóng            | Cập nhật presence, phát `state` cho admin                           |

`arm` từ socket role `game`, và `consumed` từ socket role `admin`, đều bị bỏ qua.

## 6. Sửa logic game

Hai hàm nhận thêm hai tham số optional. **Chữ ký cũ vẫn gọi được y nguyên** — bỏ trống `forced` thì hành vi phải giống hệt hôm nay, và đây là điều kiện có test riêng.

```ts
export type ForcedOutcome = 'lose' | 'win'

// crocodileGame.ts
export function pressTooth(
  state: CrocodileGameState,
  toothIndex: number,
  forced?: ForcedOutcome,
  rng?: RandomSource,
): PressToothResult

// mineGame.ts
export function pressCell(
  state: MineGameState,
  cellIndex: number,
  forced?: ForcedOutcome,
  rng?: RandomSource,
): PressCellResult
```

`rng` mặc định `Math.random`, chỉ dùng cho nhánh di dời của `'win'`. Mọi call site hiện tại không truyền gì nên không đổi.

### Thứ tự đánh giá

Các nhánh `ignored` (index không hợp lệ, game đã kết thúc, ô đã ấn) chạy **trước** `forced`. Một cú ấn không hợp lệ **không được** tiêu thụ bẫy.

### Cá sấu

- `forced === 'lose'` → `phase: 'bitten'`, `trapIndex: toothIndex`, outcome `'trap'`.
- `forced === 'win'`:
  - `toothIndex !== state.trapIndex` → xử lý bình thường (không có gì phải làm).
  - Ngược lại → **di dời** bẫy sang một răng chọn đều trong số răng chưa ấn và khác `toothIndex`; trả về `'safe'`.
  - Không còn răng nào để dời (mọi răng khác đã ấn) → **không cứu được**, trả về `'trap'` như bình thường.

### Bắt ếch

`mineIndices.length` phải **luôn** bằng `mineCount`, cả hai chiều.

- `forced === 'lose'`:
  - `cellIndex` **đã là mìn** → xử lý bình thường (đã nổ sẵn, không di dời gì). Bỏ qua bước này là tạo index trùng hoặc làm `mineIndices.length` tụt đi 1.
  - Ngược lại → bỏ con mìn **đầu tiên theo thứ tự `mineIndices`** ra, thêm `cellIndex` vào; `phase: 'exploded'`, `hitMineIndex: cellIndex`, outcome `'mine'`. Chọn theo thứ tự, không dùng `rng`, để nhánh này tất định và dễ test.
- `forced === 'win'`:
  - `cellIndex` không phải mìn → xử lý bình thường.
  - Ngược lại → di dời đúng con mìn đó sang một ô chọn đều trong số ô chưa lộ, khác `cellIndex`, và chưa phải mìn; trả về `'safe'`.
  - Không còn ô nào để dời → trả về `'mine'` như bình thường.

**Bất biến làm cho `'lose'` luôn có mìn để lấy:** mìn chỉ vào `revealedIndices` bằng cách bị ấn, mà ấn phải mìn là `exploded` ngay. Nên trong lúc `phase === 'playing'`, không con mìn nào đã lộ — luôn có ít nhất một con để di dời.

### Tại sao di dời chứ không xoá / không thêm

Màn ếch hiện `đã bắt x/24` và một thanh rủi ro tính từ `mineIndices` qua `computeNextRisk`. Xoá bớt một con mìn làm thanh rủi ro tụt ngay trước mắt cả bàn — lộ mẹo. Di dời giữ mọi số hiển thị khớp.

### Tiêu thụ bẫy

Hàm pure **không** theo dõi việc tiêu thụ; nó stateless với cờ. Composable chịu trách nhiệm: sau một press có `outcome !== 'ignored'`, xoá ref local và gửi `{"t":"consumed"}`.

Bẫy bị tiêu thụ **cả khi** `'win'` không cứu được (vì một cú ấn đã thực sự xảy ra).

Bẫy **sống qua** `reset()` của game: "lần ấn tiếp theo" tính theo cú ấn, không theo vòng.

## 7. Ràng buộc tốc độ — cứng

Phiên trước đã sửa lag ở game ếch: **702ms cho 5 ô → 44ms cho 8 ô**. Không được để hồi quy.

- Cờ đọc từ một `ref` **đồng bộ**. Socket chỉ _ghi_ vào ref đó.
- Đường đi của cú ấn **không `await`** thêm bất cứ gì.
- Socket chết, mất mạng, hoặc chưa cài secret → hành vi giống hệt hôm nay.

Có test đo lại độ trễ press sau khi sửa.

## 8. Trang ẩn `/x`

Một route duy nhất, dùng cho cả hai vai:

1. Ô nhập secret (lưu qua `AppStorage` sẵn có, giống `useSettings`).
2. Chọn vai của **máy này**: `máy chơi` hoặc `máy điều khiển`.
3. Nếu vai là điều khiển → hiện 4 nút (Cá sấu thua/thoát, Ếch thua/thoát), trạng thái kết nối, và nút Huỷ bẫy.

Hosting: `noIndex: true`, **không** thêm vào `PRERENDER_PATHS` — y hệt cách `/settings` đang làm. [public/_redirects](../../../public/_redirects) đã có SPA fallback `/* /index.html 200`, nên không cần thêm gì cho hạ tầng.

Đường dẫn `/x` không bí mật, và không cần bí mật: **secret mới là cửa**. Ai mở `/x` mà không biết secret chỉ thấy một ô nhập trống.

## 9. Mô hình bảo mật — nói thẳng

- Biết secret = gài được bẫy. Đó là toàn bộ xác thực.
- Secret nằm trong đường dẫn WebSocket, nhưng `wss://` mã hoá cả path khi truyền.
- Code cheat có trong bundle web **và** trong bản Android/iOS lên store. Nó tắt khi chưa cài secret. Nếu sau này muốn loại khỏi bản store thì gate bằng biến môi trường lúc build — đổi một chỗ.
- Không rate limit. Với một mẹo tiệc thì không cần.

## 10. Cấu trúc file

```
worker/
  index.ts            Worker fetch handler, upgrade WebSocket
  CheatRoom.ts        Durable Object (hibernation)
  roomReducer.ts      state machine pure — có unit test
wrangler.toml

src/cheat/
  cheatProtocol.ts    kiểu message + parse/serialize, pure — có unit test
  cheatSecret.ts      đọc/ghi secret + vai qua AppStorage
  useCheatLink.ts     vòng đời WebSocket, đưa ra ref phản ứng
src/app/views/
  CheatView.vue       trang /x
```

`worker/` import `cheatProtocol.ts` từ `src/cheat/` để hai bên không lệch định nghĩa message.

## 11. File sửa

| File                                                  | Sửa gì                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `src/games/crocodile/logic/crocodileGame.ts`          | thêm `forced`, `rng` vào `pressTooth`                             |
| `src/games/mine/logic/mineGame.ts`                    | thêm `forced`, `rng` vào `pressCell`                              |
| `src/games/crocodile/composables/useCrocodileGame.ts` | đọc ref, truyền `forced`, gửi `consumed`                          |
| `src/games/mine/composables/useMineGame.ts`           | như trên                                                          |
| `src/router/routes.ts`                                | thêm route `/x`, `noIndex: true`                                  |
| `package.json`                                        | `wrangler` vào `devDependencies`                                  |
| `README.md`                                           | **sửa tuyên bố "client-only, không backend"** — nó không còn đúng |

## 12. Kiểm thử

**Test được ở máy dev:**

- `cheatProtocol`: parse input hợp lệ, input rác, thiếu field, sai kiểu.
- `roomReducer`: toàn bộ bảng state machine ở mục 5, gồm cả message sai vai.
- Logic game, mỗi game × `lose` / `win`:
  - forced lose → thua đúng ô vừa ấn
  - forced win khi ô đó là bẫy → di dời, trả `safe`
  - forced win khi ô đó **không** phải bẫy → không đổi gì
  - không còn chỗ di dời → trả kết quả thua bình thường
  - press `ignored` **không** tiêu thụ bẫy
  - `mineIndices.length === mineCount` sau mọi nhánh
  - forced lose khi ô vừa ấn **đã là mìn** → không trùng index, `length` không đổi
- **Test hồi quy quan trọng nhất:** `forced` bỏ trống → kết quả y hệt hành vi hiện tại.
- 420 test đang có phải tiếp tục pass.
- Đo lại độ trễ press (mục 7).

**Không test được ở máy dev:** kết nối thật giữa hai điện thoại, và deploy Worker lên account của người dùng.

**Phải thử tay trên 2 máy:** gài thua → ấn → thua đúng ô ấn; gài thoát → ấn ô bẫy → thoát; reload máy chơi khi đang gài → bẫy còn; tắt mạng máy chơi → game chạy bình thường.

## 13. Deploy

- Worker deploy **riêng** bằng `wrangler deploy`, được subdomain `*.workers.dev`. Cloudflare **Pages Functions không khai báo được DO class**, nên không gộp vào Pages đang chạy được.
- Pages hiện tại không bị ảnh hưởng.
- `wrangler` là devDependency — không vào bundle app, không ảnh hưởng `audit:build`.

## 14. Việc cần xác nhận trước khi code

**Durable Objects trên account Cloudflare của bé.** DO có trong free plan (mở từ 4/2025, loại SQLite-backed), nhưng tôi không xem được account từ máy dev. Bé kiểm lại giúp. Nếu account không dùng được DO thì phương án thay là Supabase Realtime, chấp nhận thêm ~40KB vào bundle và phải kiểm lại `audit:build`.
