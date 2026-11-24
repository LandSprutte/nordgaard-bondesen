import {
  convertPeriod,
  parsePeriod,
  periodKey,
  periodLabel,
} from "@/lib/period"
import type { Granularity, Period } from "@/lib/period"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

const GRANULARITY_LABELS: Record<Granularity, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
}

/** Choose month / quarter / year, then which one. */
export function PeriodPicker({
  period,
  periods,
  onChange,
}: {
  period: string
  periods: Record<Granularity, Array<{ key: string; label: string }>>
  onChange: (period: string) => void
}) {
  const current = parsePeriod(period) as Period
  const options = periods[current.granularity]
  const withCurrent = options.some((o) => o.key === period)
    ? options
    : [{ key: period, label: periodLabel(current) }, ...options]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label="Group by"
        value={[current.granularity]}
        onValueChange={(value) => {
          const next = value[0] as Granularity | undefined
          if (!next || next === current.granularity) return
          onChange(periodKey(convertPeriod(current, next)))
        }}
      >
        {(Object.keys(GRANULARITY_LABELS) as Array<Granularity>).map((g) => (
          <ToggleGroupItem key={g} value={g}>
            {GRANULARITY_LABELS[g]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <NativeSelect
        size="sm"
        aria-label={GRANULARITY_LABELS[current.granularity]}
        value={period}
        onChange={(event) => onChange(event.target.value)}
      >
        {withCurrent.map((o) => (
          <NativeSelectOption key={o.key} value={o.key}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
