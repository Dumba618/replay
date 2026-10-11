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
  "intro.unlocked": { en: "Play to earn your discount.", ka: "ითამაშეთ ფასდაკლების მისაღებად." },
  "intro.skill": { en: "Your score sets the reward: the better you play, the bigger it gets.", ka: "ჯილდოს თქვენი ქულა განსაზღვრავს: რაც უკეთ ითამაშებთ, მით დიდია." },
  "intro.luck": { en: "The server draws your reward at random when you play. Nothing you do changes the odds.", ka: "ჯილდოს სერვერი თამაშისას შემთხვევითად ირჩევს. თქვენი მოქმედება შანსებს ვერ ცვლის." },
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
  "reveal.set": { en: "Your reward was drawn at random just now.", ka: "თქვენი ჯილდო ახლახან შემთხვევითად შეირჩა." },
  "catch.hint": { en: "Drag to move the bin. Catch gadgets (check), dodge food and plastic (cross). It speeds up as you go. A battery adds a heart, a golden coin is worth 5x.", ka: "გადაათრიეთ ურნა. დაიჭირეთ გაჯეტები (ნიშნული), აარიდეთ საკვები და პლასტმასა (ჯვარი). თამაში თანდათან ჩქარდება. ბატარეა სიცოცხლეს ამატებს, ოქროს მონეტა 5-ჯერ მეტს ღირს." },
  "catch.left": { en: "Move left", ka: "მარცხნივ" },
  "catch.right": { en: "Move right", ka: "მარჯვნივ" },
  "pick.hint": { en: "Pick a device. The server draws your reward when you pick.", ka: "აირჩიეთ მოწყობილობა. ჯილდოს სერვერი არჩევისას შემთხვევითად ირჩევს." },
  "pick.box": { en: "Device", ka: "მოწყობილობა" },
  "claw.hint": { en: "Move the claw, then press Grab. Your reward is drawn when you grab.", ka: "გადაადგილეთ კლანჭი და დააჭირეთ ღილაკს „აღება“. ჯილდო აღებისას შეირჩევა." },
  "claw.grab": { en: "Grab", ka: "აღება" },
  "wheel.hint": { en: "Tap spin. The server draws your reward when you spin.", ka: "დააჭირეთ დატრიალებას. ჯილდოს სერვერი დატრიალებისას შემთხვევითად ირჩევს." },
  "wheel.spin": { en: "Spin the wheel", ka: "დაატრიალეთ ბორბალი" },
  "result.stars": { en: "stars", ka: "ვარსკვლავი" },
  "result.score": { en: "Score", ka: "ქულა" },
  "sheet.title": { en: "How rewards work", ka: "როგორ მუშაობს ჯილდოები" },
  "sheet.p1": { en: "Your level sets the highest reward you can reach, and every reward is at least 15% off.", ka: "თქვენი დონე განსაზღვრავს მაქსიმალურ ჯილდოს; ყველა ჯილდო მინიმუმ 15%-იანი ფასდაკლებაა." },
  "sheet.p2": { en: "In skill games (Recycle Catch and Sky Flap) a better score earns a bigger reward.", ka: "უნარის თამაშებში („გადამუშავების დაჭერა“ და „ცაში ფრენა“) უკეთესი ქულა უფრო დიდ ჯილდოს გაძლევთ." },
  "sheet.p3": { en: "In luck games (Fortune Wheel, Pick a Device, Claw Machine) the server draws your reward at random when you play. What you do in the game cannot change the odds.", ka: "იღბლის თამაშებში (ფორტუნის ბორბალი, აირჩიეთ მოწყობილობა, კლანჭის აპარატი) სერვერი ჯილდოს თამაშისას შემთხვევითად ირჩევს. თქვენი მოქმედება თამაშში შანსებს ვერ ცვლის." },
  "sheet.p4": { en: "Your score is sent once, to work out your reward. Stars and best scores stay on this phone, and there is no leaderboard.", ka: "თქვენი ქულა ერთხელ იგზავნება ჯილდოს გამოსათვლელად. ვარსკვლავები და საუკეთესო ქულები ინახება ამ ტელეფონში, რეიტინგის გარეშე." },
  "sheet.p5": { en: "Difficulty does not depend on your level. It rises as you play.", ka: "სირთულე დონეზე არ არის დამოკიდებული. თამაშის განმავლობაში ის იზრდება." },
  "sheet.p6": { en: "You can skip at any time. Skipping a skill game rewards the score you have so far.", ka: "გამოტოვება ნებისმიერ დროს შეგიძლიათ. უნარის თამაშში გამოტოვებისას ჯილდო მიმდინარე ქულით გამოითვლება." },
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
  "intro.range": { en: "Reward at your level:", ka: "ჯილდო თქვენს დონეზე:" },
  "reveal.skill": { en: "Your reward is based on your score.", ka: "თქვენი ჯილდო ქულაზეა დამოკიდებული." },
  "reward.counting": { en: "Working out your reward...", ka: "ჯილდოს ვანგარიშობთ..." },
  "reward.error": { en: "Couldn't reach the server. Check your connection and try again.", ka: "სერვერთან დაკავშირება ვერ მოხერხდა. შეამოწმეთ კავშირი და სცადეთ თავიდან." },
  "reward.retry": { en: "Try again", ka: "სცადეთ თავიდან" },
  "flap.hint": { en: "Tap to flap. Fly through the gaps: every gate raises your reward.", ka: "შეეხეთ ფრთების საქნევად. გაიარეთ ღიობები: თითოეული კარიბჭე ჯილდოს ზრდის." },
  "intro.choose": { en: "Choose your game", ka: "აირჩიეთ თამაში" },
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
