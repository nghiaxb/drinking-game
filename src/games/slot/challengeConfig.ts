export const DICE_CHALLENGES = [
  'Hát 15 giây',
  'Nhảy 10 giây',
  'Bắt chước người bên cạnh',
  'Đổi giọng nói 1 lượt',
  'Oẳn tù tì với người bên cạnh',
  'Thử thách 5 giây',
  'Kể một bí mật nhỏ',
  'Chụp selfie nhóm',
] as const

export type DiceChallenge = (typeof DICE_CHALLENGES)[number]

/**
 * Three different symbols is over half of all pulls, so it cannot be a dead turn — but it also
 * cannot be a drink every time or the game floods. Mostly light business, a little drinking.
 */
export const MISS_ACTIONS = [
  'Chuyền cần cho người bên phải',
  'Ai cười đầu tiên uống 1 ngụm',
  'Cả bàn chạm ly, chưa ai uống',
  'Người bên trái kéo thay bạn lượt tới',
  'Giữ nguyên ly — lượt này bạn thoát',
  'Ai đang cầm điện thoại uống 1 ngụm',
  'Kể một lý do để cả bàn nâng ly',
  'Đoán xem lượt tới có ăn không',
] as const

export type MissAction = (typeof MISS_ACTIONS)[number]
