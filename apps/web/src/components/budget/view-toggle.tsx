import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

export type ValueView = "amount" | "percent"

/** Switch between amounts in kroner and percentages. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ValueView
  onChange: (view: ValueView) => void
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      aria-label="Show values as"
      value={[view]}
      onValueChange={(value) => {
        const next = value[0] as ValueView | undefined
        if (next && next !== view) onChange(next)
      }}
    >
      <ToggleGroupItem value="amount" aria-label="Amounts in kroner">
        kr.
      </ToggleGroupItem>
      <ToggleGroupItem value="percent" aria-label="Percentages">
        %
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
