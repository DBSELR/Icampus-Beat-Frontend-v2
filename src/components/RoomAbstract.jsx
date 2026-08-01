import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './RoomAbstract.module.css';
import {
  getAppData,
  getRoomAbstractSemesters,
  getRoomAbstractSessions,
  getRoomAbstractExamDates,
  getRoomAbstractData
} from '../utils/api';

const RoomAbstract = () => {
  const [filters, setFilters] = useState({
    examType: '',
    semester: '',
    session: '',
    examDate: '',
    regsup: ''
  });

  const [roomAbstractData, setRoomAbstractData] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState({
    semesters: false,
    sessions: false,
    examDates: false
  });

  // ExamType options
  const examTypeOptions = [
    { value: '', label: 'Select ExamType' },
    { value: 'External', label: 'External' },
    { value: 'MID-I', label: 'MID-I' },
    { value: 'MID-II', label: 'MID-II' }
  ];

  // Regsup options
  const regsupOptions = [
    { value: '', label: 'Select Regsup' },
    { value: '1', label: 'Reg' },
    { value: '2', label: 'Sup' }
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
      const response = await getRoomAbstractSemesters(course);
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

  // Fetch sessions when semester and examType change
  useEffect(() => {
    const fetchSessions = async () => {
      if (!filters.semester || !filters.examType || !appData?.course) {
        setSessionOptions([]);
        setFilters(prev => ({ ...prev, session: '', examDate: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, sessions: true }));
        const response = await getRoomAbstractSessions(
          appData.course,
          filters.semester,
          filters.examType
        );
        if (response && response.success && Array.isArray(response.data)) {
          console.log('Session API raw response:', response.data);
          
          // Extract ESESS values - ONLY strings, skip null
          const sessions = [];
          response.data.forEach((item, idx) => {
            // Check if item is object and has ESESS
            if (item && typeof item === 'object' && item.ESESS !== undefined) {
              const esess = item.ESESS;
              // Skip null/undefined, only add valid values
              if (esess !== null && esess !== undefined && esess !== '') {
                const sessionStr = String(esess).trim();
                if (sessionStr && !sessions.includes(sessionStr)) {
                  sessions.push(sessionStr);
                }
              }
            }
          });
          
          console.log('Processed sessions array:', sessions);
          console.log('Session types:', sessions.map(s => typeof s));
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
  }, [filters.semester, filters.examType, appData]);

  // Fetch exam dates when session changes
  useEffect(() => {
    const fetchExamDates = async () => {
      if (!filters.session || !filters.semester || !filters.examType || 
          !appData?.course || !appData?.examMY) {
        setExamDateOptions([]);
        setFilters(prev => ({ ...prev, examDate: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, examDates: true }));
        // Ensure session is a string before passing to API
        const sessionValue = typeof filters.session === 'string' ? filters.session : String(filters.session || '').trim();
        console.log('Calling examdates API with session:', sessionValue, typeof sessionValue);
        
        // Session is string from dropdown, pass as-is to examdates API
        const response = await getRoomAbstractExamDates(
          appData.course,
          filters.semester,
          sessionValue,
          appData.examMY,
          filters.examType
        );
        if (response && response.success && Array.isArray(response.data)) {
          // API returns EDATE in dd-MM-yyyy format
          const dates = response.data
            .map(item => {
              // Extract EDATE value, handle null properly
              let date = null;
              if (item.EDATE !== null && item.EDATE !== undefined) {
                date = item.EDATE;
              } else if (item.edate !== null && item.edate !== undefined) {
                date = item.edate;
              } else if (item.ExamDate !== null && item.ExamDate !== undefined) {
                date = item.ExamDate;
              } else if (item.examDate !== null && item.examDate !== undefined) {
                date = item.examDate;
              }
              // Only return string if date is not null/undefined
              return date !== null && date !== undefined ? String(date) : null;
            })
            .filter(d => d !== null && d !== ''); // Filter out null and empty strings
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

    fetchExamDates();
  }, [filters.session, filters.semester, filters.examType, appData]);

  // Handle filter change
  const handleFilterChange = (name, value) => {
    // Ensure value is always a string (especially for session)
    const stringValue = typeof value === 'string' ? value : String(value || '').trim();
    
    setFilters(prev => {
      const newFilters = { ...prev, [name]: stringValue };
      
      // Reset dependent dropdowns
      if (name === 'examType' || name === 'semester') {
        newFilters.session = '';
        newFilters.examDate = '';
      }
      if (name === 'session') {
        newFilters.examDate = '';
      }
      
      return newFilters;
    });
    setError('');
  };

  // Handle View button
  const handleView = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🚀🚀🚀 handleView function called!');
    console.log('Current filters:', JSON.stringify(filters, null, 2));
    console.log('App data:', JSON.stringify(appData, null, 2));
    
    // Validate required fields
    if (!filters.examType || !filters.semester || !filters.session || !filters.examDate || !filters.regsup) {
      const missingFields = [];
      if (!filters.examType) missingFields.push('ExamType');
      if (!filters.semester) missingFields.push('Semester');
      if (!filters.session) missingFields.push('Session');
      if (!filters.examDate) missingFields.push('Exam Date');
      if (!filters.regsup) missingFields.push('Regsup');
      alert(`Please select all fields. Missing: ${missingFields.join(', ')}`);
      console.warn('❌ Validation failed - missing fields:', missingFields);
      return;
    }

    if (!appData?.course || !appData?.examMY) {
      alert('Please select Course and Exam M/Y from the header dropdowns');
      console.warn('❌ Validation failed - missing app data:', { course: appData?.course, examMY: appData?.examMY });
      return;
    }

    console.log('✅ All validations passed, calling API...');
    setIsLoading(true);
    setError('');
    setHasData(false);
    setRoomAbstractData([]);

    try {
      // Ensure session is a string before parsing
      const sessionStr = typeof filters.session === 'string' ? filters.session : String(filters.session || '').trim();
      console.log('View data - session value:', sessionStr, typeof sessionStr);
      
      // Session from dropdown is string (e.g., "1"), but data API expects integer
      const sessionInt = parseInt(sessionStr, 10) || 0;
      if (sessionInt <= 0) {
        throw new Error('Invalid session value');
      }

      // Regsup from dropdown is string (e.g., "1", "2"), but data API expects integer
      const regsupInt = parseInt(filters.regsup, 10) || 0;
      if (regsupInt < 0 || regsupInt > 2) {
        throw new Error('Invalid regsup value');
      }

      // Convert date from dd-MM-yyyy (dropdown format) to MM-dd-yyyy (API format)
      // Example: 06-05-2024 -> 05-06-2024
      let edateFormatted = filters.examDate;
      if (filters.examDate) {
        const dateParts = filters.examDate.split('-');
        if (dateParts.length === 3) {
          // dd-MM-yyyy -> MM-dd-yyyy
          edateFormatted = `${dateParts[1]}-${dateParts[0]}-${dateParts[2]}`;
        }
      }

      const params = {
        course: appData.course,
        examMY: appData.examMY,
        sem: filters.semester,
        session: sessionInt,
        edate: edateFormatted, // Converted to MM-dd-yyyy format
        examType: filters.examType,
        regsup: regsupInt
      };

      console.log('📡 RoomAbstract: Calling API with:', params);
      console.log('📡 API URL will be:', `/api/RoomAbstract/data?course=${params.course}&examMY=${params.examMY}&sem=${params.sem}&session=${params.session}&edate=${params.edate}&examType=${params.examType}&regsup=${params.regsup}`);

      console.log('📡 About to call getRoomAbstractData function...');
      const response = await getRoomAbstractData(params);
      console.log('✅ RoomAbstract API Response received:', response);

      if (response && response.success && Array.isArray(response.data)) {
        console.log('✅ RoomAbstract data received:', response.data);
        console.log('✅ Number of records:', response.data.length);
        setRoomAbstractData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No room abstract data found for the selected criteria');
        } else {
          console.log('✅✅✅ Data set successfully, table should display now');
          setError(''); // Clear any previous errors
        }
      } else {
        console.warn('⚠️ API response format issue:', response);
        setError(response?.message || 'No room abstract data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading room abstract data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError(err.message || 'Failed to load room abstract data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
      console.log('API call completed, loading set to false');
    }
  };

  const normalize = k => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const getVal = (row, possibleKeys) => {
    const key = Object.keys(row).find(k => possibleKeys.includes(normalize(k)));
    return key ? row[key] : '';
  };

  const getGroupedData = () => {
    if (!roomAbstractData || roomAbstractData.length === 0) return {};
    
    const grouped = roomAbstractData.reduce((acc, row) => {
      const room = getVal(row, ['ROOM', 'ROOMNO', 'ROOMNAME']) || 'UNKNOWN';
      const branch = getVal(row, ['GRP', 'BRANCH', 'DEPT', 'SPECIALIZATION']) || 'UNKNOWN';
      const regNo = getVal(row, ['REGNO', 'HTNO', 'ROLLNO']);
      
      if (!acc[room]) acc[room] = {};
      if (!acc[room][branch]) acc[room][branch] = [];
      if (regNo) acc[room][branch].push(regNo);
      return acc;
    }, {});
    
    const formatted = {};
    for (const room of Object.keys(grouped)) {
      const branchesObj = grouped[room];
      const branches = Object.keys(branchesObj).sort();
      
      let maxRows = 0;
      for (const b of branches) {
        if (branchesObj[b].length > maxRows) maxRows = branchesObj[b].length;
      }
      
      const rows = [];
      for (let i = 0; i < maxRows; i++) {
        const row = [];
        for (const b of branches) {
          row.push(branchesObj[b][i] || '');
        }
        rows.push(row);
      }
      
      formatted[room] = { branches, rows };
    }
    
    return formatted;
  };

  const courseStr = appData?.course || 'B.Tech.';
  const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
  const formatSem = (sem) => {
    if (!sem) return '';
    const upperSem = String(sem).toUpperCase();
    return romanSemMap[upperSem] || upperSem;
  };
  const semStr = filters.semester ? `${formatSem(filters.semester)} Sem` : '';
  const semNumMap = { 'I': 1, 'II': 1, '1': 1, '2': 1, 'III': 2, 'IV': 2, '3': 2, '4': 2, 'V': 3, 'VI': 3, '5': 3, '6': 3, 'VII': 4, 'VIII': 4, '7': 4, '8': 4 };
  const romanYearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const yearNum = semNumMap[filters.semester?.toUpperCase()] || 1;
  const yearStr = romanYearMap[yearNum] || 'I';
  const reguStr = appData?.regulation ? `(${appData.regulation})` : '';
  const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';
  const examTypeStr = filters.examType || '';
  const suppReg = filters.regsup === '1' ? 'Regular' : filters.regsup === '2' ? 'Supplementary' : '';
  
  const subTitle = `${yearStr} ${courseStr} ${semStr} ${reguStr} ${examTypeStr} ${suppReg} Examinations ${examMYStr}`;

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
  if (sessionRaw === '1' || sessionRaw.toUpperCase() === 'FN') timeStr = '10:00 AM TO 01:00 PM';
  else if (sessionRaw === '2' || sessionRaw.toUpperCase() === 'AN') timeStr = '02:00 PM TO 05:00 PM';
  else timeStr = sessionRaw;
  
  const displayDate = formatDate(filters.examDate);

  const handleDownload = async () => {
    if (!hasData || roomAbstractData.length === 0) {
      alert('No data to export. Please load data first.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      const grouped = getGroupedData();
      const rooms = Object.keys(grouped);
      
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

      const drawHeader = (currentY) => {
        if (logoData) {
          doc.addImage(logoData, 'PNG', margin, currentY, 30, 25);
        }

        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setTextColor(255, 0, 0); // Red
        doc.setFontSize(20);
        doc.text('D. B. S. Institute', centerW, currentY + 10, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 255); // Blue
        doc.text('(PVT.LTD)', centerW, currentY + 18, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 139); // Dark Blue
        doc.text('ABSTRACT OF SEATING PLAN - BRANCH WISE', centerW, currentY + 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(255, 0, 0); // Red
        doc.text(subTitle, centerW, currentY + 40, { align: 'center' });
        
        return currentY + 55;
      };

      let currentY = drawHeader(margin);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      
      doc.text(`DATE      : ${displayDate}`, margin, currentY);
      doc.text(`TIME : ${timeStr}`, pageWidth - margin, currentY, { align: 'right' });
      
      currentY += 15;

      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const data = grouped[room];
        
        const head = [['', '', ...data.branches]];
        const body = data.rows.map((row, idx) => {
          return [idx === 0 ? room : '', String(idx + 1), ...row];
        });

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin + 15, right: margin + 15 },
          head: head,
          body: body,
          theme: 'grid',
          styles: {
            font: 'helvetica',
            lineColor: 0,
            lineWidth: 0.2,
            textColor: 0,
            valign: 'middle',
            halign: 'left',
            fontSize: 9
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: 0,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fillColor: [255, 255, 255]
          },
          columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' },
            1: { fontStyle: 'bold', halign: 'center' }
          },
          didParseCell: function(dataHook) {
            if (dataHook.section === 'body' && dataHook.column.index === 0) {
              if (dataHook.row.index === 0) {
                dataHook.cell.rowSpan = data.rows.length;
              }
            }
          }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        if (i < rooms.length - 1 && currentY > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          currentY = margin;
        }
      }

      currentY = Math.max(currentY + 20, doc.internal.pageSize.getHeight() - 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Controller of Examinations', margin, currentY);
      doc.text('Chief Controller of Examinations', pageWidth - margin, currentY, { align: 'right' });

      doc.save(`RoomAbstract_${examMYStr}.pdf`);
    } catch (err) {
      console.error('Error exporting room abstract pdf:', err);
      alert(err.message || 'Failed to export room abstract pdf');
    }
  };

  const renderReportContent = () => {
    const grouped = getGroupedData();
    const rooms = Object.keys(grouped);

    return (
      <div className={styles.abstractReportPage} id="pdf-content">
        <div className={styles.reportHeader}>
          <div className={styles.logoContainer}>
            <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Logo" className={styles.logo} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.instituteName}>D. B. S. Institute</h2>
            <p className={styles.ugcText}>(PVT.LTD)</p>
            <h3 className={styles.reportTitle}>ABSTRACT OF SEATING PLAN - BRANCH WISE</h3>
            <h4 className={styles.reportSubtitle}>{subTitle}</h4>
          </div>
        </div>

        <div className={styles.dateTimeRow}>
          <div className={styles.dateLabel}>DATE<span className={styles.colon}>:</span>{displayDate}</div>
          <div className={styles.timeLabel}>TIME<span className={styles.colon}>:</span>{timeStr}</div>
        </div>

        <div className={styles.tablesContainer}>
          {rooms.map((room, roomIdx) => {
            const data = grouped[room];
            return (
              <table key={roomIdx} className={styles.abstractTable}>
                <thead>
                  <tr>
                    <th className={styles.roomCol}></th>
                    <th className={styles.seqCol}></th>
                    {data.branches.map((branch, bIdx) => (
                      <th key={bIdx}>{branch}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {rIdx === 0 && (
                        <td className={styles.roomCell} rowSpan={data.rows.length}>{room}</td>
                      )}
                      <td className={styles.seqCell}>{rIdx + 1}</td>
                      {row.map((regNo, cIdx) => (
                        <td key={cIdx}>{regNo}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}
        </div>

        <div className={styles.reportFooter}>
          <div className={styles.footerSig}>Controller of Examinations</div>
          <div className={styles.footerSig}>Chief Controller of Examinations</div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h3>Room Abstract</h3>
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
                value={filters.session || ''}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  handleFilterChange('session', selectedValue);
                }}
                disabled={!filters.examType || !filters.semester || dropdownLoading.sessions}
              >
                <option value="">Select Session</option>
                {sessionOptions
                  .filter(s => typeof s === 'string' && s !== '')
                  .map((session, index) => (
                    <option key={`session-${index}`} value={session}>
                      {session}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Edate</label>
              <select
                className={styles.select}
                value={filters.examDate}
                onChange={(e) => handleFilterChange('examDate', e.target.value)}
                disabled={!filters.session || dropdownLoading.examDates}
              >
                <option value="">Select Exam Date</option>
                {examDateOptions.map(date => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Regsup</label>
              <select
                className={styles.select}
                value={filters.regsup}
                onChange={(e) => handleFilterChange('regsup', e.target.value)}
              >
                {regsupOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actionsGroup}>
              <button
                type="button"
                className={styles.viewBtn}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔵 View button clicked!');
                  await handleView(e);
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading…' : 'View'}
              </button>
              <button
                className={styles.downloadBtn}
                onClick={handleDownload}
                disabled={isLoading || !hasData || roomAbstractData.length === 0}
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
            Select all filters (ExamType, Semester, Session, Exam Date, and Regsup) and click View to load the room abstract.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading room abstract data…</div>}
        {hasData && !isLoading && roomAbstractData.length > 0 && renderReportContent()}
      </div>
    </div>
  );
};

export default RoomAbstract;

