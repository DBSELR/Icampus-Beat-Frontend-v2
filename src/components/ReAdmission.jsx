import React, { useState, useEffect } from 'react';
import { FaUser, FaChevronUp, FaFileAlt } from 'react-icons/fa';
import iCampusIcon from '../assets/images/iCampus.ico';
import globalStyles from './Results.module.css';
import styles from './ReAdmission.module.css';
import {
  getReAdmissionDetails,
  getReAdmissionHistory,
  getReAdmissionPaperTypes,
  getReAdmissionMarks,
  getReAdmissionPaperDetails,
  updateReAdmissionMarks,
  deleteReAdmission,
} from '../utils/api';

const emptyEdit = {
  ashId: '',
  pCode: '',
  pName: '',
  regulation: '',
  sem: '',
  see: '',
  tMarks: '',
  mMarks: '',
  rvMarks: '',
  sMarks: '',
  pMarks: '',
  entryType: '',
  credits: '',
  sgpaCr: '',
  tMax: '',
  tPass: '',
  sMax: '',
  sPass: '',
  pMax: '',
  pPass: '',
  maxMrk: '',
  pass: '',
};

const ReAdmission = () => {
  const [regNo, setRegNo] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState([]);
  const [historyColumns, setHistoryColumns] = useState([]);

  const [isStudentInfoCollapsed, setIsStudentInfoCollapsed] = useState(false);
  const [isSubjectDetailsCollapsed, setIsSubjectDetailsCollapsed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [saving, setSaving] = useState(false);
  const [paperDetailsLoading, setPaperDetailsLoading] = useState(false);

  // Entry type options from API
  const [entryTypeOptions, setEntryTypeOptions] = useState([]);

  // Fetch paper types on mount
  useEffect(() => {
    getReAdmissionPaperTypes()
      .then((res) => {
        const data = res?.data ?? res;
        if (Array.isArray(data)) setEntryTypeOptions(data);
      })
      .catch(() => {});
  }, []);

  const fetchStudentData = async (regno) => {
    if (!regno.trim()) return;
    setLoading(true);
    setError('');
    setStudentInfo(null);
    setSubjectDetails([]);
    setHistoryColumns([]);

    try {
      const [detailsRes, historyRes] = await Promise.all([
        getReAdmissionDetails(regno),
        getReAdmissionHistory(regno),
      ]);

      const details = detailsRes?.data ?? detailsRes;
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        setStudentInfo(details);
      }

      const history = historyRes?.data ?? historyRes;
      if (Array.isArray(history) && history.length > 0) {
        // Hide ASHID column from display
        const cols = Object.keys(history[0]).filter(
          (c) => !['ashId', 'ASHID', 'ASH_ID', 'ash_id'].includes(c)
        );
        setHistoryColumns(cols);
        setSubjectDetails(history);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegNoChange = (e) => setRegNo(e.target.value.toUpperCase());

  const handleSearch = () => fetchStudentData(regNo);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchStudentData(regNo);
  };

  // Get ashId from a row (handles different key cases)
  const getAshId = (row) =>
    row?.ashId ?? row?.ASHID ?? row?.ASH_ID ?? row?.ash_id ?? '';

  // Open edit modal — fetch marks for this ashId
  const handleEdit = async (row) => {
    const ashId = String(getAshId(row));
    if (!ashId) return;

    setShowEditModal(true);
    setEditLoading(true);
    setEditForm({ ...emptyEdit, ashId });

    try {
      const res = await getReAdmissionMarks(ashId);
      const raw = res?.data ?? res;
      const data = Array.isArray(raw) ? raw[0] : raw;
      const s = (v) => (v === null || v === undefined) ? '' : String(v);
      if (data && typeof data === 'object') {
        setEditForm({
          ashId,
          pCode:      s(data.PCODE      ?? data.pCode),
          pName:      s(data.PNAME      ?? data.pName),
          regulation: s(data.REGULATION ?? data.regulation),
          sem:        s(data.SEM        ?? data.sem),
          see:        s(data.SEE        ?? data.see),
          tMarks:     s(data.TMARKS     ?? data.tMarks),
          mMarks:     s(data.MMARKS     ?? data.mMarks),
          rvMarks:    s(data.RVMARKS    ?? data.rvMarks),
          sMarks:     s(data.SMARKS     ?? data.sMarks),
          pMarks:     s(data.PMARKS     ?? data.pMarks),
          entryType:  s(data.PTYPE      ?? data.entryType),
          credits:    s(data.CR         ?? data.credits),
          sgpaCr:     s(data.SUB_CR     ?? data.sgpaCr),
          tMax:       s(data.TMAX       ?? data.tMax),
          tPass:      s(data.TPASS      ?? data.tPass),
          sMax:       s(data.SMAX       ?? data.sMax),
          sPass:      s(data.SPASS      ?? data.sPass),
          pMax:       s(data.PMAX       ?? data.pMax),
          pPass:      s(data.PPASS      ?? data.pPass),
          maxMrk:     s(data.MAXMRK     ?? data.maxMrk),
          pass:       s(data.PASS       ?? data.pass),
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch marks');
      setShowEditModal(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-calc maxMrk = tMax + sMax + pMax
      if (['tMax', 'sMax', 'pMax'].includes(name)) {
        const t = parseInt(name === 'tMax' ? value : prev.tMax) || 0;
        const s = parseInt(name === 'sMax' ? value : prev.sMax) || 0;
        const p = parseInt(name === 'pMax' ? value : prev.pMax) || 0;
        updated.maxMrk = String(t + s + p);
      }
      return updated;
    });
  };

  // When pCode changes in modal, fetch paper details
  const handlePCodeBlur = async () => {
    if (!editForm.pCode.trim()) return;
    setPaperDetailsLoading(true);
    try {
      const res = await getReAdmissionPaperDetails(editForm.pCode, editForm.regulation, editForm.sem);
      const data = res?.data ?? res;
      if (data && typeof data === 'object') {
        setEditForm((prev) => ({
          ...prev,
          pName:    data.PNAME    ?? data.pName    ?? prev.pName,
          entryType: data.PTYPE   ?? data.entryType ?? prev.entryType,
          credits:  data.CREDITS  ?? data.credits   ?? prev.credits,
          sgpaCr:   data.SUB_CR   ?? data.SGPA_CR   ?? data.sgpaCr   ?? prev.sgpaCr,
          tMax:     data.TMAX     ?? data.tMax     ?? prev.tMax,
          tPass:    data.TPASS    ?? data.tPass    ?? prev.tPass,
          sMax:     data.SMAX     ?? data.sMax     ?? prev.sMax,
          sPass:    data.SPASS    ?? data.sPass    ?? prev.sPass,
          pMax:     data.PMAX     ?? data.pMax     ?? prev.pMax,
          pPass:    data.PPASS    ?? data.pPass    ?? prev.pPass,
          maxMrk:   data.MAXMRK   ?? data.maxMrk   ?? prev.maxMrk,
          pass:     data.PASS     ?? data.pass     ?? prev.pass,
        }));
      }
    } catch {
      // silent
    } finally {
      setPaperDetailsLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (parseInt(editForm.maxMrk) > 100) {
      alert('Total marks cannot exceed 100');
      return;
    }
    if (!window.confirm('Are you sure to update this record?')) return;

    setSaving(true);
    try {
      const res = await updateReAdmissionMarks(editForm);
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
    const ashId = String(getAshId(row));
    if (!ashId) return;
    if (!window.confirm('Are you sure to delete this record?')) return;

    try {
      const res = await deleteReAdmission(ashId);
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

  // Determine if a column is the PNAME column (clickable for edit)
  const isPNameCol = (col) =>
    ['pname', 'PNAME', 'pName', 'paperName', 'PAPERNAME'].includes(col);

  const getStudentField = (field) => {
    if (!studentInfo) return '';
    return studentInfo[field] ?? '';
  };

  return (
    <div className={globalStyles.container}>
      {/* Student Information */}
      <div className={styles.studentInfoSection}>
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
              <div className={styles.formLayout}>
                <div className={styles.leftColumn}>
                  <div className={globalStyles.formGroup}>
                    <label className={globalStyles.label}>Register No.</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={regNo}
                        onChange={handleRegNoChange}
                        onKeyDown={handleKeyDown}
                        className={globalStyles.input}
                        placeholder="Enter Register Number..."
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
                  <div className={globalStyles.formGroup}>
                    <label className={globalStyles.label}>Course</label>
                    <input className={globalStyles.input} value={getStudentField('course') || getStudentField('COURSE') || ''} readOnly />
                  </div>
                </div>

                <div className={styles.centerColumn}>
                  <div className={globalStyles.formGroup}>
                    <label className={globalStyles.label}>Student Name</label>
                    <input className={globalStyles.input} value={getStudentField('studentName') || getStudentField('name') || getStudentField('sName') || ''} readOnly />
                  </div>
                  <div className={globalStyles.formGroup}>
                    <label className={globalStyles.label}>Group</label>
                    <input className={globalStyles.input} value={getStudentField('group') || getStudentField('grp') || getStudentField('GRP') || ''} readOnly />
                  </div>
                </div>

                <div className={styles.rightColumn}>
                  <div className={styles.logoContainer}>
                    <img src={iCampusIcon} alt="iCampus" className={styles.brandIcon} />
                  </div>
                </div>
              </div>
              {error && <div style={{ color: 'red', fontSize: 13, marginTop: 8 }}>{error}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Subject Details */}
      <div className={styles.subjectDetailsSection}>
        <div className={globalStyles.box}>
          <div className={globalStyles.boxHeader}>
            <h2><FaFileAlt className={globalStyles.headerIcon} />SEMESTER WISE SUBJECT DETAILS</h2>
            <button
              className={`${globalStyles.minimizeBtn} ${isSubjectDetailsCollapsed ? globalStyles.rotated : ''}`}
              onClick={() => setIsSubjectDetailsCollapsed(!isSubjectDetailsCollapsed)}
            >
              <FaChevronUp />
            </button>
          </div>

          <div className={`${globalStyles.boxContent} ${isSubjectDetailsCollapsed ? globalStyles.collapsed : ''}`}>
            {loading ? (
              <div className={globalStyles.noDataMessage}>Loading...</div>
            ) : subjectDetails.length > 0 ? (
              <div className={globalStyles.tableWrapper}>
                <table className={globalStyles.dataTable}>
                  <thead>
                    <tr>
                      {historyColumns.map((col) => <th key={col}>{col.toUpperCase()}</th>)}
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectDetails.map((row, i) => (
                      <tr key={i}>
                        {historyColumns.map((col) => (
                          <td key={col} className={styles.centerText}>
                            {isPNameCol(col) ? (
                              <button className={styles.courseNameBtn} onClick={() => handleEdit(row)} style={{ color: 'var(--theme-color)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                {row[col] ?? ''}
                              </button>
                            ) : (
                              row[col] ?? ''
                            )}
                          </td>
                        ))}
                        <td className={styles.centerText}>
                          <button onClick={() => handleDelete(row)} className={`${globalStyles.btn} ${globalStyles.deleteBtn}`} style={{ padding: '4px 8px', minWidth: '0' }} title="Delete">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
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
                <div style={{ textAlign: 'center', padding: 30 }}>Loading...</div>
              ) : (
                <>
                  {/* Top row: Regulation & Semester */}
                  <div className={styles.modalTopRow} style={{ marginBottom: '16px' }}>
                    <div className={styles.modalFormGroup} style={{ flex: 1, marginRight: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Regulation</label>
                      <input type="text" name="regulation" value={editForm.regulation} onChange={handleEditChange} className={globalStyles.input} />
                    </div>
                    <div className={styles.modalFormGroup} style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Semester</label>
                      <input type="text" name="sem" value={editForm.sem} onChange={handleEditChange} className={globalStyles.input} />
                    </div>
                  </div>

                  <div className={styles.modalTwoColumns}>
                    {/* Left column */}
                    <div className={styles.modalLeftColumn} style={{ flex: 1, marginRight: '24px' }}>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Paper Code</label>
                        <input
                          type="text"
                          name="pCode"
                          value={editForm.pCode}
                          onChange={handleEditChange}
                          onBlur={handlePCodeBlur}
                          className={globalStyles.input}
                          placeholder={paperDetailsLoading ? 'Loading...' : ''}
                        />
                      </div>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Paper Name</label>
                        <input type="text" name="pName" value={editForm.pName} onChange={handleEditChange} className={globalStyles.input} />
                      </div>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Theory Marks</label>
                        <input type="text" name="tMarks" value={editForm.tMarks} onChange={handleEditChange} className={globalStyles.input} />
                      </div>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Moderation Marks</label>
                        <input type="text" name="mMarks" value={editForm.mMarks} onChange={handleEditChange} className={globalStyles.input} />
                      </div>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>RV Marks</label>
                        <input type="text" name="rvMarks" value={editForm.rvMarks} onChange={handleEditChange} className={globalStyles.input} />
                      </div>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Internal Marks</label>
                        <input type="text" name="sMarks" value={editForm.sMarks} onChange={handleEditChange} className={globalStyles.input} />
                      </div>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Practical Marks</label>
                        <input type="text" name="pMarks" value={editForm.pMarks} onChange={handleEditChange} className={globalStyles.input} />
                      </div>
                    </div>

                    {/* Right column */}
                    <div className={styles.modalRightColumn} style={{ flex: 1 }}>
                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Entry Type</label>
                        <select name="entryType" value={editForm.entryType} onChange={handleEditChange} className={globalStyles.dropdown}>
                          <option value="">Select Entry Type</option>
                          {entryTypeOptions.map((opt, i) => {
                            const val = typeof opt === 'object' ? (opt.PTYPE ?? opt.value ?? opt.id ?? opt.name ?? Object.values(opt)[0] ?? '') : opt;
                            const label = val;
                            return <option key={i} value={val}>{label}</option>;
                          })}
                        </select>
                      </div>

                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Credits</label>
                        <div className={styles.creditsRow} style={{ display: 'flex', gap: '12px' }}>
                          <input type="text" name="credits" value={editForm.credits} onChange={handleEditChange} className={globalStyles.input} placeholder="Course CR" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                          <input type="text" name="sgpaCr" value={editForm.sgpaCr} onChange={handleEditChange} className={globalStyles.input} placeholder="SGPA CR" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                        </div>
                      </div>

                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Theory</label>
                        <div className={styles.marksRow} style={{ display: 'flex', gap: '12px' }}>
                          <input type="text" name="tMax" value={editForm.tMax} onChange={handleEditChange} className={globalStyles.input} placeholder="Max" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                          <input type="text" name="tPass" value={editForm.tPass} onChange={handleEditChange} className={globalStyles.input} placeholder="Pass" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                        </div>
                      </div>

                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Internal</label>
                        <div className={styles.marksRow} style={{ display: 'flex', gap: '12px' }}>
                          <input type="text" name="sMax" value={editForm.sMax} onChange={handleEditChange} className={globalStyles.input} placeholder="Max" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                          <input type="text" name="sPass" value={editForm.sPass} onChange={handleEditChange} className={globalStyles.input} placeholder="Pass" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                        </div>
                      </div>

                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>Practical</label>
                        <div className={styles.marksRow} style={{ display: 'flex', gap: '12px' }}>
                          <input type="text" name="pMax" value={editForm.pMax} onChange={handleEditChange} className={globalStyles.input} placeholder="Max" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                          <input type="text" name="pPass" value={editForm.pPass} onChange={handleEditChange} className={globalStyles.input} placeholder="Pass" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                        </div>
                      </div>

                      <div className={styles.modalFormGroup} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#475569', fontSize: '14px' }}>TOTAL</label>
                        <div className={styles.marksRow} style={{ display: 'flex', gap: '12px' }}>
                          <input type="text" name="maxMrk" value={editForm.maxMrk} className={globalStyles.input} placeholder="Max" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} readOnly />
                          <input type="text" name="pass" value={editForm.pass} onChange={handleEditChange} className={globalStyles.input} placeholder="Pass" style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                        </div>
                      </div>
                    </div>
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

export default ReAdmission;
