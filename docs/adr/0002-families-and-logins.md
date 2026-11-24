# 2. Families, roles and logins

Date: 2026-11-24

## Status

Accepted

## Context

The app had no logins. We want parents (forældre) and children (barn), and
several families on one site, each seeing only their own data.

## Decision

- **Family** owns everything: members, the chore library and weeks,
  settlements, doubloons, treasures, and the whole budget (accounts, bank
  texts, categories, imports, transactions). Budget keys that used to be
  global (account number, text key, category name, row fingerprint) are now
  unique per family.
- **Admin** is one person, with the username and password from `.env`
  (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). The admin creates parent accounts at
  `/admin`, in a new family or an existing one, and can reset their
  passwords. The admin cannot see a family's data.
- **Parents** are members with `role = parent`, an email and a scrypt
  password hash. They log in at `/login`, use the whole dashboard, and add
  children and co-parents under Indstillinger → Besætningen. Parents play the
  game like everyone else.
- **Children** are members with `role = child` and no credentials. A parent
  logs a device in once; then anyone picks themselves under "Hvem spiller?"
  in the game. Switching to a parent asks for that parent's password.
- **Sessions** are rows keyed by the SHA-256 of a random cookie token
  (httpOnly, 180 days for families, 12 hours for the admin). The session
  remembers which member is using the device.
- Every server function checks the session itself (`requireFamily`,
  `requireParent`, `requireAdmin`) and filters by the session's family, so
  ids from another family are never found. Children may not open the
  dashboard, undo or reassign a finished chore, finish chores as someone
  else, or spend someone else's doubloons.
- Existing data moved into the family "Vores familie" (`family_default`).

## Consequences

- A family can't be used until the admin creates its first parent.
- No self sign-up, password reset by email, or rate limiting beyond a slow
  failure response. Fine for a family site; revisit before it's public.
- The command-line CSV import goes into `FAMILY_ID`, or `family_default`.

## Addendum: Basic and Pro parents (2026-11-24)

Each parent has a plan, set only by the admin. **Basic** parents get the
chores: the game, planning, the chore library, treasures and the family
settings. **Pro** parents also get the overview, budget (including its
settings) and calendar. The plan is checked on every request: the budget
server functions call `requirePro`, and the pro pages redirect basic parents
to planning. New parents start on Basic, and parents who existed before this
change were moved to Pro. Children are always Basic.
