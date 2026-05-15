"use client"

import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { EmissionsTrendPoint } from "@/features/dashboard/types"

type EmissionsTrendPlaceholderProps = {
  data: EmissionsTrendPoint[]
}

const chartConfig = {
  methaneKg: {
    label: "Methane",
    color: "var(--primary)",
  },
  limitKg: {
    label: "Limit",
    color: "var(--destructive)",
  },
} satisfies ChartConfig

export function EmissionsTrendPlaceholder({
  data,
}: EmissionsTrendPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emissions Trend</CardTitle>
        <CardDescription>Daily methane totals against limit</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="methane-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-methaneKg)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-methaneKg)"
                  stopOpacity={0.04}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value} kg`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="methaneKg"
              type="natural"
              fill="url(#methane-fill)"
              stroke="var(--color-methaneKg)"
            />
            <Line
              dataKey="limitKg"
              type="monotone"
              stroke="var(--color-limitKg)"
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
