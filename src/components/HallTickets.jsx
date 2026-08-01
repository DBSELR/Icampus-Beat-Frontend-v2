import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './HallTickets.module.css';
import { getAppData, getHallTicketBatches, getHallTicketBranches, getHallTicketSemesters, prepareHallTickets, getHallTicketData } from '../utils/api';

const HallTickets = () => {
  const [filters, setFilters] = useState({
    batch: '',
    batchRegu: '', // Store REGU value for API
    semester: '',
    branch: '',
    htNo: ''
  });

  const [batchOptions, setBatchOptions] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [hallTicketData, setHallTicketData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [autoPrint, setAutoPrint] = useState(false);
  const [appData, setAppData] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState({
    batches: false,
    semesters: false,
    branches: false
  });

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      const course = data.course || data.Course || '';
      const regulation = data.regulation || data.Regulation || '';
      
      if (course && regulation) {
        fetchBatches(course, regulation);
      }
    }
  }, []);

  // Fetch batches
  const fetchBatches = useCallback(async (course, regulation) => {
    try {
      setDropdownLoading(prev => ({ ...prev, batches: true }));
      setError('');
      const response = await getHallTicketBatches(course, regulation);
      
      if (response && response.success && Array.isArray(response.data)) {
        // API returns { REGU, BATCH } - store both values
        const batches = response.data.map(item => ({
          regu: item.REGU || item.regu || '',
          batch: item.BATCH || item.batch || ''
        })).filter(item => item.regu && item.batch);
        setBatchOptions(batches);
      } else {
        setError(response?.message || 'No batches found');
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.message || 'Failed to load batches');
    } finally {
      setDropdownLoading(prev => ({ ...prev, batches: false }));
    }
  }, []);

  // Fetch branches when batch changes
  useEffect(() => {
    const fetchBranchesData = async () => {
      if (!filters.batchRegu || !appData) {
        setBranchOptions([]);
        return;
      }

      const course = appData.course || appData.Course || '';
      const regulation = appData.regulation || appData.Regulation || '';

      if (!course || !regulation) {
        setBranchOptions([]);
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, branches: true }));
        setError('');
        const response = await getHallTicketBranches(course, regulation, filters.batchRegu);
        
        if (response && response.success && Array.isArray(response.data)) {
          const branches = response.data.map(item => item.GRP || item.grp || item.Branch || item.branch || '').filter(Boolean);
          setBranchOptions(branches);
        } else {
          setBranchOptions([]);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
        setBranchOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, branches: false }));
      }
    };

    fetchBranchesData();
  }, [filters.batchRegu, appData]);

  // Fetch semesters when examMY is available
  useEffect(() => {
    const fetchSemestersData = async () => {
      if (!appData) {
        setSemesterOptions([]);
        return;
      }

      const course = appData.course || appData.Course || '';
      const regulation = appData.regulation || appData.Regulation || '';
      const examMY = appData.examMY || appData.examMy || appData.ExamMy || appData.ExamMY || '';

      if (!course || !regulation || !examMY) {
        setSemesterOptions([]);
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, semesters: true }));
        setError('');
        const response = await getHallTicketSemesters(course, regulation, examMY);
        
        if (response && response.success && Array.isArray(response.data)) {
          const semesters = response.data.map(item => {
            return item.SEM || item.sem || item.sem1 || item;
          }).filter(Boolean);
          setSemesterOptions(semesters);
        } else {
          setSemesterOptions([]);
        }
      } catch (error) {
        console.error('Error fetching semesters:', error);
        setSemesterOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, semesters: false }));
      }
    };

    fetchSemestersData();
  }, [appData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'batch') {
      // Find the batch option to get REGU value
      const selectedBatch = batchOptions.find(b => b.batch === value);
      setFilters(prev => ({
        ...prev,
        batch: value,
        batchRegu: selectedBatch ? selectedBatch.regu : value
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const handleView = async () => {
    const data = getAppData();
    const course = data?.course || data?.Course || '';
    const regulation = data?.regulation || data?.Regulation || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !regulation || !examMY) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    // Batch is optional - can view data with just ExamMY, Course, and Regulation
    // if (!filters.batchRegu) {
    //   alert('Please select a Batch');
    //   return;
    // }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setHallTicketData([]);

    try {
      // Step 1: Prepare hall tickets
      // The API expects: { examMY, course, regulation, batch, branch, sem, regno, selectionFormula }
      // batch should be REGU value (e.g., "20"), not BATCH display (e.g., "2020-2024")
      // Use the same parameters that will be used for data fetch
      const batchValue = filters.batchRegu || '';
      const branchValue = filters.branch || '';
      const semValue = filters.semester || '';
      const regnoValue = filters.htNo || '';

      console.log('HallTickets: Preparing hall tickets with:', {
        examMY,
        course,
        regulation,
        batch: batchValue,
        branch: branchValue,
        sem: semValue,
        regno: regnoValue
      });

      // Prepare hall tickets - use exact same parameters as data fetch
      const prepareResponse = await prepareHallTickets(
        examMY,
        course,
        regulation,
        batchValue,
        branchValue,
        semValue,
        regnoValue,
        '' // selectionFormula - will be built by backend
      );

      // Prepare might succeed even if no records are found - that's okay
      // We'll check the data endpoint to see if records exist
      console.log('HallTickets: Prepare response:', prepareResponse);
      
      // Log prepare result for debugging
      if (prepareResponse && prepareResponse.data) {
        console.log('Prepare result:', {
          rowsAffected: prepareResponse.data.RowsAffected,
          recordsCount: prepareResponse.data.RecordsCount,
          selectionFormula: prepareResponse.data.SelectionFormula
        });
      }
      
      // If prepare fails completely, show error but still try to fetch data
      if (prepareResponse && prepareResponse.success === false && 
          prepareResponse.message && !prepareResponse.message.toLowerCase().includes('executed')) {
        console.warn('Prepare warning:', prepareResponse.message);
        // Continue anyway - data might still exist from previous prepare
      }

      // Step 2: Get hall ticket data
      // API: GET /api/HallTicket/data?ExamMY=DEC-2024&Course=B.TECH&Regulation=R20&Batch=20&Branch=CSE&Sem=5&Regno=20671A0101
      // Use exact same parameter values as prepare (case-sensitive parameter names in URL)
      console.log('HallTickets: Fetching hall ticket data with:', {
        ExamMY: examMY,
        Course: course,
        Regulation: regulation,
        Batch: batchValue,
        Branch: branchValue,
        Sem: semValue,
        Regno: regnoValue
      });
      
      const dataResponse = await getHallTicketData(
        examMY,      // ExamMY
        course,      // Course
        regulation,  // Regulation
        batchValue,  // Batch (REGU value)
        branchValue, // Branch (GRP value)
        semValue,    // Sem
        regnoValue   // Regno
      );

      console.log('HallTickets: Data response:', dataResponse);

      if (dataResponse && dataResponse.success && Array.isArray(dataResponse.data)) {
        setHallTicketData(dataResponse.data);
        setHasData(dataResponse.data.length > 0);
        if (dataResponse.data.length === 0) {
          setError('No hall ticket data found for the selected criteria. Please ensure data is prepared first using the prepare endpoint.');
        } else {
          setError(''); // Clear any previous errors
        }
      } else {
        // Show more detailed error message
        const errorMsg = dataResponse?.message || 'No hall ticket data found';
        setError(errorMsg);
        setHasData(false);
        
        // Log for debugging
        console.error('Hall ticket data fetch failed:', {
          success: dataResponse?.success,
          message: errorMsg,
          data: dataResponse?.data
        });
      }
    } catch (err) {
      console.error('Error loading hall tickets:', err);
      setError(err.message || 'Failed to load hall tickets. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (hallTicketData.length === 0) {
      alert('No data to download. Please load hall tickets first.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      const normalize = k => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const getVal = (row, possibleKeys) => {
        const key = Object.keys(row).find(k => possibleKeys.includes(normalize(k)));
        return key ? row[key] : '';
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

      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const day = String(d.getDate()).padStart(2, '0');
          const month = months[d.getMonth()];
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch {
          return dateStr;
        }
      };

      for (let i = 0; i < hallTicketData.length; i++) {
        if (i > 0) doc.addPage();
        
        const row = hallTicketData[i];
        const regNo = getVal(row, ['REGNO', 'HTNO', 'ROLLNO']);
        const nameValue = getVal(row, ['SNAME', 'NAME', 'STUDENTNAME']);
        const rawBranch = getVal(row, ['GRP', 'BRANCH', 'SPECIALIZATION', 'DEPT']);
        
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
        const fullBranch = branchMap[String(rawBranch).toUpperCase()] || rawBranch;

        const subjects = [];
        for (let s = 1; s <= 15; s++) {
          const code = getVal(row, [`SPAP${s}C`]);
          if (code && String(code).trim() !== '') {
            subjects.push([
              formatDate(getVal(row, [`SPAP${s}DT`])),
              getVal(row, [`SPAP${s}TYPE`]) || getVal(row, ['TIME', 'ETIME', 'EXAMTIME', 'SESSION']),
              code,
              getVal(row, [`SPAP${s}N`]),
              ''
            ]);
          }
        }
        
        while(subjects.length < 6) {
          subjects.push(['', '', '', '', '']);
        }

        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.rect(margin, margin, pageWidth - (margin * 2), 240);

        let currentY = margin + 10;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(margin + 5, currentY, 25, 30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('NO\nIMAGE', margin + 17.5, currentY + 14, { align: 'center' });

        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text('J. B. Institute of Engineering & Technology', centerW, currentY + 5, { align: 'center' });
        doc.setFontSize(10);
        doc.text('UGC Autonomous', centerW, currentY + 10, { align: 'center' });
        doc.setFontSize(11);
        const examTitleStr = `${yearStr} ${courseStr} ${semStr} ${reguStr} Supplementary Examinations, ${examMYStr}`;
        doc.text(examTitleStr, centerW, currentY + 16, { align: 'center' });
        
        const titleW = doc.getTextWidth(examTitleStr);
        doc.line(centerW - (titleW / 2), currentY + 17, centerW + (titleW / 2), currentY + 17);
        
        doc.setFontSize(14);
        doc.text('HALL TICKET', centerW, currentY + 24, { align: 'center' });
        doc.line(centerW - 16, currentY + 25, centerW + 16, currentY + 25);

        doc.rect(pageWidth - margin - 30, currentY, 25, 30);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('NO PHOTO', pageWidth - margin - 17.5, currentY + 16, { align: 'center' });
        
        doc.rect(pageWidth - margin - 30, currentY + 32, 25, 8);
        doc.text('No Sign', pageWidth - margin - 17.5, currentY + 37, { align: 'center' });

        currentY += 45;

        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.text('Regd.No.', margin + 10, currentY);
        doc.text(':', margin + 45, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(regNo).toUpperCase(), margin + 50, currentY);
        
        currentY += 8;
        doc.setFont('times', 'normal');
        doc.text('Name', margin + 10, currentY);
        doc.text(':', margin + 45, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(nameValue).toUpperCase(), margin + 50, currentY);

        currentY += 8;
        doc.setFont('times', 'normal');
        doc.text('Branch / Specialization', margin + 10, currentY);
        doc.text(':', margin + 50, currentY);
        doc.setFont('times', 'bold');
        doc.text(String(fullBranch).toUpperCase(), margin + 55, currentY);

        currentY += 10;

        // Draw Watermark BEFORE the table so it sits behind
        doc.setTextColor(245, 245, 245);
        doc.setFontSize(180);
        doc.setFont('times', 'bold');
        doc.text('JB', pageWidth / 2, currentY + 45, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin + 5, right: margin + 5 },
          head: [['Date', 'Time', 'Sub.Code', 'Subject Name', 'Invg.Sign']],
          body: subjects,
          theme: 'grid',
          headStyles: { 
            fillColor: false, textColor: 0, font: 'times', fontStyle: 'normal', fontSize: 11, halign: 'center', lineColor: 100, lineWidth: 0.2
          },
          bodyStyles: { 
            fillColor: false, textColor: 0, font: 'times', fontSize: 10, lineColor: 100, lineWidth: 0.2
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 25 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'left' },
            4: { halign: 'center', cellWidth: 25 }
          }
        });

        currentY = doc.lastAutoTable.finalY + 40;

        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        
        doc.line(margin + 5, currentY, margin + 45, currentY);
        doc.text('Signature of the Candidate', margin + 25, currentY + 5, { align: 'center' });

        doc.line(centerW - 25, currentY, centerW + 25, currentY);
        doc.text('Controller of Examinations', centerW, currentY + 5, { align: 'center' });

        doc.line(pageWidth - margin - 55, currentY, pageWidth - margin - 5, currentY);
        doc.text('Chief Controller of Examinations', pageWidth - margin - 30, currentY + 5, { align: 'center' });
      }

      doc.save(`HallTickets_${filters.batch}_${filters.semester}_${filters.branch}.pdf`);
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
            <label className={styles.label}>Batch</label>
            <select
              name="batch"
              value={filters.batch}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.batches || !batchOptions.length}
            >
              <option value="">
                {dropdownLoading.batches ? 'Loading batches...' : 'Select Batch'}
              </option>
              {batchOptions.map((option, index) => (
                <option key={index} value={option.batch}>
                  {option.batch}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.semesters || !semesterOptions.length}
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
            <label className={styles.label}>Branch</label>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.branches || !branchOptions.length}
            >
              <option value="">
                {dropdownLoading.branches ? 'Loading branches...' : 'Select Branch'}
              </option>
              {branchOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>H.T.No</label>
            <input
              type="text"
              name="htNo"
              value={filters.htNo}
              onChange={handleFilterChange}
              className={styles.input}
              placeholder="Enter H.T.No"
            />
          </div>

          <div className={styles.actionsGroup}>
            <button className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading…' : 'View'}
            </button>
            <button className={styles.downloadPdfBtn} onClick={handleDownload} disabled={isLoading}>
              Download PDF
            </button>
          </div>
        </div>

        <label className={styles.printReminder}>
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(event) => setAutoPrint(event.target.checked)}
          />
          Click Here To Print Or Export after loading the Report
        </label>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.reportArea}>
        {!hasData && !isLoading && !error && (
          <div className={styles.placeholder}>
            Select the required filters and click View to load the report.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Generating report…</div>}
        {hasData && !isLoading && hallTicketData.length > 0 && (
          <div className={styles.ticketsWrapper} id="pdf-content">
            {hallTicketData.map((row, index) => {
              const normalize = k => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
              const getVal = (possibleKeys) => {
                const key = Object.keys(row).find(k => possibleKeys.includes(normalize(k)));
                return key ? row[key] : '';
              };

              const regNo = getVal(['REGNO', 'HTNO', 'ROLLNO']);
              const nameValue = getVal(['SNAME', 'NAME', 'STUDENTNAME']);
              const rawBranch = getVal(['GRP', 'BRANCH', 'SPECIALIZATION', 'DEPT']);

              const subjects = [];
              for (let i = 1; i <= 15; i++) {
                const code = getVal([`SPAP${i}C`]);
                if (code && String(code).trim() !== '') {
                  subjects.push({
                    date: getVal([`SPAP${i}DT`]),
                    time: getVal([`SPAP${i}TYPE`]) || getVal(['TIME', 'ETIME', 'EXAMTIME', 'SESSION']),
                    code: code,
                    name: getVal([`SPAP${i}N`])
                  });
                }
              }

              const courseStr = appData?.course || 'B.Tech.';
              
              const romanSemMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
              const formatSem = (sem) => {
                if (!sem) return '';
                const upperSem = String(sem).toUpperCase();
                return romanSemMap[upperSem] || upperSem;
              };
              const semStr = filters.semester ? `${formatSem(filters.semester)} Sem` : '';
              
              // Calculate Year based on Semester (I=1, II=1, III=2, IV=2, V=3, VI=3, VII=4, VIII=4)
              const semNumMap = { 'I': 1, 'II': 1, '1': 1, '2': 1, 'III': 2, 'IV': 2, '3': 2, '4': 2, 'V': 3, 'VI': 3, '5': 3, '6': 3, 'VII': 4, 'VIII': 4, '7': 4, '8': 4 };
              const romanYearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
              const yearNum = semNumMap[filters.semester?.toUpperCase()] || 1;
              const yearStr = romanYearMap[yearNum] || 'I';

              const reguStr = appData?.regulation ? `(${appData.regulation})` : '';
              const examMYStr = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';
              
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
              const fullBranch = branchMap[String(rawBranch).toUpperCase()] || rawBranch;
              
              const formatDate = (dateStr) => {
                if (!dateStr) return '';
                try {
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return dateStr;
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = months[d.getMonth()];
                  const year = d.getFullYear();
                  return `${day}-${month}-${year}`;
                } catch {
                  return dateStr;
                }
              };

              return (
                <div key={index} className={`${styles.hallTicketContainer} ${index > 0 ? 'html2pdf__page-break' : ''}`}>
                  <div className={styles.header}>
                    <div className={styles.leftLogo}>
                      <div className={styles.noImageBox}>NO<br/>IMAGE</div>
                    </div>
                    <div className={styles.headerText}>
                      <h2 className={styles.instituteName}>J. B. Institute of Engineering & Technology</h2>
                      <p className={styles.ugcText}>UGC Autonomous</p>
                      <p className={styles.examTitle}>
                        <u>{`${yearStr} ${courseStr} ${semStr} ${reguStr} Supplementary Examinations, ${examMYStr}`}</u>
                      </p>
                      <h3 className={styles.hallTicketTitle}>
                        <u>HALL TICKET</u>
                      </h3>
                    </div>
                    <div className={styles.rightLogos}>
                      <div className={styles.noPhotoBox}>NO PHOTO</div>
                      <div className={styles.noSignBox}>No Sign</div>
                    </div>
                  </div>

                  <div className={styles.studentInfo}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Regd.No.</span>
                      <span className={styles.infoColon}>:</span>
                      <span className={styles.infoValueBold}>{regNo}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Name</span>
                      <span className={styles.infoColon}>:</span>
                      <span className={styles.infoValueBold}>{nameValue}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Branch / Specialization</span>
                      <span className={styles.infoColon}>:</span>
                      <span className={styles.infoValueBold}>{fullBranch}</span>
                    </div>
                  </div>

                  <div className={styles.tableWrapper}>
                    <div className={styles.watermark}>JB</div>
                    <table className={styles.subjectsTable}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Sub.Code</th>
                          <th>Subject Name</th>
                          <th>Invg.Sign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((sub, idx) => (
                          <tr key={idx}>
                            <td>{formatDate(sub.date)}</td>
                            <td>{sub.time}</td>
                            <td>{sub.code}</td>
                            <td>{sub.name}</td>
                            <td></td>
                          </tr>
                        ))}
                        {[...Array(Math.max(0, 6 - subjects.length))].map((_, idx) => (
                          <tr key={`empty-${idx}`}>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.signatures}>
                    <div className={styles.sigBox}>
                      <div className={styles.sigLine}></div>
                      <p>Signature of the Candidate</p>
                    </div>
                    <div className={styles.sigBox}>
                      <div className={styles.sigLine}></div>
                      <p>Controller of Examinations</p>
                    </div>
                    <div className={styles.sigBox}>
                      <div className={styles.sigLine}></div>
                      <p>Chief Controller of Examinations</p>
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

export default HallTickets;

