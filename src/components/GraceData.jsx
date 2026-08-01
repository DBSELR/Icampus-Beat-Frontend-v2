import React, { useState, useEffect } from 'react';
import globalStyles from './Results.module.css';
import { FaGift, FaBroom } from 'react-icons/fa';
import { getAppData, getGraceDataBatch, getGraceDataSem, getGraceData } from '../utils/api';

const GraceData = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';
  const exammy  = appData.examMY || '';

  const [batchRegu, setBatchRegu]       = useState('');
  const [semester, setSemester]         = useState('');
  const [isLE, setIsLE]                 = useState(false);
  const [batchOptions, setBatchOptions] = useState([]);
  const [semOptions, setSemOptions]     = useState([]);
  const [tableData, setTableData]       = useState([]);
  const [tableCols, setTableCols]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load batch on mount
  useEffect(() => {
    if (!course) return;
    getGraceDataBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  // Batch change → cascade load semester
  const handleBatchChange = async (regu) => {
    setBatchRegu(regu);
    setSemester('');
    setSemOptions([]);
    setTableData([]);
    if (!regu || !course) return;
    try {
      const res = await getGraceDataSem(course, regu);
      if (res.success && res.data)
        setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
    } catch {}
  };

  const handleGetData = async () => {
    if (!batchRegu) { showMsg('Please select Batch.'); return; }
    setLoading(true);
    setTableData([]);
    try {
      const res = await getGraceData(course, batchRegu, exammy, semester, isLE);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No grace eligible data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Get Data failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setBatchRegu(''); setSemester(''); setIsLE(false);
    setSemOptions([]); setTableData([]); setTableCols([]);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaGift className={globalStyles.headerIcon} /> Grace Eligible Data</h2>
        </div>
        <div className={globalStyles.boxContent}>
          {message.text && (
            <div style={{
              margin: '0 auto 24px', padding: '12px 20px', maxWidth: '700px', borderRadius: '8px',
              textAlign: 'center', fontWeight: '600',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {message.text}
            </div>
          )}

          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>

              {/* Batch */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select className={globalStyles.dropdown} value={batchRegu}
                  onChange={e => handleBatchChange(e.target.value)}>
                  <option value=''>Select Batch</option>
                  {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                </select>
              </div>

              {/* Semester */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <select className={globalStyles.dropdown} value={semester}
                  onChange={e => setSemester(e.target.value)}>
                  <option value=''>Select Sem</option>
                  {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* LE checkbox */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={isLE} id="isLECheck"
                  onChange={e => setIsLE(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="isLECheck" className={globalStyles.label} style={{ margin: 0, cursor: 'pointer' }}>LE</label>
              </div>

              {/* Buttons */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                  onClick={handleGetData} disabled={loading}>
                  {loading ? 'Loading...' : 'Get Data'}
                </button>
                <button type="button" className={`${globalStyles.btn} ${globalStyles.clearBtn}`}
                  onClick={handleClear}>
                  <FaBroom style={{ marginRight: '6px' }} /> Clear
                </button>
              </div>
            </div>
          </div>

          {tableData.length > 0 && (
            <div className={globalStyles.tableWrapper} style={{ marginTop: '24px' }}>
              <table className={globalStyles.dataTable}>
                <thead>
                  <tr>{tableCols.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      {tableCols.map(c => <td key={c} style={{ textAlign: 'center' }}>{row[c] ?? ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraceData;
