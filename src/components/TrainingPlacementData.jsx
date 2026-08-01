import React, { useState, useEffect } from 'react';
import globalStyles from './Results.module.css';
import { FaGraduationCap } from 'react-icons/fa';
import { getAppData, getTandPBatch, getTandPData } from '../utils/api';

const TrainingPlacementData = () => {
  const appData = getAppData() || {};
  const course  = appData.course  || '';
  const exammy  = appData.examMY  || '';

  const [batchRegu, setBatchRegu] = useState('');
  const [batchOptions, setBatchOptions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    getTandPBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  const handleDownload = async () => {
    if (!batchRegu) { showMsg('Please select Batch.'); return; }
    setLoading(true); setTableData([]);
    try {
      const res = await getTandPData(course, batchRegu, exammy);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No T&P data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Download failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className={globalStyles.boxHeader}>
          <h2><FaGraduationCap className={globalStyles.headerIcon} /> Training &amp; Placement Data</h2>
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
                <select className={globalStyles.dropdown} value={batchRegu} onChange={e => setBatchRegu(e.target.value)}>
                  <option value=''>Select Batch</option>
                  {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                </select>
              </div>

              {/* Excel Download */}
              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                <button type="button" className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  onClick={handleDownload} disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Loading...' : 'Excel Download'}
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

export default TrainingPlacementData;

