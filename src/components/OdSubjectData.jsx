import React, { useState, useEffect } from 'react';
import globalStyles from './Results.module.css';
import { FaFileAlt, FaBroom } from 'react-icons/fa';
import { getAppData, getOdDataBatch, getOdDataBranch, getOdDataList } from '../utils/api';

const OdSubjectData = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';

  const [isLateral, setIsLateral] = useState(false);
  const [batchRegu, setBatchRegu] = useState('');
  const [branch, setBranch] = useState('');
  const [regNo, setRegNo] = useState('');
  const [batchOptions, setBatchOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    getOdDataBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (regu) => {
    setBatchRegu(regu);
    setBranch('');
    setBranchOptions([]);
    setTableData([]);
    if (!regu || !course) return;
    try {
      const res = await getOdDataBranch(course, regu);
      if (res.success && res.data)
        setBranchOptions(res.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.BRANCH || r.branch || r.GRP || r.grp || r) })));
    } catch {}
  };

  const handleExport = async () => {
    if (!batchRegu) { showMsg('Please select Batch.'); return; }
    setLoading(true);
    setTableData([]);
    try {
      const res = await getOdDataList(course, batchRegu, branch, regNo, isLateral);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No OD subject data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Export failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setIsLateral(false); setBatchRegu(''); setBranch('');
    setRegNo(''); setTableData([]); setTableCols([]);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaFileAlt className={globalStyles.headerIcon} /> OD Subject Data (Reg.No Wise)</h2>
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
              
              {/* Lateral */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={isLateral} onChange={e => setIsLateral(e.target.checked)} id="isLateralCheck" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="isLateralCheck" className={globalStyles.label} style={{ margin: 0, cursor: 'pointer' }}>Lateral</label>
              </div>

              {/* Batch */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select className={globalStyles.dropdown} value={batchRegu} onChange={e => handleBatchChange(e.target.value)}>
                  <option value=''>Select Batch</option>
                  {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                </select>
              </div>

              {/* Branch */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Branch</label>
                <select className={globalStyles.dropdown} value={branch} onChange={e => setBranch(e.target.value)}>
                  <option value=''>All Branch</option>
                  {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
                </select>
              </div>

              {/* H.T.No */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>H.T.No</label>
                <input type="text" className={globalStyles.input} value={regNo}
                  onChange={e => setRegNo(e.target.value.toUpperCase())}
                  maxLength={15} placeholder="Enter H.T.No"
                  style={{ fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase' }} />
              </div>

              {/* Buttons */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                <button type="button" className={`${globalStyles.btn} ${globalStyles.exportBtn}`} onClick={handleExport} disabled={loading}>
                  <FaFileAlt style={{ marginRight: '6px' }} />
                  {loading ? 'Exporting...' : 'Export'}
                </button>
                <button type="button" className={`${globalStyles.btn} ${globalStyles.clearBtn}`} onClick={handleClear}>
                  <FaBroom style={{ marginRight: '6px' }} />
                  Clear
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

export default OdSubjectData;

