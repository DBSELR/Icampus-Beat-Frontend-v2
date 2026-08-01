import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './Dashboard.module.css';

const statsData = [
  { label: 'Total Students', value: '1,250', icon: 'fa-users', trend: '+12%', trendUp: true, sub: 'Enrolled this semester' },
  { label: 'Total Faculty', value: '85', icon: 'fa-user-tie', trend: '+3%', trendUp: true, sub: 'Active staff members' },
  { label: 'Active Courses', value: '124', icon: 'fa-book', trend: '+8', trendUp: true, sub: 'Across all programmes' },
  { label: 'Departments', value: '8', icon: 'fa-building', trend: 'Stable', trendUp: null, sub: 'Engineering branches' },
  { label: 'Exam Registrations', value: '3,480', icon: 'fa-clipboard', trend: '+5%', trendUp: true, sub: 'Current notification' },
  { label: 'Results Processed', value: '2,910', icon: 'fa-trophy', trend: '83.6%', trendUp: true, sub: 'Published this semester' },
  { label: 'Pending Results', value: '570', icon: 'fa-clock-o', trend: '-15%', trendUp: false, sub: 'Awaiting processing' },
  { label: 'Fee Collected', value: '₹48.2L', icon: 'fa-money', trend: '+22%', trendUp: true, sub: 'Exam fee collection' },
];

const quickLinks = [
  { label: 'Exam Registrations', icon: 'fa-clipboard', url: '/pre-exams/exam-registrations', desc: 'Manage student exam registrations' },
  { label: 'Hall Tickets', icon: 'fa-ticket', url: '/pre-exam-reports/hall-tickets', desc: 'Generate & print hall tickets' },
  { label: 'Marks Entry', icon: 'fa-edit', url: '/post-exams/internal-marks-entry', desc: 'Enter internal/external marks' },
  { label: 'Result Processing', icon: 'fa-trophy', url: '/results/moderation-result', desc: 'Moderation, flotation & results' },
  { label: 'Grade Card', icon: 'fa-graduation-cap', url: '/result-reports/grade-card', desc: 'Generate student grade cards' },
  { label: 'Fee Collection', icon: 'fa-money', url: '/pre-exam-reports/exam-fee-collection', desc: 'View exam fee collections' },
  { label: 'Student Screen', icon: 'fa-users', url: '/pre-exams/student-screen', desc: 'Student eligibility details' },
  { label: 'Time Table', icon: 'fa-calendar', url: '/pre-exam-reports/time-table', desc: 'View exam time tables' },
];

const activityData = [
  { action: 'Exam Registration opened', module: 'Pre-Exams', time: '2 hours ago', icon: 'fa-clipboard', type: 'info' },
  { action: 'Marks entry completed for CSE-IV', module: 'Post-Exams', time: '5 hours ago', icon: 'fa-check-circle', type: 'success' },
  { action: 'Result sheet published', module: 'Results', time: '1 day ago', icon: 'fa-trophy', type: 'success' },
  { action: 'Hall tickets generated', module: 'Pre-Exam Reports', time: '2 days ago', icon: 'fa-ticket', type: 'info' },
  { action: 'Fee collection report updated', module: 'Finance', time: '3 days ago', icon: 'fa-money', type: 'warning' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateStats(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const typeColors = { info: themeColor, success: '#22c55e', warning: '#f59e0b', danger: '#ef4444' };

  return (
    <div className={styles.dashboardRoot}>

      {/* ── Page Header ─────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          {/* <nav className={styles.breadcrumb}>
            <span>iCampus</span>
            <i className="fa fa-chevron-right" />
            <span className={styles.breadcrumbActive}>Dashboard</span>
          </nav> */}
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.dateChip}>
            <i className="fa fa-calendar-o" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Hero Welcome Banner ──────────────────────── */}
      <div className={styles.heroBanner} style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 60%, ${themeColor}88 100%)` }}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon} style={{ background: 'rgba(255,255,255,0.15)' }}>
            <i className="fa fa-graduation-cap" />
          </div>
          <div>
            <h2 className={styles.heroTitle}>Welcome to iCampus Exam Management</h2>
            <p className={styles.heroSub}>Manage exams, results, and academic records from one unified platform.</p>
          </div>
        </div>
        <div className={styles.heroDecor1} />
        <div className={styles.heroDecor2} />
      </div>

      {/* ── Stats Grid ─────────────────────────────── */}
      <div className={styles.statsGrid}>
        {statsData.map((stat, i) => (
          <div
            key={i}
            className={`${styles.statCard} ${animateStats ? styles.statCardVisible : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={styles.statIconWrap} style={{ background: `${themeColor}18`, color: themeColor }}>
              <i className={`fa ${stat.icon}`} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statSub}>{stat.sub}</div>
            </div>
            {stat.trendUp !== null && (
              <div className={`${styles.statTrend} ${stat.trendUp ? styles.trendUp : styles.trendDown}`}>
                <i className={`fa fa-arrow-${stat.trendUp ? 'up' : 'down'}`} />
                {stat.trend}
              </div>
            )}
            <div className={styles.statAccentBar} style={{ background: themeColor }} />
          </div>
        ))}
      </div>

      {/* ── Quick Access + Activity ─────────────────── */}
      <div className={styles.mainGrid}>

        {/* Quick Access */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionDot} style={{ background: themeColor }} />
            <h2 className={styles.sectionTitle}>Quick Access</h2>
          </div>
          <div className={styles.quickGrid}>
            {quickLinks.map((link, i) => (
              <div
                key={i}
                className={styles.quickCard}
                onClick={() => navigate(link.url)}
              >
                <div className={styles.quickIconWrap} style={{ background: `${themeColor}15`, color: themeColor }}>
                  <i className={`fa ${link.icon}`} />
                </div>
                <div className={styles.quickLabel}>{link.label}</div>
                <div className={styles.quickDesc}>{link.desc}</div>
                <i className="fa fa-chevron-right" style={{ fontSize: '11px', color: themeColor, marginTop: '8px', opacity: 0.7 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionDot} style={{ background: '#22c55e' }} />
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
          </div>
          <div className={styles.activityList}>
            {activityData.map((item, i) => (
              <div key={i} className={styles.activityItem}>
                <div
                  className={styles.activityIcon}
                  style={{ background: `${typeColors[item.type]}18`, color: typeColors[item.type] }}
                >
                  <i className={`fa ${item.icon}`} />
                </div>
                <div className={styles.activityContent}>
                  <div className={styles.activityAction}>{item.action}</div>
                  <div className={styles.activityMeta}>
                    <span className={styles.activityModule} style={{ color: themeColor }}>{item.module}</span>
                    <span className={styles.activityTime}><i className="fa fa-clock-o" /> {item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Module Overview */}
          <div className={styles.moduleOverview}>
            <div className={styles.sectionHeader} style={{ marginTop: '24px' }}>
              <div className={styles.sectionDot} style={{ background: themeColor }} />
              <h2 className={styles.sectionTitle}>Module Overview</h2>
            </div>
            {[
              { label: 'Pre-Exam Completion', pct: 82, color: themeColor },
              { label: 'Marks Entry Progress', pct: 67, color: '#f59e0b' },
              { label: 'Results Published', pct: 84, color: '#22c55e' },
              { label: 'Fee Collection', pct: 91, color: '#6366f1' },
            ].map((item, i) => (
              <div key={i} className={styles.progressRow}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>{item.label}</span>
                  <span className={styles.progressPct} style={{ color: item.color }}>{item.pct}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: animateStats ? `${item.pct}%` : '0%', background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;