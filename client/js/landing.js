/**
 * Landing Page Interactive Benchmark Visualizer.
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('landingDemoChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');

  // Real archival benchmark data points
  const labels = ['Mar 1', 'Mar 15', 'Apr 1', 'Apr 15', 'May 1', 'May 15', 'Jun 1', 'Jun 15', 'Jul 1', 'Jul 15', 'Aug 1', 'Aug 15'];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Europe (Confirmed Cases)',
          data: [2200, 18500, 95000, 172000, 228000, 248000, 262000, 272000, 283000, 295000, 314000, 335000],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.3,
          borderWidth: 2.5
        },
        {
          label: 'North America (Confirmed Cases)',
          data: [120, 4200, 150000, 520000, 920000, 1170000, 1430000, 1680000, 2100000, 2650000, 3400000, 4050000],
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.3
        },
        {
          label: 'Asia (Confirmed Cases)',
          data: [84000, 92100, 110000, 144000, 205000, 282000, 420000, 580000, 800000, 1080000, 1500000, 2020000],
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          padding: 10,
          cornerRadius: 6
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => (value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${value / 1000}k`)
          },
          grid: {
            color: 'rgba(150, 150, 150, 0.1)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
});
