import React, { useState, useRef } from 'react';
import { FaUser, FaChevronUp, FaArrowRight, FaTrash } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getAppData,
  getStudentHistoryDetails,
  getStudentHistorySgpaCgpa,
  getStudentHistoryHistory,
  getStudentHistoryMarks,
  getStudentHistoryMaxExammy,
  updateStudentHistoryMarks,
  deleteStudentHistory,
  runResultProcess,
} from '../utils/api';

const StudentHistoryWithoutMarks = () => {
  const appData = getAppData() || {};
  const [regNo, setRegNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [programme, setProgramme] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [sgpaCgpaData, setSgpaCgpaData] = useState([]);
  const [subjectDetails, setSubjectDetails] = useState([]);
  const [isStudentInfoCollapsed, setIsStudentInfoCollapsed] = useState(false);
  const [isSubjectDetailsCollapsed, setIsSubjectDetailsCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Result Process (shown after marks save)
  const [maxExammy, setMaxExammy] = useState('');
  const [showResultProcessBtn, setShowResultProcessBtn] = useState(false);
  const [runningRP, setRunningRP] = useState(false);

  // Delete
  const [deletingAshId, setDeletingAshId] = useState('');

  const debounceRef = useRef(null);

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const normalize = (row) => ({
    ashid:  row.ASHID  || row.ashid  || row.ashId  || '',
    regno:  row.REGNO  || row.regno  || '',
    sem:    row.SEM    || row.sem    || '',
    pcode:  row.PCODE  || row.pcode  || '',
    pname:  row.PNAME  || row.pname  || '',
    cr:     row.CR     || row.cr     || '',
    gr:     row.GR     || row.gr     || '',
    grpts:  row.GRPTS  || row.grpts  || '',
    exammy: row.EXAMMY || row.exammy || row.Exammy || '',
  });

  const handleRegNoChange = (e) => {
    const val = e.target.value.toUpperCase();
    setRegNo(val);
    setStudentName(''); setProgramme(''); setBranchCode('');
    setSgpaCgpaData([]); setSubjectDetails([]);
    setMaxExammy(''); setShowResultProcessBtn(false);
    setMessage({ text: '', type: '' });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) return;
    debounceRef.current = setTimeout(() => fetchAll(val.trim()), 600);
  };

  const fetchAll = async (rn) => {
    setLoading(true);
    try {
      const [detRes, sgpaRes, histRes] = await Promise.all([
        getStudentHistoryDetails(rn),
        getStudentHistorySgpaCgpa(rn),
        getStudentHistoryHistory(rn),
      ]);
      if (detRes.success && detRes.data?.length > 0) {
        const d = detRes.data[0];
        setStudentName(d.SNAME || d.sname || d.StudentName || '');
        setProgramme(d.COURSE || d.course || d.Programme || '');
        setBranchCode(d.GRP || d.grp || d.BranchCode || '');
      } else {
        showMessage('Student not found.');
      }
      if (sgpaRes.success && sgpaRes.data) {
        setSgpaCgpaData(sgpaRes.data.map(r => ({
          sem:       r.SEM       || r.sem,
          sgpa:      r.SGPA      || r.sgpa,
          cgpa:      r.CGPA      || r.cgpa,
          tcr:       r.TCR       || r.tcr,
          securedCR: r.SCR       || r.scr || r.SecuredCR || r.securedCR,
          backlogs:  r.Backlogs  || r.backlogs || r.BACKLOGS,
        })));
      }
      if (histRes.success && histRes.data) {
        setSubjectDetails(histRes.data.map(normalize));
      }
    } catch (err) {
      showMessage(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async (rn) => {
    try {
      const res = await getStudentHistoryHistory(rn);
      if (res.success && res.data) setSubjectDetails(res.data.map(normalize));
    } catch {}
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (subject) => {
    if (!window.confirm(`Delete record for "${subject.pname}"?`)) return;
    setDeletingAshId(subject.ashid);
    try {
      const res = await deleteStudentHistory(subject.ashid);
      if (res.success) {
        showMessage('Record deleted.', 'success');
        refreshHistory(regNo);
      } else {
        showMessage(res.message || 'Delete failed.');
      }
    } catch (err) {
      showMessage(err.message || 'Delete failed.');
    } finally {
      setDeletingAshId('');
    }
  };

  // ── Edit modal ──────────────────────────────────────────────────────────────
  const handleSubjectClick = async (subject) => {
    setEditingSubject(subject);
    setShowResultProcessBtn(false);
    setMaxExammy('');
    try {
      const res = await getStudentHistoryMarks(subject.ashid);
      if (res.success && res.data?.length > 0) {
        const d = res.data[0];
        const pick = (a, b, fb = '') => (a != null ? a : (b != null ? b : fb));
        setEditFormData({
          pcode:    pick(d.PCODE,   d.pcode,   subject.pcode),
          pname:    pick(d.PNAME,   d.pname,   subject.pname),
          smarks:   pick(d.SMARKS,  d.smarks),
          tmarks:   pick(d.TMARKS,  d.tmarks),
          mmarks:   pick(d.MMARKS,  d.mmarks),
          rvmarks:  pick(d.RVMARKS, d.rvmarks),
          v3marks:  pick(d.V3,      d.v3),
          finmarks: pick(d.MRK_FIN, d.mrk_fin),
          pmarks:   pick(d.PMARKS,  d.pmarks),
        });
      }
    } catch {
      setEditFormData({ pcode: subject.pcode, pname: subject.pname, smarks:'', tmarks:'', mmarks:'', rvmarks:'', v3marks:'', finmarks:'', pmarks:'' });
    }
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    if (!editingSubject) return;
    setSaving(true);
    try {
      const res = await updateStudentHistoryMarks({
        AshId:   String(editingSubject.ashid),
        PName:   editFormData.pname,
        SMarks:  editFormData.smarks,
        TMarks:  editFormData.tmarks,
        MMarks:  editFormData.mmarks,
        RVMarks: editFormData.rvmarks,
        V3:      editFormData.v3marks,
        PMarks:  editFormData.pmarks,
      });
      if (res.success) {
        showMessage('Changes saved successfully.', 'success');
        setShowEditModal(false);
        refreshHistory(regNo);

        // Fetch maxexammy to enable Result Process
        try {
          const mxRes = await getStudentHistoryMaxExammy(regNo);
          const mx = String(mxRes.data || mxRes.Data || '').trim();
          if (mx) { setMaxExammy(mx); setShowResultProcessBtn(true); }
        } catch {}
      } else {
        showMessage(res.message || 'Save failed.');
      }
    } catch (err) {
      showMessage(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingSubject(null);
    setEditFormData({});
  };

  // ── Result Process ──────────────────────────────────────────────────────────
  const handleResultProcess = async () => {
    if (!regNo || !maxExammy) return;
    setRunningRP(true);
    try {
      // Find the semester matching maxExammy from loaded history
      const matchSem = subjectDetails.find(s => s.exammy === maxExammy)?.sem || '';
      const regulation = appData.regulation || '';
      const res = await runResultProcess(regNo, maxExammy, regulation, programme, String(matchSem), branchCode);
      if (res.success) {
        showMessage('Result process completed successfully.', 'success');
        setShowResultProcessBtn(false);
        fetchAll(regNo);
      } else {
        showMessage(res.message || 'Result process failed.');
      }
    } catch (err) {
      showMessage(err.message || 'Result process failed.');
    } finally {
      setRunningRP(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      {message.text && (
        <div style={{
          margin: '0 auto 24px', padding: '12px 20px', maxWidth: '800px',
          borderRadius: '8px', textAlign: 'center', fontWeight: '600',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px'
        }}>
          <span>{message.text}</span>
          {showResultProcessBtn && (
            <button onClick={handleResultProcess} disabled={runningRP}
              style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
              {runningRP ? 'Processing...' : `Result Process (${maxExammy})`}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Left Panel */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={globalStyles.box}>
            <div className={globalStyles.boxHeader}>
              <h2><FaUser className={globalStyles.headerIcon} /> STUDENT INFORMATION</h2>
            </div>
            <div className={globalStyles.boxContent}>
              <div className={globalStyles.formSection}>
                <div className={globalStyles.formRow} style={{ flexDirection: 'column', gap: '16px' }}>
                  <div className={globalStyles.formGroup} style={{ width: '100%' }}>
                    <label className={globalStyles.label}>Register No.</label>
                    <input type="text" value={regNo} onChange={handleRegNoChange}
                      className={globalStyles.input} placeholder="ENTER REGISTER NUM"
                      style={{ textTransform: 'uppercase', fontWeight: 'bold', color: '#1e293b' }} />
                  </div>
                  <div className={globalStyles.formGroup} style={{ width: '100%' }}>
                    <label className={globalStyles.label}>Student Name</label>
                    <input type="text" value={studentName} readOnly className={globalStyles.input} style={{ backgroundColor: '#f1f5f9' }} />
                  </div>
                  <div className={globalStyles.formGroup} style={{ width: '100%' }}>
                    <label className={globalStyles.label}>Programme</label>
                    <input type="text" value={programme} readOnly className={globalStyles.input} style={{ backgroundColor: '#f1f5f9' }} />
                  </div>
                  <div className={globalStyles.formGroup} style={{ width: '100%' }}>
                    <label className={globalStyles.label}>Branch Code</label>
                    <input type="text" value={branchCode} readOnly className={globalStyles.input} style={{ backgroundColor: '#f1f5f9' }} />
                  </div>
                </div>

                {/* SGPA/CGPA Table */}
                <div className={globalStyles.tableWrapper} style={{ marginTop: '24px' }}>
                  <table className={globalStyles.dataTable} style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>SEM</th><th>SGPA</th><th>CGPA</th>
                        <th>TCR</th><th>SCR</th><th>BackLogs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sgpaCgpaData.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>—</td></tr>
                      ) : sgpaCgpaData.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{item.sem}</td>
                          <td style={{ textAlign: 'center' }}>{item.sgpa}</td>
                          <td style={{ textAlign: 'center' }}>{item.cgpa}</td>
                          <td style={{ textAlign: 'center' }}>{item.tcr}</td>
                          <td style={{ textAlign: 'center' }}>{item.securedCR}</td>
                          <td style={{ textAlign: 'center' }}>{item.backlogs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={globalStyles.box}>
            <div className={globalStyles.boxHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>{regNo || 'REGISTRATION NO'}</h2>
                <FaArrowRight className={globalStyles.headerIcon} style={{ margin: 0 }} />
                <h2 style={{ margin: 0, fontSize: '1rem', color: '#64748b' }}>
                  SEMESTER WISE SUBJECT DETAILS
                </h2>
              </div>
              <button className={`${globalStyles.minimizeBtn} ${isSubjectDetailsCollapsed ? globalStyles.rotated : ''}`}
                onClick={() => setIsSubjectDetailsCollapsed(!isSubjectDetailsCollapsed)}>
                <FaChevronUp />
              </button>
            </div>

            <div className={`${globalStyles.boxContent} ${isSubjectDetailsCollapsed ? globalStyles.collapsed : ''}`}>
              {loading ? (
                <div className={globalStyles.noDataMessage}>Loading...</div>
              ) : (
                <div className={globalStyles.tableWrapper}>
                  <table className={globalStyles.dataTable}>
                    <thead>
                      <tr>
                        <th>Code</th><th>Course Name</th><th>CR</th>
                        <th>GR</th><th>GR.PTS</th><th>EXAMMY</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectDetails.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '16px' }}>Enter a Registration No. to load history</td></tr>
                      ) : subjectDetails.map((subject, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{subject.pcode}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => handleSubjectClick(subject)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                            >
                              {subject.pname}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>{subject.cr}</td>
                          <td style={{ textAlign: 'center' }}>{subject.gr}</td>
                          <td style={{ textAlign: 'center' }}>{subject.grpts}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{subject.exammy}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleDelete(subject)}
                              disabled={deletingAshId === subject.ashid}
                              title="Delete"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                              <FaTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className={globalStyles.box} style={{ width: '100%', maxWidth: '600px', margin: 0, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div className={globalStyles.boxHeader}>
              <h2>Edit Subject Details</h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <div className={globalStyles.boxContent} style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              <div className={globalStyles.formSection}>
                {[
                  { label: 'Course Code',     name: 'pcode',   readOnly: true  },
                  { label: 'Course Name',     name: 'pname',   readOnly: false },
                  { label: 'Internal Marks',  name: 'smarks',  readOnly: false },
                  { label: 'SEE',             name: 'tmarks',  readOnly: false },
                  { label: 'RV.SEE',          name: 'rvmarks', readOnly: false },
                  { label: 'V3.SEE',          name: 'v3marks', readOnly: false },
                  { label: 'FIN.SEE',         name: 'finmarks',readOnly: true  },
                  { label: 'Practical Marks', name: 'pmarks',  readOnly: false },
                ].map(({ label, name, readOnly }) => (
                  <div className={globalStyles.formGroup} key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <label className={globalStyles.label} style={{ width: '150px', margin: 0, flexShrink: 0 }}>{label}</label>
                    <input type="text" name={name} value={editFormData[name] || ''}
                      onChange={readOnly ? undefined : handleEditFormChange}
                      readOnly={readOnly} className={globalStyles.input} style={{ backgroundColor: readOnly ? '#f1f5f9' : '#fff' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <button onClick={handleCloseModal} className={globalStyles.btn} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>Cancel</button>
                <button onClick={handleSaveChanges} className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistoryWithoutMarks;
