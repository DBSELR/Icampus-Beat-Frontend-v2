import React, { useState, useEffect, useCallback } from 'react';
import Barcode from 'react-barcode';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './NominalRolls.module.css';
import { getAppData, getNominalRollsSemesters, getNominalRollsExamDates, getNominalRollsRooms, getNominalRollsData } from '../utils/api';

const NominalRolls = () => {
  const [filters, setFilters] = useState({
    semester: '',
    examDate: '',
    room: '',
    isReadmitResult: false
  });

  const [semesterOptions, setSemesterOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [nominalRollsData, setNominalRollsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState({
    semesters: false,
    examDates: false,
    rooms: false
  });

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      const course = data.course || data.Course || '';
      const examMY = data.examMY || data.examMy || data.ExamMy || data.ExamMY || '';
      
      if (course && examMY) {
        fetchSemesters(course, examMY);
      }
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course, examMY) => {
    try {
      setDropdownLoading(prev => ({ ...prev, semesters: true }));
      setError('');
      const response = await getNominalRollsSemesters(course, examMY);
      
      if (response && response.success && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          return item.SEM || item.sem || item.sem1 || item;
        }).filter(Boolean);
        setSemesterOptions(sems);
      } else {
        setError(response?.message || 'No semesters found');
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setError(error.message || 'Failed to load semesters');
    } finally {
      setDropdownLoading(prev => ({ ...prev, semesters: false }));
    }
  }, []);

  // Fetch exam dates when semester changes
  useEffect(() => {
    const fetchExamDatesData = async () => {
      if (!filters.semester || !appData) {
        setExamDateOptions([]);
        setRoomOptions([]);
        setFilters(prev => ({ ...prev, examDate: '', room: '' }));
        return;
      }

      const course = appData.course || appData.Course || '';
      const examMY = appData.examMY || appData.examMy || appData.ExamMy || appData.ExamMY || '';

      if (!course || !examMY) {
        setExamDateOptions([]);
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, examDates: true }));
        setError('');
        const response = await getNominalRollsExamDates(course, examMY, filters.semester);
        
        if (response && response.success && Array.isArray(response.data)) {
          const dates = response.data.map(item => {
            return item.EDATE || item.edate || item.edate1 || item;
          }).filter(Boolean);
          setExamDateOptions(dates);
        } else {
          setExamDateOptions([]);
        }
      } catch (error) {
        console.error('Error fetching exam dates:', error);
        setExamDateOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, examDates: false }));
      }
    };

    fetchExamDatesData();
  }, [filters.semester, appData]);

  // Fetch rooms when exam date changes
  useEffect(() => {
    const fetchRoomsData = async () => {
      if (!filters.examDate || !filters.semester || !appData) {
        setRoomOptions([]);
        setFilters(prev => ({ ...prev, room: '' }));
        return;
      }

      const course = appData.course || appData.Course || '';
      const examMY = appData.examMY || appData.examMy || appData.ExamMy || appData.ExamMY || '';

      if (!course || !examMY) {
        setRoomOptions([]);
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, rooms: true }));
        setError('');
        const response = await getNominalRollsRooms(course, examMY, filters.semester, filters.examDate);
        
        if (response && response.success && Array.isArray(response.data)) {
          const rooms = response.data.map(item => {
            return item.ROOM || item.room || item.RoomNo || item.roomNo || item;
          }).filter(Boolean);
          setRoomOptions(rooms);
        } else {
          setRoomOptions([]);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setRoomOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, rooms: false }));
      }
    };

    fetchRoomsData();
  }, [filters.examDate, filters.semester, appData]);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'semester') {
      setFilters({
        semester: value,
        examDate: '',
        room: '',
        isReadmitResult: filters.isReadmitResult
      });
      setExamDateOptions([]);
      setRoomOptions([]);
    } else if (name === 'examDate') {
      setFilters(prev => ({
        ...prev,
        examDate: value,
        room: ''
      }));
      setRoomOptions([]);
    } else if (type === 'checkbox') {
      setFilters(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  // Handle view button click
  const handleView = async () => {
    const data = getAppData();
    const course = data?.course || data?.Course || '';
    const regulation = data?.regulation || data?.Regulation || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !regulation || !examMY) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    if (!filters.semester || !filters.examDate) {
      alert('Please select Semester and Exam Date');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setNominalRollsData([]);

    try {
      console.log('NominalRolls: Fetching data with:', {
        course,
        examMY,
        regulation,
        sem: filters.semester,
        edate: filters.examDate,
        room: filters.room || '',
        isReadmit: filters.isReadmitResult
      });

      const response = await getNominalRollsData(
        course,
        examMY,
        regulation,
        filters.semester,
        filters.examDate,
        filters.room || '',
        filters.isReadmitResult
      );

      if (response && response.success && Array.isArray(response.data)) {
        setNominalRollsData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No nominal rolls data found for the selected criteria');
        }
      } else {
        setError(response?.message || 'No nominal rolls data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading nominal rolls data:', err);
      setError(err.message || 'Failed to load nominal rolls data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export/download
  const handleExport = async () => {
    if (!hasData || nominalRollsData.length === 0) {
      alert('No data to export. Please load data first.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      
      const normalize = k => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const getVal = (row, possibleKeys) => {
        const key = Object.keys(row).find(k => possibleKeys.includes(normalize(k)));
        return key ? row[key] : '';
      };

      const groupedByHallAndSubject = nominalRollsData.reduce((acc, row) => {
        const room = getVal(row, ['ROOM', 'ROOMNO']) || 'UNKNOWN';
        const pcode = getVal(row, ['PCODE', 'SUBCODE', 'COURSECODE']) || 'UNKNOWN';
        const key = `${room}_${pcode}`;
        if (!acc[key]) {
          acc[key] = {
            room,
            pcode,
            pname: getVal(row, ['PNAME', 'SUBNAME', 'COURSENAME']),
            branch: getVal(row, ['GRP', 'BRANCH', 'DEPT', 'SPECIALIZATION']),
            date: getVal(row, ['EDATE', 'DATE', 'EXAMDATE']),
            session: getVal(row, ['ESESS', 'SESSION', 'TIME', 'TYPE', 'EXAMTIME']),
            students: []
          };
        }
        acc[key].students.push(row);
        return acc;
      }, {});

      const pages = Object.values(groupedByHallAndSubject);

      const courseStr = appData?.course || 'B.Tech.';
      const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
      const formatSem = (sem) => {
        if (!sem) return '';
        const upperSem = String(sem).toUpperCase();
        return romanSemMap[upperSem] || upperSem;
      };
      const semStr = filters.semester ? `${formatSem(filters.semester)} Semester` : '';
      const semNumMap = { 'I': 1, 'II': 1, '1': 1, '2': 1, 'III': 2, 'IV': 2, '3': 2, '4': 2, 'V': 3, 'VI': 3, '5': 3, '6': 3, 'VII': 4, 'VIII': 4, '7': 4, '8': 4 };
      const romanYearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
      const yearNum = semNumMap[filters.semester?.toUpperCase()] || 1;
      const yearStr = romanYearMap[yearNum] || 'I';
      const reguStr = appData?.regulation ? `${appData.regulation}` : '';
      const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';

      const nameOfExam = `${yearStr} ${courseStr}. ${semStr} ${reguStr} ${filters.isReadmitResult ? 'Readmit' : 'Supplementary'}`;
      const getBarcodeBase64 = (text) => {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, text || '0000', {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          width: 1.5,
          height: 30
        });
        return canvas.toDataURL('image/png');
      };

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

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) doc.addPage();
        
        const page = pages[i];
        const branchMap = {
          'CSE': 'COMPUTER SCIENCE & ENGINEERING (CSE)',
          'ECE': 'ELECTRONICS & COMMUNICATION ENGINEERING (ECE)',
          'EEE': 'ELECTRICAL & ELECTRONICS ENGINEERING (EEE)',
          'MECH': 'MECHANICAL ENGINEERING (MECH)',
          'ME': 'MECHANICAL ENGINEERING (ME)',
          'CIVIL': 'CIVIL ENGINEERING (CIVIL)',
          'CE': 'CIVIL ENGINEERING (CE)',
          'IT': 'INFORMATION TECHNOLOGY (IT)',
          'AI&DS': 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE (AI&DS)',
          'AIDS': 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE (AI&DS)',
          'AIML': 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING (AIML)'
        };
        const fullBranch = branchMap[String(page.branch).toUpperCase()] || page.branch || filters.branch || 'CIVIL ENGINEERING';

        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const parts = String(dateStr).split(/[-/]/);
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${day}-${month}-${year}`;
          }
          return dateStr;
        };

        const sessionRaw = String(page.session).trim();
        let sessionCode = '';
        if (sessionRaw === '1' || sessionRaw.toUpperCase() === 'FN') sessionCode = 'FN';
        else if (sessionRaw === '2' || sessionRaw.toUpperCase() === 'AN') sessionCode = 'AN';
        else if (sessionRaw) sessionCode = sessionRaw;

        const sessionStr = sessionCode ? `(${sessionCode})` : '';
        const dateSessionStr = `${formatDate(page.date)} ${sessionStr}`.trim();

        let currentY = margin;

        if (logoData) {
          doc.addImage(logoData, 'PNG', margin, currentY, 30, 25);
        }

        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        doc.text('D. B. S. Institute', centerW, currentY + 10, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text('(PVT.LTD)', centerW, currentY + 16, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        const titleStr = `STATEMENT OF ATTENDANCE (HALL WISE) FOR EXAMINATIONS ${examMYStr}`;
        doc.text(titleStr, centerW, currentY + 24, { align: 'center' });
        const titleW = doc.getTextWidth(titleStr);
        doc.line(centerW - (titleW / 2), currentY + 25, centerW + (titleW / 2), currentY + 25);

        currentY += 35;

        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        
        const rightColX = pageWidth - margin - 60;
        const rightColonX = pageWidth - margin - 45;
        const rightValueX = pageWidth - margin - 40;

        doc.text('Name of Exam', margin, currentY);
        doc.text(':', margin + 35, currentY);
        doc.text(nameOfExam, margin + 40, currentY);

        doc.text('Date', rightColX, currentY);
        doc.text(':', rightColonX, currentY);
        doc.setFont('times', 'bold');
        doc.text(dateSessionStr, rightValueX, currentY);

        currentY += 6;
        doc.setFont('times', 'normal');
        doc.text('Branch', margin, currentY);
        doc.text(':', margin + 35, currentY);
        doc.text(fullBranch, margin + 40, currentY);

        doc.text('Room', rightColX, currentY);
        doc.text(':', rightColonX, currentY);
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text(String(page.room), rightValueX, currentY + 1);

        currentY += 6;
        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        doc.text('Course Code & Name', margin, currentY);
        doc.text(':', margin + 35, currentY);
        doc.setFont('times', 'bold');
        doc.text(`${page.pcode}-${page.pname}`, margin + 40, currentY);

        currentY += 5;

        const tableBody = page.students.map((student, sIdx) => {
          const regNo = getVal(student, ['REGNO', 'HTNO', 'ROLLNO']);
          const nameValue = getVal(student, ['SNAME', 'NAME', 'STUDENTNAME']);
          const barcodeBase64 = getBarcodeBase64(regNo);
          return [
            { content: `\n\n\n${regNo}`, index: sIdx + 1 },
            { content: `${nameValue}\n\n`, barcode: barcodeBase64 },
            '',
            '',
            ''
          ];
        });

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          rowPageBreak: 'avoid',
          head: [['Hall Ticket No.', 'Student Name', 'Sl.No. of Booklet', 'Student Signature', 'Photo']],
          body: tableBody,
          theme: 'grid',
          styles: {
            font: 'times',
            lineColor: 0,
            lineWidth: 0.2,
            textColor: 0,
            valign: 'top'
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: 0,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 10,
            minCellHeight: 25
          },
          columnStyles: {
            0: { cellWidth: 35, halign: 'center' },
            1: { cellWidth: 55, halign: 'left' },
            2: { cellWidth: 40 },
            3: { cellWidth: 40 },
            4: { cellWidth: 20 }
          },
          didDrawCell: function (data) {
            if (data.section === 'body') {
              const rectX = data.cell.x;
              const rectY = data.cell.y;
              const cellW = data.cell.width;
              const cellH = data.cell.height;

              if (data.column.index === 0) {
                doc.setDrawColor(0);
                doc.setFillColor(230, 230, 230);
                doc.rect(rectX, rectY, 8, 5, 'FD');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(String(data.cell.raw.index), rectX + 4, rectY + 3.5, { align: 'center' });
              }

              if (data.column.index === 1) {
                const barcodeStr = data.cell.raw.barcode;
                if (barcodeStr) {
                  const bcWidth = 40;
                  const bcHeight = 10;
                  doc.addImage(barcodeStr, 'PNG', rectX + (cellW - bcWidth) / 2, rectY + 8, bcWidth, bcHeight);
                }
              }

              if (data.column.index === 2 || data.column.index === 3) {
                const boxW = cellW * 0.8;
                const boxH = 8;
                doc.setDrawColor(0);
                doc.rect(rectX + (cellW - boxW) / 2, rectY + (cellH - boxH) / 2, boxW, boxH);
              }
              if (data.column.index === 4) {
                const boxW = 15;
                const boxH = 20;
                doc.setDrawColor(0);
                doc.rect(rectX + (cellW - boxW) / 2, rectY + (cellH - boxH) / 2, boxW, boxH);
              }
            }
          }
        });

        currentY = doc.lastAutoTable.finalY + 10;

        // Ensure enough space for the summary box and signature before page end
        const pageHeight = doc.internal.pageSize.getHeight();
        if (currentY + 45 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
        }

        // Draw Summary Box aligned with the full table
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        const boxH = 10;
        const boxX = margin;
        const boxW = pageWidth - (margin * 2);
        
        doc.rect(boxX, currentY, boxW, boxH);
        
        const thirdW = boxW / 3;
        doc.line(boxX + thirdW, currentY, boxX + thirdW, currentY + boxH);
        doc.line(boxX + (thirdW * 2), currentY, boxX + (thirdW * 2), currentY + boxH);

        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        
        doc.text('Allotted :', boxX + 5, currentY + 6.5);
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text(String(page.students.length), boxX + 25, currentY + 7);
        
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.text('Absent :', boxX + thirdW + 5, currentY + 6.5);
        
        doc.text('Present :', boxX + (thirdW * 2) + 5, currentY + 6.5);

        // Signature text
        currentY += 18;
        doc.setFont('times', 'bolditalic');
        doc.setFontSize(11);
        doc.text('Signature of the invigilator(s) :', boxX, currentY);
      }

      doc.save(`NominalRolls_${examMYStr}.pdf`);
    } catch (err) {
      console.error('Error exporting nominal rolls pdf:', err);
      alert(err.message || 'Failed to export nominal rolls pdf');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.semesters || isLoading || !semesterOptions.length}
            >
              <option value="">
                {dropdownLoading.semesters ? 'Loading semesters...' : 'Select Semester'}
              </option>
              {semesterOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Exam Date</label>
            <select
              name="examDate"
              value={filters.examDate}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.examDates || isLoading || !examDateOptions.length || !filters.semester}
            >
              <option value="">
                {dropdownLoading.examDates ? 'Loading exam dates...' : 'Select Exam Date'}
              </option>
              {examDateOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Room</label>
            <select
              name="room"
              value={filters.room}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.rooms || isLoading || !roomOptions.length || !filters.examDate}
            >
              <option value="">
                {dropdownLoading.rooms ? 'Loading rooms...' : 'Select Room (Optional)'}
              </option>
              {roomOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              name="isReadmitResult"
              checked={filters.isReadmitResult}
              onChange={handleFilterChange}
              className={styles.checkbox}
              disabled={isLoading}
            />
            <label className={styles.checkboxLabel}>Is Readmit Result</label>
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.viewBtn}
              onClick={handleView}
              disabled={isLoading}
            >
              {isLoading ? 'Loading…' : 'View'}
            </button>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={handleExport}
              disabled={isLoading || !hasData}
            >
              Download
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.reportArea}>
        {!hasData && !isLoading && !error && (
          <div className={styles.placeholder}>
            Select the required filters (Semester, Exam Date) and click View to load the nominal rolls data.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading nominal rolls data…</div>}
        {hasData && !isLoading && nominalRollsData.length > 0 && (
          <div className={styles.reportAreaWrapper} id="pdf-content">
            {(() => {
              const normalize = k => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
              const getVal = (row, possibleKeys) => {
                const key = Object.keys(row).find(k => possibleKeys.includes(normalize(k)));
                return key ? row[key] : '';
              };

              const groupedByHallAndSubject = nominalRollsData.reduce((acc, row) => {
                const room = getVal(row, ['ROOM', 'ROOMNO']) || 'UNKNOWN';
                const pcode = getVal(row, ['PCODE', 'SUBCODE', 'COURSECODE']) || 'UNKNOWN';
                const key = `${room}_${pcode}`;
                if (!acc[key]) {
                  acc[key] = {
                    room,
                    pcode,
                    pname: getVal(row, ['PNAME', 'SUBNAME', 'COURSENAME']),
                    branch: getVal(row, ['GRP', 'BRANCH', 'DEPT', 'SPECIALIZATION']),
                    date: getVal(row, ['EDATE', 'DATE', 'EXAMDATE']),
                    session: getVal(row, ['ESESS', 'SESSION', 'TIME', 'TYPE', 'EXAMTIME']),
                    students: []
                  };
                }
                acc[key].students.push(row);
                return acc;
              }, {});

              const pages = Object.values(groupedByHallAndSubject);

              const courseStr = appData?.course || 'B.Tech.';
              const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
              const formatSem = (sem) => {
                if (!sem) return '';
                const upperSem = String(sem).toUpperCase();
                return romanSemMap[upperSem] || upperSem;
              };
              const semStr = filters.semester ? `${formatSem(filters.semester)} Semester` : '';
              const semNumMap = { 'I': 1, 'II': 1, '1': 1, '2': 1, 'III': 2, 'IV': 2, '3': 2, '4': 2, 'V': 3, 'VI': 3, '5': 3, '6': 3, 'VII': 4, 'VIII': 4, '7': 4, '8': 4 };
              const romanYearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
              const yearNum = semNumMap[filters.semester?.toUpperCase()] || 1;
              const yearStr = romanYearMap[yearNum] || 'I';
              const reguStr = appData?.regulation ? `${appData.regulation}` : '';
              const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';

              const nameOfExam = `${yearStr} ${courseStr}. ${semStr} ${reguStr} ${filters.isReadmitResult ? 'Readmit' : 'Supplementary'}`;

              return pages.map((page, pageIdx) => {
                const branchMap = {
                  'CSE': 'COMPUTER SCIENCE & ENGINEERING (CSE)',
                  'ECE': 'ELECTRONICS & COMMUNICATION ENGINEERING (ECE)',
                  'EEE': 'ELECTRICAL & ELECTRONICS ENGINEERING (EEE)',
                  'MECH': 'MECHANICAL ENGINEERING (MECH)',
                  'ME': 'MECHANICAL ENGINEERING (ME)',
                  'CIVIL': 'CIVIL ENGINEERING (CIVIL)',
                  'CE': 'CIVIL ENGINEERING (CE)',
                  'IT': 'INFORMATION TECHNOLOGY (IT)',
                  'AI&DS': 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE (AI&DS)',
                  'AIDS': 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE (AI&DS)',
                  'AIML': 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING (AIML)'
                };
                const fullBranch = branchMap[String(page.branch).toUpperCase()] || page.branch || filters.branch || 'CIVIL ENGINEERING';

                const formatDate = (dateStr) => {
                  if (!dateStr) return '';
                  const parts = String(dateStr).split(/[-/]/);
                  if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                    return `${day}-${month}-${year}`;
                  }
                  return dateStr;
                };

                const sessionRaw = String(page.session).trim();
                let sessionCode = '';
                if (sessionRaw === '1' || sessionRaw.toUpperCase() === 'FN') sessionCode = 'FN';
                else if (sessionRaw === '2' || sessionRaw.toUpperCase() === 'AN') sessionCode = 'AN';
                else if (sessionRaw) sessionCode = sessionRaw;

                const sessionStr = sessionCode ? `(${sessionCode})` : '';
                const dateSessionStr = `${formatDate(page.date)} ${sessionStr}`.trim();

                return (
                  <div key={pageIdx} className={`${styles.pageContainer} ${pageIdx > 0 ? 'html2pdf__page-break' : ''}`}>
                    <div className={styles.header}>
                      <div className={styles.logoContainer}>
                        <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Logo" className={styles.logo} />
                      </div>
                      <div className={styles.headerText}>
                        <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                        <p className={styles.ugcText}>(PVT.LTD)</p>
                        <h3 className={styles.reportTitle}><u>STATEMENT OF ATTENDANCE (HALL WISE) FOR EXAMINATIONS {examMYStr}</u></h3>
                      </div>
                    </div>

                    <div className={styles.infoGrid}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Name of Exam</span>
                        <span className={styles.infoColon}>:</span>
                        <span className={styles.infoValue}>{nameOfExam}</span>
                        <span className={styles.infoLabelRight}>Date</span>
                        <span className={styles.infoColonRight}>:</span>
                        <span className={styles.infoValueRightBold}>{dateSessionStr}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Branch</span>
                        <span className={styles.infoColon}>:</span>
                        <span className={styles.infoValue}>{fullBranch}</span>
                        <span className={styles.infoLabelRight}>Room</span>
                        <span className={styles.infoColonRight}>:</span>
                        <span className={styles.infoValueRightBoldLarge}>{page.room}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Course Code & Name</span>
                        <span className={styles.infoColon}>:</span>
                        <span className={styles.infoValueBold}>{page.pcode}-{page.pname}</span>
                      </div>
                    </div>

                    <table className={styles.attendanceTable}>
                      <thead>
                        <tr>
                          <th>Hall Ticket No.</th>
                          <th>Student Name</th>
                          <th>Sl.No. of Booklet</th>
                          <th>Student Signature</th>
                          <th>Photo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.students.map((student, sIdx) => {
                          const regNo = getVal(student, ['REGNO', 'HTNO', 'ROLLNO']);
                          const nameValue = getVal(student, ['SNAME', 'NAME', 'STUDENTNAME']);
                          return (
                            <tr key={sIdx}>
                              <td className={styles.colHtNo}>
                                <div className={styles.snoBox}>{sIdx + 1}</div>
                                <div className={styles.regNoText}>{regNo}</div>
                              </td>
                              <td className={styles.colNameBarcode}>
                                <div className={styles.studentName}>{nameValue}</div>
                                <div className={styles.barcodeContainer}>
                                  <Barcode value={regNo || '0000'} width={1.2} height={20} displayValue={false} margin={0} background="transparent" />
                                </div>
                              </td>
                              <td className={styles.colBooklet}>
                                <div className={styles.emptyBoxLarge}></div>
                              </td>
                              <td className={styles.colSignature}>
                                <div className={styles.emptyBoxLarge}></div>
                              </td>
                              <td className={styles.colPhoto}>
                                <div className={styles.photoBox}></div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className={styles.summaryFooter}>
                      <div className={styles.summaryBox}>
                        <div className={styles.summaryItem}>Allotted : <span className={styles.allottedCount}>{page.students.length}</span></div>
                        <div className={styles.summaryItem}>Absent : </div>
                        <div className={styles.summaryItem}>Present : </div>
                      </div>
                      <div className={styles.signatureText}>
                        Signature of the invigilator(s) :
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default NominalRolls;
