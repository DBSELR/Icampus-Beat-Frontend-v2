import React, { useState, useEffect } from 'react';
import styles from './PreModeration.module.css';
import { getAppData, getPreModerationSems, getPreModerationData } from '../utils/api';

const PreModeration = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [semester, setSemester]     = useState('');
  const [semOptions, setSemOptions] = useState([]);
  const [tableData, setTableData]   = useState([]);
  const [tableCols, setTableCols]   = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [message, setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load sems on mount
  useEffect(() => {
    if (!course || !examMY) return;
    getPreModerationSems(course, examMY, regu)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      }).catch(() => {});
  }, [course, examMY, regu]);

  const handleExport = async () => {
    if (!semester) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getPreModerationData(course, examMY, regu, semester);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No pre-moderation data found.');
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
          <span className={styles.title}>PREMODERATION REPORT</span>
          <div className={styles.spacer} />

          <div className={styles.filterGroup}>
            <select value={semester} onChange={e => setSemester(e.target.value)} className={styles.select}>
              <option value=''>Select Sem</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button type='button' className={styles.exportBtn} onClick={handleExport} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Export'}
          </button>
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

      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Select Semester and click Export to load the report.</div>
        )}

        {tableData.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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

export default PreModeration;
