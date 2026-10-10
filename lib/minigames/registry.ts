import { ItemCategory } from "@/types";
import type { MinigameDef, MinigameId } from "@/lib/minigames/types";

/** No game may run longer than this; the host ends it gracefully at the cap. */
export const HARD_CAP_SEC = 30;
/** Skip button appears after this many seconds of play. */
export const SKIP_AFTER_SEC = 3;

/**
 * A game is `enabled` ONLY when it is fully implemented and covered by
 * `npm run test:minigames`. The affinity lists are a light content choice
 * (a matching game is twice as likely), not a fairness lever.
 */
export const MINIGAMES: Readonly<Record<MinigameId, MinigameDef>> = {
  WHEEL: {
    id: "WHEEL",
    enabled: true,
    kind: "LUCK",
    labelEn: "Fortune Wheel",
    labelKa: "ფორტუნის ბორბალი",
    descEn: "Give the wheel a spin and watch it land on your reward.",
    descKa: "დაატრიალეთ ბორბალი და ნახეთ, რომელ ჯილდოზე გაჩერდება.",
    icon: "sparkles",
    durationSec: 20,
    starThresholds: null,
    categoryAffinity: [ItemCategory.LAPTOP, ItemCategory.MONITOR],
  },
  RECYCLE_CATCH: {
    id: "RECYCLE_CATCH",
    enabled: true,
    kind: "SKILL",
    labelEn: "Recycle Catch",
    labelKa: "გადამუშავების დაჭერა",
    descEn: "Catch falling gadgets in the recycling bin. Dodge bananas and plastic.",
    descKa: "დაიჭირეთ ჩამოვარდნილი გაჯეტები გადამამუშავებელ ურნაში. აარიდეთ ბანანი და პლასტმასა.",
    icon: "recycle",
    durationSec: 25,
    starThresholds: [200, 400, 650],
    categoryAffinity: [ItemCategory.PHONE, ItemCategory.CABLE, ItemCategory.BATTERY],
  },
  PICK_BOX: {
    id: "PICK_BOX",
    enabled: true,
    kind: "LUCK",
    labelEn: "Pick a Device",
    labelKa: "აირჩიეთ მოწყობილობა",
    descEn: "Tap a gadget to see your reward.",
    descKa: "შეეხეთ გაჯეტს და ნახეთ თქვენი ჯილდო.",
    icon: "gift",
    durationSec: 20,
    starThresholds: null,
    categoryAffinity: [ItemCategory.LAPTOP, ItemCategory.CABLE],
  },
  CLAW: {
    id: "CLAW",
    enabled: true,
    kind: "LUCK",
    labelEn: "Claw Machine",
    labelKa: "კლანჭის აპარატი",
    descEn: "Steer the claw and grab a gadget to see your reward.",
    descKa: "მართეთ კლანჭი, აიღეთ გაჯეტი და ნახეთ თქვენი ჯილდო.",
    icon: "grab",
    durationSec: 20,
    starThresholds: null,
    categoryAffinity: [ItemCategory.MONITOR, ItemCategory.PHONE],
  },
};

export const MINIGAME_IDS: readonly MinigameId[] = ["WHEEL", "RECYCLE_CATCH", "PICK_BOX", "CLAW"];

export function enabledMinigames(): MinigameId[] {
  return MINIGAME_IDS.filter((id) => MINIGAMES[id].enabled);
}

export function isMinigameId(value: unknown): value is MinigameId {
  return typeof value === "string" && (MINIGAME_IDS as readonly string[]).includes(value);
}

/** 0-3 cosmetic stars for a score. LUCK games (no thresholds) always give 0. */
export function starsForScore(id: MinigameId, score: number): 0 | 1 | 2 | 3 {
  const thresholds = MINIGAMES[id].starThresholds;
  if (!thresholds) return 0;
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
