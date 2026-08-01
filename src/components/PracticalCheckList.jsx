import React, { useState, useEffect, useCallback } from 'react';
import {
  getAppData,
  getPracticalChecklistReport,
  getPracticalChecklistSemesters,
  getPracticalChecklistBranches,
} from '../utils/api';
import styles from './PracticalCheckList.module.css';

// Derive 2-char regu from regulation (e.g. R20 → 20)
const getReguFromRegulation = (regulation) => {
  const r = String(regulation || '').trim();
  if (!r) return '';
  const match = r.replace(/^R/i, '');
  return match.length >= 2 ? match.slice(0, 2) : match;
};

// Normalize course for API (e.g. B.TECH → B.Tech)
const normalizeCourseForApi = (course) => {
  const c = String(course || '').trim();
  if (!c) return c;
  const dot = c.indexOf('.');
  if (dot === -1) return c;
  const before = c.slice(0, dot + 1);
  const after = c.slice(dot + 1);
  const afterNorm = after.length ? after[0].toUpperCase() + after.slice(1).toLowerCase() : after;
  return before + afterNorm;
};

const PracticalCheckList = () => {
  const appData = getAppData() || {};
  const course = (appData.course || '').trim();
  const examMY = (appData.examMY || '').trim();
  const regulation = (appData.regulation || '').trim();
  const regu = getReguFromRegulation(regulation);

  const [filters, setFilters] = useState({ batch: '', semester: '', branch: '' });
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [chkIsPrint, setChkIsPrint] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canLoadDropdowns = course && regu;
  const canViewReport = course && examMY && regulation && regu && filters.semester && filters.branch;

  const fetchSemesters = useCallback(async () => {
    if (!canLoadDropdowns) {
      setSemesterOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getPracticalChecklistSemesters(normalizeCourseForApi(course), regu);
      if (res?.success && Array.isArray(res?.data)) {
        const list = (res.data || [])
          .map((row) => row.SEM ?? row.sem ?? row.Sem)
          .filter(Boolean)
          .map(String)
          .sort((a, b) => Number(a) - Number(b));
        setSemesterOptions([...new Set(list)]);
      } else {
        setSemesterOptions([]);
      }
    } catch (err) {
      console.error('PracticalChecklist semesters error:', err);
      setSemesterOptions([]);
      setLoadError(err?.message || 'Failed to load semesters');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, regu, canLoadDropdowns]);

  const fetchBranches = useCallback(async () => {
    if (!canLoadDropdowns) {
      setBranchOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    if (!loadError) setLoadError('');
    try {
      const res = await getPracticalChecklistBranches(normalizeCourseForApi(course), regu);
      if (res?.success && Array.isArray(res?.data)) {
        // Backend SQL: GSUB GRP, GRP ID → GRP = full name, ID = short code. Report API needs grp=CE.
        const list = (res.data || []).map((row) => {
          const shortCode = String(row.ID ?? row.id ?? '').trim();
          const fullName = String(row.GRP ?? row.grp ?? '').trim();
          return { value: shortCode || fullName, label: fullName || shortCode };
        }).filter((x) => x.value);
        setBranchOptions(list);
      } else {
        setBranchOptions([]);
      }
    } catch (err) {
      console.error('PracticalChecklist branches error:', err);
      setBranchOptions([]);
      if (!loadError) setLoadError(err?.message || 'Failed to load branches');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, regu, canLoadDropdowns]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (!canLoadDropdowns) {
      setFilters((p) => ({ ...p, batch: '', semester: '', branch: '' }));
    } else {
      setFilters((p) => ({ ...p, batch: regu }));
    }
  }, [canLoadDropdowns, regu]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
    setLoadError('');
  };

  const handleView = async () => {
    if (!canViewReport) {
      alert('Please select Semester and Branch. Ensure Course, Regulation and Exam Month/Year are set.');
      return;
    }
    setIsLoadingReport(true);
    setReportData(null);
    setLoadError('');
    try {
      const res = await getPracticalChecklistReport(
        normalizeCourseForApi(course),
        examMY,
        regulation,
        filters.batch || regu,
        filters.branch,
        filters.semester
      );
      if (res?.success) {
        setReportData(Array.isArray(res?.data) ? res.data : res?.data ?? null);
      } else {
        setReportData(null);
        setLoadError(res?.message || 'No data found');
      }
    } catch (err) {
      console.error('PracticalChecklist report error:', err);
      setReportData(null);
      setLoadError(err?.message || 'Failed to load report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownload = () => {
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      alert('Load the report first by clicking View.');
      return;
    }
    if (Array.isArray(reportData) && reportData.length > 0) {
      const first = reportData[0];
      const keys = typeof first === 'object' && first !== null ? Object.keys(first) : [];
      const header = keys.join(',');
      const rows = reportData.map((row) =>
        keys.map((k) => {
          const v = row[k];
          const s = v == null ? '' : String(v);
          return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PracticalChecklist_${course}_${examMY}_${filters.semester}_${filters.branch}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('Report data is not in table format; download not available.');
    }
  };

  const reportLoaded = reportData !== null && (Array.isArray(reportData) ? reportData.length > 0 : true);

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch (Regu)</label>
            <select
              name="batch"
              value={filters.batch || regu}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadDropdowns || loadingDropdowns}
            >
              <option value="">Select</option>
              {regu && <option value={regu}>{regu}</option>}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadDropdowns || loadingDropdowns}
            >
              <option value="">Select</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadDropdowns || loadingDropdowns}
            >
              <option value="">Select</option>
              {branchOptions.map((b) => (
                <option key={b.value} value={b.value}>{b.label || b.value}</option>
              ))}
            </select>
          </div>
          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.viewBtn}
              onClick={handleView}
              disabled={isLoadingReport || !canViewReport}
            >
              {isLoadingReport ? 'Loading…' : 'View'}
            </button>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={!reportLoaded}
            >
              Download
            </button>
          </div>
        </div>
      </div>

      {loadError && <div className={styles.errorMessage}>{loadError}</div>}

      <div className={styles.printRow}>
        <label className={styles.printLabel}>
          <input type="checkbox" checked={chkIsPrint} onChange={(e) => setChkIsPrint(e.target.checked)} />
          Click Here To Print Or Export after loading the Report
        </label>
      </div>

      <div className={styles.reportArea}>
        {!reportLoaded && !isLoadingReport && (
          <div className={styles.placeholder}>
            Set Course, Regulation and Exam Month/Year; select Semester and Branch, then click View.
          </div>
        )}
        {isLoadingReport && <div className={styles.loadingState}>Loading report…</div>}
        {reportLoaded && !isLoadingReport && (
          <div className={styles.reportContent}>
            {Array.isArray(reportData) && reportData.length > 0 ? (
              <div className={styles.reportTableWrap}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      {Object.keys(reportData[0] || {}).map((k) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((v, i) => (
                          <td key={i}>{v != null ? String(v) : ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.placeholder}>No report data to display.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticalCheckList;
