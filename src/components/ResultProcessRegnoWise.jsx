import React, { useState, useEffect, useRef } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getAppData,
  getResultProcessExammy,
  runResultProcess,
  runReadmitResultProcess,
  getStudentHistoryDetails,
  getStudentHistoryHistory,
} from '../utils/api';

const ResultProcessRegnoWise = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';

  const [regNo, setRegNo] = useState('');
  const [sem, setSem] = useState('');
  const [grp, setGrp] = useState('');
  const [exammy, setExammy] = useState('');
  const [previousExammy, setPreviousExammy] = useState(false);
  const [exammyOptions, setExammyOptions] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [resultRows, setResultRows] = useState([]);
  const [studentName, setStudentName] = useState('');
  const debounceRef = useRef(null);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  useEffect(() => {
    if (!course || !regulation) return;
    getResultProcessExammy(course, regulation)
      .then(res => {
        if (res.success && res.data) {
          const opts = res.data.map(r => String(r.exammy || r.EXAMMY || r.ExamMy || r.examMy || r));
          setExammyOptions(opts);
        }
      })
      .catch(() => {});
  }, [course, regulation]);

  // Auto-fetch GRP + student name when regNo changes
  const handleRegNoChange = (e) => {
    const val = e.target.value.toUpperCase();
    setRegNo(val);
    setGrp('');
    setStudentName('');
    setResultRows([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getStudentHistoryDetails(val.trim());
        if (res.success && res.data?.length > 0) {
          const d = res.data[0];
          setGrp(d.GRP || d.grp || '');
          setStudentName(d.SNAME || d.sname || '');
        }
      } catch {}
    }, 600);
  };

  const handleResultProcess = async () => {
    if (!regNo.trim()) { showMessage('Please enter Registration Number.', 'error'); return; }
    if (!exammy)       { showMessage('Please select ExamMY.', 'error'); return; }
    if (!sem.trim())   { showMessage('Please enter Semester.', 'error'); return; }
    if (!grp.trim())   { showMessage('Branch/Group not found for this RegNo.', 'error'); return; }

    setProcessing(true);
    setResultRows([]);
    try {
      let res;
      if (previousExammy) {
        res = await runReadmitResultProcess(regNo.trim(), exammy, regulation, course, sem.trim(), grp.trim(), regulation);
      } else {
        res = await runResultProcess(regNo.trim(), exammy, regulation, course, sem.trim(), grp.trim());
      }
      if (res.success) {
        showMessage('Result process completed successfully.', 'success');
        // Fetch updated results for this student + semester
        try {
          const histRes = await getStudentHistoryHistory(regNo.trim());
          if (histRes.success && histRes.data) {
            const filtered = histRes.data.filter(r => {
              const em = r.EXAMMY || r.exammy || '';
              const sm = String(r.SEM || r.sem || '');
              return em === exammy && sm === sem.trim();
            });
            setResultRows(filtered.length > 0 ? filtered : histRes.data);
          }
        } catch {}
      } else {
        showMessage(res.message || 'Result process failed.', 'error');
      }
    } catch (err) {
      showMessage(err.message || 'Result process failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaFileAlt className={globalStyles.headerIcon} /> Result Process (Regno Wise)</h2>
        </div>
        <div className={globalStyles.boxContent}>
          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>
              {/* RegNo Input */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>RegNo</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={handleRegNoChange}
                  className={globalStyles.input}
                  placeholder="Enter Registration Number"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* Exammy Dropdown */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>ExamMY</label>
                <select
                  value={exammy}
                  onChange={e => setExammy(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value=''>Select ExamMY</option>
                  {exammyOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Sem Input */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <input
                  type="text"
                  value={sem}
                  onChange={e => setSem(e.target.value)}
                  className={globalStyles.input}
                  placeholder="e.g. 8"
                  style={{ width: '80px' }}
                />
              </div>

              {/* GRP (auto-filled) */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Branch</label>
                <input
                  type="text"
                  value={grp}
                  onChange={e => setGrp(e.target.value)}
                  className={globalStyles.input}
                  placeholder="Auto-filled"
                  style={{ width: '100px' }}
                />
              </div>

              {/* Previous Exammy Checkbox */}
              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={previousExammy}
                  onChange={e => setPreviousExammy(e.target.checked)}
                  id="previousExammy"
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="previousExammy" className={globalStyles.label} style={{ margin: 0, cursor: 'pointer' }}>Previous Exammy</label>
              </div>

              {/* Result Process Button */}
              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                <button
                  onClick={handleResultProcess}
                  className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Result Process'}
                </button>
              </div>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div style={{
              margin: '24px auto', padding: '12px 20px', maxWidth: '600px',
              borderRadius: '8px', textAlign: 'center', fontWeight: '600',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {message.text}
            </div>
          )}

          {/* Updated Results Table */}
          {resultRows.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ marginBottom: '12px', fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                Updated Results — {regNo} {studentName && `| ${studentName}`} | ExamMY: {exammy} | Sem: {sem}
              </div>
              <div className={globalStyles.tableWrapper}>
                <table className={globalStyles.dataTable}>
                  <thead>
                    <tr>
                      {['PCODE','PNAME','SEM','SMARKS','MRK_FIN','MARKS','PAPRES','GR','GRPTS','EXAMMY'].map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultRows.map((row, i) => (
                      <tr key={i}>
                        {['PCODE','PNAME','SEM','SMARKS','MRK_FIN','MARKS','PAPRES','GR','GRPTS','EXAMMY'].map(col => (
                          <td key={col} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {row[col] ?? row[col.toLowerCase()] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {resultRows.length === 0 && !message.text && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '48px 24px', color: '#94a3b8'
            }}>
              <FaFileAlt style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', margin: 0 }}>Enter RegNo and ExamMY, then click Result Process</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultProcessRegnoWise;
