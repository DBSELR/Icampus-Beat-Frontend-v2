import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './QuestionPaperStatement.module.css';
import { getAppData, getQPStatementSemesters, getQPStatementData } from '../utils/api';

const QuestionPaperStatement = () => {
  const [semester, setSemester] = useState('');
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      const course = data.course || data.Course || '';
      const regulation = data.regulation || data.Regulation || '';
      const examMY = data.examMY || data.examMy || data.ExamMy || data.ExamMY || '';
      
      if (course && regulation && examMY) {
        fetchSemesters(course, regulation, examMY);
      }
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course, regulation, examMY) => {
    try {
      setIsLoadingSemesters(true);
      setError('');
      const response = await getQPStatementSemesters(course, regulation, examMY);
      
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
      setIsLoadingSemesters(false);
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
    const regulation = data?.regulation || data?.Regulation || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !regulation || !examMY) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setTableData([]);

    try {
      console.log('QPStatement: Fetching data with:', { course, examMY, regulation, sem: semester });
      const response = await getQPStatementData(course, examMY, regulation, semester);

      if (response && response.success && Array.isArray(response.data)) {
        setTableData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No question paper statement data found for the selected semester');
        }
      } else {
        setError(response?.message || 'No question paper statement data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error fetching question paper statement:', err);
      setError(err.message || 'Failed to fetch question paper statement. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  // Handle download
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

      const formatSem = (sem) => {
        if (!sem) return '';
        const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
        const upperSem = String(sem).toUpperCase();
        return romanSemMap[upperSem] || upperSem;
      };
      const semStr = semester ? `${formatSem(semester)} SEMESTER` : '';
      const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';

      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(`NUMBER OF CANDIDATES REGISTERED IN ${examMYStr} END OF ${semStr}`, pageWidth / 2, 29, { align: 'center' });

      const groupedData = Object.values(tableData.reduce((acc, row) => {
        const pcode = row.PCODE || row.pcode || '-';
        if (!acc[pcode]) {
          acc[pcode] = {
            pcode,
            pname: row.PNAME || row.pname || '-',
            total: row.TOTAL !== null && row.TOTAL !== undefined ? row.TOTAL : '-',
            reguDetails: []
          };
        }
        acc[pcode].reguDetails.push({
          regu: row.REGU || row.regu || '-',
          appear: row.APPEAR !== null && row.APPEAR !== undefined ? row.APPEAR : '-'
        });
        return acc;
      }, {}));

      const tableBody = [];
      groupedData.forEach((item) => {
        item.reguDetails.forEach((regu, rIdx) => {
          if (rIdx === 0) {
            tableBody.push([
              item.pcode,
              item.pname,
              regu.regu,
              regu.appear,
              { content: item.total, styles: { fontStyle: 'bold' } }
            ]);
          } else {
            tableBody.push(['', '', regu.regu, regu.appear, '']);
          }
        });
      });

      autoTable(doc, {
        startY: 35,
        head: [['Subject Code', 'Subject Name', 'Regu', 'Appearing', 'Total\nAppearing']],
        body: tableBody,
        theme: 'plain',
        headStyles: { 
          font: 'times', fontStyle: 'bold', fontSize: 11, textColor: 0, halign: 'center', valign: 'bottom' 
        },
        bodyStyles: { 
          font: 'times', fontSize: 10, textColor: 0, cellPadding: 2 
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 30 },
          1: { halign: 'left', cellWidth: 80 },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.section === 'head') {
            data.cell.styles.lineWidth = { bottom: 0.5 };
            data.cell.styles.lineColor = 150; // Approximates dotted
          }
          if (data.section === 'body' && data.row.raw[0] !== '') {
            data.cell.styles.cellPadding = { top: 6, bottom: 1, left: 2, right: 2 };
          }
        }
      });

      doc.save(`QuestionPaperStatement_Sem${semester}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating native PDF:', err);
      alert(`Failed to download: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className={styles.select}
              disabled={isLoadingSemesters || isLoading || !semesterOptions.length}
            >
              <option value="">
                {isLoadingSemesters ? 'Loading semesters...' : 'Select Semester'}
              </option>
              {semesterOptions.map((sem, index) => (
                <option key={index} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.viewBtn}
              onClick={handleView}
              disabled={isLoading || !semester}
            >
              {isLoading ? 'Loading…' : 'View'}
            </button>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={isLoading || !hasData || tableData.length === 0}
            >
              Download PDF
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
            Select a semester and click View to load the report.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Generating report…</div>}
        {hasData && !isLoading && tableData.length > 0 && (() => {
          
          const formatSem = (sem) => {
            if (!sem) return '';
            const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
            const upperSem = String(sem).toUpperCase();
            return romanSemMap[upperSem] || upperSem;
          };
        
          const semStr = semester ? `${formatSem(semester)} SEMESTER` : '';
          const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';

          const groupedData = Object.values(tableData.reduce((acc, row) => {
            const pcode = row.PCODE || row.pcode || '-';
            if (!acc[pcode]) {
              acc[pcode] = {
                pcode,
                pname: row.PNAME || row.pname || '-',
                total: row.TOTAL !== null && row.TOTAL !== undefined ? row.TOTAL : '-',
                reguDetails: []
              };
            }
            acc[pcode].reguDetails.push({
              regu: row.REGU || row.regu || '-',
              appear: row.APPEAR !== null && row.APPEAR !== undefined ? row.APPEAR : '-'
            });
            return acc;
          }, {}));

          return (
            <div className={styles.reportWrapper} id="pdf-content">
              <div className={styles.reportHeader}>
                <div className={styles.logoContainer}>
                  <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Institute Logo" className={styles.logo} />
                </div>
                <div className={styles.headerTextContainer}>
                  <h1 className={styles.instituteName}>D. B. S. Institute</h1>
                  <h2 className={styles.subInstituteName}>(PVT.LTD)</h2>
                  <h3 className={styles.reportTitle}>NUMBER OF CANDIDATES REGISTERED IN {examMYStr} END OF {semStr}</h3>
                </div>
              </div>

              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Regu</th>
                    <th>Appearing</th>
                    <th>Total<br/>Appearing</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {item.reguDetails.map((regu, rIdx) => (
                        <tr key={`regu-${idx}-${rIdx}`} className={rIdx === 0 ? styles.subjectRow : styles.reguRow}>
                          <td>{rIdx === 0 ? item.pcode : ''}</td>
                          <td className={rIdx === 0 ? styles.pnameCell : ''}>{rIdx === 0 ? item.pname : ''}</td>
                          <td>{regu.regu}</td>
                          <td>{regu.appear}</td>
                          <td className={rIdx === 0 ? styles.totalText : ''}>{rIdx === 0 ? item.total : ''}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default QuestionPaperStatement;

