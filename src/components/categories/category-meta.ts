import type React from "react";
import {
  Cog,
  Disc,
  Zap,
  CircleDot,
  BatteryCharging,
  Filter,
  Droplet,
  Car,
  Wrench,
  Fuel,
  Cpu,
  Fan,
  Lightbulb,
  Layers,
  Boxes,
  Activity,
  Sliders,
  RotateCw,
  Tags,
  Package,
  Shield,
} from "lucide-react";

export interface CategoryTheme {
  bg: string;
  text: string;
  badge: string;
}

export const THEMES: Record<string, CategoryTheme> = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  yellow: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  teal: {
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  cyan: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  sky: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  orange: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  slate: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
};

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function getCategoryMeta(name: string): { Icon: React.ElementType; theme: CategoryTheme } {
  const n = name.toLowerCase().trim();

  let Icon: React.ElementType = Package;
  let themeKey = "blue";

  if (n.includes("akkumulyator") || n.includes("batarey") || n.includes("akkum")) {
    Icon = BatteryCharging;
    themeKey = "amber";
  } else if (
    n.includes("elektr") ||
    n.includes("babina") ||
    n.includes("svecha") ||
    n.includes("generator") ||
    n.includes("starter") ||
    n.includes("provod")
  ) {
    Icon = Zap;
    themeKey = "amber";
  } else if (
    n.includes("datchik") ||
    n.includes("rele") ||
    n.includes("kompyuter") ||
    n.includes("mita")
  ) {
    Icon = Cpu;
    themeKey = "cyan";
  } else if (
    n.includes("far") ||
    n.includes("chiroq") ||
    n.includes("stop") ||
    n.includes("tuman") ||
    n.includes("lampa")
  ) {
    Icon = Lightbulb;
    themeKey = "yellow";
  } else if (
    n.includes("mator") ||
    n.includes("dvigatel") ||
    n.includes("motor") ||
    n.includes("porshen") ||
    n.includes("val") ||
    n.includes("shatun") ||
    n.includes("kolenval") ||
    n.includes("galovka") ||
    n.includes("kilapin") ||
    n.includes("kladish") ||
    n.includes("kollekt")
  ) {
    Icon = Cog;
    themeKey = "blue";
  } else if (
    n.includes("tormoz") ||
    n.includes("kalotka") ||
    n.includes("aporni") ||
    n.includes("vakum")
  ) {
    Icon = Disc;
    themeKey = "rose";
  } else if (
    n.includes("baraban") ||
    n.includes("diska") ||
    n.includes("shina") ||
    n.includes("ballon") ||
    n.includes("pachenik") ||
    n.includes("podshipnik")
  ) {
    Icon = CircleDot;
    themeKey = "emerald";
  } else if (
    n.includes("amarzator") ||
    n.includes("amortizator") ||
    n.includes("podveska") ||
    n.includes("prujina") ||
    n.includes("resor") ||
    n.includes("stoyka")
  ) {
    Icon = Activity;
    themeKey = "violet";
  } else if (
    n.includes("balka") ||
    n.includes("rychag") ||
    n.includes("richag") ||
    n.includes("tyaga") ||
    n.includes("sharavoy") ||
    n.includes("napravlash")
  ) {
    Icon = Wrench;
    themeKey = "purple";
  } else if (
    n.includes("kuzov") ||
    n.includes("bamfer") ||
    n.includes("bamper") ||
    n.includes("kapot") ||
    n.includes("eshik") ||
    n.includes("krilo") ||
    n.includes("brizgavek") ||
    n.includes("jabra") ||
    n.includes("oyna") ||
    n.includes("arka")
  ) {
    Icon = Car;
    themeKey = "teal";
  } else if (
    n.includes("karopka") ||
    n.includes("uzatma") ||
    n.includes("korobka") ||
    n.includes("reduktor") ||
    n.includes("mexanizm")
  ) {
    Icon = Boxes;
    themeKey = "indigo";
  } else if (
    n.includes("kardan") ||
    n.includes("kristavina") ||
    n.includes("padvisnoy") ||
    n.includes("palavos") ||
    n.includes("bendiks") ||
    n.includes("granata") ||
    n.includes("shrus")
  ) {
    Icon = RotateCw;
    themeKey = "sky";
  } else if (n.includes("filtr") || n.includes("ochistka")) {
    Icon = Filter;
    themeKey = "teal";
  } else if (
    n.includes("benzin") ||
    n.includes("yoqilgi") ||
    n.includes("bak") ||
    n.includes("nasos")
  ) {
    Icon = Fuel;
    themeKey = "orange";
  } else if (
    n.includes("moy") ||
    n.includes("suyuqlik") ||
    n.includes("antifriz") ||
    n.includes("tosol") ||
    n.includes("bachok") ||
    n.includes("patrubka")
  ) {
    Icon = Droplet;
    themeKey = "cyan";
  } else if (
    n.includes("difezor") ||
    n.includes("ventilyator") ||
    n.includes("radiator") ||
    n.includes("pechka")
  ) {
    Icon = Fan;
    themeKey = "sky";
  } else if (
    n.includes("prklatka") ||
    n.includes("prokladka") ||
    n.includes("salnik") ||
    n.includes("rezina") ||
    n.includes("nabor")
  ) {
    Icon = Layers;
    themeKey = "emerald";
  } else if (
    n.includes("gayga") ||
    n.includes("bolt") ||
    n.includes("shayba") ||
    n.includes("samorez") ||
    n.includes("shurup")
  ) {
    Icon = Sliders;
    themeKey = "slate";
  } else if (n.includes("zashita") || n.includes("himoya") || n.includes("podkrilnik")) {
    Icon = Shield;
    themeKey = "emerald";
  } else {
    const palette = [
      "indigo",
      "emerald",
      "blue",
      "violet",
      "teal",
      "rose",
      "cyan",
      "amber",
      "orange",
      "purple",
    ];
    themeKey = palette[Math.abs(hashString(name)) % palette.length];
    Icon = Tags;
  }

  return { Icon, theme: THEMES[themeKey] || THEMES.blue };
}
