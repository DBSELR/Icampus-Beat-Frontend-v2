import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaUser, FaChevronUp, FaSave, FaFileExport, FaCalendarAlt } from 'react-icons/fa';
import { getTimeTableSeatingSems, getTimeTableSeatingTimetable, getTimeTableSeatingPapers, getTimeTableSeatingDates, getTimeTableSeatingPaperData, getTimeTableSeatingRAPapers, getTimeTableSeatingRAPaperData, searchRooms, getTimeTableSeatingExportFormat, saveRoomAllotment, saveExamDate, saveExamSession, getTimeTableSeatingBranches, getAppData } from '../utils/api';
import styles from './TimeTableSeating.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const TimeTableSeating = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Tab state
  const [activeTab, setActiveTab] = useState('exam-sessions');

  // Exam Sessions & Dates form data
  const [examSessionForm, setExamSessionForm] = useState({
    examType: '',
    semester: '',
    course: '',
    branch: '',
    examDate: '',
    session: '',
    examTime: '09:00 AM TO 12:00 PM',
    remarks: ''
  });

  // Room Allotment form data
  const [roomAllotmentForm, setRoomAllotmentForm] = useState({
    semester: '',
    examDate: '',
    course: '',
    fromRegNo: '',
    toRegNo: '',
    roomNumber: ''
  });

  // Table data for Exam Sessions
  const [examSessionsData, setExamSessionsData] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Table data for Room Allotment
  const [roomAllotmentData, setRoomAllotmentData] = useState([]);

  // Semester options from API
  const [semesterOptions, setSemesterOptions] = useState(['Select Semester']);
  const [semestersLoading, setSemestersLoading] = useState(false);

  // Course options from API (for Exam Sessions tab)
  const [courseOptions, setCourseOptions] = useState(['Select Course']);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseObjects, setCourseObjects] = useState([]); // Store full course objects with pcode

  // Room Allotment course options from API (separate from Exam Sessions)
  const [raCourseOptions, setRACourseOptions] = useState(['Select Course']);
  const [raCoursesLoading, setRACoursesLoading] = useState(false);
  const [raCourseObjects, setRACourseObjects] = useState([]); // Store full RA course objects with pcode

  // Loading state for RA paper data
  const [raPaperDataLoading, setRAPaperDataLoading] = useState(false);

  // Exam date options from API
  const [examDateOptions, setExamDateOptions] = useState(['Select Exam Date']);
  const [examDatesLoading, setExamDatesLoading] = useState(false);

  // Loading state for paper data
  const [paperDataLoading, setPaperDataLoading] = useState(false);

  // Room autocomplete state
  const [roomSuggestions, setRoomSuggestions] = useState([]);
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [roomSearchLoading, setRoomSearchLoading] = useState(false);
  const roomInputRef = useRef(null);
  const roomDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Branch options from API
  const [branchOptions, setBranchOptions] = useState(['Select Branch']);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Dropdown options
  const examTypeOptions = ['Select ExamType', 'External', 'MID-I', 'MID-II'];
  const sessionOptions = ['Select Session', 'Forenoon', 'Afternoon'];

  // Fetch semesters from API
  const fetchSemesters = async () => {
    try {
      setSemestersLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        setSemesterOptions(['Select Semester']);
        return;
      }

      const response = await getTimeTableSeatingSems(
        appData.course,
        appData.examMY,
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        const semesters = ['Select Semester', ...response.data.map(item => item.SEM || item.sem || item)];
        setSemesterOptions(semesters);
      } else {
        setSemesterOptions(['Select Semester']);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setSemesterOptions(['Select Semester']);
    } finally {
      setSemestersLoading(false);
    }
  };

  // Fetch exam dates from API
  const fetchExamDates = async (semester) => {
    if (!semester || semester === 'Select Semester') {
      setExamDateOptions(['Select Exam Date']);
      return;
    }

    try {
      setExamDatesLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        setExamDateOptions(['Select Exam Date']);
        return;
      }

      const response = await getTimeTableSeatingDates(
        appData.course,
        appData.examMY,
        semester,
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        const dates = ['Select Exam Date', ...response.data.map(item => {
          return item.EDATE || item.edate || item.EDate || '';
        }).filter(item => item !== '')];
        setExamDateOptions(dates);
      } else {
        setExamDateOptions(['Select Exam Date']);
      }
    } catch (error) {
      console.error('Error fetching exam dates:', error);
      setExamDateOptions(['Select Exam Date']);
    } finally {
      setExamDatesLoading(false);
    }
  };

  // Convert date to YYYY-MM-DD for API
  const convertDateToAPIFormat = (dateString) => {
    if (!dateString || dateString === 'Select Exam Date' || dateString === '') return '';
    // If it's already in YYYY-MM-DD format (from date input), return as is
    if (dateString.includes('-') && dateString.split('-')[0].length === 4) {
      return dateString.split('T')[0]; // Remove time part if present
    }
    // If it's in DD-MM-YYYY format, convert to YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length === 3 && parts[0].length === 2) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Try to parse as Date object and format
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Ignore parse errors
    }
    return dateString;
  };

  // Fetch branches from API (for Exam Sessions tab)
  const fetchBranches = async (semester) => {
    if (!semester || semester === 'Select Semester') {
      setBranchOptions(['Select Branch']);
      return;
    }

    try {
      setBranchesLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        setBranchOptions(['Select Branch']);
        return;
      }

      const response = await getTimeTableSeatingBranches(
        appData.course,
        appData.examMY,
        semester,
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        const branches = ['Select Branch', ...response.data.map(item => {
          return item.GRP || item.grp || '';
        }).filter(item => item !== '')];
        setBranchOptions(branches);
      } else {
        setBranchOptions(['Select Branch']);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranchOptions(['Select Branch']);
    } finally {
      setBranchesLoading(false);
    }
  };

  // Fetch courses/papers from API (for Exam Sessions tab)
  // NOTE: Per new flow, examDate should NOT control loading/filtering of courses.
  const fetchCourses = async (semester) => {
    if (!semester || semester === 'Select Semester') {
      setCourseOptions(['Select Course']);
      return;
    }

    try {
      setCoursesLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        setCourseOptions(['Select Course']);
        return;
      }

      const response = await getTimeTableSeatingPapers(
        appData.course,
        appData.examMY,
        semester,
        '', // Do not filter papers by exam date; date is only for saving/updating
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        // Store full course objects
        setCourseObjects(response.data);

        // Create display options with PCODE-PNAME format
        const courses = ['Select Course', ...response.data.map(item => {
          const pcode = item.PCode || item.pCode || item.PCODE || '';
          const pname = item.PName || item.pName || item.PNAME || '';
          return pcode && pname ? `${pcode} - ${pname}` : (pname || pcode || '');
        }).filter(item => item !== '')];
        setCourseOptions(courses);
      } else {
        setCourseObjects([]);
        setCourseOptions(['Select Course']);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourseOptions(['Select Course']);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Fetch Room Allotment courses/papers from API (same API as Timetable tab)
  // examDate is optional - if provided, it filters the courses
  const fetchRACourses = async (semester, examDate = null) => {
    if (!semester || semester === 'Select Semester') {
      setRACourseOptions(['Select Course']);
      return;
    }

    try {
      setRACoursesLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        setRACourseOptions(['Select Course']);
        return;
      }

      // Convert DD-MM-YYYY to YYYY-MM-DD for API (only if examDate is provided)
      const formattedDate = examDate && examDate !== '' && examDate !== 'Select Exam Date' 
        ? convertDateToAPIFormat(examDate) 
        : '';

      // Use the same papers API as Timetable tab (not ra/papers)
      const response = await getTimeTableSeatingPapers(
        appData.course,
        appData.examMY,
        semester,
        formattedDate,
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        // Store full course objects
        setRACourseObjects(response.data);

        // Create display options with PCODE-PNAME format (same as Timetable tab)
        const courses = ['Select Course', ...response.data.map(item => {
          const pcode = item.PCode || item.pCode || item.PCODE || '';
          const pname = item.PName || item.pName || item.PNAME || '';
          return pcode && pname ? `${pcode} - ${pname}` : (pname || pcode || '');
        }).filter(item => item !== '')];
        setRACourseOptions(courses);
      } else {
        setRACourseObjects([]);
        setRACourseOptions(['Select Course']);
      }
    } catch (error) {
      console.error('Error fetching RA courses:', error);
      setRACourseObjects([]);
      setRACourseOptions(['Select Course']);
    } finally {
      setRACoursesLoading(false);
    }
  };

  // Helper function to convert session name to code (returns '1' for Forenoon, '2' for Afternoon)
  const convertSessionToCode = (sessionName) => {
    if (sessionName === 'Forenoon') return '1';
    if (sessionName === 'Afternoon') return '2';
    return sessionName; // Return as is if already a code or empty
  };

  // Helper function to format ESESS for display (FN -> '1', AN -> '2')
  const formatESESS = (esess) => {
    if (!esess) return '';
    const esessUpper = esess.toString().toUpperCase().trim();
    if (esessUpper === 'FN') return '1';
    if (esessUpper === 'AN') return '2';
    // If already '1' or '2', return as is
    if (esessUpper === '1' || esessUpper === '2') return esessUpper;
    return esess; // Return as is for any other value
  };

  // Fetch paper data when all required fields are selected
  const fetchPaperData = async (examType, semester, course, branch = null, session = null) => {
    if (!examType || examType === 'Select ExamType' ||
      !semester || semester === 'Select Semester' ||
      !course || course === 'Select Course') {
      return;
    }

    try {
      setPaperDataLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        return;
      }

      // Extract pcode from the selected course (format: "PCODE - PNAME")
      const pcode = course.split(' - ')[0];

      const response = await getTimeTableSeatingPaperData(
        appData.course,
        appData.examMY,
        semester,
        pcode,
        appData.regulation,
        examType
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        // Map and filter data
        let mappedData = response.data.map((item, index) => {
          const pcode = item.PCODE || item.pCode || item.PCode || item.Pcode || item.CourseCode || item.courseCode || item.COURSE_CODE || '';
          const pname = item.PNAME || item.pName || item.PName || item.Pname || item.CourseName || item.courseName || item.COURSE_NAME || '';
          const itemBranch = item.GRP || item.grp || item.BRANCH || item.branch || item.Branch || '';
          
          return {
            id: item.ASHID || item.ashid || item.AshId || index + 1,
            GRP: itemBranch, // Branch from API (will be overridden if branch is selected in form)
            REGNO: item.REGNO || item.regNo || item.RegNo || item.REG_NO || item.reg_no || '',
            SEM: item.SEM || item.sem || item.Sem || item.SEMESTER || item.semester || '',
            PCODE: pcode,
            PNAME: pname,
            ESESS: item.ESESS || item.esess || item.ESess || item.E_SESS || item.e_sess || '',
            EDATE: item.EDATE || item.edate || item.EDate || item.E_DATE || item.e_date || ''
          };
        });

        // Don't filter by branch here - we want to show all data
        // Branch will be applied to all rows when selected in the form
        // This allows all columns to be populated with the selected branch data

        // Apply session filter if session is selected
        if (session && session !== 'Select Session' && session !== '') {
          const sessionCode = convertSessionToCode(session); // Returns '1' or '2'
          mappedData = mappedData.filter(item => {
            const itemSession = (item.ESESS || '').toString().toUpperCase().trim();
            // Handle both new format ('1'/'2') and old format ('FN'/'AN') for backward compatibility
            if (sessionCode === '1') {
              return itemSession === '1' || itemSession === 'FN';
            } else if (sessionCode === '2') {
              return itemSession === '2' || itemSession === 'AN';
            }
            return itemSession === sessionCode.toUpperCase();
          });
        }

        // If branch is selected in form, apply it to ALL rows (fill all columns)
        if (branch && branch !== 'Select Branch' && branch !== '') {
          mappedData = mappedData.map(item => ({
            ...item,
            GRP: branch // Set the selected branch for all rows
          }));
        }

        setExamSessionsData(mappedData);
      } else {
        setExamSessionsData([]);
      }
    } catch (error) {
      console.error('Error fetching paper data:', error);
      setExamSessionsData([]);
    } finally {
      setPaperDataLoading(false);
    }
  };

  // Fetch Room Allotment paper data when all required fields are selected
  const fetchRAPaperData = async (semester, examDate, course) => {
    if (!semester || semester === 'Select Semester' ||
      !course || course === 'Select Course') {
      return;
    }

    // examDate is optional for fetching paper data
    if (!examDate || examDate === '' || examDate === 'Select Exam Date') {
      // If no exam date, we still need it for the API, so return early
      // But we can fetch data without date filter if needed
      return;
    }

    try {
      setRAPaperDataLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        return;
      }

      // Extract pcode from the selected course (format: "PCODE - PNAME")
      const pcode = course.split(' - ')[0];

      if (!pcode) {
        console.error('Could not extract PCODE from selected course:', course);
        setRoomAllotmentData([]);
        return;
      }

      // Convert DD-MM-YYYY to YYYY-MM-DD for API
      const formattedDate = convertDateToAPIFormat(examDate);

      const response = await getTimeTableSeatingRAPaperData(
        appData.course,
        appData.examMY,
        semester,
        pcode,
        formattedDate,
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        // Map the data to ensure consistent field names
        let mappedData = response.data.map((item, index) => {
          return {
            id: item.ASHID || item.ashid || item.AshId || index + 1,
            GRP: item.GRP || item.grp || '',
            REGNO: item.REGNO || item.regNo || item.RegNo || item.REG_NO || item.reg_no || '',
            PCODE: item.PCODE || item.pCode || item.PCode || item.Pcode || '',
            PNAME: item.PNAME || item.pName || item.PName || item.Pname || '',
            ESESS: item.ESESS || item.esess || item.ESess || item.E_SESS || item.e_sess || '',
            EDATE: item.EDATE || item.edate || item.EDate || item.E_DATE || item.e_date || '',
            ROOM: item.ROOM || item.room || item.Room || ''
          };
        });

        setRoomAllotmentData(mappedData);
      } else {
        setRoomAllotmentData([]);
      }
    } catch (error) {
      console.error('Error fetching RA paper data:', error);
      setRoomAllotmentData([]);
    } finally {
      setRAPaperDataLoading(false);
    }
  };

  // Search rooms with debouncing
  const handleRoomSearch = useCallback(async (searchText) => {
    if (!searchText || searchText.trim().length === 0) {
      setRoomSuggestions([]);
      setShowRoomSuggestions(false);
      return;
    }

    try {
      setRoomSearchLoading(true);
      const response = await searchRooms(searchText);

      if (response.success && response.data && Array.isArray(response.data)) {
        setRoomSuggestions(response.data);
        setShowRoomSuggestions(response.data.length > 0);
        setSelectedSuggestionIndex(-1);
      } else {
        setRoomSuggestions([]);
        setShowRoomSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching rooms:', error);
      setRoomSuggestions([]);
      setShowRoomSuggestions(false);
    } finally {
      setRoomSearchLoading(false);
    }
  }, []);

  // Handle room number input change with debouncing
  const handleRoomNumberChange = (e) => {
    const value = e.target.value;
    setRoomAllotmentForm(prev => ({
      ...prev,
      roomNumber: value
    }));

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (value.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        handleRoomSearch(value);
      }, 300); // 300ms debounce
    } else {
      setRoomSuggestions([]);
      setShowRoomSuggestions(false);
    }
  };

  // Handle room suggestion selection
  const handleRoomSelect = (roomNo) => {
    setRoomAllotmentForm(prev => ({
      ...prev,
      roomNumber: roomNo
    }));
    setShowRoomSuggestions(false);
    setRoomSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation in room suggestions
  const handleRoomKeyDown = (e) => {
    if (!showRoomSuggestions || roomSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < roomSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < roomSuggestions.length) {
          handleRoomSelect(roomSuggestions[selectedSuggestionIndex].ROOMNO);
        }
        break;
      case 'Escape':
        setShowRoomSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        roomDropdownRef.current &&
        !roomDropdownRef.current.contains(event.target) &&
        roomInputRef.current &&
        !roomInputRef.current.contains(event.target)
      ) {
        setShowRoomSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load semesters on component mount
  useEffect(() => {
    fetchSemesters();
  }, []);

  // Format date from ISO string to DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Fetch timetable data
  const fetchTimetableData = async (semester) => {
    if (!semester || semester === 'Select Semester') {
      setExamSessionsData([]);
      return;
    }

    try {
      setTimetableLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        setExamSessionsData([]);
        return;
      }

      const response = await getTimeTableSeatingTimetable(
        appData.course,
        appData.examMY,
        semester,
        appData.regulation
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('Timetable API response (first item):', response.data[0]); // Debug log
        
        // Map API response to table format - preserve original field names for table rendering
        const mappedData = response.data.map((item, index) => {
          // Try multiple field name variations for Course Code and Course Name
          const pcode = item.PCODE || item.pCode || item.PCode || item.Pcode || item.CourseCode || item.courseCode || item.COURSE_CODE || '';
          const pname = item.PNAME || item.pName || item.PName || item.Pname || item.CourseName || item.courseName || item.COURSE_NAME || '';
          // Get branch - don't fallback to course name, leave empty if not found
          const branch = item.GRP || item.grp || item.BRANCH || item.branch || item.Branch || '';
          
          return {
            id: item.ASHID || item.ashid || item.AshId || index + 1,
            GRP: branch, // Branch from API (don't use course as fallback)
            REGNO: item.REGNO || item.regNo || item.RegNo || item.REG_NO || item.reg_no || '',
            SEM: item.SEM || item.sem || item.Sem || item.SEMESTER || item.semester || '',
            PCODE: pcode, // Course Code
            PNAME: pname, // Course Name
            ESESS: item.ESESS || item.esess || item.ESess || item.E_SESS || item.e_sess || '',
            EDATE: item.EDATE || item.edate || item.EDate || item.E_DATE || item.e_date || ''
          };
        });

        console.log('Timetable data mapped (first item):', mappedData[0]); // Debug log
        setExamSessionsData(mappedData);
      } else {
        setExamSessionsData([]);
      }
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      setExamSessionsData([]);
    } finally {
      setTimetableLoading(false);
    }
  };

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return examSessionsData.slice(start, start + pageSize);
  }, [examSessionsData, currentPage, pageSize]);

  // Filtered Room Allotment data based on registration number range and room number
  const filteredRoomAllotmentData = useMemo(() => {
    if (!roomAllotmentData || roomAllotmentData.length === 0) {
      return [];
    }

    let filtered = [...roomAllotmentData];

    // Apply registration number range filter
    const fromRegNo = roomAllotmentForm.fromRegNo?.trim().toUpperCase();
    const toRegNo = roomAllotmentForm.toRegNo?.trim().toUpperCase();

    if (fromRegNo || toRegNo) {
      filtered = filtered.filter(item => {
        const regNo = (item.REGNO || item.regNo || item.RegNo || '').toString().toUpperCase();
        
        if (!regNo) return false;

        let matches = true;

        // Compare registration numbers as strings (lexicographic comparison works for this format)
        if (fromRegNo) {
          matches = matches && regNo >= fromRegNo;
        }

        if (toRegNo) {
          matches = matches && regNo <= toRegNo;
        }

        return matches;
      });
    }

    // Apply room number filter
    const roomNumber = roomAllotmentForm.roomNumber?.trim().toUpperCase();
    if (roomNumber && roomNumber !== '') {
      filtered = filtered.filter(item => {
        const itemRoom = (item.ROOM || item.room || item.Room || '').toString().toUpperCase();
        // Case-insensitive partial match for room number
        return itemRoom.includes(roomNumber) || roomNumber.includes(itemRoom);
      });
    }

    return filtered;
  }, [roomAllotmentData, roomAllotmentForm.fromRegNo, roomAllotmentForm.toRegNo, roomAllotmentForm.roomNumber]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(examSessionsData.length / pageSize));
  }, [examSessionsData.length, pageSize]);

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [examSessionsData.length]);

  // Handle exam session form changes (Exam Sessions & Dates tab)
  const handleExamSessionChange = (e) => {
    const { name, value } = e.target;
    setExamSessionForm(prev => ({
      ...prev,
      [name]: value
    }));

    // If semester is changed, fetch branches, timetable data, and courses
    // Date is NOT used for loading/filtering (per new flow)
    if (name === 'semester') {
      fetchTimetableData(value);
      fetchBranches(value);
      fetchCourses(value); // Load papers for this semester (no date filter)
      // Reset course and branch when semester changes; keep exam date as user may re-use it
      setExamSessionForm(prev => ({
        ...prev,
        course: '',
        branch: ''
      }));
      // Clear paper data
      setExamSessionsData([]);
    }

    // If branch changes, refetch paper data and populate all rows with selected branch
    // Session and Exam Time are NOT used for filtering - only for saving/updating
    if (name === 'branch') {
      const updatedForm = {
        ...examSessionForm,
        [name]: value
      };
      // If all required fields are selected, refetch with branch to populate all rows
      if (updatedForm.examType && updatedForm.examType !== 'Select ExamType' &&
        updatedForm.semester && updatedForm.semester !== 'Select Semester' &&
        updatedForm.course && updatedForm.course !== 'Select Course') {
        // Pass the selected branch - fetchPaperData will apply it to ALL rows
        const branchToApply = value && value !== 'Select Branch' ? value : null;
        fetchPaperData(updatedForm.examType, updatedForm.semester, updatedForm.course, branchToApply, null);
      } else {
        // If filter is selected but other fields aren't ready, just clear data
        setExamSessionsData([]);
      }
      return; // Don't continue with other logic
    }

    // If session or examTime changes, don't fetch data - these are only for saving/updating
    if (name === 'session' || name === 'examTime') {
      return; // Just update the form state, don't fetch data
    }

    // If examType, semester, or course changes, fetch paper data
    const updatedForm = {
      ...examSessionForm,
      [name]: value
    };

    // Check if all required fields are selected to fetch paper data
    if (updatedForm.examType && updatedForm.examType !== 'Select ExamType' &&
      updatedForm.semester && updatedForm.semester !== 'Select Semester' &&
      updatedForm.course && updatedForm.course !== 'Select Course') {
      // Pass the selected branch - fetchPaperData will apply it to ALL rows
      const branchToApply = updatedForm.branch && updatedForm.branch !== 'Select Branch' ? updatedForm.branch : null;
      fetchPaperData(updatedForm.examType, updatedForm.semester, updatedForm.course, branchToApply, null);
    } else if (name === 'examType' || name === 'course') {
      // Clear paper data if any of these fields changes to invalid value
      setExamSessionsData([]);
    }
  };

  // Handle room allotment form changes
  const handleRoomAllotmentChange = (e) => {
    const { name, value } = e.target;
    setRoomAllotmentForm(prev => ({
      ...prev,
      [name]: value
    }));

    // If semester is changed, fetch exam dates and courses
    if (name === 'semester') {
      fetchExamDates(value);
      fetchRACourses(value); // Load courses when semester is selected (examDate is optional)
      // Reset exam date and course when semester changes
      setRoomAllotmentForm(prev => ({
        ...prev,
        examDate: '',
        course: ''
      }));
      // Clear table data
      setRoomAllotmentData([]);
    }

    // If examDate is changed, refetch courses with the new date filter
    if (name === 'examDate') {
      const updatedForm = {
        ...roomAllotmentForm,
        [name]: value
      };
      // Reset course selection when exam date changes
      setRoomAllotmentForm(prev => ({
        ...prev,
        course: ''
      }));
      // Clear table data
      setRoomAllotmentData([]);
      
      // Refetch courses with the new exam date filter (if semester is selected)
      if (updatedForm.semester && updatedForm.semester !== 'Select Semester') {
        const isValidDate = updatedForm.examDate && updatedForm.examDate !== '' && updatedForm.examDate !== 'Select Exam Date';
        fetchRACourses(updatedForm.semester, isValidDate ? updatedForm.examDate : null);
      }
    }

    // Check if all required fields are filled to fetch paper data
    const updatedForm = {
      ...roomAllotmentForm,
      [name]: value
    };

    const isValidDate = updatedForm.examDate && updatedForm.examDate !== '' && updatedForm.examDate !== 'Select Exam Date';
    if (updatedForm.semester &&
      updatedForm.semester !== 'Select Semester' &&
      isValidDate &&
      updatedForm.course &&
      updatedForm.course !== 'Select Course') {
      // Fetch paper data for the table
      fetchRAPaperData(updatedForm.semester, updatedForm.examDate, updatedForm.course);
    } else if (name === 'semester' || name === 'examDate' || name === 'course') {
      // Clear table data if any of these fields changes to invalid value
      setRoomAllotmentData([]);
    }
  };


  // Handle exam session save
  const handleExamSessionSave = async () => {
    try {
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        alert('Missing required data. Please ensure regulation, course, and exam month/year are set.');
        return;
      }

      // Find the pcode from the selected course name (format: "PCODE - PNAME")
      const pcode = examSessionForm.course.split(' - ')[0];

      // Convert exam date to YYYY-MM-DD format if needed
      const formattedDate = convertDateToAPIFormat(examSessionForm.examDate);

      // Convert session to 1/2 format (1 for Forenoon, 2 for Afternoon)
      let sessionCode = '';
      if (examSessionForm.session === 'Forenoon') {
        sessionCode = '1';
      } else if (examSessionForm.session === 'Afternoon') {
        sessionCode = '2';
      }

      // Prepare API payload
      const examDateData = {
        examMy: appData.examMY,
        course: appData.course,
        sem: parseInt(examSessionForm.semester) || 0,
        pCode: pcode,
        eDate: formattedDate,
        session: sessionCode,
        examTime: examSessionForm.examTime,
        regulation: appData.regulation,
        branch: examSessionForm.branch,
        examType: examSessionForm.examType,
        remarks: examSessionForm.remarks || ''
      };

      // Call API to save exam date
      const response = await saveExamDate(examDateData);

      if (response.success) {
        // Refresh the exam sessions data to get updated values from backend
        // Pass the selected branch - fetchPaperData will apply it to ALL rows
        const branchToApply = examSessionForm.branch && examSessionForm.branch !== 'Select Branch' ? examSessionForm.branch : null;
        await fetchPaperData(examSessionForm.examType, examSessionForm.semester, examSessionForm.course, branchToApply, null);

        // Only reset the fields that were just saved (date, time, remarks)
        // Keep examType, semester, course, branch, session so user can see their saved data
        setExamSessionForm(prev => ({
          ...prev,
          examDate: '',
          examTime: '09:00 AM TO 12:00 PM',
          remarks: ''
        }));

        // Show success message from backend or default message
        alert(response.message || 'Exam session saved successfully!');
      } else {
        // Show error message from backend
        alert(response.message || 'Failed to save exam session. Please try again.');
      }
    } catch (error) {
      console.error('Error saving exam session:', error);
      // Show error message from backend if available
      const errorMessage = error.message || 'Failed to save exam session. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle session save (for saving session times for all courses in a semester)
  const handleSessionSave = async () => {
    try {
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        alert('Missing required data. Please ensure regulation, course, and exam month/year are set.');
        return;
      }

      // Convert session to 1/2 format (1 for Forenoon, 2 for Afternoon)
      let sessionCode = '';
      if (examSessionForm.session === 'Forenoon') {
        sessionCode = '1';
      } else if (examSessionForm.session === 'Afternoon') {
        sessionCode = '2';
      }

      // Prepare API payload
      const sessionData = {
        examMy: appData.examMY,
        course: appData.course,
        sem: parseInt(examSessionForm.semester) || 0,
        session: sessionCode,
        examTime: examSessionForm.examTime,
        regulation: appData.regulation
      };

      // Call API to save exam session
      const response = await saveExamSession(sessionData);

      if (response.success) {
        // Refresh the timetable data to get updated values from backend
        if (examSessionForm.semester && examSessionForm.semester !== 'Select Semester') {
          await fetchTimetableData(examSessionForm.semester);
        }

        // Show success message from backend or default message
        alert(response.message || 'Exam session saved successfully!');
      } else {
        // Show error message from backend
        alert(response.message || 'Failed to save exam session. Please try again.');
      }
    } catch (error) {
      console.error('Error saving exam session:', error);
      // Show error message from backend if available
      const errorMessage = error.message || 'Failed to save exam session. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle room allotment save
  const handleRoomAllotmentSave = async () => {
    try {
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        alert('Missing required data. Please ensure regulation, course, and exam month/year are set.');
        return;
      }

      // Extract pcode from the selected course (format: "PCODE - PNAME")
      const pcode = roomAllotmentForm.course.split(' - ')[0];

      if (!pcode) {
        alert('Could not extract course code from selected course');
        return;
      }

      // Prepare API payload
      const roomData = {
        examMy: appData.examMY,
        course: appData.course,
        sem: parseInt(roomAllotmentForm.semester) || 0,
        pCode: pcode,
        fromRegNo: roomAllotmentForm.fromRegNo,
        toRegNo: roomAllotmentForm.toRegNo,
        room: roomAllotmentForm.roomNumber,
        regulation: appData.regulation
      };

      // Call API to save room allotment
      const response = await saveRoomAllotment(roomData);

      if (response.success) {
        // Refresh the room allotment data to get updated values from backend
        await fetchRAPaperData(roomAllotmentForm.semester, roomAllotmentForm.examDate, roomAllotmentForm.course);

        // Keep the form values so user can continue allocating rooms
        // Only reset the room-specific fields
        setRoomAllotmentForm(prev => ({
          ...prev,
          fromRegNo: '',
          toRegNo: '',
          roomNumber: ''
        }));

        // Show success message from backend or default message
        alert(response.message || 'Room allotment saved successfully!');
      } else {
        // Show error message from backend
        alert(response.message || 'Failed to save room allotment. Please try again.');
      }
    } catch (error) {
      console.error('Error saving room allotment:', error);
      // Show error message from backend if available
      const errorMessage = error.message || 'Failed to save room allotment. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle export format
  const handleExportFormat = async () => {
    try {
      const appData = getAppData();

      if (!appData?.regulation || !appData?.course || !appData?.examMY) {
        alert('Missing required data. Please ensure regulation, course, and exam month/year are set.');
        return;
      }

      // Fetch export format data
      const response = await getTimeTableSeatingExportFormat(
        appData.regulation,
        appData.course,
        appData.examMY
      );

      if (!response.success || !response.data || response.data.length === 0) {
        alert('No data available for export format');
        return;
      }

      // Convert data to CSV format
      const data = response.data;

      // Define CSV headers
      const headers = [
        'REGULATION',
        'regu',
        'COURSE',
        'GRP',
        'SEM',
        'EXAMMY',
        'PCODE',
        'PNAME',
        'PTYPE',
        'EDATE',
        'ESESS'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in values
          if (value.toString().includes(',') || value.toString().includes('"')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `ExamDates_Format_${appData.course}_${appData.examMY}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Export format downloaded successfully!');
    } catch (error) {
      console.error('Error exporting format:', error);
      alert('Failed to export format. Please try again.');
    }
  };

  // Handle room allotment export
  const handleRoomAllotmentExport = () => {
    if (filteredRoomAllotmentData.length === 0) {
      alert('No room allotment data to export');
      return;
    }

    try {
      // Define CSV headers
      const headers = [
        'S.No.',
        'BRANCH',
        'REGNO',
        'PCODE',
        'PNAME',
        'ESESS',
        'EDATE',
        'ROOM'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      filteredRoomAllotmentData.forEach((row, index) => {
        const values = [
          index + 1,
          row.GRP || row.grp || '',
          row.REGNO || row.regNo || row.RegNo || '',
          row.PCODE || row.pCode || row.PCode || '',
          row.PNAME || row.pName || row.PName || '',
          row.ESESS || row.esess || row.ESess || '',
          formatDate(row.EDATE || row.edate || row.EDate || ''),
          row.ROOM || row.room || row.Room || ''
        ].map(value => {
          // Escape commas and quotes in values
          const strValue = value.toString();
          if (strValue.includes(',') || strValue.includes('"')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        });
        csvContent += values.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const appData = getAppData();
      const fileName = `RoomAllotment_${roomAllotmentForm.semester}_${roomAllotmentForm.course.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Room allotment data exported successfully!');
    } catch (error) {
      console.error('Error exporting room allotment:', error);
      alert('Failed to export room allotment data. Please try again.');
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Time Table and Seating</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaUser className={styles.headerIcon} style={{ color: themeColor }} />
            Time Table and Seating
          </h2>
          <button className={styles.minimizeBtn}>
            <FaChevronUp />
          </button>
        </div>

        <div className={styles.cardBody}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'exam-sessions' ? styles.active : ''}`}
              onClick={() => setActiveTab('exam-sessions')}
            >
              Exam Session(s) & Date(s)
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'room-allotment' ? styles.active : ''}`}
              onClick={() => setActiveTab('room-allotment')}
            >
              Room Allotment
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'exam-sessions' && (
              <div className={styles.tabPane}>
                <div className={styles.contentRow}>
                  {/* Left Panel - Form */}
                  <div className={styles.leftPanel}>
                    <div className={styles.formSection}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Exam Type</label>
                        <select
                          name="examType"
                          value={examSessionForm.examType}
                          onChange={handleExamSessionChange}
                          className={styles.dropdown}
                        >
                          {examTypeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Semester(s)</label>
                        <select
                          name="semester"
                          value={examSessionForm.semester}
                          onChange={handleExamSessionChange}
                          className={styles.dropdown}
                          disabled={semestersLoading}
                        >
                          {semestersLoading ? (
                            <option value="">Loading semesters...</option>
                          ) : (
                            semesterOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Course(s)</label>
                        <select
                          name="course"
                          value={examSessionForm.course}
                          onChange={handleExamSessionChange}
                          className={styles.dropdown}
                          disabled={coursesLoading || !examSessionForm.semester || examSessionForm.semester === 'Select Semester'}
                        >
                          {coursesLoading ? (
                            <option value="">Loading courses...</option>
                          ) : !examSessionForm.semester || examSessionForm.semester === 'Select Semester' ? (
                            <option value="">Select semester first</option>
                          ) : (
                            courseOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Branch</label>
                        <select
                          name="branch"
                          value={examSessionForm.branch}
                          onChange={handleExamSessionChange}
                          className={styles.dropdown}
                          disabled={branchesLoading || !examSessionForm.semester || examSessionForm.semester === 'Select Semester'}
                        >
                          {branchesLoading ? (
                            <option value="">Loading branches...</option>
                          ) : !examSessionForm.semester || examSessionForm.semester === 'Select Semester' ? (
                            <option value="">Select semester first</option>
                          ) : (
                            branchOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Exam Date</label>
                        <div className={styles.dateInputWrapper}>
                          <input
                            type="date"
                            name="examDate"
                            value={examSessionForm.examDate}
                            onChange={handleExamSessionChange}
                            className={styles.dateInput}
                            disabled={!examSessionForm.semester || examSessionForm.semester === 'Select Semester'}
                            placeholder="dd-mm-yyyy"
                          />
                          <FaCalendarAlt className={styles.calendarIcon} />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Session</label>
                        <select
                          name="session"
                          value={examSessionForm.session}
                          onChange={handleExamSessionChange}
                          className={styles.dropdown}
                        >
                          {sessionOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Exam Time</label>
                        <input
                          type="text"
                          name="examTime"
                          value={examSessionForm.examTime}
                          onChange={handleExamSessionChange}
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Remarks</label>
                        <textarea
                          name="remarks"
                          value={examSessionForm.remarks}
                          onChange={handleExamSessionChange}
                          className={styles.textarea}
                          rows="3"
                        />
                      </div>

                      <div className={styles.actionButtons}>
                        <button onClick={handleExamSessionSave} className={styles.saveBtn}>
                          <FaSave /> Save
                        </button>
                        <button onClick={handleExportFormat} className={styles.exportBtn}>
                          <FaFileExport /> Export Format
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - Table */}
                  <div className={styles.rightPanel}>
                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>S.No.</th>
                            <th>BRANCH</th>
                            <th>REG. NO.</th>
                            <th>SEM</th>
                            <th>COURSE CODE</th>
                            <th>COURSE NAME</th>
                            <th>ESESS</th>
                            <th>EDATE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paperDataLoading ? (
                            <tr>
                              <td colSpan="8" className={styles.centerText} style={{ padding: '20px' }}>
                                Loading paper data...
                              </td>
                            </tr>
                          ) : examSessionsData.length === 0 ? (
                            <tr>
                              <td colSpan="8" className={styles.centerText} style={{ padding: '20px' }}>
                                {examSessionForm.examType && examSessionForm.examType !== 'Select ExamType' &&
                                  examSessionForm.semester && examSessionForm.semester !== 'Select Semester' &&
                                  examSessionForm.course && examSessionForm.course !== 'Select Course'
                                  ? 'No paper data available'
                                  : 'Please select Exam Type, Semester, and Course to load paper data'}
                              </td>
                            </tr>
                          ) : (
                            paginatedData.map((item, index) => (
                              <tr key={item.ASHID || index}>
                                <td className={styles.centerText}>{(currentPage - 1) * pageSize + index + 1}</td>
                                <td className={styles.centerText}>{item.GRP || item.grp || item.branch || ''}</td>
                                <td className={styles.centerText}>{item.REGNO || item.regNo || item.RegNo || ''}</td>
                                <td className={styles.centerText}>{item.SEM || item.sem || item.Sem || ''}</td>
                                <td className={styles.centerText}>{item.PCODE || item.pCode || item.PCode || ''}</td>
                                <td>{item.PNAME || item.pName || item.PName || ''}</td>
                                <td className={styles.centerText}>{formatESESS(item.ESESS || item.esess || item.ESess || '')}</td>
                                <td className={styles.centerText}>{formatDate(item.EDATE || item.edate || item.EDate || '')}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {!paperDataLoading && examSessionsData.length > 0 && (
                        <div className={styles.paginationBar}>
                          <div className={styles.paginationControls}>
                            <button
                              className={styles.pageBtn}
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                            <span className={styles.pageInfo}>
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              className={styles.pageBtn}
                              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </div>
                          <div className={styles.pageSizeGroup}>
                            <label htmlFor="timetablePageSize" className={styles.pageSizeLabel}>
                              Rows per page
                            </label>
                            <select
                              id="timetablePageSize"
                              value={pageSize}
                              onChange={(event) => {
                                setPageSize(Number(event.target.value));
                                setCurrentPage(1);
                              }}
                              className={styles.pageSizeSelect}
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'room-allotment' && (
              <div className={styles.tabPane}>
                <div className={styles.contentRow}>
                  {/* Left Panel - Form */}
                  <div className={styles.leftPanel}>
                    <div className={styles.formSection}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Semester</label>
                        <select
                          name="semester"
                          value={roomAllotmentForm.semester}
                          onChange={handleRoomAllotmentChange}
                          className={styles.dropdown}
                          disabled={semestersLoading}
                        >
                          {semestersLoading ? (
                            <option value="">Loading semesters...</option>
                          ) : (
                            semesterOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Exam Date</label>
                        <div className={styles.dateInputWrapper}>
                          <input
                            type="date"
                            name="examDate"
                            value={roomAllotmentForm.examDate}
                            onChange={handleRoomAllotmentChange}
                            className={styles.dateInput}
                            disabled={!roomAllotmentForm.semester || roomAllotmentForm.semester === 'Select Semester'}
                            placeholder="dd-mm-yyyy"
                          />
                          <FaCalendarAlt className={styles.calendarIcon} />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Course(s)</label>
                        <select
                          name="course"
                          value={roomAllotmentForm.course}
                          onChange={handleRoomAllotmentChange}
                          className={styles.dropdown}
                          disabled={raCoursesLoading || !roomAllotmentForm.semester || roomAllotmentForm.semester === 'Select Semester'}
                        >
                          {raCoursesLoading ? (
                            <option value="">Loading courses...</option>
                          ) : !roomAllotmentForm.semester || roomAllotmentForm.semester === 'Select Semester' ? (
                            <option value="">Select semester first</option>
                          ) : (
                            raCourseOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>From Register No.</label>
                        <input
                          type="text"
                          name="fromRegNo"
                          value={roomAllotmentForm.fromRegNo}
                          onChange={handleRoomAllotmentChange}
                          className={styles.input}
                          placeholder="e.g., 20671A0201"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>To Register No.</label>
                        <input
                          type="text"
                          name="toRegNo"
                          value={roomAllotmentForm.toRegNo}
                          onChange={handleRoomAllotmentChange}
                          className={styles.input}
                          placeholder="e.g., 20671A0209"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Room Number</label>
                        <div className={styles.autocompleteContainer}>
                          <input
                            ref={roomInputRef}
                            type="text"
                            name="roomNumber"
                            value={roomAllotmentForm.roomNumber}
                            onChange={handleRoomNumberChange}
                            onKeyDown={handleRoomKeyDown}
                            className={styles.input}
                            placeholder="e.g., A-317"
                            autoComplete="off"
                          />
                          {showRoomSuggestions && (
                            <div ref={roomDropdownRef} className={styles.autocompleteDropdown}>
                              {roomSearchLoading ? (
                                <div className={styles.autocompleteItem}>
                                  Loading rooms...
                                </div>
                              ) : roomSuggestions.length > 0 ? (
                                roomSuggestions.map((room, index) => (
                                  <div
                                    key={room.ROOMNO}
                                    className={`${styles.autocompleteItem} ${index === selectedSuggestionIndex ? styles.autocompleteItemHighlighted : ''
                                      }`}
                                    onClick={() => handleRoomSelect(room.ROOMNO)}
                                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                  >
                                    {room.ROOMNO}
                                  </div>
                                ))
                              ) : (
                                <div className={styles.autocompleteItem}>
                                  No rooms found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.actionButtons}>
                        <button onClick={handleRoomAllotmentSave} className={styles.saveBtn}>
                          <FaSave /> Save
                        </button>
                        <button onClick={handleRoomAllotmentExport} className={styles.exportBtn}>
                          <FaFileExport /> Export
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - Table */}
                  <div className={styles.rightPanel}>
                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>S.No.</th>
                            <th>BRANCH</th>
                            <th>REGNO</th>
                            <th>PCODE</th>
                            <th>PNAME</th>
                            <th>ESESS</th>
                            <th>EDATE</th>
                            <th>ROOM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raPaperDataLoading ? (
                            <tr>
                              <td colSpan="8" className={styles.centerText} style={{ padding: '20px' }}>
                                Loading room allotment data...
                              </td>
                            </tr>
                          ) : filteredRoomAllotmentData.length === 0 ? (
                            <tr>
                              <td colSpan="8" className={styles.centerText} style={{ padding: '20px' }}>
                                {roomAllotmentForm.semester && roomAllotmentForm.semester !== 'Select Semester' &&
                                  roomAllotmentForm.examDate && roomAllotmentForm.examDate !== '' &&
                                  roomAllotmentForm.course && roomAllotmentForm.course !== 'Select Course'
                                  ? (roomAllotmentForm.fromRegNo || roomAllotmentForm.toRegNo
                                    ? 'No data found for the selected registration number range'
                                    : 'No room allotment data available')
                                  : 'Please select Semester, Exam Date, and Course to load room allotment data'}
                              </td>
                            </tr>
                          ) : (
                            filteredRoomAllotmentData.map((item, index) => (
                              <tr key={item.ASHID || index}>
                                <td className={styles.centerText}>{index + 1}</td>
                                <td className={styles.centerText}>{item.GRP || item.grp || ''}</td>
                                <td className={styles.centerText}>{item.REGNO || item.regNo || item.RegNo || ''}</td>
                                <td className={styles.centerText}>{item.PCODE || item.pCode || item.PCode || ''}</td>
                                <td>{item.PNAME || item.pName || item.PName || ''}</td>
                                <td className={styles.centerText}>{formatESESS(item.ESESS || item.esess || item.ESess || '')}</td>
                                <td className={styles.centerText}>{formatDate(item.EDATE || item.edate || item.EDate || '')}</td>
                                <td className={styles.centerText}>{item.ROOM || item.room || item.Room || ''}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTableSeating; 