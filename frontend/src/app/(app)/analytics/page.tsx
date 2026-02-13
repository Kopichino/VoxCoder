'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import styles from './analytics.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface AnalyticsData {
  totalSolved: number;
  totalProjects: number;
  streak: number;
  byTopic: { topic: string; count: number }[];
  byDataStructure: { data_structure: string; count: number }[];
  byDifficulty: { difficulty: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

const TOPIC_OPTIONS = ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching', 'Recursion', 'Math', 'Greedy', 'Backtracking'];
const DS_OPTIONS = ['Array', 'HashMap', 'Stack', 'Queue', 'LinkedList', 'Tree', 'Graph', 'Heap', 'Set', 'None'];
const DIFF_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTopic, setLogTopic] = useState('Arrays');
  const [logDs, setLogDs] = useState('Array');
  const [logDiff, setLogDiff] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      const d = await res.json();
      setData(d);
    } catch {
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const logSubmission = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: logTopic,
          data_structure: logDs,
          difficulty: logDiff,
        }),
      });
      showToast('Question logged! 🎯', 'success');
      setShowLogModal(false);
      fetchAnalytics();
    } catch {
      showToast('Failed to log', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const CHART_COLORS = [
    '#6C63FF', '#ED64A6', '#38B2AC', '#ECC94B', '#FC8181',
    '#9F7AEA', '#4FD1C5', '#F6AD55', '#68D391', '#63B3ED',
    '#B794F4', '#FEB2B2',
  ];

  if (loading) {
    return (
      <div className={styles.analytics}>
        <div className={styles.loading}>
          <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 16 }} />
          <div className={styles.chartGrid}>
            <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Chart configs
  const topicChartData = {
    labels: data.byTopic.map(t => t.topic),
    datasets: [{
      label: 'Questions Solved',
      data: data.byTopic.map(t => t.count),
      backgroundColor: data.byTopic.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderRadius: 8,
      borderSkipped: false as const,
    }],
  };

  const dsChartData = {
    labels: data.byDataStructure.map(d => d.data_structure),
    datasets: [{
      data: data.byDataStructure.map(d => d.count),
      backgroundColor: data.byDataStructure.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  // Fill in empty dates for activity chart
  const activityLabels: string[] = [];
  const activityData: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    activityLabels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    const found = data.dailyActivity.find(a => a.date === dateStr);
    activityData.push(found ? found.count : 0);
  }

  const activityChartData = {
    labels: activityLabels,
    datasets: [{
      label: 'Questions',
      data: activityData,
      borderColor: '#6C63FF',
      backgroundColor: 'rgba(108, 99, 255, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#6C63FF',
      pointBorderWidth: 0,
    }],
  };

  const diffColors: Record<string, string> = { Easy: '#22C55E', Medium: '#F59E0B', Hard: '#EF4444' };

  return (
    <div className={styles.analytics}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Track your coding progress and achievements</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>
          + Log Question
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.statPurple}`}>
          <span className={styles.statIcon}>🎯</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{data.totalSolved}</span>
            <span className={styles.statLabel}>Questions Solved</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <span className={styles.statIcon}>🔥</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{data.streak}</span>
            <span className={styles.statLabel}>Day Streak</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statBlue}`}>
          <span className={styles.statIcon}>📁</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{data.totalProjects}</span>
            <span className={styles.statLabel}>Projects</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statPink}`}>
          <span className={styles.statIcon}>📊</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{data.byTopic.length}</span>
            <span className={styles.statLabel}>Topics Covered</span>
          </div>
        </div>
      </div>

      {/* Difficulty badges */}
      {data.byDifficulty.length > 0 && (
        <div className={styles.diffRow}>
          {data.byDifficulty.map(d => (
            <div 
              key={d.difficulty} 
              className={styles.diffBadge}
              style={{ borderColor: diffColors[d.difficulty] || '#888' }}
            >
              <span className={styles.diffCount} style={{ color: diffColors[d.difficulty] }}>{d.count}</span>
              <span className={styles.diffLabel}>{d.difficulty}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className={styles.chartGrid}>
        {/* Topics Bar Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Questions by Topic</h3>
          {data.byTopic.length === 0 ? (
            <div className={styles.emptyChart}>
              <span>📊</span>
              <p>No data yet. Log your first question!</p>
            </div>
          ) : (
            <div className={styles.chartContainer}>
              <Bar
                data={topicChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#94A3B8', font: { size: 11 } },
                      grid: { display: false },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { color: '#94A3B8', stepSize: 1 },
                      grid: { color: 'rgba(255,255,255,0.04)' },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Data Structures Doughnut */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Data Structures Used</h3>
          {data.byDataStructure.length === 0 ? (
            <div className={styles.emptyChart}>
              <span>🍩</span>
              <p>No data yet</p>
            </div>
          ) : (
            <div className={styles.chartContainerSmall}>
              <Doughnut
                data={dsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#94A3B8',
                        font: { size: 11 },
                        padding: 12,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className={styles.chartCardWide}>
        <h3 className={styles.chartTitle}>Activity (Last 30 Days)</h3>
        <div className={styles.chartContainer}>
          <Line
            data={activityChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                x: {
                  ticks: { color: '#64748B', font: { size: 10 }, maxTicksLimit: 10 },
                  grid: { display: false },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: '#64748B', stepSize: 1 },
                  grid: { color: 'rgba(255,255,255,0.04)' },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Log Solved Question</h2>
            <div className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label>Topic</label>
                <select
                  className={styles.select}
                  value={logTopic}
                  onChange={e => setLogTopic(e.target.value)}
                >
                  {TOPIC_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Data Structure</label>
                <select
                  className={styles.select}
                  value={logDs}
                  onChange={e => setLogDs(e.target.value)}
                >
                  {DS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Difficulty</label>
                <div className={styles.diffBtnGroup}>
                  {DIFF_OPTIONS.map(d => (
                    <button
                      key={d}
                      className={`${styles.diffBtn} ${logDiff === d ? styles.diffBtnActive : ''}`}
                      style={{ '--diff-color': diffColors[d] } as React.CSSProperties}
                      onClick={() => setLogDiff(d)}
                      type="button"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className="btn btn-secondary" onClick={() => setShowLogModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={logSubmission} disabled={submitting}>
                  {submitting ? 'Logging...' : 'Log Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
