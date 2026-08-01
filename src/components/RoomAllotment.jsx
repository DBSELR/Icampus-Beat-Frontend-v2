import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import {
  getRoomAllotmentSems,
  getRoomAllotmentSessions,
  getRoomAllotmentExamDates,
  getRoomAllotmentRooms,
  getRoomAllotmentPcodes,
  loadRoomAllotmentRegnos,
  getRoomAllotmentAlloted,
  saveRoomAllotmentData,
  resetRoomAllotment,
  exportRoomAllotment,
  applyRoomAllotmentForAllDates,
  getBranchPriorityBranches,
  getAppData
} from '../utils/api';
import styles from './RoomAllotment.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const RoomAllotment = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    maxStuForBranch: '10',
    examType: '0',
    sem: '',
    session: '',
    examDate: '',
    regsup: '0',
    pcode: '',
    room: ''
  });

  // Dropdown options state
  const [semOptions, setSemOptions] = useState([]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [pcodeOptions, setPcodeOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  
  // Branches filter state
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [openBranchDropdownIndex, setOpenBranchDropdownIndex] = useState(null); // Track which column's dropdown is open
  const branchDropdownRefs = useRef({}); // Refs for each column's dropdown

  // Grid/List state - holds the allotted data
  const [gridData, setGridData] = useState([]);
  const [isGridLoaded, setIsGridLoaded] = useState(false); // Track if grid has been loaded
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Row numbers for top listbox (matching old .NET design: 1, 2, 3, 4)
  const rowNumbers = [1, 2, 3, 4];

  // Get app data from localStorage
  const appData = getAppData();
  const course = appData?.course || '';
  const examMy = appData?.examMY || '';
  const regulation = appData?.regulation || '';

  // Helper to get exam type string from value
  const getExamTypeString = (value) => {
    switch (value) {
      case '1': return 'External';
      case '2': return 'MID-I';
      case '3': return 'MID-II';
      default: return '';
    }
  };

  // Helper to get regsup string from value
  const getRegsupString = (value) => {
    switch (value) {
      case '1': return 'REG';
      case '2': return 'SUP';
      case '3': return 'REG&SUP';
      default: return 'REG';
    }
  };

  // Load semesters and branches on component mount
  useEffect(() => {
    if (course) {
      loadSems();
    }
    if (course && regulation) {
      loadBranches();
    }
  }, [course, regulation]);

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check all column dropdown refs
      let clickedInsideAny = false;
      Object.values(branchDropdownRefs.current).forEach(ref => {
        if (ref && ref.contains(event.target)) {
          clickedInsideAny = true;
        }
      });
      
      if (!clickedInsideAny) {
        setOpenBranchDropdownIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Load branches for filter
  const loadBranches = async () => {
    if (!course || !regulation) return;
    try {
      setIsLoading(true);
      const response = await getBranchPriorityBranches(course, regulation);
      if (response.success && response.data && Array.isArray(response.data)) {
        const branches = response.data.map(item => {
          const branch = item.Branch || item.branch || item.BRANCH || item.GRP || item.grp || item.Grp || '';
          return branch !== null && branch !== undefined ? String(branch) : '';
        }).filter(b => b && b !== 'null' && b !== 'undefined');
        setBranchOptions(branches);
        // Select all branches by default
        setSelectedBranches(branches);
      } else {
        setBranchOptions([]);
        setSelectedBranches([]);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
      setBranchOptions([]);
      setSelectedBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load semesters
  const loadSems = async () => {
    if (!course) return;
    try {
      setIsLoading(true);
      const response = await getRoomAllotmentSems(course);
      if (response.success && response.data && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          // Try multiple field name variations
          const sem = item.Sem || item.sem || item.SEM || item.SemNo || item.SEMNO || '';
          return sem !== null && sem !== undefined ? String(sem) : '';
        }).filter(s => s && s !== 'null' && s !== 'undefined');
        setSemOptions(sems);
      } else {
        setSemOptions([]);
      }
    } catch (err) {
      console.error('Error loading semesters:', err);
      setSemOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sessions when sem and examType are selected
  useEffect(() => {
    if (formData.sem && formData.examType !== '0' && course) {
      loadSessions();
    } else {
      setSessionOptions([]);
      setFormData(prev => ({ ...prev, session: '' }));
    }
  }, [formData.sem, formData.examType, course]);

  const loadSessions = async () => {
    if (!formData.sem || formData.examType === '0' || !course) return;
    try {
      setIsLoading(true);
      const examTypeStr = getExamTypeString(formData.examType);
      const response = await getRoomAllotmentSessions(course, formData.sem, examTypeStr);
      if (response.success && response.data && Array.isArray(response.data)) {
        const sessions = response.data.map(item => {
          // Try multiple field name variations including ESESS from API response
          const session = item.ESESS || item.Session || item.session || item.SESSION || item.Esess || item.E_SESS || '';
          // Handle null/undefined values properly
          if (session === null || session === undefined) return '';
          return String(session);
        }).filter(s => s && s !== 'null' && s !== 'undefined' && s.trim() !== '');
        
        console.log('Processed sessions for dropdown:', sessions); // Debug log
        setSessionOptions(sessions);
      } else {
        console.warn('Sessions API response issue:', response); // Debug log
        setSessionOptions([]);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setSessionOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load exam dates when session is selected
  useEffect(() => {
    if (formData.session && formData.sem && formData.examType !== '0' && course && examMy && regulation) {
      loadExamDates();
    } else {
      setExamDateOptions([]);
      setFormData(prev => ({ ...prev, examDate: '' }));
    }
  }, [formData.session, formData.sem, formData.examType, course, examMy, regulation]);

  const loadExamDates = async () => {
    if (!formData.session || !formData.sem || formData.examType === '0' || !course || !examMy || !regulation) return;
    try {
      setIsLoading(true);
      const examTypeStr = getExamTypeString(formData.examType);
      const response = await getRoomAllotmentExamDates(
        course,
        formData.sem,
        examMy,
        formData.session,
        regulation,
        examTypeStr
      );
      if (response.success && response.data && Array.isArray(response.data)) {
        const dates = response.data.map(item => {
          // Guide says response has Edate field (format: "yyyy-MM-dd")
          const date = item.Edate || item.EDATE || item.edate || 
                      item.ExamDate || item.examDate || item.EDATE || item.EXAMDATE || item.Exam_Date || item.EXAM_DATE || '';
          return date !== null && date !== undefined ? String(date) : '';
        }).filter(d => d && d !== 'null' && d !== 'undefined');
        setExamDateOptions(dates);
      } else {
        setExamDateOptions([]);
      }
    } catch (err) {
      console.error('Error loading exam dates:', err);
      setExamDateOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load rooms when session is selected
  useEffect(() => {
    if (formData.session && course) {
      loadRooms();
    } else {
      setRoomOptions([]);
      setFormData(prev => ({ ...prev, room: '' }));
    }
  }, [formData.session, course]);

  const loadRooms = async () => {
    if (!formData.session || !course) return;
    try {
      setIsLoading(true);
      console.log('Loading rooms with:', { course, session: formData.session });
      const response = await getRoomAllotmentRooms(course, formData.session);
      console.log('Rooms API Response:', response);
      
      if (response && response.success && response.data) {
        // Handle both array and single object responses
        const dataArray = Array.isArray(response.data) ? response.data : [response.data];
        console.log('Rooms data array:', dataArray);
        
        const rooms = dataArray
          .map(item => {
            if (!item || typeof item !== 'object') return '';
            
            // Try multiple field name variations - check all possible field names
            const room = item.RoomNo || item.roomNo || item.ROOMNO || item.Room || item.room || item.ROOM || 
                        item.RoomNumber || item.roomNumber || item.ROOM_NUMBER || item.Room_No || item.ROOM_NO ||
                        item.ROOMNAME || item.RoomName || item.roomName || item;
            
            // If item itself is a string/number, use it directly
            if (typeof item === 'string' || typeof item === 'number') {
              return String(item);
            }
            
            // If room is still an object, try to stringify or get first property
            if (room && typeof room === 'object') {
              const keys = Object.keys(room);
              if (keys.length > 0) {
                return String(room[keys[0]]);
              }
              return '';
            }
            
            return room !== null && room !== undefined ? String(room) : '';
          })
          .filter(r => r && r !== 'null' && r !== 'undefined' && r.trim() !== '');
        
        console.log('Processed rooms for dropdown:', rooms);
        setRoomOptions(rooms);
      } else {
        console.warn('Rooms API response issue:', response);
        setRoomOptions([]);
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setRoomOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load pcodes when exam date is selected
  useEffect(() => {
    if (formData.examDate && formData.sem && course && examMy && regulation) {
      loadPcodes();
    } else {
      setPcodeOptions([]);
      setFormData(prev => ({ ...prev, pcode: '' }));
    }
  }, [formData.examDate, formData.sem, course, examMy, regulation]);

  const loadPcodes = async () => {
    if (!formData.examDate || !formData.sem || !course || !examMy || !regulation) return;
    try {
      setIsLoading(true);
      const regsupStr = getRegsupString(formData.regsup);
      // Convert exam date to YYYY-MM-DD format if needed
      let examDateFormatted = formData.examDate;
      if (examDateFormatted.includes('-') && examDateFormatted.split('-')[0].length === 2) {
        // DD-MM-YYYY to YYYY-MM-DD
        const parts = examDateFormatted.split('-');
        examDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const response = await getRoomAllotmentPcodes(
        course,
        regulation,
        examMy,
        examDateFormatted,
        formData.sem,
        regsupStr
      );
      if (response.success && response.data && Array.isArray(response.data)) {
        const pcodes = response.data.map(item => {
          // Try multiple field name variations
          const pcode = item.PCode || item.pcode || item.PCODE || item.Pcode || item.PCODE || '';
          return pcode !== null && pcode !== undefined ? String(pcode) : '';
        }).filter(p => p && p !== 'null' && p !== 'undefined');
        setPcodeOptions(pcodes);
      } else {
        setPcodeOptions([]);
      }
    } catch (err) {
      console.error('Error loading pcodes:', err);
      setPcodeOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load grid data when room is selected (pcode is optional)
  useEffect(() => {
    if (formData.room && formData.examDate && formData.sem && formData.session && 
        formData.examType !== '0' && course && examMy && regulation) {
      loadGridData();
    } else {
      setGridData([]);
    }
  }, [formData.room, formData.pcode, formData.examDate, formData.sem, formData.session, formData.examType, 
      formData.regsup, formData.maxStuForBranch, course, examMy, regulation]);

  const loadGridData = async () => {
    // pcode is optional - allow loading data even if pcode is not selected
    if (!formData.room || !formData.examDate || !formData.sem || !formData.session || 
        formData.examType === '0' || !course || !examMy || !regulation) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const examTypeStr = getExamTypeString(formData.examType);
      const regsupStr = getRegsupString(formData.regsup);
      
      // Convert exam date to YYYY-MM-DD format if needed
      let examDateFormatted = formData.examDate;
      if (examDateFormatted.includes('-') && examDateFormatted.split('-')[0].length === 2) {
        const parts = examDateFormatted.split('-');
        examDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // First, load regnos into table (this API returns nothing)
      // pcode is optional - pass null if not selected
      await loadRoomAllotmentRegnos(
        course,
        regulation,
        examMy,
        examDateFormatted,
        formData.sem,
        formData.room,
        regsupStr,
        examTypeStr,
        formData.session,
        formData.pcode || null, // Pass null if pcode is not selected
        formData.maxStuForBranch
      );

      // Then, get allotted data to display
      const response = await getRoomAllotmentAlloted(
        course,
        examMy,
        formData.sem,
        formData.room,
        examDateFormatted,
        formData.session,
        regsupStr,
        examTypeStr
      );

      console.log('Alloted API Response:', response);
      console.log('Response data length:', response.data?.length || 0);
      if (response.data && response.data.length > 0) {
        console.log('Sample data item:', response.data[0]);
      }

      // Transform data into grid structure
      // Guide says: Col_Row format is "{row},{col}" (e.g., "1,1", "1,2")
      const gridMap = {};
      const allRegnos = new Set(); // Track all unique regnos for listbox
      const processedEntries = new Set(); // Track processed entries to avoid duplicates
      
      // Extract unique branches (Grp field) from API response
      const allBranchesFromAPI = new Set();
      
      // Check if response has data
      const hasData = response.success && response.data && Array.isArray(response.data) && response.data.length > 0;
      
      if (hasData) {
        response.data.forEach(item => {
          // Extract Grp field from API response
          const grp = item.Grp || item.grp || item.GRP || item.Branch || item.branch || item.BRANCH || '';
          if (grp && grp.trim() !== '') {
            allBranchesFromAPI.add(grp.trim());
          }
        });
      }
      
      // If no branches from API data, try to load from branch priority API
      if (allBranchesFromAPI.size === 0) {
        try {
          const branchResponse = await getBranchPriorityBranches(course, regulation);
          if (branchResponse.success && branchResponse.data && Array.isArray(branchResponse.data)) {
            branchResponse.data.forEach(item => {
              const grp = item.GRP || item.grp || item.Branch || item.branch || item.BRANCH || '';
              if (grp && grp.trim() !== '') {
                allBranchesFromAPI.add(grp.trim());
              }
            });
          }
        } catch (err) {
          console.log('Could not load branches from branch priority API:', err);
        }
      }
      
      // Update branch options from API response
      const branchesArray = Array.from(allBranchesFromAPI).sort();
      if (branchesArray.length > 0) {
        setBranchOptions(branchesArray);
        // Select all branches by default if none selected
        if (selectedBranches.length === 0) {
          setSelectedBranches(branchesArray);
        }
      }
      
      if (hasData) {
        response.data.forEach(item => {
          // Check for Col_Row (API response format) - Guide says format: "{row},{col}"
          const colRow = item.Col_Row || item.col_Row || item.COL_ROW || 
                        item.RowCol || item.rowCol || item.ROWCOL || item.Row_Col || '';
          const regno = item.Regno || item.regno || item.REGNO || '';
          // Extract Grp (branch) field from API response
          const grp = item.Grp || item.grp || item.GRP || item.Branch || item.branch || item.BRANCH || '';
          
          if (colRow && regno) {
            // Create unique key to avoid processing duplicates
            const entryKey = `${colRow}_${regno}`;
            if (processedEntries.has(entryKey)) {
              return; // Skip duplicate entry
            }
            processedEntries.add(entryKey);
            
            // Parse Col_Row format according to Guide: "{row},{col}" (row first, then column)
            const parts = colRow.split(',');
            if (parts.length !== 2) return;
            
            const row = parseInt(parts[0], 10); // First part is row
            const col = parseInt(parts[1], 10); // Second part is column
            
            if (isNaN(row) || isNaN(col)) return;
            
            if (!gridMap[col]) {
              gridMap[col] = { column: col, regnos: [], rows: [], selected: [], firstRowValue: '', selectedBranches: [] };
            }
            
            // Add regno to set for listbox
            allRegnos.add(regno);
            
            // Add row data with regno value and Grp (branch) field
            const existingRow = gridMap[col].rows.find(r => r.row === row);
            if (!existingRow) {
              gridMap[col].rows.push({ row, regno, value: regno, grp: grp.trim() });
            } else {
              // Update existing row with new regno and grp
              existingRow.regno = regno;
              existingRow.value = regno;
              existingRow.grp = grp.trim();
            }
          }
        });

        // Add all unique regnos to each column's listbox options (for dropdowns)
        const allRegnosArray = Array.from(allRegnos).sort();
        Object.keys(gridMap).forEach(colKey => {
          gridMap[colKey].regnos = allRegnosArray; // For dropdown options in first row
          gridMap[colKey].selectedRows = []; // For top listbox selection (row numbers)
          // Sort rows by row number within each column
          gridMap[colKey].rows.sort((a, b) => a.row - b.row);
          
          // Ensure first row (row 1) exists for dropdown
          const hasFirstRow = gridMap[colKey].rows.some(r => r.row === 1);
          if (!hasFirstRow) {
            gridMap[colKey].rows.unshift({ row: 1, regno: '', value: '' });
          }
        });

        // Convert to array and sort by column
        const gridArray = Object.values(gridMap).sort((a, b) => a.column - b.column);
        
        console.log('Processed grid data:', gridArray);
        console.log('Total columns:', gridArray.length);
        console.log('Total unique regnos:', allRegnosArray.length);
        
        // If no data, create default empty grid structure (4 columns)
        if (gridArray.length === 0) {
          const defaultColumns = 4;
          for (let col = 1; col <= defaultColumns; col++) {
            gridArray.push({
              column: col,
              regnos: [],
              rows: [],
              selected: [],
              firstRowValue: '',
              selectedBranches: []
            });
          }
          console.log('Created default empty grid with', defaultColumns, 'columns');
        }
        
        setGridData(gridArray);
        setIsGridLoaded(true); // Mark grid as loaded
      } else {
        // Even if response is not successful or data is null, create empty grid
        const defaultColumns = 4;
        const emptyGridArray = [];
        for (let col = 1; col <= defaultColumns; col++) {
          emptyGridArray.push({
            column: col,
            regnos: [],
            rows: [],
            selected: [],
            firstRowValue: '',
            selectedBranches: []
          });
        }
        setGridData(emptyGridArray);
        setIsGridLoaded(true); // Mark grid as loaded even if empty
        console.log('Created empty grid structure with', defaultColumns, 'columns');
      }
    } catch (err) {
      console.error('Error loading grid data:', err);
      setError(err.message || 'Failed to load grid data');
      setGridData([]);
      setIsGridLoaded(false); // Mark grid as not loaded on error
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear dependent dropdowns when parent changes
    // Note: Rooms are only dependent on Session, not on examDate or pcode
    if (name === 'sem') {
      setFormData(prev => ({ ...prev, session: '', examDate: '', pcode: '', room: '' }));
      setSessionOptions([]);
      setExamDateOptions([]);
      setPcodeOptions([]);
      setRoomOptions([]);
      setGridData([]);
    } else if (name === 'examType') {
      setFormData(prev => ({ ...prev, session: '', examDate: '', pcode: '', room: '' }));
      setSessionOptions([]);
      setExamDateOptions([]);
      setPcodeOptions([]);
      setRoomOptions([]);
      setGridData([]);
    } else if (name === 'session') {
      // When session changes, clear examDate, pcode, room, and reload rooms
      setFormData(prev => ({ ...prev, examDate: '', pcode: '', room: '' }));
      setExamDateOptions([]);
      setPcodeOptions([]);
      setRoomOptions([]); // Clear rooms - they will be reloaded by useEffect
      setGridData([]);
    } else if (name === 'examDate') {
      // When examDate changes, only clear pcode and room (not roomOptions - rooms depend on session)
      setFormData(prev => ({ ...prev, pcode: '', room: '' }));
      setPcodeOptions([]);
      // Don't clear roomOptions - rooms are loaded based on session, not examDate
      setGridData([]);
    } else if (name === 'pcode') {
      // When pcode changes, only clear room value (not roomOptions - rooms depend on session)
      setFormData(prev => ({ ...prev, room: '' }));
      // Don't clear roomOptions - rooms are loaded based on session, not pcode
      setGridData([]);
    } else if (name === 'room') {
      setGridData([]);
      setIsGridLoaded(false); // Reset grid loaded flag when room changes
    }
  };

  // Handle top listbox selection change (row numbers: 1, 2, 3, 4)
  const handleListBoxChange = (columnIndex, selectedValues) => {
    const newGridData = [...gridData];
    if (newGridData[columnIndex]) {
      newGridData[columnIndex].selectedRows = selectedValues;
      setGridData(newGridData);
    }
  };
  
  // Handle branch selection
  const handleBranchToggle = (branch) => {
    setSelectedBranches(prev => {
      if (prev.includes(branch)) {
        return prev.filter(b => b !== branch);
      } else {
        return [...prev, branch];
      }
    });
  };
  
  // Handle select all branches
  const handleSelectAllBranches = () => {
    if (selectedBranches.length === branchOptions.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches([...branchOptions]);
    }
  };

  // Handle branch toggle for a specific column
  const handleColumnBranchToggle = (columnIndex, branch) => {
    const newGridData = [...gridData];
    if (newGridData[columnIndex]) {
      const currentSelected = newGridData[columnIndex].selectedBranches || [];
      if (currentSelected.includes(branch)) {
        newGridData[columnIndex].selectedBranches = currentSelected.filter(b => b !== branch);
      } else {
        newGridData[columnIndex].selectedBranches = [...currentSelected, branch];
      }
      setGridData(newGridData);
    }
  };

  // Handle select all branches for a specific column
  const handleColumnSelectAllBranches = (columnIndex) => {
    const newGridData = [...gridData];
    if (newGridData[columnIndex]) {
      const currentSelected = newGridData[columnIndex].selectedBranches || [];
      if (currentSelected.length === branchOptions.length) {
        newGridData[columnIndex].selectedBranches = [];
      } else {
        newGridData[columnIndex].selectedBranches = [...branchOptions];
      }
      setGridData(newGridData);
    }
  };

  // Handle textbox change in grid
  const handleGridTextChange = (columnIndex, rowIndex, value) => {
    const newGridData = [...gridData];
    if (newGridData[columnIndex] && newGridData[columnIndex].rows[rowIndex]) {
      newGridData[columnIndex].rows[rowIndex].value = value;
      setGridData(newGridData);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    console.log('Submit button clicked');
    console.log('Form Data:', formData);
    console.log('Grid Data Length:', gridData.length);
    
    // Validate required fields (pcode is optional)
    if (!formData.sem || !formData.session || !formData.examDate || !formData.room || 
        formData.examType === '0' || !course || !examMy) {
      const missingFields = [];
      if (!formData.sem) missingFields.push('Sem');
      if (!formData.session) missingFields.push('Session');
      if (!formData.examDate) missingFields.push('Exam Date');
      if (!formData.room) missingFields.push('Room');
      if (formData.examType === '0') missingFields.push('ExamType');
      if (!course) missingFields.push('Course');
      if (!examMy) missingFields.push('Exam M/Y');
      
      alert(`Please fill all required fields. Missing: ${missingFields.join(', ')}`);
      return;
    }

    // Check if grid has been loaded (even if empty, user can still enter data)
    if (!isGridLoaded) {
      alert('Please load room allotment grid first by selecting all required fields (Sem, Session, Exam Date, Room).');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const examTypeStr = getExamTypeString(formData.examType);
      
      // Convert exam date to YYYY-MM-DD format if needed
      let examDateFormatted = formData.examDate;
      if (examDateFormatted.includes('-') && examDateFormatted.split('-')[0].length === 2) {
        const parts = examDateFormatted.split('-');
        examDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // Build roomAllotment array from grid data
      // Only collect data from columns that have branches selected
      // Use values from textboxes and first row dropdowns
      const roomAllotment = [];
      gridData.forEach((column) => {
        const col = column.column || 1;
        const selectedBranches = column.selectedBranches || [];
        
        // Only process columns that have at least one branch selected
        // If no branches are selected, skip this column entirely
        if (selectedBranches.length === 0) {
          return; // Skip this column - no branches selected
        }
        
        const rowRegnos = column.rows || [];
        
        // Add regnos from all rows (first row dropdown + other rows textboxes)
        // Only for columns with selected branches
        rowRegnos.forEach((rowItem) => {
          if (rowItem.value && rowItem.value.trim()) {
            const row = rowItem.row || 1;
            roomAllotment.push({
              rowCol: `${row},${col}`, // Format: "row,col"
              regno: rowItem.value.trim()
            });
          }
        });
      });

      // Format course and examMy according to API examples
      // User examples show: "BTECH" or "B.TECH" both work, but "B.TECH" is more common
      // User examples show: "NOV-2025" or "JUL-2021" (uppercase)
      const courseFormatted = course || ''; // Keep original format (B.Tech or B.TECH)
      const examMyFormatted = examMy ? examMy.toUpperCase() : examMy; // "Nov-2025" -> "NOV-2025"

      const payload = {
        sem: String(formData.sem),
        session: String(formData.session),
        examDate: examDateFormatted,
        roomNo: formData.room,
        course: courseFormatted,
        examMy: examMyFormatted,
        bp: '',
        examType: examTypeStr,
        roomAllotment: roomAllotment
      };

      console.log('Room Allotment Save Payload:', JSON.stringify(payload, null, 2));
      console.log('Room Allotment Array:', roomAllotment);
      console.log('Grid Data:', gridData);

      // Allow API call even if roomAllotment is empty - API will handle empty array
      // User might want to save empty allotment or clear existing data
      if (roomAllotment.length === 0) {
        console.warn('Room allotment array is empty, but proceeding with API call...');
        // Don't block the API call - let the backend handle empty array
      }

      console.log('Calling saveRoomAllotmentData API...');
      const response = await saveRoomAllotmentData(payload);
      console.log('Save API Response:', response);
      
      if (response && response.success) {
        alert(response.message || 'Room allotment saved successfully!');
        // Reload grid data to show updated values
        await loadGridData();
      } else {
        const errorMsg = response?.message || 'Failed to save room allotment';
        console.error('Save failed:', errorMsg);
        alert(errorMsg);
      }
    } catch (err) {
      console.error('Error saving room allotment:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      alert(err.message || 'Failed to save room allotment. Please check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset
  const handleReset = async () => {
    // pcode is optional
    if (!formData.sem || !formData.session || !formData.examDate || !formData.room || 
        formData.examType === '0' || !course || !examMy) {
      alert('Please fill all required fields');
      return;
    }

    if (!window.confirm('Are you sure you want to reset the room allotment?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const examTypeStr = getExamTypeString(formData.examType);
      
      // Convert exam date to YYYY-MM-DD format if needed
      let examDateFormatted = formData.examDate;
      if (examDateFormatted.includes('-') && examDateFormatted.split('-')[0].length === 2) {
        const parts = examDateFormatted.split('-');
        examDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // Format according to user's API examples
      const examMyFormatted = examMy ? examMy.toUpperCase() : examMy;
      
      const payload = {
        sem: String(formData.sem),
        session: String(formData.session),
        examDate: examDateFormatted,
        roomNo: formData.room,
        course: course || '', // Keep original format
        examMy: examMyFormatted,
        examType: examTypeStr,
        bp: ''
      };

      const response = await resetRoomAllotment(payload);
      
      if (response.success) {
        alert(response.message || 'Room allotment reset successfully!');
        // Reload grid data
        await loadGridData();
      } else {
        alert(response.message || 'Failed to reset room allotment');
      }
    } catch (err) {
      console.error('Error resetting room allotment:', err);
      alert(err.message || 'Failed to reset room allotment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    if (!formData.sem || !formData.examDate || !formData.room || !formData.session || 
        !course || !examMy) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Convert exam date to YYYY-MM-DD format if needed
      let examDateFormatted = formData.examDate;
      if (examDateFormatted.includes('-') && examDateFormatted.split('-')[0].length === 2) {
        const parts = examDateFormatted.split('-');
        examDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      const exportResult = await exportRoomAllotment(
        course,
        examMy,
        formData.sem,
        examDateFormatted,
        formData.session,
        formData.room
      );

      // Handle both blob (Excel file) and JSON (data array) responses
      if (exportResult instanceof Blob) {
        // If blob, download directly
        const url = window.URL.createObjectURL(exportResult);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RoomAllotment_${course}_${examMy}_${formData.sem}_${formData.room}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (Array.isArray(exportResult) || (exportResult && exportResult.data && Array.isArray(exportResult.data))) {
        // If JSON data array, convert to CSV and download
        const dataArray = Array.isArray(exportResult) ? exportResult : exportResult.data;
        if (dataArray.length === 0) {
          alert('No data to export');
          return;
        }
        
        // Convert to CSV
        const headers = Object.keys(dataArray[0]);
        const csvRows = [
          headers.join(','), // Header row
          ...dataArray.map(row => 
            headers.map(header => {
              const value = row[header] || '';
              // Escape commas and quotes in CSV
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
          )
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RoomAllotment_${course}_${examMy}_${formData.sem}_${formData.room}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Unexpected export response format');
      }
    } catch (err) {
      console.error('Error exporting room allotment:', err);
      alert(err.message || 'Failed to export room allotment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle apply for all dates
  const handleApplyForAllDates = async () => {
    if (!formData.sem || formData.examType === '0' || !course || !examMy) {
      alert('Please select Sem, ExamType, and ensure Course and Exam M/Y are selected from header');
      return;
    }

    if (!window.confirm('Are you sure you want to apply room allotment for all dates?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const examTypeStr = getExamTypeString(formData.examType);
      // Format examMy to uppercase according to user's API examples
      const examMyFormatted = examMy ? examMy.toUpperCase() : examMy;

      const response = await applyRoomAllotmentForAllDates(
        course,
        examMyFormatted,
        formData.sem,
        examTypeStr
      );
      
      if (response.success) {
        alert(response.message || 'Room allotment applied for all dates successfully!');
      } else {
        alert(response.message || 'Failed to apply for all dates');
      }
    } catch (err) {
      console.error('Error applying for all dates:', err);
      alert(err.message || 'Failed to apply for all dates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Room Allotment</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            ROOM ALLOTMENT
          </h2>
          <button
            className={`${styles.collapseBtn} ${isMainCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsMainCollapsed(!isMainCollapsed)}
            aria-label="Toggle Form Section"
          >
            {isMainCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>

        {!isMainCollapsed && (
          <div className={styles.cardBody}>
            {(!course || !examMy || !regulation) && (
              <div style={{ color: 'red', padding: '10px', textAlign: 'center' }}>
                Please select Regulation, Course and Exam M/Y from the header dropdowns
              </div>
            )}

            {error && (
              <div style={{ color: 'red', padding: '10px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {isLoading && (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                Loading...
              </div>
            )}

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <div className={styles.formSection}>
                {/* Max Stu for Branch */}
                <div className={`${styles.formGroup} ${styles.small}`}>
                  <label className={styles.label}>Max.Stu.for Branch &lt;=</label>
                  <input
                    type="number"
                    name="maxStuForBranch"
                    className={styles.maxStuInput}
                    value={formData.maxStuForBranch}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              <br/>
                <div className={styles.formGroup}>
                  <label className={styles.label}>ExamType</label>
                  <select
                    name="examType"
                    className={styles.dropdown}
                    value={formData.examType}
                    onChange={handleInputChange}
                    disabled={!course}
                  >
                    <option value="0">Select ExamType</option>
                    <option value="1">External</option>
                    <option value="2">MID-I</option>
                    <option value="3">MID-II</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>SEM</label>
                  <select
                    name="sem"
                    className={styles.dropdown}
                    value={formData.sem}
                    onChange={handleInputChange}
                    disabled={!course || semOptions.length === 0}
                  >
                    <option value="">Select Sem</option>
                    {semOptions.map((sem, idx) => (
                      <option key={idx} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Session</label>
                  <select
                    name="session"
                    className={styles.dropdown}
                    value={formData.session}
                    onChange={handleInputChange}
                    disabled={!formData.sem || formData.examType === '0' || sessionOptions.length === 0}
                  >
                    <option value="">Select Session</option>
                    {sessionOptions.map((session, idx) => {
                      if (!session || session === 'null' || session === 'undefined') return null;
                      return (
                        <option key={idx} value={session}>{session}</option>
                      );
                    })}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Exam Date</label>
                  <select
                    name="examDate"
                    className={styles.dropdown}
                    value={formData.examDate}
                    onChange={handleInputChange}
                    disabled={!formData.session || examDateOptions.length === 0}
                  >
                    <option value="">Select Exam Date</option>
                    {examDateOptions.map((date, idx) => (
                      <option key={idx} value={date}>{date}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>regsup</label>
                  <select
                    name="regsup"
                    className={styles.dropdown}
                    value={formData.regsup}
                    onChange={handleInputChange}
                  >
                    <option value="0">Select Regsup</option>
                    <option value="1">REG</option>
                    <option value="2">SUP</option>
                    <option value="3">REG&SUP</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Pcode</label>
                  <select
                    name="pcode"
                    className={styles.dropdown}
                    value={formData.pcode}
                    onChange={handleInputChange}
                    disabled={!formData.examDate || pcodeOptions.length === 0}
                  >
                    <option value="">Select Pcode</option>
                    {pcodeOptions.map((pcode, idx) => (
                      <option key={idx} value={pcode}>{pcode}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Room</label>
                  <select
                    name="room"
                    className={styles.dropdown}
                    value={formData.room}
                    onChange={handleInputChange}
                    disabled={!formData.session || roomOptions.length === 0}
                  >
                    <option value="">Select Room</option>
                    {roomOptions.map((room, idx) => (
                      <option key={idx} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
              </div>

              <hr className={styles.hr} />

              {/* Dynamic Grid/List Section */}
              <div className={styles.gridSection}>
                {gridData.length === 0 ? (
                  <div className={styles.emptyGrid}>
                    Select all required fields (Sem, Session, Exam Date, Room) to load allotment grid
                  </div>
                ) : (
                  <div className={styles.gridContainer}>
                    {gridData.map((listItem, listIndex) => {
                      // Use listIndex directly as originalIndex
                      const originalIndex = listIndex;
                      
                      return (
                        <div key={originalIndex} style={{ display: 'inline-block', width: '90px' }}>
                          {/* Matching old .NET design structure */}
                          {/* First row - Branch dropdown with checkboxes */}
                          <div style={{ position: 'relative', width: '90px' }}>
                            <button
                              type="button"
                              onClick={() => setOpenBranchDropdownIndex(openBranchDropdownIndex === originalIndex ? null : originalIndex)}
                              style={{
                                width: '90px',
                                padding: '4px 8px',
                                fontWeight: 'bold',
                                backgroundColor: '#f0f0f0',
                                border: '1px solid #ccc',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {(listItem.selectedBranches || []).length === 0
                                  ? 'None selected'
                                  : (listItem.selectedBranches || []).length === branchOptions.length
                                  ? 'All Branches'
                                  : (listItem.selectedBranches || []).length === 1
                                  ? (listItem.selectedBranches || [])[0]
                                  : `${(listItem.selectedBranches || []).length} Selected`}
                              </span>
                              <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                                {openBranchDropdownIndex === originalIndex ? '▲' : '▼'}
                              </span>
                            </button>
                            {openBranchDropdownIndex === originalIndex && (
                              <div
                                ref={el => branchDropdownRefs.current[originalIndex] = el}
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  zIndex: 1000,
                                  backgroundColor: '#fff',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                  minWidth: '200px',
                                  marginTop: '2px'
                                }}
                              >
                                <div
                                  style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer',
                                    backgroundColor: (listItem.selectedBranches || []).length === branchOptions.length ? '#e3f2fd' : '#fff'
                                  }}
                                  onClick={() => handleColumnSelectAllBranches(originalIndex)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={(listItem.selectedBranches || []).length === branchOptions.length && branchOptions.length > 0}
                                    onChange={() => handleColumnSelectAllBranches(originalIndex)}
                                    style={{ marginRight: '8px' }}
                                  />
                                  <label style={{ cursor: 'pointer', fontWeight: 'bold' }}>Select all</label>
                                </div>
                                {branchOptions.map((branch, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '8px',
                                      cursor: 'pointer',
                                      backgroundColor: (listItem.selectedBranches || []).includes(branch) ? '#e3f2fd' : '#fff'
                                    }}
                                    onClick={() => handleColumnBranchToggle(originalIndex, branch)}
                                    onMouseEnter={(e) => {
                                      if (!(listItem.selectedBranches || []).includes(branch)) {
                                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!(listItem.selectedBranches || []).includes(branch)) {
                                        e.currentTarget.style.backgroundColor = '#fff';
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(listItem.selectedBranches || []).includes(branch)}
                                      onChange={() => handleColumnBranchToggle(originalIndex, branch)}
                                      style={{ marginRight: '8px' }}
                                    />
                                    <label style={{ cursor: 'pointer' }}>{branch}</label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <br />
                          {/* Red divider after first row - matching old .NET design */}
                          <div style={{ backgroundColor: 'red', height: '3px', width: '100%' }}></div>
                             
                          {/* GridView with textboxes - matching old .NET design */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(() => {
                              const columnSelectedBranches = listItem.selectedBranches || [];
                              const hasRows = listItem.rows && listItem.rows.length > 0;
                              const maxRows = parseInt(formData.maxStuForBranch) || 10; // Default to 10 if not set
                              
                              // If no rows exist (null/empty data), show empty textboxes for data entry
                              if (!hasRows) {
                                const emptyRows = [];
                                for (let i = 1; i <= maxRows; i++) {
                                  emptyRows.push(
                                    <input
                                      key={`col-${originalIndex}-empty-row-${i}`}
                                      type="text"
                                      className={styles.gridTextBox}
                                      value=""
                                      onChange={(e) => {
                                        // Create row if it doesn't exist
                                        const newGridData = [...gridData];
                                        if (!newGridData[originalIndex].rows) {
                                          newGridData[originalIndex].rows = [];
                                        }
                                        // Find next available row number
                                        const maxRowNum = newGridData[originalIndex].rows.length > 0 
                                          ? Math.max(...newGridData[originalIndex].rows.map(r => r.row || 0))
                                          : 0;
                                        const newRowNum = maxRowNum + 1;
                                        newGridData[originalIndex].rows.push({ 
                                          row: newRowNum, 
                                          regno: '', 
                                          value: e.target.value, 
                                          grp: '' 
                                        });
                                        setGridData(newGridData);
                                      }}
                                      placeholder=""
                                      style={{ width: '90px' }}
                                    />
                                  );
                                }
                                return emptyRows;
                              }
                              
                              // If rows exist, filter by selected branches and show them
                              const filteredRows = listItem.rows.filter(row => {
                                // If no branches are selected, don't show existing data rows
                                if (columnSelectedBranches.length === 0) {
                                  return false; // Don't show existing data when no branches are selected
                                }
                                
                                // If branches are selected, filter rows by selected branches (Grp field)
                                // Show row if it has grp and grp is in selected branches
                                if (row.grp) {
                                  return columnSelectedBranches.includes(row.grp);
                                }
                                
                                // If row doesn't have grp, don't show it
                                return false;
                              });
                              
                              // Render existing filtered rows
                              const existingRows = filteredRows.map((row, filteredIndex) => {
                                // Find original row index in gridData for handleGridTextChange
                                const originalRowIndex = listItem.rows.findIndex(r => r.row === row.row);
                                
                                return (
                                  <input
                                    key={`col-${originalIndex}-row-${row.row}`}
                                    type="text"
                                    className={styles.gridTextBox}
                                    value={row.value || ''}
                                    onChange={(e) => handleGridTextChange(originalIndex, originalRowIndex, e.target.value)}
                                    placeholder={`Row ${row.row}`}
                                    style={{ width: '90px' }}
                                  />
                                );
                              });
                              
                              // Show empty textboxes based on branch selection and data availability
                              const emptyRows = [];
                              
                              // Case 1: No branches selected → show empty cells (for data entry)
                              // Case 2: Branches selected but no matching data → show empty cells (for data entry)
                              // Case 3: Branches selected and data exists → hide empty cells (only show data)
                              
                              if (columnSelectedBranches.length === 0) {
                                // No branches selected: show empty cells
                                for (let i = 1; i <= maxRows; i++) {
                                  emptyRows.push(
                                    <input
                                      key={`col-${originalIndex}-empty-row-${i}`}
                                      type="text"
                                      className={styles.gridTextBox}
                                      value=""
                                      onChange={(e) => {
                                        // Create row if it doesn't exist
                                        const newGridData = [...gridData];
                                        if (!newGridData[originalIndex].rows) {
                                          newGridData[originalIndex].rows = [];
                                        }
                                        // Find next available row number
                                        const maxRowNum = newGridData[originalIndex].rows.length > 0 
                                          ? Math.max(...newGridData[originalIndex].rows.map(r => r.row || 0))
                                          : 0;
                                        const newRowNum = maxRowNum + 1;
                                        newGridData[originalIndex].rows.push({ 
                                          row: newRowNum, 
                                          regno: '', 
                                          value: e.target.value, 
                                          grp: '' 
                                        });
                                        setGridData(newGridData);
                                      }}
                                      placeholder=""
                                      style={{ width: '90px' }}
                                    />
                                  );
                                }
                              } else if (filteredRows.length === 0) {
                                // Branches selected but no matching data: show empty cells
                                for (let i = 1; i <= maxRows; i++) {
                                  emptyRows.push(
                                    <input
                                      key={`col-${originalIndex}-empty-row-${i}`}
                                      type="text"
                                      className={styles.gridTextBox}
                                      value=""
                                      onChange={(e) => {
                                        // Create row if it doesn't exist
                                        const newGridData = [...gridData];
                                        if (!newGridData[originalIndex].rows) {
                                          newGridData[originalIndex].rows = [];
                                        }
                                        // Find next available row number
                                        const maxRowNum = newGridData[originalIndex].rows.length > 0 
                                          ? Math.max(...newGridData[originalIndex].rows.map(r => r.row || 0))
                                          : 0;
                                        const newRowNum = maxRowNum + 1;
                                        newGridData[originalIndex].rows.push({ 
                                          row: newRowNum, 
                                          regno: '', 
                                          value: e.target.value, 
                                          grp: columnSelectedBranches[0] 
                                        });
                                        setGridData(newGridData);
                                      }}
                                      placeholder=""
                                      style={{ width: '90px' }}
                                    />
                                  );
                                }
                              }
                              // If filteredRows.length > 0, don't add empty rows (hide empty cells when data exists)
                              
                              // Return existing rows and empty rows
                              return [...existingRows, ...emptyRows];
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={isLoading || !isGridLoaded}
                >
                  {isLoading ? 'Saving...' : 'Submit'}
                </button>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={handleReset}
                  disabled={isLoading || !isGridLoaded}
                >
                  {isLoading ? 'Resetting...' : 'ReSet'}
                </button>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={handleExport}
                  disabled={isLoading || !formData.room}
                >
                  {isLoading ? 'Exporting...' : 'Excel Export'}
                </button>
                <button
                  type="button"
                  className={styles.applyAllBtn}
                  onClick={handleApplyForAllDates}
                  disabled={isLoading || !formData.sem || formData.examType === '0'}
                >
                  {isLoading ? 'Applying...' : 'Apply For All Dates'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomAllotment;
