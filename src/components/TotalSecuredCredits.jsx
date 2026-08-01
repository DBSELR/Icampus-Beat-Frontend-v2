import React, { useState, useEffect } from 'react';
import { FaCheck, FaChevronUp } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getAppData,
  getCreditSecuredExammy,
  getCreditSecuredBatch,
  getCreditSecuredBranch,
  getCreditSecuredData,
  getCreditSecuredTotalData,
} from '../utils/api';

const TABS = [
  { key: 'total', label: 'Total Credit Secured' },
  { key: 'credit', label: 'Credit Secured'      },
];

const TotalSecuredCredits = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';

  const [activeTab, setActiveTab] = useState('total');

  // Shared dropdowns
  const [exammyOptions, setExammyOptions]   = useState([]);
  const [batchOptions, setBatchOptions]     = useState([]);
  const [branchOptions, setBranchOptions]   = useState([]);

  // Tab 1 — Total Credit Secured (RegnoWiseTotalCredits.aspx)
  const [t_exammy, setT_exammy] = useState('');
  const [t_batch, setT_batch]   = useState('');
  const [t_branch, setT_branch] = useState('');
  const [t_sem, setT_sem]       = useState('');

  // Tab 2 — Credit Secured (Credits_NextSem.aspx)
  const [c_exammy, setC_exammy]         = useState('');
  const [c_batch, setC_batch]           = useState('');
  const [c_branch, setC_branch]         = useState('');
  const [c_noofcredits, setC_noofcredits] = useState('');

  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [tableData, setTableData]         = useState([]);
  const [tableCols, setTableCols]         = useState([]);
  const [message, setMessage]             = useState({ text: '', type: '' });

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const clearTable = () => { setTableData([]); setTableCols([]); };

  useEffect(() => {
    if (!course) return;
    Promise.all([getCreditSecuredExammy(appData.regulation || '', course), getCreditSecuredBatch(course)])
      .then(([exRes, batchRes]) => {
        if (exRes.success && exRes.data)
          setExammyOptions(exRes.data.map(r => String(r.examMy || r.ExamMy || r.EXAMMY || r.exammy || r)));
        if (batchRes.success && batchRes.data)
          setBatchOptions(batchRes.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      })
      .catch(() => {});
  }, [course]);

  const handleBatchChange = async (val, setter) => {
    setter(val);
    setBranchOptions([]);
    clearTable();
    if (!val || !course) return;
    try {
      const res = await getCreditSecuredBranch(course, val);
      if (res.success && res.data)
        setBranchOptions(res.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.BRANCH || r.branch || r.GRP || r.grp || r) })));
    } catch {}
  };

  // Tab 1 export
  const handleTotalExport = async () => {
    if (!t_exammy)      { showMessage('Please Select Exammy'); return; }
    if (!t_batch)       { showMessage('Please Select Batch'); return; }
    if (!t_sem.trim())  { showMessage('Please enter Sem'); return; }
    setIsLoading(true); clearTable();
    try {
      const res = await getCreditSecuredTotalData(appData.regulation || '', course, t_batch, t_exammy, t_branch, t_sem.trim());
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMessage(`${res.data.length} records loaded.`, 'success');
      } else {
        showMessage(res.message || 'No data found.');
      }
    } catch (err) {
      showMessage(err.message || 'Export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tab 2 export
  const handleCreditExport = async () => {
    if (!c_exammy)                    { showMessage('Please Select Exammy'); return; }
    if (!c_batch)                     { showMessage('Please Select Batch'); return; }
    if (!c_branch)                    { showMessage('Please Select Branch'); return; }
    if (!c_noofcredits.trim() || isNaN(Number(c_noofcredits)) || Number(c_noofcredits) <= 0)
      { showMessage('Please enter No.Of Credits'); return; }
    setIsLoading(true); clearTable();
    try {
      const res = await getCreditSecuredData(appData.regulation || '', course, c_batch, c_exammy, c_branch, Number(c_noofcredits));
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMessage(`${res.data.length} records loaded.`, 'success');
      } else {
        showMessage(res.message || 'No data found.');
      }
    } catch (err) {
      showMessage(err.message || 'Export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabStyle = (key) => ({
    padding: '6px 14px', marginRight: 4, cursor: 'pointer', fontSize: 13,
    border: '1px solid #ccc',
    borderBottom: activeTab === key ? '1px solid #fff' : '1px solid #ccc',
    background: activeTab === key ? '#fff' : '#f5f5f5',
    fontWeight: activeTab === key ? 'bold' : 'normal',
    borderRadius: '4px 4px 0 0',
  });

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaCheck className={globalStyles.headerIcon} /> Total Credit Secured</h2>
          <button className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}>
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
            {TABS.map(t => (
              <div key={t.key} 
                onClick={() => { setActiveTab(t.key); clearTable(); setMessage({ text: '', type: '' }); }}
                style={{
                  padding: '12px 24px', 
                  cursor: 'pointer', 
                  fontSize: '14px',
                  fontWeight: activeTab === t.key ? '600' : '500',
                  color: activeTab === t.key ? '#2563eb' : '#64748b',
                  borderBottom: activeTab === t.key ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-2px',
                  transition: 'all 0.2s ease',
                }}>
                {t.label}
              </div>
            ))}
          </div>

          {message.text && (
            <div style={{
              margin: '0 auto 24px', padding: '12px 20px', maxWidth: '700px', borderRadius: '8px',
              textAlign: 'center', fontWeight: '600',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>{message.text}</div>
          )}

          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>

              {/* Tab 1 — Total Credit Secured */}
              {activeTab === 'total' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Exammy</label>
                  <select value={t_exammy} onChange={e => setT_exammy(e.target.value)} className={globalStyles.dropdown}>
                    <option value=''>Select Exammy</option>
                    {exammyOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Batch</label>
                  <select value={t_batch} onChange={e => handleBatchChange(e.target.value, setT_batch)} className={globalStyles.dropdown}>
                    <option value=''>SELECT BATCH</option>
                    {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Branch</label>
                  <select value={t_branch} onChange={e => setT_branch(e.target.value)} className={globalStyles.dropdown}>
                    <option value=''>Select Branch</option>
                    {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Sem</label>
                  <input type="text" value={t_sem} onChange={e => setT_sem(e.target.value)}
                    className={globalStyles.input} placeholder="Enter Sem"
                    style={{ fontWeight: 'bold', color: '#b91c1c' }} />
                </div>
              </>)}

              {/* Tab 2 — Credit Secured */}
              {activeTab === 'credit' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Exammy</label>
                  <select value={c_exammy} onChange={e => setC_exammy(e.target.value)} className={globalStyles.dropdown}>
                    <option value=''>Select Exammy</option>
                    {exammyOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Batch</label>
                  <select value={c_batch} onChange={e => handleBatchChange(e.target.value, setC_batch)} className={globalStyles.dropdown}>
                    <option value=''>SELECT BATCH</option>
                    {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Branch</label>
                  <select value={c_branch} onChange={e => setC_branch(e.target.value)} className={globalStyles.dropdown}>
                    <option value=''>Select Branch</option>
                    {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>No.Of Credits &lt;</label>
                  <input type="number" value={c_noofcredits} onChange={e => setC_noofcredits(e.target.value)}
                    className={globalStyles.input} placeholder="Enter Credits"
                    style={{ fontWeight: 'bold', color: '#b91c1c' }} />
                </div>
              </>)}

              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                <button type="button"
                  onClick={activeTab === 'total' ? handleTotalExport : handleCreditExport}
                  className={`${globalStyles.btn} ${globalStyles.exportBtn}`} disabled={isLoading}>
                  {isLoading ? 'Exporting...' : 'Export'}
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

export default TotalSecuredCredits;
