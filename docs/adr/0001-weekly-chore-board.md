# 1. Chores are planned week by week from a library, and anyone can do them

- Status: accepted
- Date: 2026-11-19

## Context

Chores began as persisted, recurring schedules (daily, weekly or monthly on
picked days, or "any day") with one doubloon purse shared by the household.
Missing a deadline cost the shared purse 10%.

The family wants it to work like a game: on Sunday evening the parents put
together next week's chores, anyone in the crew can do any of them, and each
member earns their own doubloons to spend on treasures.

## Decision

- **Family members** are kept as a list in Settings → Family, each with a
  name, a colour and an emoji. There are no logins. A member with history is
  archived, not deleted.
- **Chore library** (Settings → Chore library): reusable templates with a
  title, a checklist and a reward. A template is never "done", so it is
  always available again.
- **Weeks run Monday to Sunday.** On the "Plan next week" board, templates
  are dragged (or added with "+") into a week. The same template can go in
  several times. "Copy last week" copies the week before. This week and next
  week can be changed at any time; past weeks are read-only.
- **A week chore is a copy** of the template's title, checklist and reward,
  so editing the library doesn't change weeks already planned.
- **Nobody claims a chore up front.** Checklist items can be ticked by
  anyone. When the chore is finished (last item ticked, or "Done" when it
  has no checklist), you pick **who did it** and that member gets the whole
  reward. Unticking reopens the chore and takes the reward back. Editing the
  reward of a done chore updates what the member got. Removing a done chore
  takes it back.
- **Missed chores.** Once a week is over (on the first page load from the
  following Monday), every active member loses 10% of their own purse,
  rounded up, for **each** chore left undone, charged one chore after
  another. Each charge shows as a red skull.
- **Treasures** are bought by one member, who must be able to afford them.
  The cost is deducted from their purse.
- Each member's purse is a ledger of `reward`, `penalty` and `purchase`
  entries; the balance is the sum.

## Consequences

- Recurrence, individual chore pages and the shared purse are removed.
  Existing chores become library templates.
- One crew progress bar per week, coloured by who finished each chore, and a
  weekly leaderboard with a "Captain of the week".
- There is no access control: anyone with the dashboard can change settings
  or pick any member. That is acceptable for a family tablet and can be
  revisited.
