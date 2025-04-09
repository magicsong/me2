"use client"

import { ResponsiveBar } from "@nivo/bar"
import { ResponsivePie } from "@nivo/pie"

export interface ChartData {
  [key: string]: string | number
}

interface BarChartProps {
  data: ChartData[]
  index: string
  categories: string[]
  valueFormatter?: (value: number) => string
  colors?: string[]
}

export function BarChart({ data, index, categories, valueFormatter, colors = ["#3B82F6"] }: BarChartProps) {
  return (
    <div className="h-full w-full">
      <ResponsiveBar
        data={data}
        keys={categories}
        indexBy={index}
        margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
        padding={0.3}
        colors={colors}
        borderRadius={4}
        axisBottom={{
          tickSize: 0,
          tickPadding: 10,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
        }}
        gridYValues={4}
        theme={{
          tooltip: {
            container: {
              fontSize: "12px",
            },
          },
          grid: {
            line: {
              stroke: "#f3f4f6",
            },
          },
        }}
        valueFormat={valueFormatter}
        role="application"
        ariaLabel="Bar chart"
      />
    </div>
  )
}

interface PieChartProps {
  data: ChartData[]
  index: string
  categories: string[]
  valueFormatter?: (value: number) => string
  colors?: string[]
}

export function PieChart({ data, index, categories, valueFormatter, colors = ["#3B82F6", "#10B981"] }: PieChartProps) {
  // 转换数据以适应Pie图表格式
  const pieData = data.map(item => ({
    id: item[index],
    label: item[index],
    value: item[categories[0]]
  }))

  return (
    <div className="h-full w-full">
      <ResponsivePie
        data={pieData}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        colors={colors}
        borderWidth={1}
        enableArcLinkLabels={true}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#ffffff"
        valueFormat={valueFormatter}
        theme={{
          tooltip: {
            container: {
              fontSize: "12px",
            },
          },
        }}
      />
    </div>
  )
}
