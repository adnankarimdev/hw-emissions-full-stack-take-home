const emissionsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  style: "percent",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatKilograms(value: number) {
  return `${emissionsFormatter.format(value)} kg`
}

export function formatPercent(value: number) {
  return percentFormatter.format(value)
}

export function formatReadingTimestamp(value: string) {
  return dateTimeFormatter.format(new Date(value))
}
