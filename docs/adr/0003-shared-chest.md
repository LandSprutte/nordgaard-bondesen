# 3. A shared chest, personal experience

Date: 2026-11-24

## Status

Accepted. Replaces the personal purses from ADR 0001.

## Context

Each member had their own purse, and treasures were bought from it. We want
the family to work together towards shared goals, while everyone still
levels up their own character.

## Decision

- **One chest per family.** Its balance is the sum of the family's
  `DoubloonEntry` rows. Existing purses simply add up into it.
- **Experience stays personal.** A member's XP is everything they have
  earned from chores (`reward` entries). Spending or losing doubloons
  never lowers it.
- **Treasures are shared goals.** Togtet shows the next goal: the cheapest
  treasure the chest can't afford yet. Only a parent can redeem a
  treasure, and the redeeming parent is recorded on the entry.
- **Penalties hit the chest.** Each chore left undone when a week ends
  costs 10% of the chest, one after another. Penalty entries have no
  member (`memberId` is now optional).

## Consequences

- Children can see progress but can't spend the chest.
- The log shows the chest's totals and what each member has contributed.
