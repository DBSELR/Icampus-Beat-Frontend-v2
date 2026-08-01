import React, { useState, useEffect } from 'react';
import styles from './SubjectWiseGradesCount.module.css';
import {
  getAppData,
  getSubjectWiseGradesCountBatches,
  getSubjectWiseGradesCountSems,
  getSubjectWiseGradesCountData,
  getSubjectWiseGradesCountExcel,
} from '../utils/api';

const SubjectWiseGradesCount = () => {
  const appData = getAppData() || {};
  const course  = appData.course  || '';
  const examMY  = appData.examMY  || '';

  const [batch,        setBatch]        = useState('');
  const [regu,         setRegu]         = useState('');
  const [sem,          setSem]          = useState('');
  const [isReadmit,    setIsReadmit]    = useState(false);
  const [batchOptions, setBatchOptions] = useState([]);
  const [semOptions,   setSemOptions]   = useState([]);
  const [tableData,    setTableData]    = useState([]);
  const [tableCols,    setTableCols]    = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [message,      setMessage]      = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    Promise.all([
      getSubjectWiseGradesCountBatches(course),
      getSubjectWiseGradesCountSems(course, examMY),
    ]).then(([bRes, sRes]) => {
      if (bRes.success && bRes.data)
        setBatchOptions(bRes.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      if (sRes.success && sRes.data)
        setSemOptions(sRes.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
    }).catch(() => {});
  }, [course, examMY]);

  const handleBatchChange = (val) => {
    const opt = batchOptions.find(o => o.regu === val);
    setBatch(val);
    setRegu(opt ? opt.regu : val);
    setTableData([]);
  };

  const handleView = async () => {
    if (!batch) { showMsg('Please select Batch.'); return; }
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getSubjectWiseGradesCountData(course, examMY, regu, sem, isReadmit);
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

  const handleExport = async () => {
    if (!batch) { showMsg('Please select Batch.'); return; }
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    try {
      const res = await getSubjectWiseGradesCountExcel(course, examMY, regu, sem);
      if (res.success && res.data && res.data.length > 0) {
        const cols    = Object.keys(res.data[0]);
        const headers = cols.join(',');
        const rows    = res.data.map(row =>
          cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv  = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `SubjectWiseGradesCount_${sem}.csv`; a.click();
        URL.revokeObjectURL(url);
        showMsg('Exported successfully.', 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <span className={styles.title}>RESULTS GRADE ANALYSIS</span>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value=''>-- All --</option>
              {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isReadmit} onChange={e => setIsReadmit(e.target.checked)} />
              Is Readmit Result
            </label>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.exportBtn} onClick={handleExport} disabled={isLoading}>
              Export
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

export default SubjectWiseGradesCount;
