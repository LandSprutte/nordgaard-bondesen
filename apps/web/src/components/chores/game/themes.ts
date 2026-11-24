import * as React from "react"

/**
 * Worlds the weekly voyage can be played in. Only the story changes:
 * doubloons, the treasure chest and the Sunday penalty work the same in all.
 */
export type ThemeId = "pirat" | "traktor" | "spindelhelt" | "wakeboard"

export type VoyageTheme = {
  id: ThemeId
  label: string
  emoji: string
  /** Background of the voyage card while sailing, and once arrived. */
  background: string
  backgroundArrived: string
  /** Colour of the small "Uge 48 · …" line. */
  eyebrow: string
  headline: {
    empty: string
    start: string
    underway: string
    halfway: string
    arrived: string
  }
  /** Explains the Sunday penalty in this world. */
  warning: string
  arrivedText: string
  /** Where the treasure is. */
  goal: string
  crewTitle: string
  /** Title for whoever earned the most this week. */
  captain: string
  questsTitle: string
  /** Stamp on a finished chore. */
  stamp: string
  /** Question when picking who finished a chore. */
  whoDidIt: string
  /** Name of the week, after "Uge 48 · 23.–29. nov.". */
  weekName: string
  /** The Sunday penalty, as a boss the crew fights all week. */
  boss: { face: string; name: string; meta: string }
  /** What the crew's level is called. */
  teamLevel: string
  /** Titles by level: beginner (LV 1–3), seasoned (4–6), master (7+). */
  levelTitles: [string, string, string]
  /** Chore rarity by reward: under 100, under 300, 300 and up. */
  rarity: [string, string, string]
  /** Comic words that pop up in the scene when a chore is done. */
  pow: Array<string>
  doneLabel: string
  badgesTitle: string
  /** [emoji, name, how to get it] for: first chore, 3 days in a row, a gold chore, all chores. */
  badges: [Badge, Badge, Badge, Badge]
  /** Toast when someone finishes a chore. */
  cheer: (name: string) => string
}

export type Badge = [emoji: string, name: string, how: string]

