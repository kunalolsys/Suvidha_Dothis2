import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

import { useMemo } from "react";

export const description = "A donut chart with text";

const chartConfig = {
  visitors: {
    label: "Visitors",
  },

  overdue: {
    label: "Overdue Tasks",
    color: "red",
  },

  pending: {
    label: "Pending Tasks",
    color: "orange",
  },

  delayed: {
    label: "Delayed Tasks",
    color: "#eab308",
  },

  completed: {
    label: "Completed Tasks",
    color: "green",
  },
};

export function ChartPieDonutText({ record }) {
  const chartData = useMemo(() => {
    if (!record) return [];

    return [
      {
        browser: "Overdue tasks",
        visitors: record.counts?.Overdue || 0,
        fill: "var(--color-overdue)",
      },

      {
        browser: "Pending tasks",
        visitors: record.counts?.Pending || 0,
        fill: "var(--color-pending)",
      },

      // ✅ DELAYED
      {
        browser: "Delayed tasks",
        visitors: record.counts?.Delayed || 0,
        fill: "var(--color-delayed)",
      },

      {
        browser: "Completed tasks",
        visitors: record.counts?.Completed || 0,
        fill: "var(--color-completed)",
      },
    ];
  }, [record]);

  const totalVisitors = useMemo(() => {
    return record?.total || 0;
  }, [record]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-md font-semibold">My Task Status</CardTitle>
      </CardHeader>

      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={55}
              strokeWidth={2}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalVisitors.toLocaleString()}
                        </tspan>

                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-lg font-bold"
                        >
                          Total Tasks
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 text-sm">
        {/* COMPLETED */}
        <div className="flex items-center justify-between w-full py-1 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>

            <span className="font-semibold text-green-600">Completed</span>
          </div>

          <span className="font-bold text-green-700">
            {record?.counts?.Completed || 0}
          </span>
        </div>

        {/* PENDING */}
        <div className="flex items-center justify-between w-full py-1 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>

            <span className="font-semibold text-orange-600">Pending</span>
          </div>

          <span className="font-bold text-orange-700">
            {record?.counts?.Pending || 0}
          </span>
        </div>

        {/* DELAYED */}
        <div className="flex items-center justify-between w-full py-1 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>

            <span className="font-semibold text-yellow-600">Delayed</span>
          </div>

          <span className="font-bold text-yellow-700">
            {record?.counts?.Delayed || 0}
          </span>
        </div>

        {/* OVERDUE */}
        <div className="flex items-center justify-between w-full py-1">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>

            <span className="font-semibold text-red-600">Overdue</span>
          </div>

          <span className="font-bold text-red-700">
            {record?.counts?.Overdue || 0}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
