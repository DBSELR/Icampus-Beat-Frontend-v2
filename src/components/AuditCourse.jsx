import React, { useState, useEffect } from 'react';
import styles from './AuditCourse.module.css';
import {
  getAppData,
  getAuditCourseBatch,
  getAuditCourseSem,
  getAuditCourseAcademicYear,
  getAuditCourseData,
} from '../utils/api';

const downloadCsv = (data, filename) => {
  const cols    = Object.keys(data[0]);
  const headers = cols.join(',');
  const rows    = data.map(row =>
    cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const AuditCourse = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';

  const [batch,           setBatch]           = useState('');
  const [sem,             setSem]             = useState('');
  const [academicYear,    setAcademicYear]    = useState('');
  const [batchOptions,    setBatchOptions]    = useState([]);
  const [semOptions,      setSemOptions]      = useState([]);
  const [yearOptions,     setYearOptions]     = useState([]);
  const [tableData,       setTableData]       = useState([]);
  const [tableCols,       setTableCols]       = useState([]);
  const [isLoading,       setIsLoading]       = useState(false);
  const [message,         setMessage]         = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load batch (REGU) and academic year on mount
  useEffect(() => {
    if (!course) return;
    getAuditCourseBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({
            value: String(r.REGU || r.regu || ''),
            label: String(r.REGU || r.regu || r),
          })));
      }).catch(() => {});

    getAuditCourseAcademicYear(course)
      .then(res => {
        if (res.success && res.data)
          setYearOptions(res.data.map(r => ({
            value: String(r.Academic_year || r.ACADEMIC_YEAR || r.academicYear || ''),
            label: String(r.Academic_year || r.ACADEMIC_YEAR || r.academicYear || r),
          })));
      }).catch(() => {});
  }, [course]);

  // Cascade: batch → semester
  const handleBatchChange = async (val) => {
    setBatch(val);
    setSem('');
    setSemOptions([]);
    setTableData([]);
    if (!val || !course) return;
    try {
      const res = await getAuditCourseSem(course, val);
      if (res.success && res.data)
        setSemOptions(res.data.map(r => ({
          value: String(r.SEM || r.sem || r.Sem || ''),
          label: String(r.SEM || r.sem || r.Sem || r),
        })));
    } catch {}
  };

  const fetchData = async () => {
    if (!batch)        { showMsg('Please select Batch.'); return null; }
    if (!sem)          { showMsg('Please select Semester.'); return null; }
    if (!academicYear) { showMsg('Please select Academic Year.'); return null; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getAuditCourseData(course, batch, sem, academicYear);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        return res.data;
      } else {
        showMsg(res.message || 'No data found.');
        return null;
      }
    } catch (err) {
      showMsg(err.message || 'Load failed.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async () => {
    const data = await fetchData();
    if (data) showMsg(`${data.length} records loaded.`, 'success');
  };

  const handleDownload = async () => {
    const data = tableData.length > 0 ? tableData : await fetchData();
    if (data && data.length > 0) {
      downloadCsv(data, `AuditCourse_${batch}_Sem${sem}_${academicYear}.csv`);
      showMsg(`${data.length} records downloaded.`, 'success');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {batchOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {semOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button type="button" className={styles.viewBtn}
              onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type="button" className={styles.downloadBtn}
              onClick={handleDownload} disabled={isLoading}>
              Download
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className={styles.reportArea}>
        {isLoading && <div className={styles.loadingState}>Loading...</div>}
        {!isLoading && tableData.length === 0 && !message.text && (
          <div className={styles.placeholder}>
            Select Batch, Semester and Academic Year, then click <strong>View</strong>.
          </div>
        )}
        {tableData.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>{tableCols.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={i}>{tableCols.map(c => <td key={c}>{row[c] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditCourse;
