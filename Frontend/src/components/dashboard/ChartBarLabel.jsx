import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import {
//   ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart"

export const description = "A bar chart with a label"

const chartData = [
  { month: "Green (>95%)", desktop: 1 },
  { month: "Yellow (85-95%)", desktop: 3 },
  { month: "Red (<85%)", desktop: 2 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} 
export function ChartBarLabel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Zones</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 40,
            }}
         
          >
            {/* <CartesianGrid vertical={false} /> */}
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            //   tickFormatter={(value) => value.slice(0, 3)}
            className="text-lg"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8}  className="font-semibold">
              <LabelList
                position="top"
                offset={10}
                className="fill-foreground"
                fontSize={32}
               
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
