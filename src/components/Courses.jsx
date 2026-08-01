import React, { useState, useEffect } from 'react';
import { FaEdit, FaChevronUp, FaChevronDown, FaTrash, FaCopy, FaCalendarAlt, FaBook } from 'react-icons/fa';
import { getBatches, getBranches, getSemesters, getStreams, getPaperList, getPaperDetails, copyPaper, deletePaper, savePaper, reorderPapers, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './Courses.module.css';

const Courses = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  const [formData, setFormData] = useState({
    batch: '', branch: '', semester: '', courseCode: '', courseName: '',
    entryType: '', credits: '', sgpaCredits: '', internalMax: '', internalPass: '',
    theoryMax: '', theoryPass: '', practicalMax: '', practicalPass: '',
    totalMax: '', totalPass: '', isElective: false, branchElective: false
  });

  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseList, setCourseList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedCourseFromStorage, setSelectedCourseFromStorage] = useState('');
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBatchRegu, setSelectedBatchRegu] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [semestersLoading, setSemestersLoading] = useState(false);
  const [streams, setStreams] = useState([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [paperList, setPaperList] = useState([]);
  const [paperListLoading, setPaperListLoading] = useState(false);
  const [paperDetailsLoading, setPaperDetailsLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFormData, setCopyFormData] = useState({ fromBatch: '', fromSemester: '', toBatch: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  useEffect(() => {
    const loadCourseAndBatches = async () => {
      try {
        const appData = getAppData();
        if (appData && appData.course) {
          setSelectedCourseFromStorage(appData.course);
          setBatchesLoading(true);
          const response = await getBatches(appData.course);
          if (response.success) setBatches(response.data);
          else setBatches([]);
        } else { setBatches([]); }
      } catch { setBatches([]); } finally { setBatchesLoading(false); }
    };
    loadCourseAndBatches();
  }, []);

  const fetchBranches = async (course, regu) => {
    try {
      setBranchesLoading(true);
      const r = await getBranches(course, regu);
      if (r.success) setBranches(r.data); else setBranches([]);
    } catch { setBranches([]); } finally { setBranchesLoading(false); }
  };

  const fetchSemesters = async (course, batch, branch) => {
    try {
      setSemestersLoading(true);
      const r = await getSemesters(course, batch, branch);
      if (r.success) setSemesters(r.data); else setSemesters([]);
    } catch { setSemesters([]); } finally { setSemestersLoading(false); }
  };

  const fetchStreams = async (course, batch, branch, sem) => {
    try {
      setStreamsLoading(true);
      const r = await getStreams(course, batch, branch, sem);
      if (r.success) {
        setStreams(r.data);
        if (r.data.length > 0) fetchPaperList(course, selectedBatchRegu, branch, sem, r.data[0].stream);
      } else { setStreams([]); setPaperList([]); }
    } catch { setStreams([]); setPaperList([]); } finally { setStreamsLoading(false); }
  };

  const fetchPaperList = async (course, regu, branch, sem, stream) => {
    try {
      setPaperListLoading(true);
      const r = await getPaperList(course, regu, branch, sem, stream);
      if (r.success) setPaperList(r.data); else setPaperList([]);
    } catch { setPaperList([]); } finally { setPaperListLoading(false); }
  };

  const isFiltersSelected = formData.batch && formData.branch && formData.semester;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'isElective' && checked) setFormData(p => ({ ...p, isElective: true, branchElective: true }));
      else if (name === 'branchElective' && !checked) setFormData(p => ({ ...p, isElective: false, branchElective: false }));
      else setFormData(p => ({ ...p, [name]: checked }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
    if (['batch', 'branch', 'semester'].includes(name)) { setSelectedCourse(''); setCourseList([]); }
    if (name === 'batch' && value) {
      const sel = batches.find(b => b.batch === value);
      if (sel && selectedCourseFromStorage) { setSelectedBatchRegu(sel.regu); fetchBranches(selectedCourseFromStorage, sel.regu); }
    } else if (name === 'batch' && !value) { setBranches([]); setSemesters([]); setStreams([]); setPaperList([]); setSelectedBatchRegu(''); }
    if (name === 'branch' && value && formData.batch && selectedCourseFromStorage) {
      const sel = branches.find(b => b.branch === value);
      if (sel) fetchSemesters(selectedCourseFromStorage, formData.batch, sel.grp);
    } else if (name === 'branch' && !value) { setSemesters([]); setStreams([]); setPaperList([]); }
    if (name === 'semester' && value && formData.batch && formData.branch && selectedCourseFromStorage) {
      const sel = branches.find(b => b.branch === formData.branch);
      if (sel) fetchStreams(selectedCourseFromStorage, formData.batch, sel.grp, value);
    } else if (name === 'semester' && !value) { setStreams([]); setPaperList([]); }
  };

  useEffect(() => {
    if (isFiltersSelected && paperList.length > 0) {
      setCourseList(paperList.map(p => `${String(p.pno).padStart(2, '0')}-${p.tempCode || p.pcode || ''}`));
    } else { setCourseList([]); setSelectedCourse(''); }
  }, [isFiltersSelected, paperList]);

  const handleCourseSelect = async (courseCode) => {
    setSelectedCourse(courseCode);
    const tempCode = courseCode.split('-')[1];
    if (tempCode && selectedCourseFromStorage && selectedBatchRegu && formData.branch && formData.semester) {
      const sel = branches.find(b => b.branch === formData.branch);
      if (sel) {
        setPaperDetailsLoading(true);
        try {
          const r = await getPaperDetails(selectedCourseFromStorage, selectedBatchRegu, formData.semester, tempCode, sel.grp);
          if (r.success && r.data.length > 0) {
            const d = r.data[0];
            setFormData(p => ({
              ...p, courseCode: d.tempCode, courseName: d.pname,
              entryType: d.entryType === 'R' ? 'Regular only' : d.entryType === 'L' ? 'Lateral only' : 'Regular & Lateral',
              credits: d.credits.toString(), sgpaCredits: d.sub_Cr.toString(),
              internalMax: d.smax.toString(), internalPass: d.sPass.toString(),
              theoryMax: d.tmax.toString(), theoryPass: d.tpass.toString(),
              practicalMax: d.pmax.toString(), practicalPass: d.pPass.toString(),
              totalMax: d.maxmrk.toString(), totalPass: d.pass.toString(),
              isElective: d.elec === 'Y' || d.elec === true,
              branchElective: d.eleC_BRANCH === 'Y' || d.eleC_BRANCH === true
            }));
          }
        } catch (e) { console.error(e); } finally { setPaperDetailsLoading(false); }
      }
    }
  };

  const handleSave = async () => {
    if (!formData.courseCode || !formData.courseName || !formData.entryType || !formData.credits || !formData.internalMax || !formData.theoryMax || !formData.practicalMax || !formData.totalMax) { alert('Please fill all required fields'); return; }
    if (!selectedCourseFromStorage || !selectedBatchRegu || !formData.branch || !formData.semester) { alert('Please ensure all filters are selected'); return; }
    const sel = branches.find(b => b.branch === formData.branch);
    if (!sel) { alert('Invalid branch selection'); return; }
    const stream = streams.length > 0 ? streams[0].stream : 1;
    setSaveLoading(true);
    try {
      const paperData = {
        Regulation: `R${selectedBatchRegu}`, ReguInt: parseInt(selectedBatchRegu) || 0, PName: formData.courseName,
        PCode: formData.courseCode, PType: 'TI', MaxMrk: parseInt(formData.totalMax) || 0,
        SMax: parseInt(formData.internalMax) || 0, TMax: parseInt(formData.theoryMax) || 0,
        PMax: parseInt(formData.practicalMax) || 0, TPass: parseInt(formData.theoryPass) || 0,
        Pass: parseInt(formData.totalPass) || 0, Credits: parseFloat(formData.credits) || 0,
        SemInt: parseInt(formData.semester) || 0, Grp: sel.grp,
        SPass: parseInt(formData.internalPass) || 0, PPass: parseInt(formData.practicalPass) || 0,
        Part: 0, SubCode: '', PTitle: '', P1MAX: 0, P2MAX: 0, ASGMAX: 0, ATTMAX: 0,
        Sub_Cr: parseFloat(formData.sgpaCredits) || 0, TIPASS: 0, TPPASS: 0, PIPASS: 0, Stream: stream,
        EntryType: formData.entryType === 'Regular only' ? 'R' : formData.entryType === 'Lateral only' ? 'L' : 'RL',
        Course: selectedCourseFromStorage, Elec_All: formData.isElective ? 'Y' : 'N',
        IsElecBranch: formData.branchElective ? 'Y' : 'N', PNameBranchwise: formData.courseName, Remarks: ''
      };
      const r = await savePaper(paperData);
      if (r.success) { alert('Paper saved successfully!'); if (streams.length > 0) fetchPaperList(selectedCourseFromStorage, selectedBatchRegu, sel.grp, formData.semester, streams[0].stream); }
      else alert('Failed to save: ' + (r.message || 'Unknown error'));
    } catch (e) { alert('Error saving: ' + e.message); } finally { setSaveLoading(false); }
  };

  const handleCancel = () => {
    setFormData({ batch: '', branch: '', semester: '', courseCode: '', courseName: '', entryType: '', credits: '', sgpaCredits: '', internalMax: '', internalPass: '', theoryMax: '', theoryPass: '', practicalMax: '', practicalPass: '', totalMax: '', totalPass: '', isElective: false, branchElective: false });
    setSelectedCourse(''); setCourseList([]);
  };

  const handleMoveUp = async () => {
    if (!selectedCourse) { alert('Please select a course first'); return; }
    const idx = courseList.indexOf(selectedCourse);
    if (idx === 0) { alert('Course is already at the top'); return; }
    const sel = branches.find(b => b.branch === formData.branch);
    if (!sel) { alert('Invalid branch'); return; }
    const stream = streams.length > 0 ? streams[0].stream : 1;
    setReorderLoading(true);
    try {
      const nl = [...courseList];
      [nl[idx], nl[idx - 1]] = [nl[idx - 1], nl[idx]];
      const r = await reorderPapers(selectedBatchRegu, parseInt(formData.semester), sel.grp, selectedCourseFromStorage, stream.toString(), nl.map(c => c.split('-')[1]));
      if (r.success) { setCourseList(nl); setSelectedCourse(nl[idx - 1]); }
      else alert('Failed to reorder: ' + (r.message || 'Unknown error'));
    } catch (e) { alert('Error: ' + e.message); } finally { setReorderLoading(false); }
  };

  const handleMoveDown = async () => {
    if (!selectedCourse) { alert('Please select a course first'); return; }
    const idx = courseList.indexOf(selectedCourse);
    if (idx === courseList.length - 1) { alert('Course is already at the bottom'); return; }
    const sel = branches.find(b => b.branch === formData.branch);
    if (!sel) { alert('Invalid branch'); return; }
    const stream = streams.length > 0 ? streams[0].stream : 1;
    setReorderLoading(true);
    try {
      const nl = [...courseList];
      [nl[idx], nl[idx + 1]] = [nl[idx + 1], nl[idx]];
      const r = await reorderPapers(selectedBatchRegu, parseInt(formData.semester), sel.grp, selectedCourseFromStorage, stream.toString(), nl.map(c => c.split('-')[1]));
      if (r.success) { setCourseList(nl); setSelectedCourse(nl[idx + 1]); }
      else alert('Failed to reorder: ' + (r.message || 'Unknown error'));
    } catch (e) { alert('Error: ' + e.message); } finally { setReorderLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedCourse) { alert('Please select a course first'); return; }
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    const sel = branches.find(b => b.branch === formData.branch);
    if (!sel) { alert('Invalid branch'); return; }
    setDeleteLoading(true);
    try {
      const r = await deletePaper(selectedBatchRegu, formData.semester, sel.grp, formData.courseCode);
      if (r.success) {
        alert('Course deleted successfully!');
        setSelectedCourse('');
        setFormData(p => ({ ...p, courseCode: '', courseName: '', entryType: '', credits: '', sgpaCredits: '', internalMax: '', internalPass: '', theoryMax: '', theoryPass: '', practicalMax: '', practicalPass: '', totalMax: '', totalPass: '', isElective: false, branchElective: false }));
        if (streams.length > 0) fetchPaperList(selectedCourseFromStorage, selectedBatchRegu, sel.grp, formData.semester, streams[0].stream);
      } else alert('Failed to delete: ' + (r.message || 'Unknown error'));
    } catch (e) { alert('Error: ' + e.message); } finally { setDeleteLoading(false); }
  };

  const handleCopy = () => setShowCopyModal(true);
  const handleCopyInputChange = (e) => { const { name, value } = e.target; setCopyFormData(p => ({ ...p, [name]: value })); };

  const handleCopySave = async () => {
    if (!copyFormData.fromBatch) { alert('Please Select From Batch'); return; }
    if (!copyFormData.fromSemester) { alert('Please Select Sem'); return; }
    if (!copyFormData.toBatch) { alert('Please Select To Batch'); return; }
    if (parseInt(copyFormData.fromBatch.substring(0, 4)) >= parseInt(copyFormData.toBatch.substring(0, 4))) { alert('To Batch Must be Greater than from Batch'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) { alert('User ID not found. Please login again.'); return; }
    if (!selectedCourseFromStorage) { alert('No course selected'); return; }
    setCopyLoading(true);
    try {
      const r = await copyPaper(selectedCourseFromStorage, copyFormData.toBatch, copyFormData.fromBatch, copyFormData.fromSemester, user.userId);
      if (r.success) {
        alert('Papers copied successfully!');
        setShowCopyModal(false); setCopyFormData({ fromBatch: '', fromSemester: '', toBatch: '' });
        if (streams.length > 0 && formData.batch && formData.branch && formData.semester) {
          const sel = branches.find(b => b.branch === formData.branch);
          if (sel) fetchPaperList(selectedCourseFromStorage, selectedBatchRegu, sel.grp, formData.semester, streams[0].stream);
        }
      } else alert('Failed to copy: ' + (r.message || 'Unknown error'));
    } catch (e) { alert('Error: ' + e.message); } finally { setCopyLoading(false); }
  };

  const handleCopyModalClose = () => { setShowCopyModal(false); setCopyFormData({ fromBatch: '', fromSemester: '', toBatch: '' }); };

  const themeStyle = {
    '--theme-color': themeColor,
    '--theme-color-bg': `${themeColor}15`,
    '--theme-color-border': `${themeColor}33`,
  };

  return (
    <div className={styles.pageRoot} style={themeStyle}>

      {/* ── Page Header ─────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            Papers Master
            {selectedCourseFromStorage && (
              <span className={styles.courseBadge}>{selectedCourseFromStorage}</span>
            )}
          </h1>
        </div>
        <div className={styles.dateChip}>
          <FaCalendarAlt style={{ color: themeColor }} />
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ── Filter Card ─────────────────────────────── */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Batch</label>
            <select name="batch" value={formData.batch} onChange={handleInputChange} className={styles.dropdown} disabled={batchesLoading}>
              {batchesLoading ? <option value="">Loading...</option>
                : !selectedCourseFromStorage ? <option value="">No course selected</option>
                : batches.length === 0 ? <option value="">No batches available</option>
                : <><option value="">Select Batch</option>{batches.map((b, i) => <option key={i} value={b.batch}>{b.batch}</option>)}</>}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Branch</label>
            <select name="branch" value={formData.branch} onChange={handleInputChange} className={styles.dropdown} disabled={branchesLoading || !formData.batch}>
              {branchesLoading ? <option value="">Loading...</option>
                : !formData.batch ? <option value="">Select batch first</option>
                : branches.length === 0 ? <option value="">No branches available</option>
                : <><option value="">Select Branch</option>{branches.map((b, i) => <option key={i} value={b.branch}>{b.branch}</option>)}</>}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Semester</label>
            <select name="semester" value={formData.semester} onChange={handleInputChange} className={styles.dropdown} disabled={semestersLoading || !formData.branch}>
              {semestersLoading ? <option value="">Loading...</option>
                : !formData.branch ? <option value="">Select branch first</option>
                : semesters.length === 0 ? <option value="">No semesters available</option>
                : <><option value="">Select Semester</option>{semesters.map((s, i) => <option key={i} value={s.sem}>{s.sem}</option>)}</>}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────── */}
      <div className={styles.mainLayout}>

        {/* Course List Panel */}
        <div className={styles.courseListCard}>
          <div className={styles.courseListHeader}>
            <h3 className={styles.courseListTitle}>
              <FaBook style={{ color: themeColor, fontSize: '12px' }} />
              Courses
              {courseList.length > 0 && <span className={styles.courseCount}>{courseList.length}</span>}
            </h3>
          </div>
          <div className={styles.courseListBody}>
            {!isFiltersSelected ? (
              <div className={styles.emptyState}>Select Batch, Branch &amp; Semester to view courses</div>
            ) : streamsLoading || paperListLoading ? (
              <div className={styles.emptyState}>Loading courses...</div>
            ) : courseList.length === 0 ? (
              <div className={styles.emptyState}>No courses found for selected criteria</div>
            ) : courseList.map((course, index) => (
              <div
                key={index}
                className={`${styles.courseItem} ${selectedCourse === course ? styles.selected : ''} ${paperDetailsLoading ? styles.loading : ''}`}
                onClick={() => !paperDetailsLoading && handleCourseSelect(course)}
              >
                {course}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className={styles.actionCol}>
          <button className={styles.actionBtn} onClick={handleMoveUp} title="Move Up" disabled={reorderLoading}><FaChevronUp /></button>
          <button className={styles.actionBtn} onClick={handleMoveDown} title="Move Down" disabled={reorderLoading}><FaChevronDown /></button>
          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDelete} title="Delete" disabled={deleteLoading}><FaTrash /></button>
          <button className={styles.actionBtn} onClick={handleCopy} title="Copy Papers" disabled={copyLoading}><FaCopy /></button>
        </div>

        {/* Form Card */}
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <FaEdit style={{ color: themeColor, fontSize: '13px' }} />
            <h3 className={styles.formCardTitle}>
              {selectedCourse ? `Editing: ${selectedCourse}` : 'Course Details'}
            </h3>
          </div>
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Course Code</label>
                <input type="text" name="courseCode" value={paperDetailsLoading ? 'Loading...' : formData.courseCode} onChange={handleInputChange} className={styles.formInput} placeholder="Enter course code" disabled={paperDetailsLoading} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Elective Options</label>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}><input type="checkbox" name="isElective" checked={formData.isElective} onChange={handleInputChange} />Is Elective</label>
                  <label className={styles.checkboxLabel}><input type="checkbox" name="branchElective" checked={formData.branchElective} onChange={handleInputChange} />Branch Elective</label>
                </div>
              </div>
            </div>
            <div className={styles.formRowFull}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Course Name</label>
                {formData.isElective ? (
                  <select name="courseName" value={formData.courseName} onChange={handleInputChange} className={styles.formSelect} disabled={paperDetailsLoading}>
                    <option value="">Select Type</option>
                    {['Program Elective - I','Program Elective - II','Program Elective - III','Program Elective - IV','Program Elective - V','Program Elective - VI','Open Elective - I','Open Elective - II','Open Elective - III','Elective-I','Elective-II','Elective-III','Elective-IV','Elective-V','Elective-VI','Elective-VII','Elective-VIII','Add on course-1','Add on course-2','Add on course-3','Add on course-4','Professional Elective-I','Professional Elective-II','Professional Elective-III','Professional Elective-IV','Self Study Course-I','Online Course-I'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <input type="text" name="courseName" value={paperDetailsLoading ? 'Loading...' : formData.courseName} onChange={handleInputChange} className={styles.formInput} placeholder="Enter course name" disabled={paperDetailsLoading} />
                )}
              </div>
            </div>
            <div className={styles.formRowFull}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Entry Type</label>
                <select name="entryType" value={formData.entryType} onChange={handleInputChange} className={styles.formSelect}>
                  <option value="">Select Entry Type</option>
                  <option value="Regular & Lateral">Regular &amp; Lateral</option>
                  <option value="Regular only">Regular only</option>
                  <option value="Lateral only">Lateral only</option>
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Course Credits</label><input type="text" name="credits" value={formData.credits} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. 3.00" /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>SGPA Credits</label><input type="text" name="sgpaCredits" value={formData.sgpaCredits} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. 3.00" /></div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Internal Max</label><input type="text" name="internalMax" value={formData.internalMax} onChange={handleInputChange} className={styles.formInput} placeholder="Max" /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Internal Pass</label><input type="text" name="internalPass" value={formData.internalPass} onChange={handleInputChange} className={styles.formInput} placeholder="Pass" /></div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Theory Max</label><input type="text" name="theoryMax" value={formData.theoryMax} onChange={handleInputChange} className={styles.formInput} placeholder="Max" /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Theory Pass</label><input type="text" name="theoryPass" value={formData.theoryPass} onChange={handleInputChange} className={styles.formInput} placeholder="Pass" /></div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Practical Max</label><input type="text" name="practicalMax" value={formData.practicalMax} onChange={handleInputChange} className={styles.formInput} placeholder="Max" /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Practical Pass</label><input type="text" name="practicalPass" value={formData.practicalPass} onChange={handleInputChange} className={styles.formInput} placeholder="Pass" /></div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Total Max</label><input type="text" name="totalMax" value={formData.totalMax} onChange={handleInputChange} className={styles.formInput} placeholder="Max" /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Total Pass</label><input type="text" name="totalPass" value={formData.totalPass} onChange={handleInputChange} className={styles.formInput} placeholder="Pass" /></div>
            </div>
            <div className={styles.formActions}>
              <button className={styles.btnSave} onClick={handleSave} disabled={saveLoading} style={{ background: themeColor }}>{saveLoading ? 'Saving...' : 'Save Record'}</button>
              <button className={styles.btnCancel} onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Copy Modal ───────────────────────────────── */}
      {showCopyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}>
              <h3>Copy Papers From Previous Batch</h3>
              <button className={styles.modalCloseBtn} onClick={handleCopyModalClose}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>From Course</label>
                <input type="text" value={selectedCourseFromStorage} className={styles.modalInput} readOnly style={{ fontWeight: '600', color: themeColor }} />
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>From Batch</label>
                <select name="fromBatch" value={copyFormData.fromBatch} onChange={handleCopyInputChange} className={styles.modalSelect}>
                  <option value="">Select Batch</option>{batches.map((b, i) => <option key={i} value={b.batch}>{b.batch}</option>)}
                </select>
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Semester</label>
                <select name="fromSemester" value={copyFormData.fromSemester} onChange={handleCopyInputChange} className={styles.modalSelect}>
                  <option value="">Select Semester</option>{[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>To Batch</label>
                <select name="toBatch" value={copyFormData.toBatch} onChange={handleCopyInputChange} className={styles.modalSelect}>
                  <option value="">Select Batch</option>{batches.map((b, i) => <option key={i} value={b.batch}>{b.batch}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={handleCopyModalClose}>Cancel</button>
              <button className={styles.modalSaveBtn} onClick={handleCopySave} disabled={copyLoading} style={{ background: themeColor }}>{copyLoading ? 'Copying...' : 'Copy Data'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;