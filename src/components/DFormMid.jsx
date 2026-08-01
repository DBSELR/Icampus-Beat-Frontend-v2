import React, { useState, useEffect, useCallback } from 'react';
import {
  getAppData,
  getDFormMidSemesters,
  getDFormMidEDates,
  getDFormMidReport,
} from '../utils/api';
import styles from './DFormMid.module.css';

const DFormMid = () => {
  const appData = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course = (appData.course || '').trim();
  const examMY = (appData.examMY || '').trim();

  const [filters, setFilters] = useState({ examType: '', semester: '', examDate: '' });
  const [isReadmitResult, setIsReadmitResult] = useState(false);
  const [chkIsPrint, setChkIsPrint] = useState(false);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadError, setLoadError] = useState('');

  const examTypeOptions = [
    { value: '', text: 'Select ExamType' },
    { value: '1', text: 'MID-I' },
    { value: '2', text: 'MID-II' },
  ];

  const canLoadDropdowns = !!(course && regulation && examMY);
  const canLoadEdates = canLoadDropdowns && filters.semester && filters.examType;
  const canViewReport =
    regulation &&
    course &&
    examMY &&
    filters.semester &&
    filters.examDate &&
    filters.examType;

  const fetchSemesters = useCallback(async () => {
    if (!canLoadDropdowns) {
      setSemesterOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getDFormMidSemesters(course, regulation, examMY);
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
      console.error('DFormMid semesters error:', err);
      setSemesterOptions([]);
      setLoadError(err?.message || 'Failed to load semesters');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, regulation, examMY, canLoadDropdowns]);

  const fetchEDates = useCallback(async () => {
    if (!canLoadEdates) {
      setExamDateOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getDFormMidEDates(
        course,
        regulation,
        examMY,
        filters.semester,
        filters.examType
      );
      if (res?.success && Array.isArray(res?.data)) {
        const list = (res.data || []).map((row) => {
          const raw = row.MDATE ?? row.EDATE ?? row.eDate ?? row.EDate ?? '';
          const label =
            row.edate1 ??
            row.MDATE ??
            row.EDATE ??
            row.eDate ??
            row.EDate ??
            '';
          return {
            value: raw,
            label: label || raw,
          };
        }).filter((x) => x.value);
        setExamDateOptions(list);
      } else {
        setExamDateOptions([]);
      }
    } catch (err) {
      console.error('DFormMid edates error:', err);
      setExamDateOptions([]);
      setLoadError(err?.message || 'Failed to load exam dates');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, regulation, examMY, filters.semester, filters.examType, canLoadEdates]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    fetchEDates();
  }, [fetchEDates]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'semester' || name === 'examType') {
      setFilters((p) => ({ ...p, [name]: value, examDate: '' }));
    } else {
      setFilters((p) => ({ ...p, [name]: value }));
    }
    setLoadError('');
    setReportData(null);
  };

  const handleView = async () => {
    if (!canViewReport) {
      alert('Please select ExamType, Semester and Exam Date. Ensure Course, Regulation and Exam Month/Year are set.');
      return;
    }
    setIsLoadingReport(true);
    setReportData(null);
    setLoadError('');
    try {
      const res = await getDFormMidReport(
        regulation,
        course,
        examMY,
        filters.semester,
        filters.examDate,
        filters.examType,
        isReadmitResult
      );
      if (res?.success) {
        setReportData(Array.isArray(res?.data) ? res.data : res?.data ?? null);
      } else {
        setReportData(null);
        setLoadError(res?.message || 'No data found');
      }
    } catch (err) {
      console.error('DFormMid report error:', err);
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
      a.download = `DFormMid_${course}_${examMY}_${filters.semester}_${filters.examDate}.csv`;
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
            <label className={styles.label}>ExamType</label>
            <select
              name="examType"
              value={filters.examType}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadDropdowns || loadingDropdowns}
            >
              {examTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.text}</option>
              ))}
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
            <label className={styles.label}>Exam Date</label>
            <select
              name="examDate"
              value={filters.examDate}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadEdates || loadingDropdowns || examDateOptions.length === 0}
            >
              <option value="">Select</option>
              {examDateOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label || d.value}</option>
              ))}
            </select>
          </div>
          <div className={styles.checkGroup}>
            <label className={styles.readmitLabel}>
              <input
                type="checkbox"
                checked={isReadmitResult}
                onChange={(e) => setIsReadmitResult(e.target.checked)}
              />
              Is Readmit Result
            </label>
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
            Select ExamType, Semester, Exam Date and click View to load the report. Ensure Course, Regulation and Exam Month/Year are set.
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

export default DFormMid;
