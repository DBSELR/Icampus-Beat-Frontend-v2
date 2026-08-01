import React, { useState, useEffect } from 'react';
import styles from './WebResult.module.css';
import { getAppData, getResultGradeSheetSems, getResultGradeSheetData } from '../utils/api';

const WebResult = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [sem, setSem]             = useState('');
  const [semOptions, setSemOptions] = useState([]);
  const [regSup, setRegSup]       = useState('');
  const [isRv, setIsRv]           = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY) return;
    getResultGradeSheetSems(course, examMY)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      }).catch(() => {});
  }, [course, examMY]);

  const handleExport = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    if (!regSup) { showMsg('Please select RegSup.'); return; }
    setIsLoading(true);
    try {
      const res = await getResultGradeSheetData(course, examMY, regu, sem, isRv, false, '');
      if (res.success && res.data && res.data.length > 0) {
        const cols = Object.keys(res.data[0]);
        const headers = cols.join(',');
        const rows = res.data.map(row =>
          cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv  = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `WebResult_${sem}_${regSup}${isRv ? '_RV' : ''}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg(`Exported ${res.data.length} records.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
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

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>RegSup</label>
            <select value={regSup} onChange={e => setRegSup(e.target.value)} className={styles.select}>
              <option value=''>Select RegSup</option>
              <option value='Reg'>Reg</option>
              <option value='Sup'>Sup</option>
            </select>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isRv} onChange={e => setIsRv(e.target.checked)} />
              Revaluation
            </label>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.exportBtn} onClick={handleExport} disabled={isLoading}>
              {isLoading ? 'Exporting...' : 'Export'}
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
        {!isLoading && !message.text && (
          <div className={styles.placeholder}>Select Semester and RegSup, then click <strong>Export</strong> to download.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Exporting...</div>}
      </div>
    </div>
  );
};

export default WebResult;
