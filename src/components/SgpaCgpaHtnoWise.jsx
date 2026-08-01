import React, { useState, useEffect } from 'react';
import styles from './SgpaCgpaHtnoWise.module.css';
import {
  getAppData,
  getSgpaCgpaHtnoWiseBatches,
  getSgpaCgpaHtnoWiseBranches,
  getSgpaCgpaHtnoWiseExamMYs,
  getSgpaCgpaHtnoWiseData,
} from '../utils/api';

const SgpaCgpaHtnoWise = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';

  const [batch,         setBatch]         = useState('');
  const [regu,          setRegu]          = useState('');
  const [branch,        setBranch]        = useState('');
  const [examMY,        setExamMY]        = useState('');
  const [withRv,        setWithRv]        = useState(false);
  const [batchOptions,  setBatchOptions]  = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [examMYOptions, setExamMYOptions] = useState([]);
  const [tableData,     setTableData]     = useState([]);
  const [tableCols,     setTableCols]     = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [message,       setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    Promise.all([
      getSgpaCgpaHtnoWiseBatches(course),
      getSgpaCgpaHtnoWiseBranches(course),
    ]).then(([bRes, brRes]) => {
      if (bRes.success && bRes.data)
        setBatchOptions(bRes.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      if (brRes.success && brRes.data)
        setBranchOptions(brRes.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.GRP || r.grp || r) })));
    }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (val) => {
    const opt = batchOptions.find(o => o.regu === val);
    const reguVal = opt ? opt.regu : val;
    setBatch(val);
    setRegu(reguVal);
    setExamMY('');
    setExamMYOptions([]);
    setTableData([]);
    if (!reguVal || !course) return;
    try {
      const res = await getSgpaCgpaHtnoWiseExamMYs(course, reguVal);
      if (res.success && res.data)
        setExamMYOptions(res.data.map(r => String(r.EXAMMY || r.ExamMY || r.examMY || r.exammy || r)));
    } catch {}
  };

  const handleView = async () => {
    if (!batch)  { showMsg('Please select Batch.'); return; }
    if (!examMY) { showMsg('Please select Exam M/Y.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getSgpaCgpaHtnoWiseData(course, examMY, regu, branch, withRv);
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
    a.href = url; a.download = `SgpaCgpa_${batch}_${examMY}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Exam M/Y</label>
            <select value={examMY} onChange={e => setExamMY(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {examMYOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={withRv} onChange={e => setWithRv(e.target.checked)} />
              With RV
            </label>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
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
          <div className={styles.placeholder}>Select Batch, Exam M/Y and click <strong>View</strong> to load the report.</div>
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

export default SgpaCgpaHtnoWise;
