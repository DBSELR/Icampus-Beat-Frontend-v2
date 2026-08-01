import React, { useState, useEffect } from 'react';
import styles from './CreditsSecuredHtnoWise.module.css';
import {
  getAppData,
  getCreditSecuredExammy,
  getCreditSecuredBatch,
  getCreditSecuredBranch,
  getCreditSecuredData,
} from '../utils/api';

const CreditsSecuredHtnoWise = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';

  const [batch,         setBatch]         = useState('');
  const [regu,          setRegu]          = useState('');
  const [branch,        setBranch]        = useState('');
  const [examMY,        setExamMY]        = useState('');
  const [noofcredits,   setNoofcredits]   = useState('');
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
    getCreditSecuredBatch(course)
      .then(bRes => {
        if (bRes.success && bRes.data)
          setBatchOptions(bRes.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (val) => {
    const opt = batchOptions.find(o => o.regu === val);
    const reguVal = opt ? opt.regu : val;
    setBatch(val);
    setRegu(reguVal);
    setBranch('');
    setBranchOptions([]);
    setExamMY('');
    setExamMYOptions([]);
    setTableData([]);
    if (!reguVal || !course) return;
    try {
      const [bRes, eRes] = await Promise.all([
        getCreditSecuredBranch(course, reguVal),
        getCreditSecuredExammy('R' + reguVal, course),
      ]);
      if (bRes.success && bRes.data)
        setBranchOptions(bRes.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.BRANCH || r.branch || r.GRP || r.grp || r) })));
      if (eRes.success && eRes.data)
        setExamMYOptions(eRes.data.map(r => String(r.EXAMMY || r.ExamMY || r.examMY || r.exammy || r)));
    } catch {}
  };

  const handleView = async () => {
    if (!regu)                        { showMsg('Please select Batch.'); return; }
    if (!examMY)                      { showMsg('Please select Exam M/Y.'); return; }
    if (!branch)                      { showMsg('Please select Branch.'); return; }
    const credits = parseInt(noofcredits, 10);
    if (!noofcredits || credits <= 0) { showMsg('Please enter No. of Credits (> 0).'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getCreditSecuredData('R' + regu, course, regu, examMY, branch, credits);
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

  const handleExport = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const headers = tableCols.join(',');
    const rows = tableData.map(row =>
      tableCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `CreditsSecured_${batch}_${branch}_${examMY}.csv`; a.click();
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

          <div className={styles.filterGroup}>
            <label className={styles.label}>No. of Credits</label>
            <input type='number' value={noofcredits} min='1'
              onChange={e => setNoofcredits(e.target.value)}
              className={styles.input} placeholder='e.g. 10' />
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.exportBtn}
              onClick={handleExport} disabled={isLoading || tableData.length === 0}>
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
          <div className={styles.placeholder}>Select Batch, Branch, Exam M/Y, enter No. of Credits and click <strong>View</strong> to load data.</div>
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

export default CreditsSecuredHtnoWise;
