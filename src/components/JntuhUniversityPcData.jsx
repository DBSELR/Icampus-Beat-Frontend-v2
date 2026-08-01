import React, { useState, useEffect } from 'react';
import styles from './JntuhUniversityPcData.module.css';
import { getAppData, getUniversityPcFormateBatch, getUniversityPcFormateBranch, getUniversityPcFormateData } from '../utils/api';

const JntuhUniversityPcData = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [isLateral,     setIsLateral]     = useState(false);
  const [isGracing,     setIsGracing]     = useState(false);
  const [batch,         setBatch]         = useState('');
  const [branch,        setBranch]        = useState('');
  const [batchOptions,  setBatchOptions]  = useState([]);
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
    if (!course) return;
    getUniversityPcFormateBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (val) => {
    setBatch(val);
    setBranch('');
    setBranchOptions([]);
    setTableData([]);
    if (!val || !course) return;
    try {
      const res = await getUniversityPcFormateBranch(course, val);
      if (res.success && res.data)
        setBranchOptions(res.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.GRP || r.grp || r) })));
    } catch {}
  };

  const handleDownload = async () => {
    if (!batch)  { showMsg('Please select Batch.'); return; }
    if (!branch) { showMsg('Please select Branch.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getUniversityPcFormateData(course, examMY, regu, batch, branch, isGracing, isLateral);
      if (res.success && res.data && res.data.length > 0) {
        const cols = Object.keys(res.data[0]);
        setTableCols(cols);
        setTableData(res.data);
        // auto download CSV
        const headers = cols.join(',');
        const rows = res.data.map(row =>
          cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv  = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `University_PC_${batch}_${branch}.csv`; a.click();
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

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={isLateral} onChange={e => setIsLateral(e.target.checked)} />
              Lateral
            </label>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={isGracing} onChange={e => setIsGracing(e.target.checked)} />
              Gracing
            </label>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button type="button" className={styles.downloadBtn} onClick={handleDownload} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Download'}
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
          <div className={styles.placeholder}>Select Batch and Branch, then click <strong>Download</strong> to load data.</div>
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

export default JntuhUniversityPcData;
