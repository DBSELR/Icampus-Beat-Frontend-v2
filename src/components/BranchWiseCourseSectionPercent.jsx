import React, { useState, useEffect } from 'react';
import styles from './BranchWiseCourseSectionPercent.module.css';
import { getAppData, getBranchwiseCourseSecPercentSems, getBranchwiseCourseSecPercentData } from '../utils/api';

const BranchWiseCourseSectionPercent = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [sem, setSem]             = useState('');
  const [semOptions, setSemOptions] = useState([]);
  const [isRv, setIsRv]           = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load sems on mount
  useEffect(() => {
    if (!course || !examMY) return;
    getBranchwiseCourseSecPercentSems(course, examMY)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getBranchwiseCourseSecPercentData(course, examMY, regu, sem, isRv);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'View failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const headers = tableCols.join(',');
    const rows = tableData.map(row =>
      tableCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `BranchWiseCourseSecPercent_${sem}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isRv} onChange={e => setIsRv(e.target.checked)} />
              RV
            </label>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownload} disabled={isLoading || tableData.length === 0}>
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
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Select Semester and click <strong>View</strong> to load data.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

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

export default BranchWiseCourseSectionPercent;
