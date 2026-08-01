import React, { useEffect, useState } from 'react';
import { FaUserTimes, FaChevronUp, FaFileExport } from 'react-icons/fa';
import { getAppData, getBranchPriorityBranches, getAbsenteesPapers, getAbsenteesStudents, saveAbsenteesEntry } from '../utils/api';
import styles from './AbsenteesEntry.module.css';

const AbsenteesEntry = () => {
  const [formData, setFormData] = useState({
    semester: '',
    branch: '',
    paperCode: '',
    regNo: '',
    abMp: ''
  });

  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const semesterOptions = ['Select Semester', '1', '2', '3', '4', '5', '6', '7', '8'];

  const [branchOptions, setBranchOptions] = useState(['Select Branch']);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [papersOptions, setPapersOptions] = useState([{ value: '', label: 'Select Paper' }]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const appData = getAppData() || {};

  useEffect(() => {
    const { course, regulation } = appData || {};
    if (!course || !regulation) { setBranchOptions(['Select Branch']); return; }
    const fetchBranches = async () => {
      setBranchesLoading(true);
      try {
        const response = await getBranchPriorityBranches(course, regulation);
        const list = response?.success && Array.isArray(response.data) ? response.data : [];
        const options = Array.from(new Set(list.map(item => { const value = item?.GRP || item?.grp || item?.branch; return typeof value === 'string' ? value.trim() : ''; }).filter(Boolean)));
        setBranchOptions(['Select Branch', ...options]);
      } catch (error) {
        console.error('Error fetching branch options for AbsenteesEntry:', error);
        setBranchOptions(['Select Branch']);
      } finally { setBranchesLoading(false); }
    };
    fetchBranches();
  }, []);

  const resetPapersAndStudents = () => {
    setPapersOptions([{ value: '', label: 'Select Paper' }]);
    setFormData(prev => ({ ...prev, paperCode: '' }));
    setTableData([]);
    setShowTable(false);
  };

  const loadPapers = async (semester, branch) => {
    const { regulation, examMY, course } = appData || {};
    if (!regulation || !examMY || !course) { alert('Please select Regulation, Course and ExamMY in header.'); return; }
    if (!semester || semester === 'Select Semester' || !branch || branch === 'Select Branch') { resetPapersAndStudents(); return; }
    setPapersLoading(true);
    try {
      const response = await getAbsenteesPapers(regulation, examMY, semester, course, branch);
      const data = response?.data || [];
      const options = [{ value: '', label: 'Select Paper' }];
      data.forEach(item => {
        const pcode = item.PCODE || item.pcode;
        const pname = item.PName || item.PNAME || item.pname;
        if (pcode) options.push({ value: pcode, label: pname ? `${pcode} - ${pname}` : pcode });
      });
      setPapersOptions(options);
      setFormData(prev => ({ ...prev, paperCode: '' }));
      setTableData([]);
      setShowTable(false);
    } catch (error) {
      console.error('Error loading absentees papers:', error);
      alert(error.message || 'Failed to load papers');
      resetPapersAndStudents();
    } finally { setPapersLoading(false); }
  };

  const loadStudents = async (semester, branch, paperCode) => {
    const { regulation, examMY, course } = appData || {};
    if (!regulation || !examMY || !course) { alert('Please select Regulation, Course and ExamMY in header.'); return; }
    if (!semester || semester === 'Select Semester' || !branch || branch === 'Select Branch' || !paperCode) {
      setTableData([]); setShowTable(false); return;
    }
    setStudentsLoading(true);
    try {
      const response = await getAbsenteesStudents(regulation, examMY, semester, course, branch, paperCode);
      const data = response?.data || [];
      const normalized = data.map((item, index) => ({
        id: item.aSHID || item.ASHID || index,
        ashid: item.aSHID || item.ASHID,
        regNo: item.RegNo || item.regNo || '',
        branch: item.GRP || item.grp || branch,
        courseCode: item.PCODE || item.pcode || paperCode,
        code: item.CODE ?? item.code ?? null
      }));
      setTableData(normalized);
      setShowTable(normalized.length > 0);
    } catch (error) {
      console.error('Error loading absentees students:', error);
      alert(error.message || 'Failed to load students');
      setTableData([]); setShowTable(false);
    } finally { setStudentsLoading(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'semester' || name === 'branch') {
      const updatedSemester = name === 'semester' ? value : formData.semester;
      const updatedBranch = name === 'branch' ? value : formData.branch;
      resetPapersAndStudents();
      loadPapers(updatedSemester, updatedBranch);
    }
    if (name === 'paperCode') {
      loadStudents(formData.semester, formData.branch, value);
    }
  };

  const handleAbMpChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, abMp: value.toUpperCase() }));
  };

  const handleAbMpBlur = async (e) => {
    const upperValue = (e.target.value || '').toUpperCase().trim();
    if (upperValue === '') return;
    if (upperValue !== 'AB' && upperValue !== 'MP') {
      alert('Please Enter AB or MP');
      setFormData(prev => ({ ...prev, abMp: '' }));
      e.target.value = ''; e.target.focus(); return;
    }
    if (formData.regNo.trim()) {
      const targetReg = formData.regNo.trim().toUpperCase();
      const student = tableData.find(s => (s.regNo || '').toString().toUpperCase() === targetReg);
      if (!student || !student.ashid) { alert('Entered Regd.No not found in students list.'); return; }
      try {
        await saveAbsenteesEntry(student.ashid, upperValue);
        setTableData(prev => prev.map(row => row.ashid === student.ashid ? { ...row, code: upperValue } : row));
      } catch (error) {
        console.error('Error saving absentee code:', error);
        alert(error.message || 'Failed to save absentee code');
      }
    }
  };

  const handleExport = () => {
    if (!formData.semester || formData.semester === 'Select Semester') { alert('Please Select Sem'); return; }
    if (!formData.branch || formData.branch === 'Select Branch') { alert('Please Select Branch'); return; }
    if (!formData.paperCode) { alert('Please Select Paper'); return; }
    if (!tableData.length) { alert('No data to export'); return; }
    const columns = ['Reg No.', 'Branch', 'Course Code', 'AB/MP'];
    const keys = ['regNo', 'branch', 'courseCode', 'code'];
    const header = columns.join(',');
    const rows = tableData.map((row) => keys.map((k) => { const v = row[k]; const s = v == null ? '' : String(v); return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s; }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AbsenteesEntry_${formData.semester}_${formData.branch}_${formData.paperCode}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUserTimes className={styles.headerIcon} />
            Absentees Entry
          </h2>
          <div className={styles.headerActions}>
            <button
              className={`${styles.minimizeBtn} ${isFormCollapsed ? styles.rotated : ''}`}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            >
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className={styles.boxContent}>
          <div className={`${styles.formContainer} ${isFormCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.formSection}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} className={styles.dropdown}>
                    {semesterOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch {branchesLoading && <span className={styles.loadingText}>Loading...</span>}</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange} className={styles.dropdown} disabled={branchesLoading}>
                    {branchOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Papers {papersLoading && <span className={styles.loadingText}>Loading...</span>}</label>
                  <select name="paperCode" value={formData.paperCode} onChange={handleInputChange} className={styles.dropdown} disabled={papersLoading || papersOptions.length === 1}>
                    {papersOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Regd.No</label>
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} className={styles.input} placeholder="Regd.No" style={{ fontWeight: '600', color: '#b91c1c' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>AB / MP</label>
                  <input type="text" name="abMp" value={formData.abMp} onChange={handleAbMpChange} onBlur={handleAbMpBlur} className={styles.input} placeholder="AB or MP" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button onClick={handleExport} className={styles.exportBtn}>
                <FaFileExport /> Export
              </button>
            </div>
          </div>

          {studentsLoading ? (
            <div className={styles.loadingMessage}>Loading students...</div>
          ) : showTable ? (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Reg No.</th>
                    <th>Branch</th>
                    <th>Course Code</th>
                    <th>AB / MP</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.centerText}>{item.regNo}</td>
                      <td className={styles.centerText}>{item.branch}</td>
                      <td className={styles.centerText}>{item.courseCode}</td>
                      <td className={styles.centerText}>{item.code || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              Please select Semester, Branch, and Papers to view absentees data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbsenteesEntry;