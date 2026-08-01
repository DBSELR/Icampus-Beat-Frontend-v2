import React, { useState, useEffect } from 'react';
import styles from './RvReports.module.css';
import { getAppData, getRvMarksCheckListSems, getRvMarksCheckListData } from '../utils/api';

const toReportType = (val) => val === 'R' ? 3 : Number(val);

const RvReports = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [reportType,  setReportType]  = useState('1');
  const [sem,         setSem]         = useState('');
  const [semOptions,  setSemOptions]  = useState([]);
  const [isReadmit,   setIsReadmit]   = useState(false);
  const [readmitRegu, setReadmitRegu] = useState('');
  const [tableData,   setTableData]   = useState([]);
  const [tableCols,   setTableCols]   = useState([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [message,     setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    getRvMarksCheckListSems(course)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      }).catch(() => {});
  }, [course]);

  const handleExport = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getRvMarksCheckListData(course, examMY, regu, sem, isReadmit, readmitRegu.trim(), toReportType(reportType));
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (tableData.length === 0) { showMsg('Please click Export first to load data.'); return; }
    const cols    = tableCols;
    const headers = cols.join(',');
    const rows    = tableData.map(row =>
      cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `RvCheckList_Sem${sem}_${examMY}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.radioGroup}>
            {[['1', 'Check List - I'], ['2', 'Check List - II'], ['R', 'Result Sheet']].map(([val, lbl]) => (
              <label key={val} className={styles.radioLabel}>
                <input type='radio' name='rvReportType' value={val}
                  checked={reportType === val} onChange={e => setReportType(e.target.value)} />
                {lbl}
              </label>
            ))}
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
              <input type='checkbox' checked={isReadmit}
                onChange={e => { setIsReadmit(e.target.checked); if (!e.target.checked) setReadmitRegu(''); }} />
              Is Readmit Result
            </label>
          </div>

          {isReadmit && (
            <div className={styles.filterGroup}>
              <label className={styles.label}>Readmit Reg.</label>
              <input type='text' value={readmitRegu}
                onChange={e => setReadmitRegu(e.target.value.toUpperCase())}
                className={styles.input} placeholder='e.g. R20' />
            </div>
          )}

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.exportBtn} onClick={handleExport} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Export'}
            </button>
            <button type='button' className={styles.downloadBtn}
              onClick={handleDownload} disabled={isLoading || tableData.length === 0}>
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
          <div className={styles.placeholder}>Select report type and semester, then click <strong>Export</strong> to load data.</div>
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

export default RvReports;
