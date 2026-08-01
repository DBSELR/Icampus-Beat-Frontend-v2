import React, { useState, useEffect } from 'react';
import styles from './AwardOfClassBranchwise.module.css';
import {
  getAppData,
  getAwardOfClassBatches,
  getAwardOfClassSems,
  getAwardOfClassData,
  getAwardOfClassExcel,
} from '../utils/api';

const AwardOfClassBranchwise = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';
  const examMY  = appData.examMY || '';

  const [batch,        setBatch]        = useState('');
  const [regu,         setRegu]         = useState('');
  const [sem,          setSem]          = useState('');
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
      getAwardOfClassBatches(course),
      examMY ? getAwardOfClassSems(course, examMY) : Promise.resolve({ success: false }),
    ]).then(([bRes, sRes]) => {
      if (bRes.success && bRes.data)
        setBatchOptions(bRes.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      if (sRes.success && sRes.data)
        setSemOptions(sRes.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
    }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (!regu) { showMsg('Please select Batch.'); return; }
    if (!sem)  { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getAwardOfClassData(course, examMY, regu, sem);
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

  const handleDownload = async () => {
    if (!regu) { showMsg('Please select Batch.'); return; }
    if (!sem)  { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    try {
      const res = await getAwardOfClassExcel(course, examMY, regu, sem);
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
        a.href = url; a.download = `AwardofClass_${batch}_Sem${sem}_${examMY}.csv`; a.click();
        URL.revokeObjectURL(url);
        showMsg(`${res.data.length} records downloaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Download failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => {
              const opt = batchOptions.find(o => o.regu === e.target.value);
              setBatch(e.target.value);
              setRegu(opt ? opt.regu : e.target.value);
            }} className={styles.select}>
              <option value=''>-- Select --</option>
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

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn}
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
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Select Batch, Semester and click <strong>View</strong> to load the report.</div>
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

export default AwardOfClassBranchwise;
