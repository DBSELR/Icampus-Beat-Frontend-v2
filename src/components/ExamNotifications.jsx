import React, { useState, useEffect } from 'react';
import { FaEdit, FaChevronUp } from 'react-icons/fa';
import { getExamRegulations, getExamCourses, getExistingExams, getExamExisting, getAppData, saveExamWithNotification, deleteExam, getExamBatch, saveExamRegSup, getExamNotifications } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './ExamNotifications.module.css';

const ExamNotifications = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form data state
  const [formData, setFormData] = useState({
    regulation: '',
    programme: '',
    examMonthYear: '',
    examType: '',
    regularSems: '',
    remarks: '',
    extraSems: {
      sem1: false,
      sem2: false,
      sem3: false,
      sem4: false,
      sem5: false,
      sem6: false,
      sem7: false,
      sem8: false
    }
  });

  // Regular batch details state
  const [batchDetails, setBatchDetails] = useState({
    batch1: '',
    sem1: '',
    batch2: '',
    sem2: '',
    batch3: '',
    sem3: '',
    batch4: '',
    sem4: ''
  });

  // Table data state
  const [tableData, setTableData] = useState([]);

  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // API data states
  const [regulations, setRegulations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [regulationsLoading, setRegulationsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingExamPayload, setPendingExamPayload] = useState(null);
  // Support multiple notification rows (one per batch/semester)
  const [notificationRows, setNotificationRows] = useState([]);

  // Dropdown options
  const examTypeOptions = ['Regular Only', 'Regular & Supplementary', 'Supplementary'];
  const regularSemsOptions = ['Odd Semesters', 'Even Semesters', 'Supply Semesters'];

  // Format month value for display (YYYY-MM to MMM-YYYY)
  const formatMonthDisplay = (value) => {
    if (!value) return '';
    const [year, month] = value.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month, 10) - 1]}-${year}`;
  };

  const formatMonthForApi = (value) => {
    if (!value) return '';
    return formatMonthDisplay(value);
  };

  const mapExamTypeToApi = (type) => {
    switch (type) {
      case 'Regular Only':
        return 'Regular';
      case 'Regular & Supplementary':
        return 'Regular & Supplementary';
      case 'Supplementary':
        return 'Supplementary';
      default:
        return '';
    }
  };

  const getRegularSemNumbers = () => {
    switch (formData.regularSems) {
      case 'Odd Semesters':
        return '1 3 5 7';
      case 'Even Semesters':
        return '2 4 6 8';
      default:
        return '';
    }
  };

  const getBatchSupSemNumbers = () => {
    const semKeys = ['sem1', 'sem2', 'sem3', 'sem4'];
    const values = semKeys
      .map((key) => batchDetails[key])
      .map((val) => (val || '').trim())
      .filter(Boolean);
    return Array.from(new Set(values)).join(' ');
  };

  const getExtraSemNumbers = () => {
    return Object.entries(formData.extraSems)
      .filter(([, checked]) => checked)
      .map(([key]) => key.replace('sem', ''))
      .map((val) => parseInt(val, 10))
      .sort((a, b) => a - b)
      .map((num) => num.toString())
      .join(' ');
  };

  // Fetch regulations data
  const fetchRegulations = async () => {
    try {
      setRegulationsLoading(true);
      const response = await getExamRegulations();

      if (response.success && response.data) {
        setRegulations(response.data);
        console.log('Regulations loaded:', response.data);
      } else {
        console.error('Failed to load regulations:', response.message);
        setRegulations([]);
      }
    } catch (error) {
      console.error('Error fetching regulations:', error);
      alert('Error loading regulations: ' + error.message);
      setRegulations([]);
    } finally {
      setRegulationsLoading(false);
    }
  };

  // Fetch courses data based on selected regulation
  const fetchCourses = async (regulation) => {
    if (!regulation) {
      setCourses([]);
      return;
    }

    try {
      setCoursesLoading(true);
      const response = await getExamCourses(regulation);

      if (response.success && response.data) {
        setCourses(response.data);
        console.log('Courses loaded for regulation', regulation, ':', response.data);
      } else {
        console.error('Failed to load courses:', response.message);
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Error loading courses: ' + error.message);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Load regulations on component mount
  useEffect(() => {
    fetchRegulations();
  }, []);

  // Auto-fill Regulation and Programme from localStorage (header selection)
  useEffect(() => {
    const appData = getAppData();
    if (appData) {
      setFormData(prev => ({
        ...prev,
        regulation: appData.regulation || '',
        programme: appData.course || ''
      }));
      console.log('Auto-filled from localStorage:', { regulation: appData.regulation, programme: appData.course });
    }
  }, []);

  // Load courses when regulation changes
  useEffect(() => {
    if (formData.regulation) {
      fetchCourses(formData.regulation);
    } else {
      setCourses([]);
    }
  }, [formData.regulation]);

  // Fetch existing exams data - use form data if provided, otherwise use localStorage
  // Using masterlist API which only needs regulation and course (no examMY parameter)
  const fetchExistingExams = async (customRegulation, customExamMY, customCourse) => {
    try {
      setTableLoading(true);
      const appData = getAppData();

      // Use custom parameters if provided, otherwise fallback to localStorage
      const regulation = customRegulation || appData?.regulation || formData.regulation;
      const course = customCourse || appData?.course || formData.programme;

      // masterlist API doesn't require examMY parameter
      if (!regulation || !course) {
        console.warn('Missing required data for fetching exams:', { regulation, course });
        setTableData([]);
        return;
      }

      console.log('Fetching exam master list with:', { regulation, course });

      // masterlist API only needs regulation and course (examMY is optional/nullable)
      const response = await getExistingExams(regulation, null, course);

      if (response.success && response.data) {
        // Map API response to table format (new masterlist API structure)
        const mappedData = response.data.map((exam, index) => ({
          id: exam.aexamid || index + 1, // Use aexamid from API if available
          regulation: exam.regulation || regulation,
          course: exam.course || course,
          examMy: exam.exammy || '', // exammy comes from API
          regSem: exam.regsem || '-',
          supSem: exam.supsem || '-',
          sems: exam.sems || '-',
          etype: exam.etype || '-'
        }));

        setTableData(mappedData);
        console.log('Exam master list loaded:', mappedData);
      } else {
        console.error('Failed to load exam master list:', response.message);
        setTableData([]);
      }
    } catch (error) {
      console.error('Error fetching exam master list:', error);
      // Don't show alert for table loading errors, just log them
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  // Fetch existing exam data and pre-fill form (Extra Sems and Batch Details)
  const fetchExamExistingData = async (regulation, examMy, course) => {
    if (!regulation || !examMy || !course) {
      console.log('Missing required params for fetchExamExistingData:', { regulation, examMy, course });
      return;
    }

    try {
      console.log('Fetching existing exam data for pre-fill:', { regulation, examMy, course });
      const response = await getExamExisting(regulation, examMy, course);

      if (response.success && response.data && response.data.length > 0) {
        console.log('Pre-filling form with existing exam data:', response.data);

        // Reset batch details first
        const newBatchDetails = {
          batch1: '',
          sem1: '',
          batch2: '',
          sem2: '',
          batch3: '',
          sem3: '',
          batch4: '',
          sem4: ''
        };

        // Reset extra sems
        const newExtraSems = {
          sem1: false,
          sem2: false,
          sem3: false,
          sem4: false,
          sem5: false,
          sem6: false,
          sem7: false,
          sem8: false
        };

        // Process each item in the response data
        response.data.forEach((item) => {
          // Pre-fill Extra Sems checkboxes from exsems field (space-separated numbers like "2 4")
          if (item.exsems) {
            const exSemsArray = item.exsems.split(' ').filter(Boolean);
            exSemsArray.forEach((semNum) => {
              const semKey = `sem${semNum}`;
              if (newExtraSems.hasOwnProperty(semKey)) {
                newExtraSems[semKey] = true;
              }
            });
          }

          // Pre-fill Regular Batch Details based on cname field
          // cname values: txtRegulation1, txtRegulation2, txtRegulation3, txtRegulation4
          if (item.cname && item.regu && item.sem) {
            const match = item.cname.match(/txtRegulation(\d)/);
            if (match) {
              const rowNum = match[1]; // 1, 2, 3, or 4
              newBatchDetails[`batch${rowNum}`] = item.regu;
              newBatchDetails[`sem${rowNum}`] = item.sem;
            }
          }
        });

        // Update batch details state
        setBatchDetails(newBatchDetails);
        console.log('Pre-filled batch details:', newBatchDetails);

        // Call batch API for each unique regu value that was pre-filled
        const uniqueReguValues = new Set();
        response.data.forEach((item) => {
          if (item.regu && /^\d{1,2}$/.test(item.regu)) {
            uniqueReguValues.add(item.regu);
          }
        });

        // Call batch API for each unique regu value
        uniqueReguValues.forEach((reguValue) => {
          console.log('Calling batch API for pre-filled regu:', reguValue);
          fetchAndStoreBatchDataWithCourse(reguValue, course);
        });

        // Update extra sems in form data
        setFormData(prev => ({
          ...prev,
          extraSems: newExtraSems
        }));
        console.log('Pre-filled extra sems:', newExtraSems);

        // Optionally pre-fill exam type from first item's etype
        const firstItem = response.data[0];
        if (firstItem.etype) {
          // Map API etype to form examType
          let examType = '';
          if (firstItem.etype === 'Regular') {
            examType = 'Regular Only';
          } else if (firstItem.etype === 'Regular & Supplementary') {
            examType = 'Regular & Supplementary';
          } else if (firstItem.etype === 'Supplementary') {
            examType = 'Supplementary';
          }

          if (examType) {
            setFormData(prev => ({
              ...prev,
              examType: examType,
              extraSems: newExtraSems
            }));
            console.log('Pre-filled exam type:', examType);
          }
        }
      } else {
        console.log('No existing exam data found for pre-fill');
      }
    } catch (error) {
      console.error('Error fetching existing exam data for pre-fill:', error);
      // Don't show alert, just log the error - this is optional pre-fill
    }
  };

  // Load existing exams on component mount
  useEffect(() => {
    fetchExistingExams();

    // Load batch details from localStorage if available
    const savedBatchDetails = localStorage.getItem('examBatchDetails');
    if (savedBatchDetails) {
      try {
        const parsed = JSON.parse(savedBatchDetails);
        // Merge with default empty structure, only overwrite non-empty values
        setBatchDetails(prev => ({
          batch1: '',
          sem1: '',
          batch2: '',
          sem2: '',
          batch3: '',
          sem3: '',
          batch4: '',
          sem4: '',
          ...parsed // Only non-empty values from localStorage will overwrite
        }));
        console.log('Loaded batch details from localStorage:', parsed);
      } catch (error) {
        console.error('Error loading batch details from localStorage:', error);
      }
    }

    // Fetch existing exam data on page load to pre-fill form
    const appData = getAppData();
    if (appData?.regulation && appData?.examMY && appData?.course) {
      fetchExamExistingData(appData.regulation, appData.examMY, appData.course);
    }
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Handle regulation change - reset programme
    if (name === 'regulation') {
      setFormData(prev => ({
        ...prev,
        programme: '' // Clear programme when regulation changes
      }));
    }

    // Handle exam type change - reset batch details and extra sems
    if (name === 'examType') {
      setBatchDetails({
        batch1: '',
        sem1: '',
        batch2: '',
        sem2: '',
        batch3: '',
        sem3: '',
        batch4: '',
        sem4: ''
      });
      setFormData(prev => ({
        ...prev,
        extraSems: {
          sem1: false,
          sem2: false,
          sem3: false,
          sem4: false,
          sem5: false,
          sem6: false,
          sem7: false,
          sem8: false
        }
      }));
    }
  };

  // Fetch batch data from API and store in localStorage (with explicit course parameter)
  const fetchAndStoreBatchDataWithCourse = async (regu, course) => {
    try {
      if (!course) {
        console.log('No course available for batch API call');
        return;
      }

      console.log('Calling batch API for regu:', regu, 'course:', course);
      const response = await getExamBatch(regu, course);

      if (response.success && response.data) {
        // Store in localStorage with the regu as key for easy lookup
        const existingBatchData = JSON.parse(localStorage.getItem('examBatchApiData') || '{}');
        existingBatchData[regu] = response.data;
        localStorage.setItem('examBatchApiData', JSON.stringify(existingBatchData));
        console.log('Batch data stored in localStorage for regu', regu, ':', response.data);
      }
    } catch (error) {
      console.error('Error fetching batch data:', error);
    }
  };

  // Fetch batch data from API and store in localStorage (gets course from localStorage/form)
  const fetchAndStoreBatchData = async (regu) => {
    // Get course from localStorage
    const appData = getAppData();
    const course = appData?.course || formData.programme;
    await fetchAndStoreBatchDataWithCourse(regu, course);
  };

  // Handle batch details changes
  const handleBatchChange = (e) => {
    const { name, value } = e.target;
    const newBatchDetails = {
      ...batchDetails,
      [name]: value
    };
    setBatchDetails(newBatchDetails);

    // Call batch API only when sem field is entered and corresponding batch has a value
    // This prevents API calls while user is still typing the batch number
    if (name.startsWith('sem') && value && value.trim() !== '') {
      // Extract the row number (sem1 -> 1, sem2 -> 2, etc.)
      const rowNum = name.replace('sem', '');
      const batchFieldName = `batch${rowNum}`;
      const batchValue = newBatchDetails[batchFieldName];

      // Only call API if the corresponding batch field has a valid value
      if (batchValue && /^\d{1,2}$/.test(batchValue.trim())) {
        fetchAndStoreBatchData(batchValue.trim());
      }
    }
  };

  // Get placeholders for batch semester inputs based on Regular Sems selection
  const getSemesterPlaceholders = () => {
    if (formData.regularSems === 'Odd Semesters') {
      return ['7', '5', '3', '1'];
    } else if (formData.regularSems === 'Even Semesters') {
      return ['8', '6', '4', '2'];
    }
    return ['', '', '', ''];
  };

  // Check if Regular Batch Details section should be visible
  // .NET: Server-side controlled by Exam Type, shown for "Regular Only" and "Regular & Supplementary"
  // Client-side ChangeExamSems() defaults to visible, only hides for "Supply Semesters"
  const shouldShowBatchDetails = () => {
    // Primary condition: Exam Type must be "Regular Only" or "Regular & Supplementary"
    if (formData.examType !== 'Regular Only' && formData.examType !== 'Regular & Supplementary') {
      return false;
    }
    // Secondary condition: Hide if Supply Semesters selected
    if (formData.regularSems === 'Supply Semesters') {
      return false;
    }
    // Show by default (even if regularSems is empty)
    return true;
  };

  // Check if Extra Sems section should be visible
  // .NET: Server-side controlled by Exam Type, shown for "Supplementary" or "Regular & Supplementary"
  const shouldShowExtraSems = () => {
    // Show if Exam Type is Supplementary
    if (formData.examType === 'Supplementary') {
      return true;
    }
    // Show if Exam Type is Regular & Supplementary
    if (formData.examType === 'Regular & Supplementary') {
      return true;
    }
    return false;
  };

  // Check which extra sems to show (odd or even)
  const shouldShowOddSems = () => {
    // Show by default if nothing selected
    if (!formData.regularSems) return true;

    // Show ODD sems (1,3,5,7) when Even Semesters or Supply Semesters selected
    return formData.regularSems === 'Even Semesters' ||
      formData.regularSems === 'Supply Semesters' ||
      formData.examType === 'Supplementary';
  };

  const shouldShowEvenSems = () => {
    // Show by default if nothing selected
    if (!formData.regularSems) return true;

    // Show EVEN sems (2,4,6,8) when Odd Semesters or Supply Semesters selected
    return formData.regularSems === 'Odd Semesters' ||
      formData.regularSems === 'Supply Semesters' ||
      formData.examType === 'Supplementary';
  };

  // Handle extra semesters checkbox changes
  const handleExtraSemsChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      extraSems: {
        ...prev.extraSems,
        [name]: checked
      }
    }));
  };

  // Handle save
  const handleSave = async () => {
    // Validate required fields
    if (!formData.programme) {
      alert('Please Select Course');
      return;
    }

    if (!formData.examMonthYear) {
      alert('Please Select Exam Month & Year');
      return;
    }

    if (!formData.examType) {
      alert('Please Select Exam Type');
      return;
    }

    if (!formData.regularSems) {
      alert('Please Select Exam Semesters');
      return;
    }

    const selectedExtraSems = getExtraSemNumbers();

    // Match .NET validation logic exactly (by selectedIndex position)
    // In .NET: selectedIndex 0 = "Select", 1 = "Regular Only", 2 = "Regular & Supplementary", 3 = "Supplementary"
    // But .NET validation checks:
    //   - selectedIndex == 1 (Regular Only) → requires batch details
    //   - selectedIndex == 2 (Regular & Supplementary) → requires extra sems checkboxes

    // Validate batch details if exam type is "Regular Only" (matches .NET selectedIndex == 1)
    if (formData.examType === 'Regular Only') {
      const hasBatchData = (batchDetails.batch1 && batchDetails.sem1) ||
        (batchDetails.batch2 && batchDetails.sem2) ||
        (batchDetails.batch3 && batchDetails.sem3) ||
        (batchDetails.batch4 && batchDetails.sem4);

      if (!hasBatchData) {
        alert('Please Enter Batch Wise Sems');
        return;
      }
    }

    // Validate extra semesters if exam type is "Regular & Supplementary" (matches .NET selectedIndex == 2)
    // NOTE: .NET validation for this type ONLY checks extra sems, NOT batch details
    if (formData.examType === 'Regular & Supplementary') {
      if (!selectedExtraSems) {
        alert('Please Check The Exam Semesters');
        return;
      }
    }

    // Additional validation for Supply Semesters
    if (formData.regularSems === 'Supply Semesters' && !selectedExtraSems) {
      alert('Please Check The Exam Semesters');
      return;
    }

    // Check for duplicate exam notification
    const existingRecord = tableData.find(record =>
      record.regulation === formData.regulation &&
      record.course === formData.programme &&
      record.examMy === formData.examMonthYear
    );

    if (existingRecord) {
      const shouldContinue = window.confirm(
        `Exam notification already exists for:\n` +
        `Regulation: ${formData.regulation}\n` +
        `Programme: ${formData.programme}\n` +
        `Exam Month & Year: ${formData.examMonthYear}\n\n` +
        `Do you want to create a new record anyway?`
      );
      if (!shouldContinue) {
        return;
      }
    }

    const regularSemNumbers = getRegularSemNumbers();
    const batchSemNumbers = getBatchSupSemNumbers(); // Right side Regular Batch Details sem values
    const extraSemNumbers = selectedExtraSems; // Extra Sems checkboxes

    // Build payload exactly as per user requirements
    const payload = {
      examMY: formatMonthForApi(formData.examMonthYear), // Exam Month & Year field value
      eType: mapExamTypeToApi(formData.examType), // Exam Type: "Regular", "Regular & Supplementary", or "Supplementary"
      remarks: formData.remarks || '', // Remarks field value
      sems: batchSemNumbers, // Four semesters from right side Regular Batch Details container
      exSems: extraSemNumbers, // Extra sems that are ticked (space-separated numbers)
      course: formData.programme, // Programme field value
      regSem: batchSemNumbers, // Right side Regular Batch Details sem values (space-separated)
      supSem: '', // Will be set based on Exam Type
      regulation: formData.regulation, // Regulation field value
    };

    // Set supSem based on Exam Type
    if (formData.examType === 'Supplementary' || formData.examType === 'Regular & Supplementary') {
      // If Supplementary or Regular & Supplementary, supSem = extra sems selected
      payload.supSem = extraSemNumbers;
    } else {
      // For Regular Only, supSem is empty or batch sem numbers
      payload.supSem = batchSemNumbers;
    }

    // Create notification rows based on BOTH Regular Batch Details AND Extra Sems
    const rows = [];
    const allSemesters = new Set(); // Use Set to avoid duplicates
   
    // 1. Add semesters from Regular Batch Details (right side)
    const semKeys = ['sem1', 'sem2', 'sem3', 'sem4'];
    const batchSems = semKeys
      .map(key => batchDetails[key])
      .map(val => (val || '').trim())
      .filter(Boolean);
   
    batchSems.forEach(sem => allSemesters.add(sem));
   
    // 2. Add semesters from Extra Sems checkboxes (selected ones)
    Object.entries(formData.extraSems).forEach(([key, checked]) => {
      if (checked) {
        const semNumber = key.replace('sem', '');
        allSemesters.add(semNumber);
      }
    });
   
    // 3. Create one row per unique semester (both batch details AND extra sems)
    if (allSemesters.size > 0) {
      // Sort semesters numerically
      const sortedSems = Array.from(allSemesters).sort((a, b) => parseInt(a) - parseInt(b));
     
      sortedSems.forEach(semValue => {
        rows.push({
          ENID: '0',
          NNumber: '',
          Sem: semValue, // Both batch details AND extra sems
          NDate: '',
          ExRegDate: '',
          ExRegEndDate: '',
        });
      });
    } else {
      // No batch details or extra sems: Create single row with sem value from payload
      const initialSemValue = payload.sems || payload.regSem || '';
      rows.push({
        ENID: '0',
        NNumber: '',
        Sem: initialSemValue || '',
        NDate: '',
        ExRegDate: '',
        ExRegEndDate: '',
      });
    }

    // Call regsup/save API for each batch/sem entry in Regular Batch Details
    // Get batch data from localStorage
    const examBatchApiData = JSON.parse(localStorage.getItem('examBatchApiData') || '{}');
    const batchEntries = [];

    // Collect all batch/sem entries
    ['1', '2', '3', '4'].forEach((rowNum) => {
      const batchValue = batchDetails[`batch${rowNum}`];
      const semValue = batchDetails[`sem${rowNum}`];

      if (batchValue && semValue && batchValue.trim() !== '' && semValue.trim() !== '') {
        // Get the BATCH value from localStorage (e.g., "2020-2022")
        const batchApiData = examBatchApiData[batchValue.trim()];
        const batchYearRange = batchApiData && batchApiData.length > 0 ? batchApiData[0].BATCH : null;

        batchEntries.push({
          regu: batchValue.trim(),
          sem: parseInt(semValue.trim(), 10),
          batch: batchYearRange || '', // From localStorage examBatchApiData
        });
      }
    });

    // Call regsup/save API for each batch entry
    if (batchEntries.length > 0) {
      try {
        const regSupPromises = batchEntries.map((entry) => {
          const regSupPayload = {
            regu: entry.regu,
            sem: entry.sem,
            mode: 'R', // Static value
            examMy: formatMonthForApi(formData.examMonthYear),
            batch: entry.batch,
            course: formData.programme,
            cname: 'Computer Science Engineering', // Static value
          };

          console.log('Calling regsup/save API with payload:', regSupPayload);
          return saveExamRegSup(regSupPayload);
        });

        await Promise.all(regSupPromises);
        console.log('All regsup/save API calls completed successfully');
      } catch (error) {
        console.error('Error calling regsup/save API:', error);
        // Continue to show modal even if regsup API fails
      }
    }

    setPendingExamPayload(payload);

    // Fetch existing notifications from API and pre-fill the modal
    try {
      const notificationsResponse = await getExamNotifications(
        formatMonthForApi(formData.examMonthYear),
        formData.programme,
        formData.regulation
      );

      if (notificationsResponse.success && notificationsResponse.data && notificationsResponse.data.length > 0) {
        // Map API response to notification rows format
        const apiRows = notificationsResponse.data.map((item) => {
          // Convert date format from "2024-04-15T00:00:00" to "YYYY-MM-DD" for input[type="date"]
          const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
          };

          return {
            ENID: item.ENID?.toString() || '0',
            NNumber: item.NNUM || '',
            Sem: item.SEMESTERS?.toString() || '',
            NDate: formatDateForInput(item.NDATE),
            ExRegDate: formatDateForInput(item.EXREG_DATE),
            ExRegEndDate: formatDateForInput(item.EXREG_END_DATE),
          };
        });

        console.log('Pre-filled notification rows from API:', apiRows);
        setNotificationRows(apiRows);
      } else {
        // No existing notifications, use the default rows created earlier
        console.log('No existing notifications found, using default rows');
        setNotificationRows(rows);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If API fails, use the default rows
      setNotificationRows(rows);
    }

    setShowNotificationModal(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      regulation: '',
      programme: '',
      examMonthYear: '',
      examType: '',
      regularSems: '',
      remarks: '',
      extraSems: {
        sem1: false,
        sem2: false,
        sem3: false,
        sem4: false,
        sem5: false,
        sem6: false,
        sem7: false,
        sem8: false
      }
    });
    setBatchDetails({
      batch1: '',
      sem1: '',
      batch2: '',
      sem2: '',
      batch3: '',
      sem3: '',
      batch4: '',
      sem4: ''
    });
    setShowNotificationModal(false);
    setPendingExamPayload(null);
  };

  // Handle delete
  const handleDelete = async (id) => {
    const record = tableData.find(item => item.id === id);
    if (!record) {
      alert('Record not found');
      return;
    }

    const confirmMessage = `Do you want to delete this exam notification?\n\n` +
      `Regulation: ${record.regulation}\n` +
      `Course: ${record.course}\n` +
      `Exam M/Y: ${record.examMy}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);
     
      // Call delete API with aExamId
      const response = await deleteExam(id);
     
      console.log('Delete API Response:', response);
     
      if (response.success) {
        // Check if there are any warnings or errors in the response data
        let hasWarning = false;
        let warningMessage = '';
       
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Check if data contains warning messages
          const firstDataItem = response.data[0];
         
          console.log('Checking response.data for warnings:', firstDataItem);
         
          if (typeof firstDataItem === 'object' && firstDataItem !== null) {
            // Check all keys in the object for warning messages (including empty key "")
            const values = Object.values(firstDataItem);
            const keys = Object.keys(firstDataItem);
           
            // Also check keys for any warning text
            const allTexts = [...values, ...keys].filter(val => typeof val === 'string' && val.trim() !== '');
           
            const warningText = allTexts.find(val =>
              val && typeof val === 'string' &&
              (val.toLowerCase().includes('already registered') ||
               val.toLowerCase().includes('subjetcs') ||
               val.toLowerCase().includes('subjects') ||
               val.toLowerCase().includes('cannot delete') ||
               val.toLowerCase().includes('registered') ||
               val.toLowerCase().includes('notification'))
            );
           
            if (warningText) {
              hasWarning = true;
              warningMessage = warningText;
              console.log('Warning detected:', warningText);
            }
          } else if (typeof firstDataItem === 'string') {
            if (firstDataItem.toLowerCase().includes('already registered') ||
                firstDataItem.toLowerCase().includes('subjetcs') ||
                firstDataItem.toLowerCase().includes('subjects') ||
                firstDataItem.toLowerCase().includes('cannot delete')) {
              hasWarning = true;
              warningMessage = firstDataItem;
              console.log('Warning detected in string:', firstDataItem);
            }
          }
        }
       
        if (hasWarning) {
          // Show warning but don't delete - the backend didn't actually delete it
          alert(`Cannot delete: ${warningMessage}\n\nThis exam notification cannot be deleted because subjects are already registered for it.`);
         
          // Refresh to ensure UI is in sync with backend
          await fetchExistingExams();
        } else {
          // Successfully deleted
          alert('Record deleted successfully!');
         
          // Remove from local state immediately for better UX
          setTableData(prev => prev.filter(item => item.id !== id));
         
          // Refresh existing exams data from API to ensure sync
          await fetchExistingExams();
        }
      } else {
        throw new Error(response.message || 'Failed to delete exam');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert(error.message || 'Failed to delete exam. Please try again.');
     
      // Refresh table data on error to ensure UI is in sync
      await fetchExistingExams();
    } finally {
      setDeleting(false);
    }
  };

  // Handle export
  const handleExport = () => {
    alert('Export functionality will be implemented');
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor, '--theme-color-bg': themeColor + '15' }}>
      <div className={styles.box}>
        {/* Header */}
        <div className={styles.boxHeader}>
          <h2>
            <FaEdit className={styles.headerIcon} />
            Exam Master
          </h2>
          <div className={styles.boxIcon}>
            <button
              className={styles.minimizeBtn}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            >
              <FaChevronUp className={isFormCollapsed ? styles.rotated : ''} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.boxContent}>
          <div className={`${styles.formContainer} ${isFormCollapsed ? styles.collapsed : ''}`}>
            <fieldset>
              <div className={styles.formPanel}>
                <div className={styles.formSection}>
                  <div className={styles.formLeft}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Regulation<span className={styles.required}> *</span>
                        </label>
                        <select
                          name="regulation"
                          value={formData.regulation}
                          onChange={handleInputChange}
                          className={styles.dropdown}
                          disabled={regulationsLoading}
                        >
                          {regulationsLoading ? (
                            <option value="">Loading regulations...</option>
                          ) : regulations.length === 0 ? (
                            <option value="">No regulations available</option>
                          ) : (
                            <>
                              <option value="">Select Regulation</option>
                              {regulations.map(regulation => (
                                <option key={regulation} value={regulation}>{regulation}</option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Programme<span className={styles.required}> *</span>
                        </label>
                        <select
                          name="programme"
                          value={formData.programme}
                          onChange={handleInputChange}
                          className={styles.dropdown}
                          disabled={coursesLoading || !formData.regulation}
                        >
                          {!formData.regulation ? (
                            <option value="">Select Regulation First</option>
                          ) : coursesLoading ? (
                            <option value="">Loading courses...</option>
                          ) : courses.length === 0 ? (
                            <option value="">No courses available</option>
                          ) : (
                            <>
                              <option value="">Select Programme</option>
                              {courses.map(course => (
                                <option key={course} value={course}>{course}</option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Exam Month & Year<span className={styles.required}> *</span>
                        </label>
                        <div className={styles.monthInputContainer}>
                          <input
                            type="text"
                            name="examMonthYear"
                            value={formData.examMonthYear ? formatMonthDisplay(formData.examMonthYear) : ''}
                            onChange={() => { }} // Prevent direct typing
                            className={styles.input}
                            placeholder="MM-YYYY"
                            readOnly
                            onClick={() => document.getElementById('hiddenMonthPicker').showPicker()}
                          />
                          <input
                            id="hiddenMonthPicker"
                            type="month"
                            value={formData.examMonthYear}
                            onChange={handleInputChange}
                            name="examMonthYear"
                            style={{
                              position: 'absolute',
                              opacity: 0,
                              pointerEvents: 'none',
                              width: 0,
                              height: 0
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Exam Type<span className={styles.required}> *</span>
                        </label>
                        <select
                          name="examType"
                          value={formData.examType}
                          onChange={handleInputChange}
                          className={styles.dropdown}
                        >
                          <option value="">Select Exam Type</option>
                          {examTypeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Regular Sems<span className={styles.required}> *</span>
                        </label>
                        <select
                          name="regularSems"
                          value={formData.regularSems}
                          onChange={handleInputChange}
                          className={styles.dropdown}
                        >
                          <option value="">Select Exam Semesters</option>
                          {regularSemsOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Remarks</label>
                        <textarea
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Enter remarks..."
                        />
                      </div>
                    </div>

                    {/* Extra Sems Section - Only show if applicable */}
                    {shouldShowExtraSems() && (
                      <div className={styles.extraSemsSection}>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Extra Sems</label>
                            <div className={styles.checkboxGrid}>
                              {/* Odd Sems */}
                              {shouldShowOddSems() && (
                                <div className={styles.checkboxRow}>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem1"
                                      checked={formData.extraSems.sem1}
                                      onChange={handleExtraSemsChange}
                                    />
                                    1
                                  </label>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem3"
                                      checked={formData.extraSems.sem3}
                                      onChange={handleExtraSemsChange}
                                    />
                                    3
                                  </label>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem5"
                                      checked={formData.extraSems.sem5}
                                      onChange={handleExtraSemsChange}
                                    />
                                    5
                                  </label>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem7"
                                      checked={formData.extraSems.sem7}
                                      onChange={handleExtraSemsChange}
                                    />
                                    7
                                  </label>
                                </div>
                              )}
                              {/* Even Sems */}
                              {shouldShowEvenSems() && (
                                <div className={styles.checkboxRow}>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem2"
                                      checked={formData.extraSems.sem2}
                                      onChange={handleExtraSemsChange}
                                    />
                                    2
                                  </label>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem4"
                                      checked={formData.extraSems.sem4}
                                      onChange={handleExtraSemsChange}
                                    />
                                    4
                                  </label>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem6"
                                      checked={formData.extraSems.sem6}
                                      onChange={handleExtraSemsChange}
                                    />
                                    6
                                  </label>
                                  <label className={styles.checkbox}>
                                    <input
                                      type="checkbox"
                                      name="sem8"
                                      checked={formData.extraSems.sem8}
                                      onChange={handleExtraSemsChange}
                                    />
                                    8
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Regular Batch Details Section - Only show for Regular & Supplementary */}
                  {shouldShowBatchDetails() && (
                    <div className={styles.batchDetailsSection}>
                      <div className={styles.batchDetails}>
                        <div className={styles.batchHeader}>
                          <h3>Regular Batch Details</h3>
                        </div>
                        <div className={styles.batchGrid}>
                          <div className={styles.batchRow}>
                            <div className={styles.batchCell}>
                              <label>Batch</label>
                              <input
                                type="text"
                                name="batch1"
                                value={batchDetails.batch1}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                maxLength="2"
                              />
                            </div>
                            <div className={styles.batchCell}>
                              <label>Sem</label>
                              <input
                                type="text"
                                name="sem1"
                                value={batchDetails.sem1}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder={getSemesterPlaceholders()[0]}
                                maxLength="2"
                              />
                            </div>
                          </div>
                          <div className={styles.batchRow}>
                            <div className={styles.batchCell}>
                              <input
                                type="text"
                                name="batch2"
                                value={batchDetails.batch2}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder="15"
                                maxLength="2"
                              />
                            </div>
                            <div className={styles.batchCell}>
                              <input
                                type="text"
                                name="sem2"
                                value={batchDetails.sem2}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder={getSemesterPlaceholders()[1]}
                                maxLength="2"
                              />
                            </div>
                          </div>
                          <div className={styles.batchRow}>
                            <div className={styles.batchCell}>
                              <input
                                type="text"
                                name="batch3"
                                value={batchDetails.batch3}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder="16"
                                maxLength="2"
                              />
                            </div>
                            <div className={styles.batchCell}>
                              <input
                                type="text"
                                name="sem3"
                                value={batchDetails.sem3}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder={getSemesterPlaceholders()[2]}
                                maxLength="2"
                              />
                            </div>
                          </div>
                          <div className={styles.batchRow}>
                            <div className={styles.batchCell}>
                              <input
                                type="text"
                                name="batch4"
                                value={batchDetails.batch4}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder="17"
                                maxLength="2"
                              />
                            </div>
                            <div className={styles.batchCell}>
                              <input
                                type="text"
                                name="sem4"
                                value={batchDetails.sem4}
                                onChange={handleBatchChange}
                                className={styles.batchInput}
                                placeholder={getSemesterPlaceholders()[3]}
                                maxLength="2"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <button onClick={handleSave} className={styles.saveBtn} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancel} className={styles.cancelBtn} disabled={saving}>
                    Cancel
                  </button>
                  <button onClick={handleExport} className={styles.exportBtn} disabled={saving}>
                    Export Exams List
                  </button>
                </div>
              </div>
            </fieldset>
          </div>

          {/* Data Table */}
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>REGULATION</th>
                  <th>COURSE</th>
                  <th>EXAMMY</th>
                  <th>REGSEM</th>
                  <th>SUPSEM</th>
                  <th>SEMS</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan="7" className={styles.centerText}>
                      Loading existing exams...
                    </td>
                  </tr>
                ) : tableData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.centerText}>
                      No existing exams found
                    </td>
                  </tr>
                ) : (
                  tableData.map((record) => (
                    <tr key={record.id}>
                      <td>{record.regulation}</td>
                      <td className={styles.centerText}>{record.course}</td>
                      <td className={styles.centerText}>{record.examMy}</td>
                      <td className={styles.centerText}>{record.regSem}</td>
                      <td className={styles.centerText}>{record.supSem}</td>
                      <td className={styles.centerText}>{record.sems}</td>
                      <td className={styles.centerText}>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className={styles.deleteBtn}
                          title="Delete"
                          disabled={saving || deleting}
                        >
                          {deleting ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showNotificationModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Exam Nafications Released & End Date(s)</h3>
            </div>
            <div className={styles.modalBody}>
              {/* Table format matching .NET GridView */}
              <table className={styles.notificationTable}>
                <thead>
                  <tr>
                    <th>Notification Number</th>
                    <th>SEMESTERS</th>
                    <th>Notification Date</th>
                    <th>Registration Starting Date</th>
                    <th>Registration Ending Date</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationRows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={row.NNumber}
                          onChange={(e) => {
                            const newRows = [...notificationRows];
                            newRows[index].NNumber = e.target.value;
                            setNotificationRows(newRows);
                          }}
                          placeholder="Enter notification number"
                          disabled={saving}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={row.Sem}
                          disabled={true}
                          style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className={styles.tableInput}
                          value={row.NDate}
                          onChange={(e) => {
                            const newRows = [...notificationRows];
                            newRows[index].NDate = e.target.value;
                            setNotificationRows(newRows);
                          }}
                          placeholder="DD-MM-YYYY"
                          disabled={saving}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className={styles.tableInput}
                          value={row.ExRegDate}
                          onChange={(e) => {
                            const newRows = [...notificationRows];
                            newRows[index].ExRegDate = e.target.value;
                            setNotificationRows(newRows);
                          }}
                          placeholder="DD-MM-YYYY"
                          disabled={saving}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className={styles.tableInput}
                          value={row.ExRegEndDate}
                          onChange={(e) => {
                            const newRows = [...notificationRows];
                            newRows[index].ExRegEndDate = e.target.value;
                            setNotificationRows(newRows);
                          }}
                          placeholder="DD-MM-YYYY"
                          disabled={saving}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalPrimaryBtn}
                onClick={async () => {
                  if (!pendingExamPayload) return;

                  // Validate all rows
                  for (let i = 0; i < notificationRows.length; i++) {
                    const row = notificationRows[i];
                    if (!row.NNumber) {
                      alert(`Please enter notification number for row ${i + 1}`);
                      return;
                    }
                    if (!row.Sem) {
                      alert(`Please enter semesters for row ${i + 1}`);
                      return;
                    }
                    if (!row.NDate || !row.ExRegDate || !row.ExRegEndDate) {
                      alert(`Please select all notification dates for row ${i + 1}`);
                      return;
                    }
                  }

                  try {
                    setSaving(true);

                    // Format NNumber: Ensure it starts with "N" followed by numbers only
                    const formatNNumber = (input) => {
                      if (!input) return '';
                      // Remove any existing "N" prefix and extract numbers only
                      const numbers = input.replace(/^N/i, '').replace(/[^0-9]/g, '');
                      // Return "N" + numbers (or empty if no numbers)
                      return numbers ? `N${numbers}` : '';
                    };

                    // Get first notification date (as per user requirement: first date)
                    const firstNDate = notificationRows
                      .map(row => row.NDate)
                      .filter(Boolean)
                      .sort()[0] || '';

                    // Get first registration starting date and last ending date
                    const allExRegDates = notificationRows
                      .map(row => row.ExRegDate)
                      .filter(Boolean)
                      .sort();
                    const allExRegEndDates = notificationRows
                      .map(row => row.ExRegEndDate)
                      .filter(Boolean)
                      .sort();

                    const firstExRegDate = allExRegDates.length > 0 ? allExRegDates[0] : '';
                    const lastExRegEndDate = allExRegEndDates.length > 0 ? allExRegEndDates[allExRegEndDates.length - 1] : '';

                    // Send one API call per notification row (as per user: don't store in array)
                    const promises = notificationRows.map(async (row) => {
                      // Construct payload exactly matching the sample API structure (flat structure)
                      const payload = {
                        examMY: pendingExamPayload.examMY,
                        eType: pendingExamPayload.eType,
                        remarks: pendingExamPayload.remarks,
                        sems: pendingExamPayload.sems,
                        exSems: pendingExamPayload.exSems,
                        course: pendingExamPayload.course,
                        regSem: pendingExamPayload.regSem,
                        supSem: pendingExamPayload.supSem,
                        regulation: pendingExamPayload.regulation,
                        ENID: row.ENID || '0',
                        NNumber: formatNNumber(row.NNumber),
                        Sem: row.Sem.trim(),
                        NDate: row.NDate || firstNDate,
                        ExRegDate: row.ExRegDate || firstExRegDate,
                        ExRegEndDate: row.ExRegEndDate || lastExRegEndDate
                      };

                      return saveExamWithNotification(payload);
                    });

                    // Wait for all requests to complete
                    await Promise.all(promises);

                    alert('Exam notification saved successfully!');

                    // Clear examBatchApiData from localStorage after successful save
                    localStorage.removeItem('examBatchApiData');
                    console.log('Cleared examBatchApiData from localStorage');

                    // Save regular batch details to localStorage (device storage)
                    // Store only non-empty batch details (sem values) for future reference
                    try {
                      // Filter out empty/blank values before saving
                      const filteredBatchDetails = Object.keys(batchDetails).reduce((acc, key) => {
                        const value = batchDetails[key];
                        // Only include non-empty values
                        if (value && value.trim() !== '') {
                          acc[key] = value;
                        }
                        return acc;
                      }, {});
                     
                      // Only save if there are any non-empty values
                      if (Object.keys(filteredBatchDetails).length > 0) {
                        localStorage.setItem('examBatchDetails', JSON.stringify(filteredBatchDetails));
                        console.log('Saved batch details to localStorage (non-empty only):', filteredBatchDetails);
                      } else {
                        // Remove from localStorage if all values are empty
                        localStorage.removeItem('examBatchDetails');
                        console.log('All batch details are empty, removed from localStorage');
                      }
                    } catch (error) {
                      console.error('Error saving batch details to localStorage:', error);
                    }
                   
                    setShowNotificationModal(false);
                    setPendingExamPayload(null);
                   
                    // Refresh table with current form data (new saved exam)
                    // masterlist API only needs regulation and course (examMY is not required)
                    await fetchExistingExams(
                      pendingExamPayload.regulation,
                      null, // examMY not required for masterlist API
                      pendingExamPayload.course
                    );
                   
                    // Clear form but keep batch details in localStorage
                    handleCancel();
                  } catch (error) {
                    console.error('Error saving exam notification with dates:', error);
                    alert(error.message || 'Failed to save exam notification');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamNotifications; 