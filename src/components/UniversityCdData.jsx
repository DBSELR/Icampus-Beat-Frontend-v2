import React, { useState, useEffect } from 'react';
import styles from './UniversityCdData.module.css';
import {
  getAppData,
  getUniversityCdDataBatch,
  getUniversityCdDataSem,
  getUnivCdDataSubjectList,
  getUniversityCdStudentsData,
} from '../utils/api';

const downloadCsv = (data, filename) => {
  const cols    = Object.keys(data[0]);
  const headers = cols.join(',');
  const rows    = data.map(row =>
    cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const UniversityCdData = () => {
  const appData    = getAppData() || {};
  const course     = appData.course     || '';
  const regulation = appData.regulation || '';

  const [batch,        setBatch]        = useState('');
  const [regSup,       setRegSup]       = useState('');
  const [sem,          setSem]          = useState('');
  const [batchOptions, setBatchOptions] = useState([]);
  const [semOptions,   setSemOptions]   = useState([]);
  const [tableData,    setTableData]    = useState([]);
  const [tableCols,    setTableCols]    = useState([]);
  const [loading,      setLoading]      = useState('');
  const [message,      setMessage]      = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !regulation) return;
    getUniversityCdDataBatch(course, regulation)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({
            value: String(r.EXAMMY || r.examMY || r.exammy || ''),
            label: String(r.EXAMMY || r.examMY || r.exammy || r),
          })));
      }).catch(() => {});
  }, [course, regulation]);

  const handleBatchChange = async (val) => {
    setBatch(val);
    setSem('');
    setSemOptions([]);
    setTableData([]);
    if (!val || !course) return;
    try {
      const res = await getUniversityCdDataSem(course, val, regulation);
      if (res.success && res.data)
        setSemOptions(res.data.map(r => ({
          value: String(r.SEM || r.sem || r.Sem || ''),
          label: String(r.SEM || r.sem || r.Sem || r),
        })));
    } catch {}
  };

  const handleSubjectList = async () => {
    if (!batch) { showMsg('Please select Batch.'); return; }
    if (!sem)   { showMsg('Please select Semester.'); return; }
    setLoading('subjects');
    setTableData([]);
    try {
      const res = await getUnivCdDataSubjectList(course, regulation, batch, sem);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        downloadCsv(res.data, `CD_Subject_List_${batch}_Sem${sem}.csv`);
        showMsg(`${res.data.length} subjects loaded.`, 'success');
      } else {
        showMsg(res.message || 'No subjects found.');
      }
    } catch (err) {
      showMsg(err.message || 'Load failed.');
    } finally {
      setLoading('');
    }
  };

  const handleStudentsData = async () => {
    if (!batch)  { showMsg('Please select Batch.'); return; }
    if (!regSup) { showMsg('Please select Regsup.'); return; }
    if (!sem)    { showMsg('Please select Semester.'); return; }
    setLoading('students');
    setTableData([]);
    try {
      const res = await getUniversityCdStudentsData(course, regulation, batch, sem, regSup);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        downloadCsv(res.data, `CD_Students_${batch}_${regSup}_Sem${sem}.csv`);
        showMsg(`${res.data.length} students loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Load failed.');
    } finally {
      setLoading('');
    }
  };

  const busy = loading !== '';

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {batchOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Regsup</label>
            <select value={regSup} onChange={e => setRegSup(e.target.value)} className={styles.select}>
              <option value="">Select Regsup</option>
              <option value="REG">REG</option>
              <option value="SUP">SUP</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {semOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button type="button" className={styles.subjectsBtn}
              onClick={handleSubjectList} disabled={busy}>
              {loading === 'subjects' ? 'Loading...' : 'Subjects Data'}
            </button>
            <button type="button" className={styles.studentsBtn}
              onClick={handleStudentsData} disabled={busy}>
              {loading === 'students' ? 'Loading...' : 'Students Data'}
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
        {busy && <div className={styles.loadingState}>Loading...</div>}
        {!busy && tableData.length === 0 && !message.text && (
          <div className={styles.placeholder}>
            Select Batch, Regsup and Semester, then click <strong>Subjects Data</strong> or <strong>Students Data</strong>.
          </div>
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

export default UniversityCdData;
