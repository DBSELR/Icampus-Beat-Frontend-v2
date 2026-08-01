import React, { useState, useEffect } from 'react';
import styles from './MtechCmm.module.css';
import { getAppData, getMtechCmmData } from '../utils/api';

const MtechCmm = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Auto-load on mount using appData
  useEffect(() => {
    if (!course || !examMY) return;
    setIsLoading(true);
    getMtechCmmData(course, examMY, regu)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setTableCols(Object.keys(res.data[0]));
          setTableData(res.data);
          showMsg(`${res.data.length} records loaded.`, 'success');
        } else {
          showMsg(res.message || 'No data found.');
        }
      })
      .catch(err => showMsg(err.message || 'Load failed.'))
      .finally(() => setIsLoading(false));
  }, [course, examMY, regu]);

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <span className={styles.title}>MTECH CMM REPORT</span>
          <div className={styles.spacer} />
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
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Data loads automatically on page open.</div>
        )}

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

export default MtechCmm;
