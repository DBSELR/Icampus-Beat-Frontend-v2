import React, { useState, useEffect } from 'react';
import styles from './Pc.module.css';
import { getAppData, getUniversityPcFormateData } from '../utils/api';

const Pc = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message,   setMessage]   = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY || !regu) return;
    setIsLoading(true);
    getUniversityPcFormateData(course, examMY, regu)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setTableCols(Object.keys(res.data[0]));
          setTableData(res.data);
        } else {
          showMsg(res.message || 'No data found.');
        }
      })
      .catch(err => showMsg(err.message || 'Load failed.'))
      .finally(() => setIsLoading(false));
  }, [course, examMY, regu]);

  const handleDownload = () => {
    if (tableData.length === 0) { showMsg('No data to download.'); return; }
    const headers = tableCols.join(',');
    const rows = tableData.map(row =>
      tableCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `PC_Report_${course}_${examMY}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <span className={styles.title}>{course} PC REPORT</span>
          <div className={styles.actionsGroup}>
            <button type="button" className={styles.downloadBtn}
              onClick={handleDownload} disabled={isLoading || tableData.length === 0}>
              Download
            </button>
            <button type="button" className={styles.printBtn}
              onClick={handlePrint} disabled={isLoading || tableData.length === 0}>
              Print
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
          <div className={styles.placeholder}>Loading PC report data...</div>
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

export default Pc;
