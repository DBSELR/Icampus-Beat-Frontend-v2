import React, { useState, useEffect, useCallback } from 'react';
import {
  getAppData,
  getStudentWisePresentListSemesters,
  getStudentWisePresentListReport,
} from '../utils/api';
import styles from './SubjectWisePresentList.module.css';

const SubjectWisePresentList = () => {
  const appData = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course = (appData.course || '').trim();
  const examMY = (appData.examMY || '').trim();

  const [filters, setFilters] = useState({ semester: '', regsup: 'REG' });
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadError, setLoadError] = useState('');

  const regsupOptions = [
    { value: 'REG', text: 'REG' },
    { value: 'Sup', text: 'Sup' },
  ];

  const canLoadDropdowns = !!(course && regulation && examMY);
  const canViewReport = course && regulation && examMY && filters.semester && filters.regsup;

  const fetchSemesters = useCallback(async () => {
    if (!canLoadDropdowns) {
      setSemesterOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getStudentWisePresentListSemesters(course, regulation, examMY);
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
      console.error('StudentWisePresentList semesters error:', err);
      setSemesterOptions([]);
      setLoadError(err?.message || 'Failed to load semesters');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, regulation, examMY, canLoadDropdowns]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
    setLoadError('');
    if (name === 'semester' || name === 'regsup') setReportData(null);
  };

  const handleView = async () => {
    if (!canViewReport) {
      alert('Please select Semester and RegSup. Ensure Course, Regulation and Exam Month/Year are set.');
      return;
    }
    setIsLoadingReport(true);
    setReportData(null);
    setLoadError('');
    try {
      const res = await getStudentWisePresentListReport(
        course,
        regulation,
        examMY,
        filters.semester,
        filters.regsup
      );
      if (res?.success) {
        setReportData(Array.isArray(res?.data) ? res.data : res?.data ?? null);
      } else {
        setReportData(null);
        setLoadError(res?.message || 'No data found');
      }
    } catch (err) {
      console.error('StudentWisePresentList report error:', err);
      setReportData(null);
      setLoadError(err?.message || 'Failed to load report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownload = () => {
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      alert('Load the report first by clicking Export Data.');
      return;
    }
    if (Array.isArray(reportData) && reportData.length > 0) {
      const first = reportData[0];
      const keys = typeof first === 'object' && first !== null ? Object.keys(first) : [];
      const header = keys.join(',');
      const rows = reportData.map((row) =>
        keys
          .map((k) => {
            const v = row[k];
            const s = v == null ? '' : String(v);
            return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `StudentWisePresentList_${course}_${examMY}_${filters.semester}_${filters.regsup}.csv`;
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
            <label className={styles.label}>Regsup</label>
            <select
              name="regsup"
              value={filters.regsup}
              onChange={handleChange}
              className={styles.select}
            >
              {regsupOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.text}</option>
              ))}
            </select>
          </div>
          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={handleView}
              disabled={isLoadingReport || !canViewReport}
            >
              {isLoadingReport ? 'Loading…' : 'Export Data'}
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

      <div className={styles.resultArea}>
        {!reportLoaded && !isLoadingReport && (
          <div className={styles.placeholder}>
            Select Semester, Regsup and click Export Data. Ensure Course, Regulation and Exam Month/Year are set.
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

export default SubjectWisePresentList;