export const THEMES: Record<ThemeId, VoyageTheme> = {
  pirat: {
    id: "pirat",
    label: "Pirat",
    emoji: "🏴‍☠️",
    background:
      "bg-[linear-gradient(160deg,#0b1437_0%,#1e3a8a_50%,#0e7490_100%)]",
    backgroundArrived:
      "bg-[linear-gradient(150deg,#451a03_0%,#b45309_50%,#f59e0b_100%)]",
    eyebrow: "text-cyan-200/90",
    headline: {
      empty: "Skibet ligger i havn",
      start: "Let anker!",
      underway: "Fulde sejl frem!",
      halfway: "Land i sigte, bliv ved!",
      arrived: "Skatten er fundet! 🏴‍☠️",
    },
    warning:
      "Ligger en tjans stadig søndag aften, mister hele besætningen 10% af sine dubloner for den.",
    arrivedText:
      "Hver eneste tjans er klaret. Ingen dødningehoveder dette togt!",
    goal: "Skatteøen",
    crewTitle: "Besætningen",
    captain: "Kaptajn",
    questsTitle: "Tjanser",
    stamp: "Klaret!",
    whoDidIt: "Hvem klarede den, matros?",
    weekName: "Kapertogtet",
    boss: {
      face: "🐙",
      name: "Kraken Klamfisk",
      meta: "Dukker op søndag ved midnat. Hver klaret tjans hugger en arm af.",
    },
    teamLevel: "Skibets niveau",
    levelTitles: ["Dæksdreng", "Matros", "Styrmand"],
    rarity: ["Hverdag", "Fed fangst", "Kongeskat"],
    pow: ["ARRR!", "BOOM!", "YO-HO!"],
    doneLabel: "Tjanser klaret",
    badgesTitle: "Medaljer",
    badges: [
      ["⚓", "Første tjans", "Klar en tjans"],
      ["🦜", "Tre dage i træk", "3 dage i træk"],
      ["💎", "Kongeskat", "Klar en guldtjans"],
      ["🏴‍☠️", "Hele togtet", "Klar alle tjanser"],
    ],
    cheer: (name) => `${name} hev en tjans i land!`,
  },
  traktor: {
    id: "traktor",
    label: "Traktor",
    emoji: "🚜",
    background:
      "bg-[linear-gradient(180deg,#075985_0%,#0284c7_45%,#3f6212_100%)]",
    backgroundArrived:
      "bg-[linear-gradient(180deg,#9a3412_0%,#d97706_50%,#3f6212_100%)]",
    eyebrow: "text-lime-200",
    headline: {
      empty: "Traktoren holder i laden",
      start: "Start motoren!",
      underway: "Fuld gas på marken!",
      halfway: "Laden er i sigte, giv den gas!",
      arrived: "Høsten er i hus! 🌾",
    },
    warning:
      "Ligger der stadig en tjans i marken søndag aften, æder vildsvinet 10% af alles dubloner for den.",
    arrivedText: "Hele marken er pløjet. Skattekisten i laden er jeres!",
    goal: "Skatteladen",
    crewTitle: "Gårdens mandskab",
    captain: "Storbonde",
    questsTitle: "Markarbejde",
    stamp: "Høstet!",
    whoDidIt: "Hvem kørte den i hus?",
    weekName: "Høstugen",
    boss: {
      face: "🐗",
      name: "Vildsvinet Bøvl",
      meta: "Roder i marken søndag ved midnat. Hver klaret tjans lukker et hul i hegnet.",
    },
    teamLevel: "Gårdens niveau",
    levelTitles: ["Markhjælper", "Traktorfører", "Storbonde"],
    rarity: ["Hverdag", "God høst", "Guldhøst"],
    pow: ["BRUM!", "VROOM!", "HØST!"],
    doneLabel: "Marker pløjet",
    badgesTitle: "Rosetter",
    badges: [
      ["🌱", "Første fure", "Klar en tjans"],
      ["🐓", "Tidligt op", "3 dage i træk"],
      ["🌾", "Guldhøst", "Klar en guldtjans"],
      ["🏚️", "Fuld lade", "Klar alle tjanser"],
    ],
    cheer: (name) => `${name} pløjede et stykke mark!`,
  },
  spindelhelt: {
    id: "spindelhelt",
    label: "Spindelhelt",
    emoji: "🕸️",
    background:
      "bg-[linear-gradient(180deg,#05061a_0%,#1b1f63_55%,#4c1d95_100%)]",
    backgroundArrived:
      "bg-[linear-gradient(180deg,#1b1f63_0%,#be123c_60%,#f59e0b_100%)]",
    eyebrow: "text-rose-300",
    headline: {
      empty: "Byen sover stille",
      start: "Byen kalder!",
      underway: "Sving videre over tagene!",
      halfway: "Tårnet er i sigte, hold fast!",
      arrived: "Byen er reddet! 🕸️",
    },
    warning:
      "Står der stadig en mission tilbage søndag aften, stjæler Rodemesteren 10% af alles dubloner for den.",
    arrivedText: "Alle missioner er klaret. Rodemesteren må give op!",
    goal: "Skattetårnet",
    crewTitle: "Heltene",
    captain: "Holdleder",
    questsTitle: "Missioner",
    stamp: "Reddet!",
    whoDidIt: "Hvilken helt klarede den?",
    weekName: "Nattevagten",
    boss: {
      face: "👾",
      name: "Rodemesteren",
      meta: "Slår til søndag ved midnat. Hver mission I klarer, tager et liv fra ham.",
    },
    teamLevel: "Heltenes niveau",
    levelTitles: ["Rookie", "Nabolagshelt", "Byens helt"],
    rarity: ["Gadepatrulje", "Farlig", "Superskurk"],
    pow: ["THWIP!", "POW!", "ZAP!"],
    doneLabel: "Redninger",
    badgesTitle: "Heltemærker",
    badges: [
      ["🕸️", "Første redning", "Klar en mission"],
      ["🌙", "Tre nætter", "3 dage i træk"],
      ["💥", "Superskurk fanget", "Klar en guldmission"],
      ["🏙️", "Byen er sikker", "Klar alle missioner"],
    ],
    cheer: (name) => `${name} reddede dagen!`,
  },
  wakeboard: {
    id: "wakeboard",
    label: "Wakeboard",
    emoji: "🏄",
    background:
      "bg-[linear-gradient(180deg,#9a3412_0%,#c2410c_35%,#0e7490_75%,#164e63_100%)]",
    backgroundArrived:
      "bg-[linear-gradient(180deg,#9d174d_0%,#d97706_40%,#0e7490_80%,#164e63_100%)]",
    eyebrow: "text-amber-200",
    headline: {
      empty: "Båden ligger ved broen",
      start: "Hold linen stram!",
      underway: "Send it over søen!",
      halfway: "Rampen er i sigte!",
      arrived: "Landet perfekt! 🤙",
    },
    warning:
      "Er der stadig et run tilbage søndag aften, skyller stormen 10% af alles dubloner væk for det.",
    arrivedText: "Alle runs er landet. Skatteøen er jeres!",
    goal: "Skatteøen",
    crewTitle: "Crewet",
    captain: "Pro rider",
    questsTitle: "Runs",
    stamp: "Landet!",
    whoDidIt: "Hvem landede den?",
    weekName: "Sæsonens run",
    boss: {
      face: "⛈️",
      name: "Søndagsstormen",
      meta: "Rammer søen søndag ved midnat. Hver landet run skubber skyerne væk.",
    },
    teamLevel: "Crewets niveau",
    levelTitles: ["Grom", "Rider", "Pro"],
    rarity: ["Chill", "Big air", "Legendarisk"],
    pow: ["SPLASH!", "WHOOSH!", "SEND IT!"],
    doneLabel: "Runs landet",
    badgesTitle: "Tricks låst op",
    badges: [
      ["🤙", "Ollie", "Land dit første run"],
      ["☀️", "Tre dage på vandet", "3 dage i træk"],
      ["🌀", "Backroll", "Land et guld-run"],
      ["🏆", "Perfekt sæson", "Land alle runs"],
    ],
    cheer: (name) => `${name} landede et run!`,
  },
}

export const THEME_LIST = Object.values(THEMES)

const STORAGE_KEY = "chores-theme"
const CHANGE_EVENT = "chores-theme-change"

/** Used when the browser won't let us store the choice. */
let fallback: ThemeId = "pirat"

function read(): ThemeId {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value && value in THEMES) return value as ThemeId
  } catch {
    // Storage blocked.
  }
  return fallback
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function setTheme(id: ThemeId) {
  fallback = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Not saved, but still switch for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * The world picked on this device. Each child can pick their own on their
 * own tablet or phone. The server always renders the pirate world.
 */
export function useVoyageTheme(): VoyageTheme {
  const id = React.useSyncExternalStore(subscribe, read, () => "pirat" as const)
  return THEMES[id]
}
