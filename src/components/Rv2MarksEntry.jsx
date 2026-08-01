import React, { useState, useEffect } from 'react';
import globalStyles from './Results.module.css';
import { FaEdit, FaBroom } from 'react-icons/fa';
import { getAppData, getV3DataSems, getV3Data } from '../utils/api';

const Rv2MarksEntry = () => {
  const appData    = getAppData() || {};
  const course     = appData.course     || '';
  const regu       = appData.regulation || '';
  const exammy     = appData.examMY     || '';

  const [sem, setSem]               = useState('');
  const [diffmarks, setDiffmarks]   = useState('0');
  const [isReadmit, setIsReadmit]   = useState(false);
  const [readmitReg, setReadmitReg] = useState('');
  const [semOptions, setSemOptions] = useState([]);
  const [tableData, setTableData]   = useState([]);
  const [tableCols, setTableCols]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load semesters on mount using appData
  useEffect(() => {
    if (!course || !exammy) return;
    getV3DataSems(course, regu, exammy)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      }).catch(() => {});
  }, [course, regu, exammy]);

  const handleView = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    if (isReadmit && !readmitReg.trim()) { showMsg('Please enter Readmit Regulation.'); return; }
    setLoading(true);
    setTableData([]);
    try {
      const res = await getV3Data(course, regu, exammy, sem, diffmarks || '0', isReadmit, readmitReg.trim());
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No V3 data found.');
      }
    } catch (err) {
      showMsg(err.message || 'View failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSem(''); setDiffmarks('0'); setIsReadmit(false); setReadmitReg('');
    setTableData([]); setTableCols([]);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaEdit className={globalStyles.headerIcon} /> V3 Data</h2>
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

              {/* Semester */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <select className={globalStyles.dropdown} value={sem}
                  onChange={e => setSem(e.target.value)}>
                  <option value=''>Select Sem</option>
                  {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Marks Difference */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Marks Difference</label>
                <input type='number' className={globalStyles.input} value={diffmarks}
                  onChange={e => setDiffmarks(e.target.value)} />
              </div>

              {/* IsReadmit */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={isReadmit} id="isReadmitCheck"
                  onChange={e => { setIsReadmit(e.target.checked); if (!e.target.checked) setReadmitReg(''); }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="isReadmitCheck" className={globalStyles.label} style={{ margin: 0, cursor: 'pointer' }}>IsReadmit</label>
              </div>

              {/* Readmit Regulation (conditional) */}
              {isReadmit && (
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Readmit Regulation</label>
                  <input type='text' className={globalStyles.input} value={readmitReg}
                    onChange={e => setReadmitReg(e.target.value.toUpperCase())}
                    placeholder='Readmit Regulation' />
                </div>
              )}

              {/* Buttons */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                <button type='button' className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                  onClick={handleView} disabled={loading}>
                  <FaEdit style={{ marginRight: '6px' }} />
                  {loading ? 'Loading...' : 'View'}
                </button>
                <button type='button' className={`${globalStyles.btn} ${globalStyles.clearBtn}`}
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

export default Rv2MarksEntry;
