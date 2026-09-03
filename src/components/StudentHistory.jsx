import React, { useState } from 'react';
import { FaUser, FaChevronUp, FaFileExport, FaTrash } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import styles from './StudentHistory.module.css';
import {
  getStudentHistoryDetails,
  getStudentHistorySgpaCgpa,
  getStudentHistoryHistory,
  getStudentHistoryMarks,
  updateStudentHistoryMarks,
  deleteStudentHistory,
} from '../utils/api';
import { exportToExcel } from '../utils/exportExcel';

const StudentHistory = () => {
  const [regNo, setRegNo] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);
  const [sgpaCgpaData, setSgpaCgpaData] = useState([]);
  const [sgpaColumns, setSgpaColumns] = useState([]);
  const [subjectDetails, setSubjectDetails] = useState([]);
  const [historyColumns, setHistoryColumns] = useState([]);

  const [isStudentInfoCollapsed, setIsStudentInfoCollapsed] = useState(false);
  const [isSubjectDetailsCollapsed, setIsSubjectDetailsCollapsed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    ashId: '',
    pName: '',
    sMarks: '',
    tMarks: '',
    mMarks: '',
    rvMarks: '',
    v3: '',
    pMarks: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchStudentData = async (regno) => {
    if (!regno.trim()) return;
    setLoading(true);
    setError('');
    setStudentInfo(null);
    setSgpaCgpaData([]);
    setSgpaColumns([]);
    setSubjectDetails([]);
    setHistoryColumns([]);

    try {
      const [detailsRes, sgpaRes, historyRes] = await Promise.all([
        getStudentHistoryDetails(regno),
        getStudentHistorySgpaCgpa(regno),
        getStudentHistoryHistory(regno),
      ]);

      // Details
      const details = detailsRes?.data ?? detailsRes;
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        setStudentInfo(details);
      }

      // SGPA/CGPA
      const sgpa = sgpaRes?.data ?? sgpaRes;
      if (Array.isArray(sgpa) && sgpa.length > 0) {
        setSgpaColumns(Object.keys(sgpa[0]));
        setSgpaCgpaData(sgpa);
      }

      // History
      const history = historyRes?.data ?? historyRes;
      if (Array.isArray(history) && history.length > 0) {
        setHistoryColumns(Object.keys(history[0]));
        setSubjectDetails(history);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegNoChange = (e) => {
    setRegNo(e.target.value.toUpperCase());
  };

  const handleSearch = () => {
    fetchStudentData(regNo);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchStudentData(regNo);
  };

  // Edit: fetch marks from API for the selected row
  const handleEdit = async (row) => {
    const ashId = String(row.ASHID ?? row.ashId ?? row.ASH_ID ?? row.ash_id ?? row.id ?? '');
    if (!ashId) return;

    setEditLoading(true);
    setShowEditModal(true);
    setEditFormData({ ashId, pName: '', sMarks: '', tMarks: '', mMarks: '', rvMarks: '', v3: '', pMarks: '' });

    try {
      const res = await getStudentHistoryMarks(ashId);
      const raw = res?.data ?? res;
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (data && typeof data === 'object') {
        setEditFormData({
          ashId,
          pName:   data.PNAME   ?? data.pName   ?? data.paperName  ?? '',
          sMarks:  data.SMARKS  ?? data.sMarks  ?? '',
          tMarks:  data.TMARKS  ?? data.tMarks  ?? '',
          mMarks:  data.MMARKS  ?? data.mMarks  ?? '',
          rvMarks: data.RVMARKS ?? data.rvMarks ?? '',
          v3:      data.V3      ?? data.v3       ?? '',
          pMarks:  data.PMARKS  ?? data.pMarks  ?? '',
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch marks');
      setShowEditModal(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await updateStudentHistoryMarks(editFormData);
      if (res?.success === false) {
        alert(res.message || 'Update failed');
      } else {
        alert('Record updated successfully!');
        setShowEditModal(false);
        fetchStudentData(regNo);
      }
    } catch (err) {
      alert(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ashId = String(row.ASHID ?? row.ashId ?? row.ASH_ID ?? row.ash_id ?? row.id ?? '');
    if (!ashId) return;
    if (!window.confirm('Do you want to delete this record?')) return;

    try {
      const res = await deleteStudentHistory(ashId);
      if (res?.success === false) {
        alert(res.message || 'Delete failed');
      } else {
        alert('Record deleted successfully!');
        fetchStudentData(regNo);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleExport = () => {
    if (!regNo.trim()) { alert('Please enter a Registration Number first'); return; }
    if (subjectDetails.length === 0) { alert('No data to export. Please search for a student first.'); return; }

    const sheets = [];

    // Sheet 1: Student Info
    const infoRows = [['Field', 'Value']];
    if (studentInfo) {
      Object.entries(studentInfo).forEach(([k, v]) => infoRows.push([k, String(v ?? '')]));
    }
    sheets.push({ name: 'Student Info', data: infoRows });

    // Sheet 2: SGPA CGPA
    if (sgpaCgpaData.length > 0) {
      const sgpaRows = [sgpaColumns, ...sgpaCgpaData.map((r) => sgpaColumns.map((c) => r[c] ?? ''))];
      sheets.push({ name: 'SGPA CGPA', data: sgpaRows });
    }

    // Sheet 3: Subject Details
    const visibleCols = historyColumns.filter((c) => !['ASHID', 'ashId', 'ASH_ID', 'ash_id'].includes(c));
    const subjectRows = [visibleCols, ...subjectDetails.map((r) => visibleCols.map((c) => r[c] ?? ''))];
    sheets.push({ name: 'Subject Details', data: subjectRows });

    exportToExcel(sheets, `StudentHistory_${regNo}.xlsx`);
  };

  // Determine student display fields dynamically
  const getStudentField = (field) => {
    if (!studentInfo) return '';
    return studentInfo[field] ?? '';
  };

  // Identify ashId column key in history rows
  const getAshId = (row) => row.ASHID ?? row.ashId ?? row.ASH_ID ?? row.ash_id ?? row.id ?? '';

  // Desired columns to display in specific order (others commented out for future use)
  const desiredColumns = [
    'SEM',
    'PCODE',
    'PNAME',
    'CR',
    'SMARKS',
    'MRK_FIN',
    'MARKS',
    'GR',
    'GRPTS',
    'EXAMMY'
    /* 
    'TMARKS',
    'MMARKS',
    'RVMARKS',
    'V3',
    'PMARKS',
    // ... uncomment or add other columns here
    */
  ];

  // Map desired columns to their exact case from the API (if present) and filter out missing ones
  const visibleHistoryColumns = desiredColumns
    .map(dc => historyColumns.find(hc => hc.toUpperCase() === dc))
    .filter(Boolean);

  return (
    <div className={globalStyles.container}>
      <div className={styles.mainLayout}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          <div className={globalStyles.box}>
            <div className={globalStyles.boxHeader}>
              <h2><FaUser className={globalStyles.headerIcon} />STUDENT INFORMATION</h2>
              <button
                className={`${globalStyles.minimizeBtn} ${isStudentInfoCollapsed ? globalStyles.rotated : ''}`}
                onClick={() => setIsStudentInfoCollapsed(!isStudentInfoCollapsed)}
              >
                <FaChevronUp />
              </button>
            </div>

            <div className={`${globalStyles.boxContent} ${isStudentInfoCollapsed ? globalStyles.collapsed : ''}`}>
              <div className={globalStyles.formSection}>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Register No.</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={regNo}
                      onChange={handleRegNoChange}
                      onKeyDown={handleKeyDown}
                      className={globalStyles.input}
                      placeholder="ENTER REGISTER NO"
                      style={{ textTransform: 'uppercase', flex: 1 }}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={loading}
                      className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                      style={{ padding: '6px 16px', flexShrink: 0 }}
                    >
                      {loading ? '...' : 'Search'}
                    </button>
                  </div>
                </div>

                {error && <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>{error}</div>}

                {studentInfo && (
                  <>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Student Name</label>
                      <input className={globalStyles.input} value={getStudentField('studentName') || getStudentField('name') || getStudentField('sName') || ''} readOnly />
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Programme</label>
                      <input className={globalStyles.input} value={getStudentField('programme') || getStudentField('course') || ''} readOnly />
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Branch Code</label>
                      <input className={globalStyles.input} value={getStudentField('branchCode') || getStudentField('branch') || getStudentField('grp') || ''} readOnly />
                    </div>
                  </>
                )}

                {/* SGPA/CGPA Table */}
                {sgpaCgpaData.length > 0 && (() => {
                  const visibleSgpaColumns = sgpaColumns.filter(
                    col => !['REGNO', 'RNO'].includes(col.toUpperCase())
                  );
                  return (
                    <div className={styles.sgpaTableContainer}>
                      <table className={styles.sgpaTable}>
                        <thead>
                          <tr>
                            {visibleSgpaColumns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sgpaCgpaData.map((row, i) => (
                            <tr key={i}>
                              {visibleSgpaColumns.map((col) => (
                                <td key={col} className={styles.centerText}>{row[col] ?? ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          <div className={globalStyles.box}>
            <div className={globalStyles.boxHeader}>
              <div className={styles.headerContent} style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#fff', flexWrap: 'wrap' }}>
                <h2 style={{ color: '#fff' }}><span className={styles.regNoText} style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '4px' }}>{regNo || '---'}</span></h2>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}><FaUser className={globalStyles.headerIcon} />SEMESTER WISE SUBJECT DETAILS</h2>
              </div>
              <div className={globalStyles.headerActions}>
                <button onClick={handleExport} className={`${globalStyles.btn} ${globalStyles.exportBtn}`} style={{ padding: '4px 12px', height: '32px' }}>
                  <FaFileExport /> Export
                </button>
                <button
                  className={`${globalStyles.minimizeBtn} ${isSubjectDetailsCollapsed ? globalStyles.rotated : ''}`}
                  onClick={() => setIsSubjectDetailsCollapsed(!isSubjectDetailsCollapsed)}
                >
                  <FaChevronUp />
                </button>
              </div>
            </div>

            <div className={`${globalStyles.boxContent} ${isSubjectDetailsCollapsed ? globalStyles.collapsed : ''}`}>
              {loading ? (
                <div className={globalStyles.noDataMessage}>Loading...</div>
              ) : subjectDetails.length > 0 ? (
                <div className={globalStyles.tableContainer}>
                  <table className={`${globalStyles.dataTable} ${styles.compactTable}`}>
                    <thead>
                      <tr>
                        {visibleHistoryColumns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let currentSem = null;
                        const toRoman = (sem) => {
                          const map = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X' };
                          return map[String(sem).trim()] || sem;
                        };

                        return subjectDetails.map((row, i) => {
                          const semKey = Object.keys(row).find(k => k.toUpperCase() === 'SEM');
                          const semValue = semKey ? row[semKey] : null;

                          const renderRow = (
                            <tr key={i}>
                              {visibleHistoryColumns.map((col) => (
                                <td key={col} className={styles.centerText}>
                                  {/* Make course name clickable for edit */}
                                  {['PNAME', 'courseName', 'pName', 'paperName', 'COURSE_NAME'].includes(col) ? (
                                    <button className={styles.courseNameBtn} onClick={() => handleEdit(row)} style={{ color: 'var(--theme-color)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                      {row[col] ?? ''}
                                    </button>
                                  ) : (
                                    row[col] ?? ''
                                  )}
                                </td>
                              ))}
                              <td className={styles.centerText}>
                                <button
                                  onClick={() => handleDelete(row)}
                                  className={`${globalStyles.btn} ${globalStyles.deleteBtn}`}
                                  style={{ padding: '4px 8px', minWidth: '0' }}
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            </tr>
                          );

                          if (semValue && semValue !== currentSem) {
                            currentSem = semValue;
                            return (
                              <React.Fragment key={`group-${i}`}>
                                <tr>
                                  <td colSpan={visibleHistoryColumns.length + 1} style={{ textAlign: 'left', fontWeight: 'bold', background: '#e2e8f0', color: '#1e293b', padding: '8px 12px', fontSize: '13px' }}>
                                    Semester - {toRoman(semValue)}
                                  </td>
                                </tr>
                                {renderRow}
                              </React.Fragment>
                            );
                          }

                          return renderRow;
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={globalStyles.noDataMessage}>
                  {regNo ? 'No data found for this registration number.' : 'Please enter a Registration Number to view subject details.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>Edit Subject Details</span>
              <button onClick={() => setShowEditModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.modalBody}>
              {editLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>
              ) : (
                <>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Paper Name</label>
                    <input type="text" name="pName" value={editFormData.pName} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>SEE Marks</label>
                    <input type="text" name="sMarks" value={editFormData.sMarks} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Total Marks</label>
                    <input type="text" name="tMarks" value={editFormData.tMarks} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Moderation Marks</label>
                    <input type="text" name="mMarks" value={editFormData.mMarks} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>RV Marks</label>
                    <input type="text" name="rvMarks" value={editFormData.rvMarks} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>V3</label>
                    <input type="text" name="v3" value={editFormData.v3} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                  <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Practical Marks</label>
                    <input type="text" name="pMarks" value={editFormData.pMarks} onChange={handleEditFormChange} className={globalStyles.input} />
                  </div>
                </>
              )}
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={handleEditSave} className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={saving || editLoading}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowEditModal(false)} className={`${globalStyles.btn} ${globalStyles.deleteBtn}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistory;
