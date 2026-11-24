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
