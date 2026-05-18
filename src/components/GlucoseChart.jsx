import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
);

export default function GlucoseChart({ readings = [] }) {
  const labels = readings.map(r => r.date);
  const values = readings.map(r => r.value);

  const data = {
    labels,
    datasets: [
      {
        label: 'Blood Sugar',
        data: values,
        tension: 0.42,
        borderWidth: 4,
        borderColor: '#4b57f5',
        pointBackgroundColor: '#fff',
        pointBorderColor: '#4b57f5',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 9,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;

          if (!chartArea) return null;

          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );

          gradient.addColorStop(0, 'rgba(75,87,245,0.35)');
          gradient.addColorStop(1, 'rgba(75,87,245,0)');

          return gradient;
        },
      },
      {
        label: 'Min Target (70)',
        data: labels.map(() => 70),
        borderColor: '#22c55e',
        borderDash: [10, 6],
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
      {
        label: 'Max Target (140)',
        data: labels.map(() => 140),
        borderColor: '#ef4444',
        borderDash: [10, 6],
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          boxWidth: 18,
          boxHeight: 3,
          padding: 18,
          font: {
            size: 12,
            weight: '700',
          },
        },
      },

      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 14,
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        displayColors: false,

        callbacks: {
          label: (ctx) => `${ctx.raw} mg/dL`,
        },
      },
    },

    scales: {
      x: {
        grid: {
          display: false,
        },

        ticks: {
          color: '#94a3b8',
        },
      },

      y: {
        min: 50,
        max: 180,

        ticks: {
          color: '#94a3b8',
          callback: (v) => `${v}`,
        },

        grid: {
          color: 'rgba(255,255,255,.06)',
        },
      },
    },
  };

  return (
    <div style={{ height: 420 }}>
      <Line data={data} options={options} />
    </div>
  );
}
