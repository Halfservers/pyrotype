import type { ChartData, ChartDataset, ChartOptions } from 'chart.js';
import { useState } from 'react';

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const options: ChartOptions<'line'> = {
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { enabled: false },
  },
  layout: { padding: 0 },
  scales: {
    x: {
      min: 0,
      max: 19,
      type: 'linear',
      grid: { display: false },
      ticks: { display: false },
    },
    y: {
      min: 0,
      type: 'linear',
      grid: { display: false },
      ticks: { display: true, count: 3, font: { size: 11, weight: 600 } },
    },
  },
  elements: {
    point: { radius: 0 },
    line: { tension: 0.15 },
  },
};

function getOptions(opts?: Partial<ChartOptions<'line'>>): ChartOptions<'line'> {
  return { ...options, ...opts } as ChartOptions<'line'>;
}

type ChartDatasetCallback = (value: ChartDataset<'line'>, index: number) => ChartDataset<'line'>;

function getEmptyData(label: string, sets = 1, callback?: ChartDatasetCallback): ChartData<'line'> {
  const next = callback || ((value) => value);
  return {
    labels: Array(20).fill(0).map((_, i) => i),
    datasets: Array(sets).fill(0).map((_, index) =>
      next(
        {
          fill: true,
          label,
          data: Array(20).fill(-5),
          borderColor: '#fa4e49',
          backgroundColor: hexToRgba('#fa4e49', 0.09),
        },
        index,
      ),
    ),
  };
}

interface UseChartOptions {
  sets: number;
  options?: Partial<ChartOptions<'line'>> | number;
  callback?: ChartDatasetCallback;
}

function useChart(label: string, opts?: UseChartOptions) {
  const chartOptions = getOptions(
    typeof opts?.options === 'number'
      ? { scales: { y: { min: 0, suggestedMax: opts.options } } } as any
      : (opts?.options as any),
  );
  const [data, setData] = useState(getEmptyData(label, opts?.sets || 1, opts?.callback));

  const push = (items: number | null | (number | null)[]) =>
    setData((state) => ({
      ...state,
      datasets: (Array.isArray(items) ? items : [items]).map((item, index) => ({
        ...state.datasets[index],
        data: state.datasets[index]?.data
          ?.slice(1)
          ?.concat(typeof item === 'number' ? Number(item.toFixed(2)) : item) ?? [],
      })),
    }));

  const clear = () =>
    setData((state) => ({
      ...state,
      datasets: state.datasets.map((value) => ({
        ...value,
        data: Array(20).fill(-5),
      })),
    }));

  return { props: { data, options: chartOptions }, push, clear };
}

function useChartTickLabel(label: string, max: number, tickLabel: string, roundTo?: number) {
  return useChart(label, {
    sets: 1,
    options: {
      scales: {
        y: {
          suggestedMax: max,
          ticks: {
            callback(value: string | number) {
              return `${roundTo ? Number(value).toFixed(roundTo) : value}${tickLabel}`;
            },
          },
        },
      },
    } as any,
  });
}

export { useChart, useChartTickLabel, getOptions, getEmptyData, hexToRgba };
