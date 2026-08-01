import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { getAppData, getDFormReport, getDFormSemesters, getDFormEDates } from '../utils/api';
import styles from './DForm.module.css';

const DForm = () => {
  const appData = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course = (appData.course || '').trim();
  const examMY = (appData.examMY || '').trim();

  const [filters, setFilters] = useState({ semester: '', examDate: '' });
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [isReadmitResult, setIsReadmitResult] = useState(false);
  const [chkIsPrint, setChkIsPrint] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canLoadDropdowns = course && regulation;
  const canViewReport = course && regulation && examMY && filters.semester && filters.examDate;

  const fetchSemesters = useCallback(async () => {
    if (!canLoadDropdowns) {
      setSemesterOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getDFormSemesters(course, regulation);
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
      console.error('DForm semesters error:', err);
      setSemesterOptions([]);
      setLoadError(err?.message || 'Failed to load semesters');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [course, regulation, canLoadDropdowns]);

  const fetchEDates = useCallback(async () => {
    if (!canLoadDropdowns || !filters.semester) {
      setExamDateOptions([]);
      return;
    }
    setLoadingDropdowns(true);
    setLoadError('');
    try {
      const res = await getDFormEDates(course, examMY, filters.semester);
      if (res?.success && Array.isArray(res?.data)) {
        const list = (res.data || []).map((row) => ({
          value: row.EDATE ?? row.eDate ?? row.EDate ?? '',
          label: row.edate1 ?? row.EDATE ?? row.eDate ?? row.EDate ?? '',
        })).filter((x) => x.value);
        setExamDateOptions(list);
      } else {
        setExamDateOptions([]);
      }
    } catch (err) {
      console.error('DForm edates error:', err);
      setExamDateOptions([]);
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
    setFilters((p) => ({ ...p, [name]: value }));
    if (name === 'semester') {
      setFilters((p) => ({ ...p, semester: value, examDate: '' }));
    }
    setLoadError('');
  };

  const handleView = async () => {
    if (!canViewReport) {
      alert('Please select Semester and Exam Date. Ensure Course, Regulation and Exam Month/Year are set.');
      return;
    }
    setIsLoadingReport(true);
    setReportData(null);
    setLoadError('');
    try {
      const res = await getDFormReport(
        regulation,
        course,
        examMY,
        filters.semester,
        filters.examDate,
        isReadmitResult
      );
      if (res?.success) {
        setReportData(Array.isArray(res?.data) ? res.data : res?.data ?? null);
      } else {
        setReportData(null);
        setLoadError(res?.message || 'No data found');
      }
    } catch (err) {
      console.error('DForm report error:', err);
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

  const processDFormData = useCallback(() => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return [];

    const grouped = {};
    reportData.forEach((student) => {
      const branch = getVal(student, ['GSUB', 'BRANCHNAME', 'BRANCH', 'DEPTNAME']);
      const subjectCode = getVal(student, ['PCODE', 'SUBJECTCODE', 'PAPERCODE', 'SUBCODE', 'SUBJECT_CODE']);
      const subjectName = getVal(student, ['PNAME', 'SUBJECTNAME', 'SUBNAME', 'SUBJECT', 'PAPERNAME']);
      const regNo = getVal(student, ['REGNO', 'HTNO', 'ROLLNO', 'STUDENTID']);
      
      const sessionRaw = getVal(student, ['ESESS', 'SESSION', 'SESSIONID']);
      let sessionCode = '';
      if (sessionRaw === '1' || sessionRaw.toUpperCase() === 'FN') sessionCode = 'FN';
      else if (sessionRaw === '2' || sessionRaw.toUpperCase() === 'AN') sessionCode = 'AN';
      else if (sessionRaw) sessionCode = sessionRaw;

      const dateStr = getVal(student, ['EDATE', 'EXAMDATE', 'DATE']);
      
      const status = getVal(student, ['CODE', 'ABSENT', 'ISABSENT', 'STATUS']);
      const isAbsent = status.toUpperCase() === 'AB' || status === 'A' || status.toUpperCase() === 'Y' || status === '1' || status.toUpperCase() === 'TRUE';
      const isMalpractice = status === 'M' || status === 'MP'; 

      const key = `${branch}_${subjectCode}_${subjectName}`;
      if (!grouped[key]) {
        grouped[key] = {
          branch: branch || 'N/A',
          subjectCode: subjectCode || '',
          subjectName: subjectName || 'N/A',
          session: sessionCode,
          date: dateStr || filters.examDate,
          students: [],
        };
      }
      if (regNo) {
        grouped[key].students.push({
          regNo: regNo,
          isAbsent,
          isMalpractice
        });
      }
    });

    return Object.values(grouped).map(group => {
      group.students.sort((a, b) => a.regNo.localeCompare(b.regNo));
      return group;
    });
  }, [reportData, filters.examDate]);

  const handleDownload = async () => {
    const pagesData = processDFormData();
    if (!pagesData || pagesData.length === 0) {
      alert('No data to export.');
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
      
      const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
      const formatSem = (sem) => {
        if (!sem) return '';
        const upperSem = String(sem).toUpperCase();
        return romanSemMap[upperSem] || upperSem;
      };
      
      const semNumMap = { 'I': 1, 'II': 1, '1': 1, '2': 1, 'III': 2, 'IV': 2, '3': 2, '4': 2, 'V': 3, 'VI': 3, '5': 3, '6': 3, 'VII': 4, 'VIII': 4, '7': 4, '8': 4 };
      const romanYearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
      const yearNum = semNumMap[filters.semester?.toUpperCase()] || 1;
      const yearStr = romanYearMap[yearNum] || 'I';
      
      const courseStr = course || 'B.Tech.';
      const reguStr = regulation ? `(${regulation})` : '';
      const semStr = filters.semester ? `(${formatSem(filters.semester)} Semester)` : '';
      const examMYDisplay = examMY ? `- ${examMY}` : '';
      
      const nameOfExam = `${yearStr} ${courseStr}.${semStr} ${reguStr} ${isReadmitResult ? 'Readmit' : 'Supplementary'} ${examMYDisplay}`;

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
        doc.text('D. B. S. Institute', centerW + 15, currentY + 12, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text('(PVT.LTD)', centerW + 15, currentY + 18, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text(`'D' FORM`, centerW + 15, currentY + 28, { align: 'center' });
        const titleW = doc.getTextWidth(`'D' FORM`);
        doc.setLineWidth(0.5);
        doc.line(centerW + 15 - (titleW / 2), currentY + 29, centerW + 15 + (titleW / 2), currentY + 29);
        
        currentY += 45;

        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        
        const leftColX = margin;
        const leftColonX = margin + 45;
        const leftValueX = margin + 50;

        doc.text('Name of Exam', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.setFont('times', 'bold');
        doc.text(nameOfExam, leftValueX, currentY);

        currentY += 8;
        doc.setFont('times', 'normal');
        doc.text('Branch', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.setFont('times', 'bold');
        doc.text(page.branch, leftValueX, currentY);

        currentY += 8;
        doc.setFont('times', 'normal');
        doc.text('Date of Examination', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.setFont('times', 'bold');
        const sessionStr = page.session ? ` (${page.session})` : '';
        doc.text(`${page.date}${sessionStr}`, leftValueX, currentY);

        currentY += 8;
        doc.setFont('times', 'normal');
        doc.text('Course Code and Name', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.setFont('times', 'bold');
        doc.text(`${page.subjectCode} - ${page.subjectName}`, leftValueX, currentY);

        currentY += 12;
        doc.setLineWidth(0.2);
        doc.setLineDash([1, 1], 0);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.setLineDash([], 0); 
        
        currentY += 10;
        doc.setFont('times', 'normal');
        doc.text('Hall Ticket Numbers of students registered :', margin, currentY);
        
        currentY += 10;
        
        const studentsReg = page.students.length;
        const studentsAbsent = page.students.filter(s => s.isAbsent).length;
        const studentsPresent = studentsReg - studentsAbsent;
        const studentsMalpractice = page.students.filter(s => s.isMalpractice).length;
        
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        
        page.students.forEach(student => {
            if (currentY > 240) {
                doc.addPage();
                currentY = margin + 10;
            }
            
            if (student.isAbsent) {
                doc.setTextColor(0, 0, 128);
                const textW = doc.getTextWidth(student.regNo);
                doc.setDrawColor(0, 0, 128);
                doc.rect(margin - 1, currentY - 4, textW + 2, 6);
            } else {
                doc.setTextColor(0, 0, 0);
            }
            
            doc.text(student.regNo, margin, currentY);
            currentY += 8;
        });
        
        doc.setTextColor(0, 0, 0);
        
        if (currentY > 210) {
            doc.addPage();
            currentY = margin + 10;
        } else {
            currentY = 230;
        }
        
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        
        const rightLabelX = pageWidth / 2 + 10;
        const rightColonX2 = rightLabelX + 45;
        const rightValueX2 = rightColonX2 + 5;
        
        doc.text('No. of Students Registered', margin, currentY);
        doc.text(':', leftColonX, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(studentsReg), leftValueX, currentY);
        
        doc.setFont('times', 'normal');
        doc.text('No. of Students Absent', rightLabelX, currentY);
        doc.text(':', rightColonX2, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(studentsAbsent), rightValueX2, currentY);
        
        currentY += 8;
        
        doc.setFont('times', 'normal');
        doc.text('No. of Malpractice Cases', margin, currentY);
        doc.text(':', leftColonX, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(studentsMalpractice), leftValueX, currentY);
        
        doc.setFont('times', 'normal');
        doc.text('No. of Students Present', rightLabelX, currentY);
        doc.text(':', rightColonX2, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(studentsPresent), rightValueX2, currentY);
        
        currentY += 15;
        doc.setFont('times', 'normal');
        doc.text('Verified By :', margin, currentY);
        
        currentY += 25;
        doc.text('(Name & Signature)', margin, currentY);
        
        doc.setFont('times', 'bold');
        const ccW = doc.getTextWidth('CHIEF CONTROLLER OF EXAMINATIONS');
        doc.text('CHIEF CONTROLLER OF EXAMINATIONS', pageWidth - margin - ccW, currentY + 10);
      });

      doc.save(`DForm_${course}_${examMY}_${filters.semester}_${filters.examDate}.pdf`);
    } catch (err) {
      console.error('Error exporting DForm pdf:', err);
      alert(err.message || 'Failed to export DForm pdf');
    }
  };

  const reportLoaded = reportData !== null && (Array.isArray(reportData) ? reportData.length > 0 : true);
  const groupedPages = processDFormData();

  const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
  const formatSem = (sem) => {
    if (!sem) return '';
    const upperSem = String(sem).toUpperCase();
    return romanSemMap[upperSem] || upperSem;
  };
  const semNumMap = { 'I': 1, 'II': 1, '1': 1, '2': 1, 'III': 2, 'IV': 2, '3': 2, '4': 2, 'V': 3, 'VI': 3, '5': 3, '6': 3, 'VII': 4, 'VIII': 4, '7': 4, '8': 4 };
  const romanYearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const yearNum = semNumMap[filters.semester?.toUpperCase()] || 1;
  const yearStr = romanYearMap[yearNum] || 'I';
  
  const courseStr = course || 'B.Tech.';
  const reguStr = regulation ? `(${regulation})` : '';
  const semStr = filters.semester ? `(${formatSem(filters.semester)} Semester)` : '';
  const examMYDisplay = examMY ? `- ${examMY}` : '';
  
  const nameOfExam = `${yearStr} ${courseStr}.${semStr} ${reguStr} ${isReadmitResult ? 'Readmit' : 'Supplementary'} ${examMYDisplay}`;

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
            <label className={styles.label}>Exam Date</label>
            <select
              name="examDate"
              value={filters.examDate}
              onChange={handleChange}
              className={styles.select}
              disabled={!canLoadDropdowns || loadingDropdowns || !filters.semester || examDateOptions.length === 0}
            >
              <option value="">Select</option>
              {examDateOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label || d.value}</option>
              ))}
            </select>
          </div>
          <div className={styles.checkGroup}>
            <label className={styles.readmitLabel}>
              <input
                type="checkbox"
                checked={isReadmitResult}
                onChange={(e) => setIsReadmitResult(e.target.checked)}
              />
              Is Readmit Result
            </label>
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
            Select Semester and Exam Date, then click View. Ensure Course, Regulation and Exam Month/Year are set.
          </div>
        )}
        {isLoadingReport && <div className={styles.loadingState}>Loading report…</div>}
        
        {reportLoaded && !isLoadingReport && groupedPages.length > 0 && (
          <div className={styles.reportContent}>
            {groupedPages.map((page, idx) => {
              const studentsReg = page.students.length;
              const studentsAbsent = page.students.filter(s => s.isAbsent).length;
              const studentsPresent = studentsReg - studentsAbsent;
              const studentsMalpractice = page.students.filter(s => s.isMalpractice).length;
              
              return (
                <div key={idx} className={styles.abstractReportPage}>
                  <div className={styles.reportHeader}>
                    <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} />
                    <div className={styles.headerText}>
                      <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                      <p className={styles.ugcText}>(PVT.LTD)</p>
                      <h3 className={styles.reportTitle}>'D' FORM</h3>
                    </div>
                  </div>

                  <div className={styles.infoBlock}>
                    <div className={styles.infoRow}>
                      <div className={styles.infoLabel}>Name of Exam</div>
                      <div className={styles.infoColon}>:</div>
                      <div className={styles.infoValue}>{nameOfExam}</div>
                    </div>
                    <div className={styles.infoRow}>
                      <div className={styles.infoLabel}>Branch</div>
                      <div className={styles.infoColon}>:</div>
                      <div className={styles.infoValue}>{page.branch}</div>
                    </div>
                    <div className={styles.infoRow}>
                      <div className={styles.infoLabel}>Date of Examination</div>
                      <div className={styles.infoColon}>:</div>
                      <div className={styles.infoValue}>{page.date}{page.session ? ` (${page.session})` : ''}</div>
                    </div>
                    <div className={styles.infoRow}>
                      <div className={styles.infoLabel}>Course Code and Name</div>
                      <div className={styles.infoColon}>:</div>
                      <div className={styles.infoValue}>{page.subjectCode} - {page.subjectName}</div>
                    </div>
                  </div>

                  <hr className={styles.divider} />

                  <div className={styles.studentsSectionTitle}>
                    Hall Ticket Numbers of students registered :
                  </div>

                  <div className={styles.studentsGrid}>
                    {page.students.map((student, sIdx) => (
                      <div 
                        key={sIdx} 
                        className={`${styles.studentRegNo} ${student.isAbsent ? styles.absentStudent : ''}`}
                      >
                        {student.regNo}
                      </div>
                    ))}
                  </div>

                  <div className={styles.footerSection}>
                    <div className={styles.footerCol}>
                      <div className={styles.footerRow}>
                        <div className={styles.footerLabel}>No. of Students Registered</div>
                        <div className={styles.footerColon}>:</div>
                        <div className={styles.footerValue}>{studentsReg}</div>
                      </div>
                      <div className={styles.footerRow}>
                        <div className={styles.footerLabel}>No. of Malpractice Cases</div>
                        <div className={styles.footerColon}>:</div>
                        <div className={styles.footerValue}>{studentsMalpractice}</div>
                      </div>
                    </div>
                    <div className={styles.footerCol}>
                      <div className={styles.footerRow}>
                        <div className={styles.footerLabel}>No. of Students Absent</div>
                        <div className={styles.footerColon}>:</div>
                        <div className={styles.footerValue}>{studentsAbsent}</div>
                      </div>
                      <div className={styles.footerRow}>
                        <div className={styles.footerLabel}>No. of Students Present</div>
                        <div className={styles.footerColon}>:</div>
                        <div className={styles.footerValue}>{studentsPresent}</div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.signatureSection}>
                    <div>Verified By :</div>
                    <div className={styles.signatureBlock}>
                      <div>(Name & Signature)</div>
                      <div className={styles.chiefController}>CHIEF CONTROLLER OF EXAMINATIONS</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DForm;
