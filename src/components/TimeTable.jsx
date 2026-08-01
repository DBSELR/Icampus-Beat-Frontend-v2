import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './TimeTable.module.css';
import { getAppData, getTimeTableSemesters, getTimeTableData } from '../utils/api';

const TimeTable = () => {
  const [semester, setSemester] = useState('');
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);

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
      setIsLoading(true);
      setError('');
      const response = await getTimeTableSemesters(course, examMY);
      
      if (response && response.success && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          // Handle both SEM and sem1 fields
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
      setIsLoading(false);
    }
  }, []);

  // Handle view button click
  const handleView = async () => {
    if (!semester || semester === '') {
      alert('Please select a Semester');
      return;
    }

    const data = getAppData();
    const course = data?.course || data?.Course || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !examMY) {
      alert('Please select Course and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setTableData([]);

    try {
      const response = await getTimeTableData(course, examMY, semester);

      if (response && response.success && Array.isArray(response.data)) {
        // Group papers by date for display
        const groupedData = groupPapersByDate(response.data);
        setTableData(groupedData);
        setHasData(groupedData.length > 0);
        if (groupedData.length === 0) {
          setError('No timetable data found for the selected semester');
        }
      } else {
        setError(response?.message || 'No timetable data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error fetching timetable data:', err);
      setError(err.message || 'Failed to fetch timetable data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Group papers by date for display
  const groupPapersByDate = (papers) => {
    // Group by EDATE
    const grouped = {};
    papers.forEach(paper => {
      const date = paper.EDATE || paper.edate || paper.EDate || '';
      const pcode = paper.PCODE || paper.pcode || paper.PCode || '';
      const pname = paper.PNAME || paper.pname || paper.PName || '';
      
      if (!date) return;
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({ pcode, pname });
    });

    // Convert to array of date groups
    const result = [];
    Object.keys(grouped).sort().forEach(date => {
      result.push({
        date: date,
        papers: grouped[date]
      });
    });

    return result;
  };

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const handleDownload = async () => {
    if (tableData.length === 0) {
      alert('No data to download. Please load the report first.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      try {
        const img = await loadImage('/assets/Screenshot%202026-06-18%20143601.png');
        doc.addImage(img, 'PNG', 14, 10, 40, 15);
      } catch (e) {
        console.warn('Could not load logo for PDF', e);
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.text('D. B. S. Institute', pageWidth / 2, 16, { align: 'center' });
      
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text('(PVT.LTD)', pageWidth / 2, 21, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 255); // Blue
      const title = `${semester} Semester Time Table for ${appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY} Exams`;
      doc.text(title, pageWidth / 2, 29, { align: 'center' });

      const tableBody = [];
      tableData.forEach(dateGroup => {
        tableBody.push([
          { content: dateGroup.date, colSpan: 4, styles: { fontStyle: 'bold', textColor: [0, 0, 255], fontSize: 11, halign: 'center' } }
        ]);
        
        const papers = dateGroup.papers;
        for (let i = 0; i < papers.length; i += 2) {
          const paper1 = papers[i];
          const paper2 = papers[i + 1] || { pcode: '', pname: '' };
          tableBody.push([
            paper1.pcode,
            paper1.pname,
            paper2.pcode,
            paper2.pname
          ]);
        }
      });

      autoTable(doc, {
        startY: 35,
        head: [['Paper Code', 'Paper Name', 'Paper Code', 'Paper Name']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], textColor: [128, 0, 128], fontStyle: 'bold', lineColor: [0, 128, 0], lineWidth: 0.1, halign: 'left'
        },
        bodyStyles: { 
          lineColor: [0, 128, 0], lineWidth: 0.1, textColor: 0 
        },
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 2 }
      });

      doc.save(`TimeTable_${semester}_${appData?.examMY || ''}.pdf`);
    } catch (err) {
      console.error('Error generating native PDF:', err);
      alert(`Failed to download: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <label className={styles.label}>Semester</label>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className={styles.dropdown}
          disabled={isLoading}
        >
          <option value="">Select Semester</option>
          {semesterOptions.map((sem, index) => (
            <option key={index} value={sem}>
              {sem}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.viewBtn}
          onClick={handleView}
          disabled={isLoading || !semester}
        >
          {isLoading ? 'Loading...' : 'View'}
        </button>
        <button
          type="button"
          className={styles.downloadPdfBtn}
          onClick={handleDownload}
          disabled={isLoading || !hasData || tableData.length === 0}
        >
          Download PDF
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {hasData && tableData.length > 0 && (
        <div className={styles.reportArea}>
          <div className={styles.reportWrapper} id="pdf-content">
            <div className={styles.titleSection}>
            <div className={styles.logoContainer}>
              <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Institute Logo" className={styles.logo} />
            </div>
            <div className={styles.titleTextContainer}>
              <h2 className={styles.instituteTitle}>D. B. S. Institute</h2>
              <p className={styles.instituteSubtitle}>(PVT.LTD)</p>
              <h3 className={styles.reportTitle}>{semester} Semester Time Table for {appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY} Exams</h3>
            </div>
          </div>

          <table className={styles.timetableTable}>
            <thead>
              <tr>
                <th>Paper Code</th>
                <th>Paper Name</th>
                <th>Paper Code</th>
                <th>Paper Name</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((dateGroup, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  <tr>
                    <td className={styles.dateCell}>{dateGroup.date}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  {(() => {
                    const rows = [];
                    const papers = dateGroup.papers;
                    for (let i = 0; i < papers.length; i += 2) {
                      const paper1 = papers[i];
                      const paper2 = papers[i + 1] || { pcode: '', pname: '' };
                      rows.push(
                        <tr key={i}>
                          <td>{paper1.pcode}</td>
                          <td>{paper1.pname}</td>
                          <td>{paper2.pcode}</td>
                          <td>{paper2.pname}</td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
};

export default TimeTable;

