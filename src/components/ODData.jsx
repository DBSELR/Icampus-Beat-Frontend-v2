import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaImage } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import { getAppData, getOdDataBatch, getOdDataBranch, getOdDataList, runOdGracing } from '../utils/api';

const ODData = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const userId = appData.userId || '';

  const [lateral, setLateral] = useState(false);
  const [gracing, setGracing] = useState(false);
  const [batchRegu, setBatchRegu] = useState('');
  const [branch, setBranch] = useState('');
  const [htNo, setHtNo] = useState('');
  const [batchOptions, setBatchOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    getOdDataBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      })
      .catch(() => {});
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
    if (!batchRegu) { showMessage('Please select Batch.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      if (gracing && branch) {
        const examMy = appData.examMY || '';
        await runOdGracing(course, batchRegu, branch, examMy, userId, lateral ? 'L' : 'R');
      }
      const res = await getOdDataList(course, batchRegu, branch, htNo, lateral);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMessage(`${res.data.length} records loaded.`, 'success');
      } else {
        showMessage(res.message || 'No OD data found.');
      }
    } catch (err) {
      showMessage(err.message || 'Export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaFileAlt className={globalStyles.headerIcon} /> OD Data</h2>
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
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={lateral} onChange={e => setLateral(e.target.checked)} id="lateralCheck" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="lateralCheck" className={globalStyles.label} style={{ margin: 0, cursor: 'pointer' }}>Lateral</label>
              </div>

              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={gracing} onChange={e => setGracing(e.target.checked)} id="gracingCheck" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="gracingCheck" className={globalStyles.label} style={{ margin: 0, cursor: 'pointer' }}>Gracing</label>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select value={batchRegu} onChange={e => handleBatchChange(e.target.value)} className={globalStyles.dropdown}>
                  <option value=''>Select Batch</option>
                  {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                </select>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Branch</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className={globalStyles.dropdown}>
                  <option value=''>All Branch</option>
                  {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
                </select>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>H.T.No</label>
                <input
                  type="text"
                  value={htNo}
                  onChange={e => setHtNo(e.target.value)}
                  className={globalStyles.input}
                  placeholder="Enter H.T.No"
                />
              </div>

              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                <button type="button" onClick={handleExport} disabled={isLoading} className={`${globalStyles.btn} ${globalStyles.exportBtn}`}>
                  <FaFileAlt style={{ marginRight: '6px' }} />
                  {isLoading ? 'Loading...' : 'Export'}
                </button>
                <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled>
                  <FaImage style={{ marginRight: '6px' }} />
                  Photos
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
                      {tableCols.map(c => <td key={c}>{row[c] ?? ''}</td>)}
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

export default ODData;
