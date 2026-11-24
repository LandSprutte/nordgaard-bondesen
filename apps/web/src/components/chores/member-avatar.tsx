import * as React from "react"
import { CheckIcon } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export type Member = {
  id: string
  name: string
  color: string
  emoji: string
  archived: boolean
}

const sizes = {
  sm: "size-6 text-xs",
  md: "size-8 text-base",
  lg: "size-11 text-2xl",
} as const

/** A member's emoji on their colour. */
export function MemberAvatar({
  member,
  size = "md",
  className,
}: {
  member: Pick<Member, "name" | "color" | "emoji">
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={member.name}
      title={member.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-background select-none",
        sizes[size],
        className
      )}
      style={{ backgroundColor: member.color }}
    >
      <span aria-hidden className="leading-none drop-shadow-sm">
        {member.emoji}
      </span>
    </span>
  )
}

/**
 * A popover that asks which member something is for, e.g. "Who did it?".
 * `trigger` is the button that opens it.
 */
export function MemberPicker({
  members,
  title,
  description,
  selectedId,
  onPick,
  open,
  onOpenChange,
  trigger,
}: {
  members: Array<Member>
  title: string
  description?: string
  selectedId?: string | null
  onPick: (member: Member) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: React.ReactElement
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-64">
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          {description && (
            <PopoverDescription>{description}</PopoverDescription>
          )}
        </PopoverHeader>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen endnu. Mønstr familien under Indstillinger → Besætningen.
          </p>
        ) : (
          <ul className="-mx-1 flex flex-col gap-0.5">
            {members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onPick(member)}
                  className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MemberAvatar member={member} size="sm" />
                  <span className="flex-1 font-medium">{member.name}</span>
                  {member.id === selectedId && (
                    <CheckIcon className="size-4 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
