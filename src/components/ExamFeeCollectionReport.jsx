import React, { useState, useEffect } from 'react';
import styles from './ExamFeeCollectionReport.module.css';
import {
  getAppData,
  getExamFeeCollectionReportSems,
  getExamFeeCollectionReportBranches,
  getExamFeeCollectionReportData,
} from '../utils/api';

const ExamFeeCollectionReport = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [sem,           setSem]           = useState('');
  const [branch,        setBranch]        = useState('');
  const [semOptions,    setSemOptions]    = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [tableData,     setTableData]     = useState([]);
  const [tableCols,     setTableCols]     = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [message,       setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY) return;
    Promise.all([
      getExamFeeCollectionReportSems(course, examMY),
      getExamFeeCollectionReportBranches(course),
    ]).then(([sRes, bRes]) => {
      if (sRes.success && sRes.data)
        setSemOptions(sRes.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      if (bRes.success && bRes.data)
        setBranchOptions(bRes.data.map(r => String(r.GRP || r.grp || r)));
    }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getExamFeeCollectionReportData(course, examMY, regu, sem, branch);
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

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value=''>-- All Branches --</option>
              {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
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
          <div className={styles.placeholder}>Select Semester and click <strong>View</strong> to load the report.</div>
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

export default ExamFeeCollectionReport;
