import { Retailer } from "@/types";
import type { ItemDef, SpriteName, StoreTheme, ThemeDef } from "@/lib/minigames/types";

const make = (kind: ItemDef["kind"]) => (id: string, labelEn: string, labelKa: string, icon: SpriteName): ItemDef => ({ id, labelEn, labelKa, icon, kind });
const good = make("GOOD");
const bad = make("BAD");
const power = make("BATTERY");
const bonus = make("BONUS");

export const THEMES: Readonly<Record<StoreTheme, ThemeDef>> = {
  ELECTRONICS: {
    id: "ELECTRONICS",
    labelEn: "Electronics store",
    labelKa: "ელექტრონიკის მაღაზია",
    good: [
      good("laptop", "Laptop", "ლეპტოპი", "laptop"),
      good("phone", "Phone", "სმარტფონი", "smartphone"),
      good("monitor", "Monitor", "მონიტორი", "monitor"),
      good("headphones", "Headphones", "ყურსასმენი", "headphones"),
      good("camera", "Camera", "კამერა", "camera"),
      good("controller", "Game controller", "გეიმფედი", "controller"),
      good("speaker", "Speaker", "დინამიკი", "speaker"),
      good("charger", "Charger", "დამტენი", "charger"),
    ],
    bad: [
      bad("banana", "Banana", "ბანანი", "banana"),
      bad("apple", "Apple", "ვაშლი", "apple"),
      bad("carrot", "Carrot", "სტაფილო", "carrot"),
      bad("pizza", "Pizza", "პიცა", "pizza"),
      bad("soda", "Plastic cup", "პლასტმასის ჭიქა", "soda"),
      bad("egg", "Egg", "კვერცხი", "egg"),
    ],
    batteries: [power("battery", "Battery", "ბატარეა", "battery"), power("battery-green", "Battery", "ბატარეა", "battery-green")],
    bonus: [bonus("gold-coin", "Golden coin", "ოქროს მონეტა", "star")],
    boxLabelEn: "Recycling bin",
    boxLabelKa: "გადამამუშავებელი ურნა",
  },
  // Data only: no retailer uses it yet. It exists to prove the system is data-driven.
  SUPERMARKET: {
    id: "SUPERMARKET",
    labelEn: "Supermarket",
    labelKa: "სუპერმარკეტი",
    good: [good("cup", "Cup", "ჭიქა", "soda"), good("carton", "Carton", "მუყაოს შეფუთვა", "milk")],
    bad: [bad("battery", "Battery", "ბატარეა", "battery"), bad("charger", "Charger", "დამტენი", "charger")],
    batteries: [],
    bonus: [bonus("gold-coin", "Golden coin", "ოქროს მონეტა", "star")],
    boxLabelEn: "Recycling bin",
    boxLabelKa: "გადამამუშავებელი ურნა",
  },
};

/** Every retailer uses the electronics theme today. */
export const STORE_THEME_BY_RETAILER: Readonly<Record<Retailer, StoreTheme>> = {
  [Retailer.ELIT]: "ELECTRONICS",
  [Retailer.ZOOMMER]: "ELECTRONICS",
  [Retailer.ALTA]: "ELECTRONICS",
  [Retailer.GSTORE]: "ELECTRONICS",
};
