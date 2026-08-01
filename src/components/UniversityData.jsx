import React, { useState, useEffect } from 'react';
import globalStyles from './Results.module.css';
import { FaUniversity } from 'react-icons/fa';
import {
  getAppData,
  getUniversityDataBatch,
  getUniversityDataSem,
  getUniversityResultFormat,
  getUniversityRegisteredFormat,
  getUniversityRegisteredFormat2,
  getUniversityFormatData,
  getUniversitySubjectList,
  getUniversitySubjectData,
  getUniversityCdSubjectList,
  getUniversityCdStudentData,
  getUniversityPcFormat,
} from '../utils/api';

const TABS = [
  { key: 'udata',   label: 'University Data' },
  { key: 'fmtdata', label: 'Format Data'      },
  { key: 'subdata', label: 'Subject Data'     },
  { key: 'cddata',  label: 'CD Data'          },
  { key: 'pcfmt',   label: 'PC Format'        },
];

const UniversityData = () => {
  const appData = getAppData() || {};
  const course  = appData.course      || '';
  const regu    = appData.regulation  || '';
  const exammy  = appData.examMY      || '';

  const [activeTab, setActiveTab]       = useState('udata');

  // Shared dropdown data
  const [semOptions, setSemOptions]     = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  // Tab 1 – University Data
  const [ud_sem, setUd_sem]             = useState('');

  // Tab 2 – Format Data
  const [fd_sem, setFd_sem]             = useState('');
  const [fd_regsup, setFd_regsup]       = useState('');

  // Tab 3 – Subject Data
  const [sd_batch, setSd_batch]         = useState('');
  const [sd_sem, setSd_sem]             = useState('');
  const [sd_regsup, setSd_regsup]       = useState('');

  // Tab 4 – CD Data
  const [cd_batch, setCd_batch]         = useState('');
  const [cd_sem, setCd_sem]             = useState('');
  const [cd_regsup, setCd_regsup]       = useState('');

  // Tab 5 – PC Format
  const [pc_batchRegu, setPc_batchRegu] = useState('');
  const [pc_sem,       setPc_sem]       = useState('');
  const [pc_type,      setPc_type]      = useState('CourseComplete');

  // Shared results
  const [tableData, setTableData]       = useState([]);
  const [tableCols, setTableCols]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [activeBtn, setActiveBtn]       = useState('');
  const [message, setMessage]           = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const clearTable = () => { setTableData([]); setTableCols([]); };

  useEffect(() => {
    if (!course) return;
    getUniversityDataSem(course, exammy)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      }).catch(() => {});
    getUniversityDataBatch(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course, exammy]);

  const handlePcBatchChange = (reguVal) => {
    setPc_batchRegu(reguVal);
    clearTable();
  };

  const fetchData = async (apiFn, btnName) => {
    setLoading(true); setActiveBtn(btnName); clearTable();
    try {
      const res = await apiFn();
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Request failed.');
    } finally {
      setLoading(false); setActiveBtn('');
    }
  };

  const isBusy = (name) => loading && activeBtn === name;

  const tabStyle = (key) => ({
    padding: '6px 14px',
    marginRight: 4,
    border: '1px solid #ccc',
    borderBottom: activeTab === key ? '1px solid #fff' : '1px solid #ccc',
    background: activeTab === key ? '#fff' : '#f5f5f5',
    fontWeight: activeTab === key ? 'bold' : 'normal',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    fontSize: 13,
  });

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaUniversity className={globalStyles.headerIcon} /> University Data</h2>
        </div>
        <div className={globalStyles.boxContent}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', gap: '8px', flexWrap: 'wrap' }}>
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
              {/* Tab 1: University Data */}
              {activeTab === 'udata' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Semester</label>
                  <select className={globalStyles.dropdown} value={ud_sem} onChange={e => setUd_sem(e.target.value)}>
                    <option value=''>Select Sem</option>
                    {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={isBusy('rf')}
                    onClick={() => {
                      if (!ud_sem) { showMsg('Please select Semester.'); return; }
                      fetchData(() => getUniversityResultFormat(course, regu, ud_sem, exammy), 'rf');
                    }}>
                    {isBusy('rf') ? '...' : 'Result Format'}
                  </button>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.exportBtn}`} disabled={isBusy('regf')}
                    onClick={() => {
                      if (!ud_sem) { showMsg('Please select Semester.'); return; }
                      fetchData(() => getUniversityRegisteredFormat(course, regu, ud_sem, exammy), 'regf');
                    }}>
                    {isBusy('regf') ? '...' : 'Registered Format'}
                  </button>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.exportBtn}`} disabled={isBusy('regf2')}
                    onClick={() => {
                      if (!ud_sem) { showMsg('Please select Semester.'); return; }
                      fetchData(() => getUniversityRegisteredFormat2(course, regu, ud_sem, exammy), 'regf2');
                    }}>
                    {isBusy('regf2') ? '...' : 'Registered Format 2'}
                  </button>
                </div>
              </>)}

              {/* Tab 2: Format Data */}
              {activeTab === 'fmtdata' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Semester</label>
                  <select className={globalStyles.dropdown} value={fd_sem} onChange={e => setFd_sem(e.target.value)}>
                    <option value=''>Select Sem</option>
                    {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>REGSUP</label>
                  <select className={globalStyles.dropdown} value={fd_regsup} onChange={e => setFd_regsup(e.target.value)}>
                    <option value=''>SELECT</option>
                    <option value='REG'>REG</option>
                    <option value='SUP'>SUP</option>
                  </select>
                </div>
                <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={isBusy('dl')}
                    onClick={() => {
                      if (!fd_sem) { showMsg('Please select Semester.'); return; }
                      fetchData(() => getUniversityFormatData(course, regu, fd_sem, fd_regsup, exammy), 'dl');
                    }}>
                    {isBusy('dl') ? '...' : 'Download'}
                  </button>
                </div>
              </>)}

              {/* Tab 3: Subject Data */}
              {activeTab === 'subdata' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Batch</label>
                  <select className={globalStyles.dropdown} value={sd_batch} onChange={e => setSd_batch(e.target.value)}>
                    <option value=''>Select Batch</option>
                    {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>REGSUP</label>
                  <select className={globalStyles.dropdown} value={sd_regsup} onChange={e => setSd_regsup(e.target.value)}>
                    <option value=''>Select Regsup</option>
                    <option value='REG'>REG</option>
                    <option value='SUP'>SUP</option>
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Semester</label>
                  <select className={globalStyles.dropdown} value={sd_sem} onChange={e => setSd_sem(e.target.value)}>
                    <option value=''>Select Sem</option>
                    {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={isBusy('sl')}
                    onClick={() => {
                      if (!sd_batch || !sd_sem) { showMsg('Please select Batch and Semester.'); return; }
                      fetchData(() => getUniversitySubjectList(course, sd_batch, sd_sem, sd_regsup, exammy, false), 'sl');
                    }}>
                    {isBusy('sl') ? '...' : 'Subjects Data'}
                  </button>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.exportBtn}`} disabled={isBusy('sd')}
                    onClick={() => {
                      if (!sd_batch || !sd_sem) { showMsg('Please select Batch and Semester.'); return; }
                      fetchData(() => getUniversitySubjectData(course, sd_batch, sd_sem, sd_regsup, exammy, false), 'sd');
                    }}>
                    {isBusy('sd') ? '...' : 'Students Data'}
                  </button>
                </div>
              </>)}

              {/* Tab 4: CD Data */}
              {activeTab === 'cddata' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Batch</label>
                  <select className={globalStyles.dropdown} value={cd_batch} onChange={e => setCd_batch(e.target.value)}>
                    <option value=''>Select Batch</option>
                    {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>REGSUP</label>
                  <select className={globalStyles.dropdown} value={cd_regsup} onChange={e => setCd_regsup(e.target.value)}>
                    <option value=''>Select Regsup</option>
                    <option value='REG'>REG</option>
                    <option value='SUP'>SUP</option>
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Semester</label>
                  <select className={globalStyles.dropdown} value={cd_sem} onChange={e => setCd_sem(e.target.value)}>
                    <option value=''>Select Sem</option>
                    {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={isBusy('cdsl')}
                    onClick={() => {
                      if (!cd_batch || !cd_sem) { showMsg('Please select Batch and Semester.'); return; }
                      fetchData(() => getUniversityCdSubjectList(course, cd_batch, cd_sem, cd_regsup, exammy, false), 'cdsl');
                    }}>
                    {isBusy('cdsl') ? '...' : 'Subjects Data'}
                  </button>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.exportBtn}`} disabled={isBusy('cdsd')}
                    onClick={() => {
                      if (!cd_batch || !cd_sem) { showMsg('Please select Batch and Semester.'); return; }
                      fetchData(() => getUniversityCdStudentData(course, cd_batch, cd_sem, cd_regsup, exammy, false), 'cdsd');
                    }}>
                    {isBusy('cdsd') ? '...' : 'Students Data'}
                  </button>
                </div>
              </>)}

              {/* Tab 5: PC Format */}
              {activeTab === 'pcfmt' && (<>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Batch</label>
                  <select className={globalStyles.dropdown} value={pc_batchRegu} onChange={e => handlePcBatchChange(e.target.value)}>
                    <option value=''>Select Batch</option>
                    {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Semester</label>
                  <select className={globalStyles.dropdown} value={pc_sem} onChange={e => setPc_sem(e.target.value)}>
                    <option value=''>Select All</option>
                    {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Type</label>
                  <select className={globalStyles.dropdown} value={pc_type} onChange={e => setPc_type(e.target.value)}>
                    <option value='CourseComplete'>Course Complete</option>
                    <option value='All'>All</option>
                    <option value='Regnowise'>Regnowise</option>
                    <option value='JNTUK CE'>JNTUK CE</option>
                  </select>
                </div>
                <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={isBusy('pcdl')}
                    onClick={() => {
                      if (!pc_batchRegu) { showMsg('Please select Batch.'); return; }
                      fetchData(() => getUniversityPcFormat(course, pc_batchRegu, exammy, pc_sem, pc_type), 'pcdl');
                    }}>
                    {isBusy('pcdl') ? '...' : 'Download'}
                  </button>
                </div>
              </>)}
            </div>
          </div>

          {/* Dynamic Table */}
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

export default UniversityData;
