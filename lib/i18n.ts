"use client";

import { useEffect, useState } from "react";

/**
 * Tiny dictionary for the game copy. Georgian text was written without a
 * native review: see the "needs review" list in the project report.
 */
export type Lang = "en" | "ka";

const LANG_KEY = "replay.lang";
const LANG_EVENT = "replay:lang";

const STRINGS = {
  "intro.unlocked": { en: "Your reward is already unlocked.", ka: "თქვენი ჯილდო უკვე გახსნილია." },
  "intro.fun": { en: "This game is just for fun and stars. It can't change your reward.", ka: "ეს თამაში მხოლოდ გასართობია და ვარსკვლავებისთვის. ის ჯილდოს ვერ შეცვლის." },
  "intro.local": { en: "Stars are saved only on this phone.", ka: "ვარსკვლავები ინახება მხოლოდ ამ ტელეფონში." },
  "intro.play": { en: "Play", ka: "თამაში" },
  "intro.revealNow": { en: "Reveal now", ka: "აჩვენე ახლავე" },
  "intro.how": { en: "How rewards work", ka: "როგორ მუშაობს ჯილდოები" },
  "hud.skip": { en: "Skip to reward", ka: "ჯილდოზე გადასვლა" },
  "hud.score": { en: "Score", ka: "ქულა" },
  "hud.lives": { en: "Lives", ka: "სიცოცხლე" },
  "hud.combo": { en: "Combo", ka: "კომბო" },
  "hud.seconds": { en: "seconds left", ka: "წამი დარჩა" },
  "reveal.title": { en: "Your reward", ka: "თქვენი ჯილდო" },
  "reveal.off": { en: "off", ka: "ფასდაკლება" },
  "reveal.show": { en: "Show my voucher", ka: "ვაუჩერის ჩვენება" },
  "reveal.practice": { en: "Practice round, no reward", ka: "სავარჯიშო რაუნდი, ჯილდოს გარეშე" },
  "reveal.set": { en: "Your reward was set when your drop-off was confirmed.", ka: "თქვენი ჯილდო განისაზღვრა ჩაბარების დადასტურებისას." },
  "catch.hint": { en: "Drag to move the bin. Catch gadgets (check), dodge food and plastic (cross). A battery adds a heart, a golden coin is worth 5x.", ka: "გადაათრიეთ ურნა. დაიჭირეთ გაჯეტები (ნიშნული), აარიდეთ საკვები და პლასტმასა (ჯვარი). ბატარეა სიცოცხლეს ამატებს, ოქროს მონეტა 5-ჯერ მეტს ღირს." },
  "catch.left": { en: "Move left", ka: "მარცხნივ" },
  "catch.right": { en: "Move right", ka: "მარჯვნივ" },
  "pick.hint": { en: "Pick a device. Your reward is already set, so picking is just for fun.", ka: "აირჩიეთ მოწყობილობა. თქვენი ჯილდო უკვე განსაზღვრულია, არჩევანი მხოლოდ გასართობია." },
  "pick.box": { en: "Device", ka: "მოწყობილობა" },
  "claw.hint": { en: "Move the claw, then press Grab. Your reward is already set.", ka: "გადაადგილეთ კლანჭი და დააჭირეთ ღილაკს „აღება“. თქვენი ჯილდო უკვე განსაზღვრულია." },
  "claw.grab": { en: "Grab", ka: "აღება" },
  "wheel.hint": { en: "Tap spin. The wheel shows the reward that was already set.", ka: "დააჭირეთ დატრიალებას. ბორბალი აჩვენებს უკვე განსაზღვრულ ჯილდოს." },
  "wheel.spin": { en: "Spin the wheel", ka: "დაატრიალეთ ბორბალი" },
  "result.stars": { en: "stars", ka: "ვარსკვლავი" },
  "result.score": { en: "Score", ka: "ქულა" },
  "sheet.title": { en: "How rewards work", ka: "როგორ მუშაობს ჯილდოები" },
  "sheet.p1": { en: "Your reward is decided by RePlay's server the moment your drop-off is confirmed.", ka: "ჯილდოს RePlay-ის სერვერი ადგენს იმ წუთს, როცა თქვენი ჩაბარება დადასტურდება." },
  "sheet.p2": { en: "Games never change it. Your score, speed and choices have no effect on your reward.", ka: "თამაშები მას არასოდეს ცვლის. თქვენი ქულა, სიჩქარე და არჩევანი ჯილდოზე გავლენას არ ახდენს." },
  "sheet.p3": { en: "Stars (0 to 3) and scores are for fun. They are saved only on this phone, with no leaderboard.", ka: "ვარსკვლავები (0-დან 3-მდე) და ქულა გასართობია. ისინი ინახება მხოლოდ ამ ტელეფონში, რეიტინგის გარეშე." },
  "sheet.p4": { en: "In Pick a Device and the Claw Machine it can look like you are choosing. You are not: the result is already set.", ka: "„აირჩიეთ მოწყობილობა“ და „კლანჭის აპარატში“ შეიძლება ისე ჩანდეს, თითქოს თქვენ ირჩევთ. სინამდვილეში შედეგი უკვე განსაზღვრულია." },
  "sheet.p5": { en: "Difficulty does not depend on your level. Your level only changes which rewards are possible.", ka: "სირთულე თქვენს დონეზე არ არის დამოკიდებული. დონე მხოლოდ იმას განსაზღვრავს, რა ჯილდოებია შესაძლებელი." },
  "sheet.p6": { en: "You can always skip straight to your reward.", ka: "ჯილდოზე პირდაპირ გადასვლა ყოველთვის შეგიძლიათ." },
  "sheet.close": { en: "Got it", ka: "გასაგებია" },
  "confirmed.title": { en: "Drop-off confirmed", ka: "ჩაბარება დადასტურდა" },
  "confirmed.sub": { en: "Thank you for recycling.", ka: "გმადლობთ გადამუშავებისთვის." },
  "ticket.title": { en: "Your voucher", ka: "თქვენი ვაუჩერი" },
  "ticket.stars": { en: "Stars this round (just for fun)", ka: "ვარსკვლავები ამ რაუნდში (გასართობად)" },
  "ticket.done": { en: "Done", ka: "მზადაა" },
  "ticket.missing": { en: "The reward could not be loaded. Ask the clerk for help.", ka: "ჯილდოს ჩატვირთვა ვერ მოხერხდა. მიმართეთ გამყიდველს." },
  "done.title": { en: "All set. See you next time!", ka: "ყველაფერი მზადაა. შემდეგ ჯერზე გნახავთ!" },
  "done.another": { en: "Hand in another item", ka: "კიდევ ერთი ნივთის ჩაბარება" },
  "done.profile": { en: "My profile and practice games", ka: "ჩემი პროფილი და სავარჯიშო თამაშები" },
  "level.continue": { en: "Continue", ka: "გაგრძელება" },
  "me.title": { en: "My profile", ka: "ჩემი პროფილი" },
  "me.practice": { en: "Practice games", ka: "სავარჯიშო თამაშები" },
  "me.practiceNote": { en: "No reward is involved here. Stars and best scores stay on this phone.", ka: "აქ ჯილდო არ არის. ვარსკვლავები და საუკეთესო ქულები ინახება მხოლოდ ამ ტელეფონში." },
  "me.best": { en: "Best", ka: "საუკეთესო" },
  "me.totalStars": { en: "Stars collected", ka: "შეგროვებული ვარსკვლავები" },
  "me.plays": { en: "Games played", ka: "თამაშების რაოდენობა" },
  "me.language": { en: "Language", ka: "ენა" },
  "me.back": { en: "Back to RePlay", ka: "უკან RePlay-ში" },
  "me.close": { en: "Close", ka: "დახურვა" },
  "me.playAgain": { en: "Play again", ka: "თავიდან თამაში" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function translate(lang: Lang, key: StringKey): string {
  return STRINGS[key][lang];
}

function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "ka") return stored;
  } catch {
    // ignore and fall back to the browser language
  }
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ka") ? "ka" : "en";
}

export function setLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(LANG_EVENT));
}

/** Current language plus a bound translator. Starts as "en" on the server to avoid hydration mismatches. */
export function useLang(): { lang: Lang; t: (key: StringKey) => string } {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const sync = () => setLangState(detectLang());
    sync();
    window.addEventListener(LANG_EVENT, sync);
    return () => window.removeEventListener(LANG_EVENT, sync);
  }, []);
  return { lang, t: (key) => translate(lang, key) };
}
