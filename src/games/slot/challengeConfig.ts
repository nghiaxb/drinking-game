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
