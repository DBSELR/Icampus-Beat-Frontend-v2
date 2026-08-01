import React, { useState, useEffect } from 'react';
import styles from './GradeCard.module.css';
import { getAppData, getResultGradeSheetSems, getResultGradeSheetData } from '../utils/api';

const GradeCard = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [semester, setSemester]         = useState('');
  const [isRv, setIsRv]                 = useState(false);
  const [isReadmit, setIsReadmit]       = useState(false);
  const [readmitRegu, setReadmitRegu]   = useState('');
  const [semOptions, setSemOptions]     = useState([]);
  const [tableData, setTableData]       = useState([]);
  const [tableCols, setTableCols]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [message, setMessage]           = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load sems on mount
  useEffect(() => {
    if (!course || !examMY) return;
    getResultGradeSheetSems(course, examMY)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (!semester) { showMsg('Please select Semester.'); return; }
    if (isReadmit && !readmitRegu.trim()) { showMsg('Please enter Readmit Regulation.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getResultGradeSheetData(course, examMY, regu, semester, isRv, isReadmit, readmitRegu.trim());
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
    a.href = url; a.download = `GradeCard_${semester}.csv`; a.click();
    URL.revokeObjectURL(url);
    showMsg('Exported successfully.', 'success');
  };

  const handleClear = () => {
    setSemester(''); setIsRv(false); setIsReadmit(false); setReadmitRegu('');
    setTableData([]); setTableCols([]);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          {/* Semester */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={semester} onChange={e => setSemester(e.target.value)} className={styles.select}>
              <option value=''>Select</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Revaluation */}
          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isRv} onChange={e => setIsRv(e.target.checked)} />
              &nbsp;Revaluation
            </label>
          </div>

          {/* Is Readmit Result */}
          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isReadmit}
                onChange={e => { setIsReadmit(e.target.checked); if (!e.target.checked) setReadmitRegu(''); }} />
              &nbsp;Is Readmit Result
            </label>
          </div>

          {/* Readmit Regulation (conditional) */}
          {isReadmit && (
            <div className={styles.filterGroup}>
              <label className={styles.label}>Readmit Regulation</label>
              <input
                type='text'
                className={styles.select}
                value={readmitRegu}
                onChange={e => setReadmitRegu(e.target.value.toUpperCase())}
                placeholder='Enter Readmit Regulation'
                style={{ width: 160 }}
              />
            </div>
          )}

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownload} disabled={isLoading || tableData.length === 0} style={{ marginLeft: 8 }}>
              Download
            </button>
            <button type='button' onClick={handleClear} style={{ marginLeft: 8 }}>
              Clear
            </button>
          </div>
        </div>

        {message.text && (
          <div style={{
            margin: '8px 0', padding: '6px 12px', borderRadius: 4, fontWeight: 'bold',
            color: message.type === 'success' ? '#155724' : '#721c24',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>{message.text}</div>
        )}
      </div>

      <div className={styles.printHint}>
        <label className={styles.printLabel}>
          <input type='checkbox' />
          Click Here To Print Or Export after loading the Report
        </label>
      </div>

      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Select Semester and click View to load the Grade Card report.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {tableData.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{tableCols.map(c => <th key={c} style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f0f0', whiteSpace: 'nowrap' }}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    {tableCols.map(c => <td key={c} style={{ border: '1px solid #ddd', padding: '4px 8px', textAlign: 'center' }}>{row[c] ?? ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeCard;
