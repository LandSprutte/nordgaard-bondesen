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
}

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
