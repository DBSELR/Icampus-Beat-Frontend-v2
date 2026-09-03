import React, { useState, useEffect } from 'react';
import globalStyles from './Results.module.css';
import { FaGraduationCap, FaFileExcel, FaBroom, FaEye } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import {
  getAppData,
  getCgpaYearWiseExammy,
  getCgpaYearWiseBatch,
  getCgpaYearWiseSems,
  getCgpaYearWiseDownload,
} from '../utils/api';

const CgpaYearWise = () => {
  const appData = getAppData() || {};
  const course     = appData.course     || '';
  const regulation = appData.regulation || '';

  const [examMy, setExamMy]           = useState('');
  const [batch, setBatch]             = useState('');
  const [semester, setSemester]       = useState('');
  const [exammyOptions, setExammyOptions] = useState([]);
  const [batchOptions, setBatchOptions]   = useState([]);
  const [semOptions, setSemOptions]       = useState([]);
  const [tableData, setTableData]     = useState([]);
  const [tableCols, setTableCols]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load exammy on mount
  useEffect(() => {
    getCgpaYearWiseExammy(course, regulation)
      .then(res => {
        if (res.success && res.data)
          setExammyOptions(res.data.map(r => String(r.examMy || r.ExamMy || r.EXAMMY || r.exammy || r)));
      }).catch(() => {});
  }, [course]);

  // Exammy change → cascade load batch
  const handleExammyChange = async (val) => {
    setExamMy(val);
    setBatch('');
    setSemester('');
    setBatchOptions([]);
    setSemOptions([]);
    setTableData([]);
    if (!val) return;
    try {
      const res = await getCgpaYearWiseBatch(val);
      if (res.success && res.data)
        setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
    } catch {}
  };

  // Batch change → cascade load sems
  const handleBatchChange = async (val) => {
    setBatch(val);
    setSemester('');
    setSemOptions([]);
    setTableData([]);
    if (!val || !examMy) return;
    try {
      const res = await getCgpaYearWiseSems(examMy, val);
      if (res.success && res.data)
        setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
    } catch {}
  };

  const handleViewData = async () => {
    if (!examMy) { showMsg('Please select Exammy.'); return; }
    if (!batch)  { showMsg('Please select Batch.'); return; }
    setLoading(true);
    setTableData([]);
    try {
      const res = await getCgpaYearWiseDownload(regulation, course, examMy, batch, semester);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Loading failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (tableData.length === 0) {
      showMsg('No data available to export.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CGPA Data');
    XLSX.writeFile(wb, 'CgpaYearWise.xlsx');
  };

  const handleClear = () => {
    setExamMy(''); setBatch(''); setSemester('');
    setBatchOptions([]); setSemOptions([]);
    setTableData([]); setTableCols([]);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaGraduationCap className={globalStyles.headerIcon} /> CGPA YEAR WISE</h2>
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

              {/* Exammy */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Exammy</label>
                <select className={globalStyles.dropdown} value={examMy}
                  onChange={e => handleExammyChange(e.target.value)}>
                  <option value=''>Select Exammy</option>
                  {exammyOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Batch */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select className={globalStyles.dropdown} value={batch}
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

              {/* Buttons */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', flex: '1 1 auto' }}>
                <button type='button' className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  onClick={handleViewData} disabled={loading}>
                  <FaEye style={{ marginRight: '6px' }} />
                  {loading ? 'Loading...' : 'View Data'}
                </button>
                <button type='button' className={`${globalStyles.btn} ${globalStyles.clearBtn}`}
                  onClick={handleClear}>
                  <FaBroom style={{ marginRight: '6px' }} /> Clear
                </button>
                <button type='button' className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  onClick={handleExportExcel} disabled={loading || tableData.length === 0}
                  style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}>
                  <FaFileExcel style={{ marginRight: '6px' }} /> Export Excel
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

export default CgpaYearWise;
