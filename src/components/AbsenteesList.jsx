import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { getAppData, getAbsenteesListSemesters, getAbsenteesListEDates, getAbsenteesListReport } from '../utils/api';
import styles from './AbsenteesList.module.css';

// Normalize course for API (e.g. B.TECH → B.Tech)
const normalizeCourseForApi = (course) => {
  const c = String(course || '').trim();
  if (!c) return c;
  const dot = c.indexOf('.');
  if (dot === -1) return c;
  const before = c.slice(0, dot + 1);
  const after = c.slice(dot + 1);
  const afterNorm = after.length ? after[0].toUpperCase() + after.slice(1).toLowerCase() : after;
  return before + afterNorm;
};

// Ensure eDate is YYYY-MM-DD for API (convert DD-MM-YYYY if needed)
const toApiDate = (dateStr) => {
  const s = String(dateStr || '').trim();
  if (!s) return s;
  const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  return s;
};

const AbsenteesList = () => {
  const appData = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course = (appData.course || '').trim();
  const examMY = (appData.examMY || '').trim();

  const [filters, setFilters] = useState({ semester: '', dateOfExam: '' });
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [dateOfExamOptions, setDateOfExamOptions] = useState([]);
  const [chkIsPrint, setChkIsPrint] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canLoadDropdowns = !!course;
  const canViewReport = regulation && course && examMY && filters.semester && filters.dateOfExam;

  const fetchSemesters = useCallback(async () => {
    if (!canLoadDropdowns) {
      setSemesterOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getAbsenteesListSemesters(normalizeCourseForApi(course));
      if (res?.success && Array.isArray(res?.data)) {
        const list = (res.data || [])
          .map((row) => row.SEM ?? row.sem ?? row.Sem)
          .filter(Boolean)
          .map(String)
          .sort((a, b) => Number(a) - Number(b));
        setSemesterOptions([...new Set(list)]);
      } else {
        setSemesterOptions([]);
      }
    } catch (err) {
      console.error('AbsenteesList semesters error:', err);
      setSemesterOptions([]);
      setLoadError(err?.message || 'Failed to load semesters');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, canLoadDropdowns]);

  const fetchEDates = useCallback(async () => {
    if (!canLoadDropdowns || !filters.semester || !examMY) {
      setDateOfExamOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getAbsenteesListEDates(normalizeCourseForApi(course), examMY, filters.semester);
      if (res?.success && Array.isArray(res?.data)) {
        const list = (res.data || []).map((row) => ({
          value: row.EDATE ?? row.eDate ?? row.EDate ?? '',
          label: row.edate1 ?? row.EDATE ?? row.eDate ?? row.EDate ?? '',
        })).filter((x) => x.value);
        setDateOfExamOptions(list);
      } else {
        setDateOfExamOptions([]);
      }
    } catch (err) {
      console.error('AbsenteesList edates error:', err);
      setDateOfExamOptions([]);
      setLoadError(err?.message || 'Failed to load exam dates');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, examMY, filters.semester, canLoadDropdowns]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    fetchEDates();
  }, [fetchEDates]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'semester') {
      setFilters((p) => ({ ...p, semester: value, dateOfExam: '' }));
    } else {
      setFilters((p) => ({ ...p, [name]: value }));
    }
    setLoadError('');
  };

  const handleView = async () => {
    if (!canViewReport) {
      alert('Please select Semester and Date of Exam. Ensure Course, Regulation and Exam Month/Year are set.');
      return;
    }
    setIsLoadingReport(true);
    setReportData(null);
    setLoadError('');
    try {
      const res = await getAbsenteesListReport(
        regulation,
        normalizeCourseForApi(course),
        examMY,
        filters.semester,
        toApiDate(filters.dateOfExam)
      );
      if (res?.success) {
        setReportData(Array.isArray(res?.data) ? res.data : res?.data ?? null);
      } else {
        setReportData(null);
        setLoadError(res?.message || 'No data found');
      }
    } catch (err) {
      console.error('AbsenteesList report error:', err);
      setReportData(null);
      setLoadError(err?.message || 'Failed to load report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const getVal = (obj, keys) => {
    if (!obj) return '';
    const objKeys = Object.keys(obj);
    for (const key of keys) {
      const match = objKeys.find((k) => k.toLowerCase() === key.toLowerCase());
      if (match && obj[match] != null && String(obj[match]).trim() !== '') {
        return String(obj[match]).trim();
      }
    }
    return '';
  };

  const processAbsenteesData = useCallback(() => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return [];

    const grouped = {};
    reportData.forEach((student) => {
      const status = getVal(student, ['CODE', 'ABSENT', 'ISABSENT', 'STATUS']);
      const isAbsent = status.toUpperCase() === 'AB' || status === 'A' || status.toUpperCase() === 'Y' || status === '1' || status.toUpperCase() === 'TRUE';
      const isMalpractice = status === 'M' || status === 'MP'; 

      if (!isAbsent && !isMalpractice) return; // ONLY include absentees and malpractice!

      const branch = getVal(student, ['GSUB', 'BRANCHNAME', 'BRANCH', 'DEPTNAME']);
      const subjectCode = getVal(student, ['PCODE', 'SUBJECTCODE', 'PAPERCODE', 'SUBCODE', 'SUBJECT_CODE']);
      const subjectName = getVal(student, ['PNAME', 'SUBJECTNAME', 'SUBNAME', 'SUBJECT', 'PAPERNAME']);
      const regNo = getVal(student, ['REGNO', 'HTNO', 'ROLLNO', 'STUDENTID']);
      
      const key = `${subjectCode}_${subjectName}`;
      if (!grouped[key]) {
        grouped[key] = {
          subjectCode: subjectCode || '',
          subjectName: subjectName || 'N/A',
          students: [],
        };
      }
      
      let codeDisplay = status;
      if (isAbsent) codeDisplay = 'AB';
      else if (isMalpractice) codeDisplay = 'M.P.';

      if (regNo) {
        grouped[key].students.push({
          regNo: regNo,
          branch: branch,
          code: codeDisplay
        });
      }
    });

    return Object.values(grouped).map(group => {
      return group;
    });
  }, [reportData]);

  const handleDownload = async () => {
    const pagesData = processAbsenteesData();
    if (!pagesData || pagesData.length === 0) {
      alert('No absentees found to export.');
      return;
    }

    let logoData = null;
    try {
      const response = await fetch('/assets/Screenshot%202026-06-18%20143601.png');
      const blob = await response.blob();
      logoData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Could not load logo for PDF', err);
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;

      const dateLabel = dateOfExamOptions.find(d => d.value === filters.dateOfExam)?.label || filters.dateOfExam;

      pagesData.forEach((page, index) => {
        if (index > 0) doc.addPage();
        
        let currentY = margin;

        if (logoData) {
          doc.addImage(logoData, 'PNG', margin, currentY, 35, 30);
        }

        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.text('D. B. S. Institute', centerW, currentY + 12, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text('(PVT.LTD)', centerW, currentY + 18, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text(`COURSE : ${course}      SEM : ${filters.semester}`, centerW, currentY + 26, { align: 'center' });

        doc.setFontSize(14);
        doc.text(`ABSENTEES or M.P. CANDIDATES LIST FOR EXAMINATIONS, ${examMY}`, centerW, currentY + 38, { align: 'center' });
        
        currentY += 48;

        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        
        doc.text(`EXAM DATE : `, pageWidth - margin - 35, currentY, { align: 'right' });
        doc.setFont('times', 'bold');
        doc.text(dateLabel, pageWidth - margin, currentY, { align: 'right' });

        currentY += 5;
        doc.setLineWidth(0.2);
        doc.setLineDash([1, 1], 0);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.setLineDash([], 0); 
        
        currentY += 8;
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.setTextColor(139, 0, 0); // Dark Red
        doc.text(`${page.subjectCode}-${page.subjectName}`, margin, currentY);

        currentY += 4;
        doc.setLineWidth(0.2);
        doc.setDrawColor(0, 0, 0);
        doc.setLineDash([1, 1], 0);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.setLineDash([], 0); 

        currentY += 15;
        
        doc.setFont('times', 'normal');
        
        page.students.forEach(student => {
            if (currentY > 270) {
                doc.addPage();
                currentY = margin + 10;
            }
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('times', 'normal');
            doc.text(student.regNo, margin, currentY);
            
            const textW = doc.getTextWidth(student.regNo);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 255);
            doc.setFont('times', 'bold');
            doc.text(student.code, margin + textW + 1, currentY - 2);

            currentY += 6;

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 255);
            doc.setFont('times', 'bold');
            doc.text(student.branch, margin, currentY);

            currentY += 12;
        });
      });

      doc.save(`AbsenteesList_${course}_${examMY}_${filters.semester}_${filters.dateOfExam}.pdf`);
    } catch (err) {
      console.error('Error exporting Absentees pdf:', err);
      alert(err.message || 'Failed to export Absentees pdf');
    }
  };

  const reportLoaded = reportData !== null && (Array.isArray(reportData) ? reportData.length > 0 : true);
  const groupedPages = processAbsenteesData();

  const dateLabel = dateOfExamOptions.find(d => d.value === filters.dateOfExam)?.label || filters.dateOfExam;

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadDropdowns || loadingDropdowns}
            >
              <option value="">Select</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Date of Exam</label>
            <select
              name="dateOfExam"
              value={filters.dateOfExam}
              onChange={handleChange}
              className={styles.selectDate}
              disabled={!canLoadDropdowns || loadingDropdowns || !filters.semester || dateOfExamOptions.length === 0}
            >
              <option value="">Select</option>
              {dateOfExamOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label || d.value}</option>
              ))}
            </select>
          </div>
          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.viewBtn}
              onClick={handleView}
              disabled={isLoadingReport || !canViewReport}
            >
              {isLoadingReport ? 'Loading…' : 'View'}
            </button>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={!reportLoaded}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {loadError && <div className={styles.errorMessage}>{loadError}</div>}

      <div className={styles.printRow}>
        <label className={styles.printLabel}>
          <input type="checkbox" checked={chkIsPrint} onChange={(e) => setChkIsPrint(e.target.checked)} />
          Click Here To Print Or Export after loading the Report
        </label>
      </div>

      <div className={styles.reportArea}>
        {!reportLoaded && !isLoadingReport && (
          <div className={styles.placeholder}>
            Select Semester and Date of Exam, then click View. Ensure Course, Regulation and Exam Month/Year are set.
          </div>
        )}
        {isLoadingReport && <div className={styles.loadingState}>Loading report…</div>}
        
        {reportLoaded && !isLoadingReport && groupedPages.length === 0 && (
          <div className={styles.placeholder}>No absentees found for the selected criteria.</div>
        )}

        {reportLoaded && !isLoadingReport && groupedPages.length > 0 && (
          <div className={styles.reportContent}>
            {groupedPages.map((page, idx) => (
              <div key={idx} className={styles.abstractReportPage}>
                <div className={styles.reportHeader}>
                  <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} />
                  <div className={styles.headerText}>
                    <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                    <p className={styles.ugcText}>(PVT.LTD)</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>COURSE : {course} &nbsp;&nbsp;&nbsp;&nbsp; SEM : {filters.semester}</p>
                  </div>
                </div>
                
                <h3 className={styles.reportTitle} style={{ textAlign: 'center', marginBottom: '20px' }}>
                  ABSENTEES or M.P. CANDIDATES LIST FOR EXAMINATIONS, {examMY}
                </h3>

                <div className={styles.examDate}>
                  EXAM DATE : <strong>{dateLabel}</strong>
                </div>

                <hr className={styles.divider} />
                <div className={styles.subjectTitle}>{page.subjectCode}-{page.subjectName}</div>
                <hr className={styles.divider} />

                <div className={styles.studentsList}>
                  {page.students.map((student, sIdx) => (
                    <div key={sIdx} className={styles.studentBlock}>
                      <div className={styles.studentRegNo}>
                        {student.regNo}
                        <span className={styles.absentCode}>{student.code}</span>
                      </div>
                      <div className={styles.studentBranch}>{student.branch}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AbsenteesList;
