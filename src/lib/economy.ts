// Star Coins economy (M6 §20.4). Pure — the reward layer over the frozen pedagogy engine.
// Coins are cosmetic currency only (spent in the shop); they NEVER affect difficulty, mastery,
// or what is taught. Assessment answers earn the full amount; deliberately-easy reps (interleave/
// thread/fluency/SRS-review/guided/down-shift, tagged Attempt.review) earn a token amount so the
// economy tracks real work, mirroring the accuracy rules (§ readiness).
export const COIN_CORRECT = 5   // a correct assessment answer
export const COIN_REVIEW = 1    // a correct non-assessment rep
export const COIN_CERT = 50     // a pattern certificate (retention-confirmed mastery)

// Coins for a single answer. `review` = the item was a non-assessment rep.
export function coinsForAnswer(correct: boolean, review: boolean): number {
  if (!correct) return 0
  return review ? COIN_REVIEW : COIN_CORRECT
}
