import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './SeatingArrangement.module.css';
import {
  getAppData,
  getSeatingArrangementSemesters,
  getSeatingArrangementSessions,
  getSeatingArrangementExamDates,
  getSeatingArrangementRooms,
  getSeatingArrangementData
} from '../utils/api';

const SeatingArrangement = () => {
  const [filters, setFilters] = useState({
    examType: '',
    semester: '',
    session: '',
    edate: '',
    room: ''
  });

  const [seatingData, setSeatingData] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [edateOptions, setEdateOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState({
    semesters: false,
    sessions: false,
    edates: false,
    rooms: false
  });

  // ExamType options
  const examTypeOptions = [
    { value: '', label: 'Select ExamType' },
    { value: 'External', label: 'External' },
    { value: 'MID-I', label: 'MID-I' },
    { value: 'MID-II', label: 'MID-II' }
  ];

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      if (data.course) {
        fetchSemesters(data.course);
      }
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course) => {
    try {
      setDropdownLoading(prev => ({ ...prev, semesters: true }));
      const response = await getSeatingArrangementSemesters(course);
      if (response && response.success && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          const sem = item.sem || item.Sem || item.SEM || item;
          return sem ? String(sem) : '';
        }).filter(Boolean);
        setSemesterOptions(sems);
      } else {
        setSemesterOptions([]);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setSemesterOptions([]);
    } finally {
      setDropdownLoading(prev => ({ ...prev, semesters: false }));
    }
  }, []);

  // Fetch sessions when examType and semester change
  useEffect(() => {
    const fetchSessions = async () => {
      if (!filters.examType || !filters.semester || !appData?.course) {
        setSessionOptions([]);
        setFilters(prev => ({ ...prev, session: '', edate: '', room: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, sessions: true }));
        const response = await getSeatingArrangementSessions(
          appData.course,
          filters.semester,
          filters.examType
        );
        if (response && response.success && Array.isArray(response.data)) {
          // API returns ESESS which can be null or "1" (string)
          const sessions = response.data
            .map(item => {
              const session = item.ESESS || item.esess || item.Session || item.session || item;
              return session !== null && session !== undefined ? String(session) : '';
            })
            .filter(s => s !== ''); // Filter out empty strings
          setSessionOptions(sessions);
        } else {
          setSessionOptions([]);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessionOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, sessions: false }));
      }
    };

    fetchSessions();
  }, [filters.examType, filters.semester, appData]);

  // Fetch exam dates when session changes
  useEffect(() => {
    const fetchExamDates = async () => {
      if (!filters.session || !filters.semester || !filters.examType || 
          !appData?.course || !appData?.examMY) {
        setEdateOptions([]);
        setFilters(prev => ({ ...prev, edate: '', room: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, edates: true }));
        const response = await getSeatingArrangementExamDates(
          appData.course,
          filters.semester,
          filters.session,
          appData.examMY,
          filters.examType
        );
        if (response && response.success && Array.isArray(response.data)) {
          // API returns EDATE in DD-MM-YYYY format
          const dates = response.data.map(item => {
            const date = item.EDATE || item.edate || item.ExamDate || item.examDate || item;
            return date ? String(date) : '';
          }).filter(Boolean);
          setEdateOptions(dates);
        } else {
          setEdateOptions([]);
        }
      } catch (error) {
        console.error('Error fetching exam dates:', error);
        setEdateOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, edates: false }));
      }
    };

    fetchExamDates();
  }, [filters.session, filters.semester, filters.examType, appData]);

  // Fetch rooms when session changes
  useEffect(() => {
    const fetchRooms = async () => {
      if (!filters.session || !appData?.course) {
        setRoomOptions([]);
        setFilters(prev => ({ ...prev, room: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, rooms: true }));
        const response = await getSeatingArrangementRooms(appData.course, filters.session);
        if (response && response.success && Array.isArray(response.data)) {
          const rooms = response.data.map(item => {
            const room = item.ROOM || item.room || item.RoomNo || item.roomNo || item;
            return room ? String(room) : '';
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

    fetchRooms();
  }, [filters.session, appData]);

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset dependent dropdowns
      if (name === 'examType' || name === 'semester') {
        newFilters.session = '';
        newFilters.edate = '';
        newFilters.room = '';
      }
      if (name === 'session') {
        newFilters.edate = '';
        newFilters.room = '';
      }
      if (name === 'edate') {
        // Don't reset room when edate changes
      }
      
      return newFilters;
    });
    setError('');
  };

  // Date is already in DD-MM-YYYY format from dropdown, pass as-is to API
  // No conversion needed - API expects DD-MM-YYYY format

  // Handle View button
  const handleView = async () => {
    if (!filters.examType || !filters.semester || !filters.session || !filters.edate) {
      alert('Please select ExamType, Semester, Session, and Exam Date');
      return;
    }

    if (!appData?.course || !appData?.examMY) {
      alert('Please select Course and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setSeatingData([]);

    try {
      // Date is already in DD-MM-YYYY format from dropdown, pass as-is to API
      // API expects DD-MM-YYYY format (e.g., 30-12-2024)
      const edateFormatted = filters.edate || '';
      
      // Session needs to be integer for API
      const sessionInt = parseInt(filters.session, 10) || 0;
      if (sessionInt <= 0) {
        throw new Error('Invalid session value');
      }

      console.log('SeatingArrangement: Calling API with:', {
        course: appData.course,
        examMY: appData.examMY,
        sem: filters.semester,
        session: sessionInt,
        edate: edateFormatted, // DD-MM-YYYY format (e.g., 30-12-2024)
        room: filters.room || null,
        examType: filters.examType
      });

      const response = await getSeatingArrangementData(
        appData.course,
        appData.examMY,
        filters.semester,
        sessionInt,
        edateFormatted, // DD-MM-YYYY format
        filters.room || null,
        filters.examType
      );

      if (response && response.success && Array.isArray(response.data)) {
        setSeatingData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No seating arrangement data found for the selected criteria');
        }
      } else {
        setError(response?.message || 'No seating arrangement data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading seating arrangement data:', err);
      setError(err.message || 'Failed to load seating arrangement data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const normalize = k => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const getVal = (row, possibleKeys) => {
    const key = Object.keys(row).find(k => possibleKeys.includes(normalize(k)));
    return key ? row[key] : '';
  };

  const processSeatingData = () => {
    if (!seatingData || seatingData.length === 0) return {};
    
    const grouped = seatingData.reduce((acc, student) => {
      const room = getVal(student, ['ROOM', 'ROOMNO', 'HALLNO']) || 'UNKNOWN';
      if (!acc[room]) {
        acc[room] = {
          room,
          ident: getVal(student, ['IDENT', 'IDENTIFIER', 'ID']) || '',
          subjects: new Set(),
          maxRow: 0,
          maxCol: 0,
          grid: {}, // col -> row -> student
          count: 0
        };
      }
      
      const subject = getVal(student, ['SUBJECTS', 'SUBJECTNAME', 'SUBNAME', 'PNAME', 'SUBJECT', 'PAPERNAME', 'TITLE', 'SUBJ']);
      if (subject) acc[room].subjects.add(subject);
      
      let col = 1;
      let row = 1;
      let hasPosition = false;
      
      const colRowStr = getVal(student, ['COLROW', 'COLUMNROW', 'C_R']);
      
      if (colRowStr && typeof colRowStr === 'string' && colRowStr.includes(',')) {
        const parts = colRowStr.split(',');
        col = parseInt(parts[0], 10) || 1;
        row = parseInt(parts[1], 10) || 1;
        hasPosition = true;
      } else {
        const colRaw = getVal(student, ['COL', 'COLUMN', 'C', 'COLNO', 'COLUMNNO', 'CNO']);
        const rowRaw = getVal(student, ['ROW', 'R', 'ROWNO', 'RNO']);
        
        if (colRaw || rowRaw) {
          const colMatch = String(colRaw).match(/\d+/);
          col = colMatch ? parseInt(colMatch[0], 10) : 1;

          const rowMatch = String(rowRaw).match(/\d+/);
          row = rowMatch ? parseInt(rowMatch[0], 10) : 1;
          hasPosition = true;
        }
      }
      
      if (hasPosition) {
        if (!acc[room].grid[col]) acc[room].grid[col] = {};
        
        const regNo = getVal(student, ['REGNO', 'HTNO', 'ROLLNO']);
        
        // Prevent overwrite if same col/row
        if (acc[room].grid[col][row]) {
          let nextR = row + 1;
          while(acc[room].grid[col][nextR]) nextR++;
          acc[room].grid[col][nextR] = regNo;
        } else {
          acc[room].grid[col][row] = regNo;
        }
      } else {
        // Auto-generate grid (2 columns) if no col/row provided
        const regNo = getVal(student, ['REGNO', 'HTNO', 'ROLLNO']);
        let found = false;
        for (let r = 1; !found; r++) {
           for (let c = 1; c <= 2; c++) {
               if (!acc[room].grid[c]) acc[room].grid[c] = {};
               if (!acc[room].grid[c][r]) {
                   acc[room].grid[c][r] = regNo;
                   found = true;
                   break;
               }
           }
        }
      }
      
      acc[room].count += 1;
      
      return acc;
    }, {});
    
    Object.keys(grouped).forEach(roomKey => {
      const room = grouped[roomKey];
      room.subjectList = Array.from(room.subjects).map(s => {
        if (typeof s === 'string' && s.startsWith('[') && s.endsWith(']')) return s;
        return `[${s}]`;
      }).join(',');
      
      const rowsArray = [];
      const colKeys = Object.keys(room.grid).map(Number).sort((a, b) => a - b);
      
      const allRowsSet = new Set();
      colKeys.forEach(c => {
        Object.keys(room.grid[c]).forEach(r => allRowsSet.add(Number(r)));
      });
      const sortedRows = Array.from(allRowsSet).sort((a, b) => a - b);
      
      sortedRows.forEach(r => {
        const rowData = { rowNum: r, cols: [] };
        colKeys.forEach(c => {
          rowData.cols.push(room.grid[c][r] || '');
        });
        rowsArray.push(rowData);
      });
      
      room.cols = colKeys;
      room.rowsData = rowsArray; 
    });
    
    return grouped;
  };

  const getHeaderData = () => {
    const courseStr = appData?.course || 'B.TECH';
    const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
    const formatSem = (sem) => {
      if (!sem) return '';
      const upperSem = String(sem).toUpperCase();
      return romanSemMap[upperSem] || upperSem;
    };
    const semStr = filters.semester ? `${formatSem(filters.semester)} Sem` : '';
    const reguStr = appData?.regulation ? `(${appData.regulation})` : '';
    const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';
    const examTypeStr = filters.examType || '';
    
    const examinationStr = `${examTypeStr} | ${courseStr} | ${semStr} ${reguStr}`; 
    
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
    
    const sessionRaw = String(filters.session).trim();
    let timeStr = '';
    let daySession = '';
    if (sessionRaw === '1' || sessionRaw.toUpperCase() === 'FN') {
      timeStr = '10:00 AM TO 01:00 PM';
      daySession = '(FN)';
    } else if (sessionRaw === '2' || sessionRaw.toUpperCase() === 'AN') {
      timeStr = '02:00 PM TO 05:00 PM';
      daySession = '(AN)';
    } else {
      timeStr = sessionRaw;
    }
    
    return {
      date: `${formatDate(filters.edate)} - ${examMYStr}`,
      examination: examinationStr,
      timings: `${timeStr} ${daySession}`,
      examMY: examMYStr
    };
  };

  const handleDownload = async () => {
    if (!filters.examType || !filters.semester || !filters.session || !filters.edate) {
      alert('Please select ExamType, Semester, Session, and Exam Date');
      return;
    }

    if (!appData?.course || !appData?.examMY) {
      alert('Please select Course and Exam M/Y from the header dropdowns');
      return;
    }

    if (seatingData.length === 0) {
      alert('No data to download. Please click View first.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      const groupedData = processSeatingData();
      const rooms = Object.keys(groupedData).sort();
      const headerData = getHeaderData();
      
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

      for (let i = 0; i < rooms.length; i++) {
        if (i > 0) doc.addPage();
        
        const roomKey = rooms[i];
        const room = groupedData[roomKey];
        
        let currentY = margin;

        if (logoData) {
          doc.addImage(logoData, 'PNG', margin, currentY, 30, 25);
        }

        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0); // Black
        doc.setFontSize(22);
        doc.text('D. B. S. Institute', centerW, currentY + 10, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0); // Black
        doc.text('(PVT.LTD)', centerW, currentY + 16, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('times', 'bolditalic');
        doc.setTextColor(0, 0, 0);
        doc.text('SEATING ARRANGEMENT', centerW, currentY + 28, { align: 'center' });
        const titleW = doc.getTextWidth('SEATING ARRANGEMENT');
        doc.setLineWidth(0.5);
        doc.line(centerW - (titleW / 2), currentY + 29, centerW + (titleW / 2), currentY + 29);
        
        currentY += 40;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        
        const rightColX = pageWidth - margin - 55;
        const rightColonX = pageWidth - margin - 20;
        const rightValueX = pageWidth - margin - 15;
        
        const leftColX = margin;
        const leftColonX = margin + 40;
        const leftValueX = margin + 45;

        // Row 1: Date of Examination | College Code
        doc.text('Date of Examination', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.text(headerData.date, leftValueX, currentY);

        doc.text('College Code', rightColX, currentY);
        doc.text(':', rightColonX, currentY);
        doc.text('76', rightValueX, currentY);

        currentY += 8;

        // Row 2: Examination | Exam Hall No
        doc.text('Examination', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.text(headerData.examination, leftValueX, currentY);

        doc.text('Exam Hall No', rightColX, currentY);
        doc.text(':', rightColonX, currentY);
        doc.text(room.room, rightValueX, currentY);

        currentY += 8;

        // Row 3: Timings
        doc.text('Timings', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        doc.text(headerData.timings, leftValueX, currentY);

        currentY += 8;

        // Row 4: Subject Names
        doc.text('Subject Names', leftColX, currentY);
        doc.text(':', leftColonX, currentY);
        const splitSubjects = doc.splitTextToSize(room.subjectList, pageWidth - leftValueX - margin);
        doc.text(splitSubjects, leftValueX, currentY);
        
        currentY += (splitSubjects.length * 6) + 10;

        // TABLE
        const head = [['', ...room.cols.map(c => `C${c}`)]];
        
        const body = room.rowsData.map(r => {
          return [String(r.rowNum), ...r.cols];
        });

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin + 10, right: margin + 10 },
          head: head,
          body: body,
          theme: 'grid',
          styles: {
            font: 'helvetica',
            lineColor: 0,
            lineWidth: 0.2,
            textColor: 0,
            valign: 'middle',
            halign: 'center',
            fontSize: 10,
            cellPadding: 4
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [128, 0, 128], // Purple
            fontStyle: 'bold'
          },
          bodyStyles: {
            fillColor: [255, 255, 255]
          },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [0, 0, 255], cellWidth: 15 } // Blue
          }
        });

        currentY = doc.lastAutoTable.finalY + 20;
        
        if (currentY > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          currentY = margin;
        }

        // FOOTER
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        doc.text('No.of Candidates Registered', margin, currentY);
        doc.text(':', margin + 55, currentY);
        doc.text(String(room.count), margin + 60, currentY);
        
        currentY += 8;
        doc.text('No.of Candidates Absent', margin, currentY);
        doc.text(':', margin + 55, currentY);
        
        currentY += 8;
        doc.text('No.of Candidates Present', margin, currentY);
        doc.text(':', margin + 55, currentY);

        currentY += 40;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Invigilator1', margin + 30, currentY);
        doc.text('Invigilator2', centerW, currentY, { align: 'center' });
        doc.text('Chief Superintendent', pageWidth - margin - 10, currentY, { align: 'right' });
      }

      doc.save(`SeatingArrangement_${headerData.examMY}.pdf`);
    } catch (err) {
      console.error('Error exporting seating arrangement pdf:', err);
      alert(err.message || 'Failed to export seating arrangement pdf');
    }
  };

  const renderReportContent = () => {
    const groupedData = processSeatingData();
    const rooms = Object.keys(groupedData).sort();
    const headerData = getHeaderData();

    return (
      <div className={styles.abstractReportPage} id="pdf-content">
        {rooms.map((roomKey, idx) => {
          const room = groupedData[roomKey];
          return (
            <div key={idx} className={styles.pageBreak}>
              <div className={styles.reportHeader}>
                <div className={styles.logoContainer}>
                  <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Logo" className={styles.logo} />
                </div>
                <div className={styles.headerText}>
                  <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                  <p className={styles.ugcText}>(PVT.LTD)</p>
                  <h3 className={styles.reportTitle}><u>SEATING ARRANGEMENT</u></h3>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <div className={styles.infoColLeft}>
                    <div className={styles.infoLabel}>Date of Examination</div>
                    <div className={styles.infoColon}>:</div>
                    <div className={styles.infoValue}>{headerData.date}</div>
                  </div>
                  <div className={styles.infoColRight}>
                    <div className={styles.infoLabel}>College Code</div>
                    <div className={styles.infoColon}>:</div>
                    <div className={styles.infoValue}>76</div>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoColLeft}>
                    <div className={styles.infoLabel}>Examination</div>
                    <div className={styles.infoColon}>:</div>
                    <div className={styles.infoValue}>{headerData.examination}</div>
                  </div>
                  <div className={styles.infoColRight}>
                    <div className={styles.infoLabel}>Exam Hall No</div>
                    <div className={styles.infoColon}>:</div>
                    <div className={styles.infoValue}>{room.room}</div>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoColLeft} style={{ width: '100%' }}>
                    <div className={styles.infoLabel}>Timings</div>
                    <div className={styles.infoColon}>:</div>
                    <div className={styles.infoValue}>{headerData.timings}</div>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoColLeft} style={{ width: '100%' }}>
                    <div className={styles.infoLabel}>Subject Names</div>
                    <div className={styles.infoColon}>:</div>
                    <div className={styles.infoValue}>{room.subjectList}</div>
                  </div>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.seatingTable}>
                  <thead>
                    <tr>
                      <th className={styles.rowHeaderEmpty}></th>
                      {room.cols.map(c => (
                        <th key={c} className={styles.colHeader}>C{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {room.rowsData.map(r => (
                      <tr key={r.rowNum}>
                        <td className={styles.rowNumberCell}>{r.rowNum}</td>
                        {r.cols.map((val, cIdx) => (
                          <td key={cIdx} className={styles.studentCell}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.footerSection}>
                <div className={styles.footerCounts}>
                  <div className={styles.countRow}>
                    <div className={styles.countLabel}>No.of Candidates Registered</div>
                    <div className={styles.countColon}>:</div>
                    <div className={styles.countValue}>{room.count}</div>
                  </div>
                  <div className={styles.countRow}>
                    <div className={styles.countLabel}>No.of Candidates Absent</div>
                    <div className={styles.countColon}>:</div>
                    <div className={styles.countValue}></div>
                  </div>
                  <div className={styles.countRow}>
                    <div className={styles.countLabel}>No.of Candidates Present</div>
                    <div className={styles.countColon}>:</div>
                    <div className={styles.countValue}></div>
                  </div>
                </div>

                <div className={styles.signatures}>
                  <div className={styles.sigBlock}>Invigilator1</div>
                  <div className={styles.sigBlock}>Invigilator2</div>
                  <div className={styles.sigBlock}>Chief Superintendent</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h3>Seating Arrangement</h3>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ExamType</label>
              <select
                className={styles.select}
                value={filters.examType}
                onChange={(e) => handleFilterChange('examType', e.target.value)}
              >
                {examTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Semester</label>
              <select
                className={styles.select}
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
                disabled={dropdownLoading.semesters || !appData?.course}
              >
                <option value="">Select Semester</option>
                {semesterOptions.map(sem => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Session</label>
              <select
                className={styles.select}
                value={filters.session}
                onChange={(e) => handleFilterChange('session', e.target.value)}
                disabled={!filters.examType || !filters.semester || dropdownLoading.sessions}
              >
                <option value="">Select Session</option>
                {sessionOptions.map(session => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Edate</label>
              <select
                className={styles.select}
                value={filters.edate}
                onChange={(e) => handleFilterChange('edate', e.target.value)}
                disabled={!filters.session || dropdownLoading.edates}
              >
                <option value="">Select Exam Date</option>
                {edateOptions.map(date => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Room</label>
              <select
                className={styles.select}
                value={filters.room}
                onChange={(e) => handleFilterChange('room', e.target.value)}
                disabled={!filters.session || dropdownLoading.rooms}
              >
                <option value="">All Rooms</option>
                {roomOptions.map(room => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actionsGroup}>
              <button
                className={styles.viewBtn}
                onClick={handleView}
                disabled={isLoading || !filters.examType || !filters.semester || !filters.session || !filters.edate}
              >
                {isLoading ? 'Loading...' : 'View'}
              </button>
              <button
                className={styles.downloadBtn}
                onClick={handleDownload}
                disabled={isLoading || !hasData || seatingData.length === 0}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.reportArea}>
        {!hasData && !isLoading && !error && (
          <div className={styles.placeholder}>
            Select filters and click View to load the seating arrangement data.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading seating arrangement data…</div>}
        {hasData && !isLoading && seatingData.length > 0 && renderReportContent()}
      </div>
    </div>
  );
};

export default SeatingArrangement;
