import * as React from "react";
import { Label, Pie, PieChart, Cell } from "recharts";

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
  const totalVisitors = useMemo(() => {
    return record?.total || 0;
  }, [record]);

  const chartData = useMemo(() => {
    if (!record) return [];

    const overdue = record.counts?.Overdue || 0;
    const pending = record.counts?.Pending || 0;
    const delayed = record.counts?.Delayed || 0;
    const completed = record.counts?.Completed || 0;

    // 🟢 AGAR SAARI VALUES 0 HAIN, TOH EMPTY DUMMY SLICE DIKHAYENGE
    if (totalVisitors === 0) {
      return [
        {
          browser: "No Tasks",
          visitors: 1, // Minimum 1 for rendering circle
          fill: "#e2e8f0", // Light Gray ring color
          isEmpty: true,
        },
      ];
    }

    return [
      {
        browser: "Overdue tasks",
        visitors: overdue,
        fill: "var(--color-overdue)",
      },
      {
        browser: "Pending tasks",
        visitors: pending,
        fill: "var(--color-pending)",
      },
      {
        browser: "Delayed tasks",
        visitors: delayed,
        fill: "var(--color-delayed)",
      },
      {
        browser: "Completed tasks",
        visitors: completed,
        fill: "var(--color-completed)",
      },
    ];
  }, [record, totalVisitors]);

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
            {/* Tooltip tabhi dikhayenge jab values 0 na hon */}
            {totalVisitors > 0 && (
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
            )}

            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={55}
              strokeWidth={2}
            >
              {/* Optional: Explicit Cells for colors */}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}

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
                          className="fill-muted-foreground text-xs font-semibold"
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
