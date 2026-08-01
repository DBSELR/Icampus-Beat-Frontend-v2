import React, { useState, useEffect, useCallback } from 'react';
import { FaEdit, FaChevronUp, FaChevronDown, FaTimes } from 'react-icons/fa';
import styles from './RevaluationRegistration.module.css';
import {
  getRevaluationSemesters,
  getRevaluationPapers,
  getRevaluationOptedPapers,
  checkRevaluationStatus,
  getRevaluationFee,
  registerRevaluationPaper,
  resetRevaluationPapers,
  payRevaluationFee,
  getRevaluationBundleData,
  getRevaluationReceipt,
  getStudentDetails,
  getAppData
} from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

// ... (rest of the component logic)

const RevaluationRegistration = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [semester, setSemester] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [registerNumber, setRegisterNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [branch, setBranch] = useState('');

  // Revaluation type state (should be empty initially, not pre-selected)
  const [revaluationType, setRevaluationType] = useState(''); // 'revaluation', 'recounting', 'challenge'

  // Papers state
  const [availablePapers, setAvailablePapers] = useState([]);
  const [optedPapers, setOptedPapers] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);

  // Amount state
  const [totalPayableAmount, setTotalPayableAmount] = useState(0);
  const [feePerPaper, setFeePerPaper] = useState(0);

  // Button visibility state (Unregister hidden by default, Cancel Receipt hidden by default)
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasReceipt, setHasReceipt] = useState(false);

  // Status check state
  const [revaluationStatus, setRevaluationStatus] = useState(null);

  // Collapsible sections
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isBundleDataCollapsed, setIsBundleDataCollapsed] = useState(false);

  // Bundle data state
  const [bundleData, setBundleData] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Cancel Receipt Modal State
  const [showCancelReceiptModal, setShowCancelReceiptModal] = useState(false);
  const [receiptNumberSearch, setReceiptNumberSearch] = useState('');
  const [receiptData, setReceiptData] = useState([]);

  // Handle cancel receipt button click
  const handleCancelReceipt = (e) => {
    e.preventDefault();
    setShowCancelReceiptModal(true);
    setReceiptNumberSearch('');
    setReceiptData([]);
  };

  // Handle receipt number change and search
  const handleReceiptNumberSearchChange = async (e) => {
    const value = e.target.value;
    setReceiptNumberSearch(value);
  };

  const handleReceiptSearchBlur = async () => {
    if (receiptNumberSearch) {
      try {
        setLoading(true);
        const response = await getRevaluationReceipt(receiptNumberSearch);
        if (response.success && response.data) {
          setReceiptData(response.data);
        } else {
          setReceiptData([]);
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        setReceiptData([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteReceipt = () => {
    if (receiptNumberSearch) {
      // TODO: Call delete API when available
      alert(`Delete functionality for receipt ${receiptNumberSearch} is not yet implemented.`);
    }
  };

  const closeCancelReceiptModal = (e) => {
    if (e) e.preventDefault();
    setShowCancelReceiptModal(false);
  };

  // Fetch semesters on component mount
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const appData = getAppData();
        const course = appData?.course || '';
        const examMy = appData?.examMY || '';
        const regulation = appData?.regulation || '';

        if (course && examMy && regulation) {
          setLoading(true);
          const response = await getRevaluationSemesters(course, examMy, regulation);
          console.log('Semesters API Response:', response); // Debug log
          if (response.success && response.data) {
            // Ensure data is an array
            const semestersArray = Array.isArray(response.data) ? response.data : [response.data];
            setSemesters(semestersArray);
            console.log('Semesters loaded:', semestersArray); // Debug log
          } else {
            console.warn('No semesters data in response:', response);
            setSemesters([]);
          }
        } else {
          console.warn('Missing app data (course, examMy, or regulation) for fetching semesters');
        }
      } catch (error) {
        console.error('Error fetching semesters:', error);
        setSemesters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, []);

  // Helper to fetch papers
  const fetchPapers = async (regNo, sem) => {
    // Ensure sem is a string (extract from object if needed)
    const semValue = typeof sem === 'object' && sem !== null ? (sem.SEM || sem.sem || sem) : String(sem || '');
    
    if (!regNo || !semValue) {
      console.warn('Missing regNo or sem for fetchPapers:', { regNo, sem, semValue });
      setAvailablePapers([]);
      setOptedPapers([]);
      return;
    }

    try {
      setLoading(true);
      const appData = getAppData();
      const examMy = appData?.examMY || '';
      const course = appData?.course || '';
      const regulation = appData?.regulation || '';

      if (!examMy) {
        console.warn('Missing examMy in appData');
        setAvailablePapers([]);
        setOptedPapers([]);
        return;
      }

      console.log('Fetching papers with:', { examMy, regNo, sem: semValue }); // Debug log

      // Fetch available papers, opted papers, and check status in parallel
      // Use Promise.allSettled to handle partial failures gracefully
      // This ensures that if one API fails, others can still succeed
      const [papersResult, optedResult, statusResult] = await Promise.allSettled([
        getRevaluationPapers(examMy, regNo, semValue),
        getRevaluationOptedPapers(examMy, regNo, semValue),
        checkRevaluationStatus(regulation, course, examMy, semValue, regNo)
      ]);
      
      // Extract responses from results - handle both fulfilled and rejected
      const papersResponse = papersResult.status === 'fulfilled' ? papersResult.value : null;
      const optedResponse = optedResult.status === 'fulfilled' ? optedResult.value : null;
      const statusResponse = statusResult.status === 'fulfilled' ? statusResult.value : null;
      
      // Log any rejected promises (but don't fail the whole operation)
      if (papersResult.status === 'rejected') {
        console.error('❌ Papers API call failed:', papersResult.reason);
        // Don't throw - we'll handle empty response below
      }
      if (optedResult.status === 'rejected') {
        console.warn('⚠️ Opted papers API call failed (non-critical):', optedResult.reason);
        // This is okay - just means no opted papers
      }
      if (statusResult.status === 'rejected') {
        console.warn('⚠️ Status check API call failed (non-critical):', statusResult.reason);
        // This is okay - just means we can't check status
      }

      console.log('📥 Papers API Responses:', { papersResponse, optedResponse, statusResponse }); // Debug log
      console.log('📥 Papers response type:', typeof papersResponse);
      console.log('📥 Papers response success:', papersResponse?.success);
      console.log('📥 Papers response data:', papersResponse?.data);

      let fetchedAvailable = [];
      let fetchedOpted = [];

      // Handle papers API response - be more lenient with response structure
      if (papersResponse) {
        // Check if response has success property (could be true, "true", or 1)
        const isSuccess = papersResponse.success === true || 
                         papersResponse.success === 'true' || 
                         papersResponse.success === 1 ||
                         (papersResponse.success === undefined && papersResponse.data); // If no success field but has data, assume success
        
        if (isSuccess && papersResponse.data) {
          // Handle both array and object responses
          if (Array.isArray(papersResponse.data)) {
            fetchedAvailable = papersResponse.data.length > 0 ? papersResponse.data : [];
            console.log('✅ Papers API returned array with', fetchedAvailable.length, 'papers');
          } else if (papersResponse.data && typeof papersResponse.data === 'object') {
            // Check if it's an empty object
            const keys = Object.keys(papersResponse.data);
            const hasData = keys.length > 0 && !keys.every(key => papersResponse.data[key] === null || papersResponse.data[key] === undefined || papersResponse.data[key] === '');
            if (hasData) {
              // If it's a single object, convert to array
              fetchedAvailable = [papersResponse.data];
              console.log('✅ Papers API returned single object, converted to array');
            } else {
              fetchedAvailable = [];
              console.warn('⚠️ Papers API returned empty object');
            }
          } else {
            fetchedAvailable = [];
            console.warn('⚠️ Papers API data is not array or object:', typeof papersResponse.data);
          }
          console.log('✅ Fetched available papers (raw):', fetchedAvailable, 'Count:', fetchedAvailable.length); // Debug log
        } else {
          console.warn('⚠️ Papers API response not successful or no data:', { 
            success: papersResponse.success, 
            isSuccess,
            hasData: !!papersResponse.data,
            data: papersResponse.data 
          }); // Debug log
          fetchedAvailable = [];
        }
      } else {
        console.error('❌ Papers API response is null or undefined');
        fetchedAvailable = [];
      }

      // Handle opted papers API response - be more lenient with response structure
      if (optedResponse) {
        // Check if response has success property (could be true, "true", or 1)
        const isOptedSuccess = optedResponse.success === true || 
                              optedResponse.success === 'true' || 
                              optedResponse.success === 1 ||
                              (optedResponse.success === undefined && optedResponse.data); // If no success field but has data, assume success
        
        if (isOptedSuccess && optedResponse.data) {
        // Handle both array and object responses
        if (Array.isArray(optedResponse.data)) {
          // Mark fetched opted papers as old so they don't contribute to the fee
          fetchedOpted = optedResponse.data.length > 0 
            ? optedResponse.data.map(p => ({ ...p, isOld: true }))
            : [];
        } else if (optedResponse.data && typeof optedResponse.data === 'object') {
          // Check if it's an empty object or has actual data
          const keys = Object.keys(optedResponse.data);
          const hasData = keys.length > 0 && !keys.every(key => optedResponse.data[key] === null || optedResponse.data[key] === undefined || optedResponse.data[key] === '');
          if (hasData) {
            fetchedOpted = [{ ...optedResponse.data, isOld: true }];
          } else {
            fetchedOpted = [];
          }
        } else {
          fetchedOpted = [];
        }
          console.log('✅ Fetched opted papers (raw):', fetchedOpted, 'Count:', fetchedOpted.length); // Debug log
        } else {
          // No opted papers - set to empty array
          fetchedOpted = [];
          console.log('ℹ️ No opted papers found or opted API not successful:', { 
            success: optedResponse.success, 
            hasData: !!optedResponse.data,
            data: optedResponse.data 
          }); // Debug log
        }
      } else {
        console.warn('⚠️ Opted API response is null or undefined');
        fetchedOpted = [];
      }

      if (statusResponse.success && statusResponse.data) {
        setRevaluationStatus(statusResponse.data);
        // Logic to handle status (e.g., disable if closed) can be added here
        if (statusResponse.data.length > 0 && statusResponse.data[0].RVCDATE === 0) {
          // Example: alert("Revaluation date might be closed");
        }
      }

      // Filter available papers: Remove those that are already in opted papers
      // Matching by PCODE (try multiple field name variations)
      const optedCodes = fetchedOpted && Array.isArray(fetchedOpted) && fetchedOpted.length > 0 
        ? fetchedOpted.map(p => {
            if (!p || typeof p !== 'object') return '';
            const code = p.PCODE || p.pCode || p.PCode || p.code || p.TEMPCODE || p.tempCode || '';
            const normalizedCode = String(code).trim().toUpperCase();
            return normalizedCode;
          }).filter(code => code && code.length > 0) // Remove empty strings
        : []; // Empty array if no opted papers
      
      console.log('Opted paper codes (normalized):', optedCodes, 'Count:', optedCodes.length); // Debug log
      console.log('Available papers before filtering:', fetchedAvailable.length, fetchedAvailable); // Debug log
      
      // Only filter if there are opted papers, otherwise show all available papers
      // IMPORTANT: If fetchedAvailable is empty or not an array, set filteredAvailable to empty array
      let filteredAvailable = [];
      
      console.log('🔍 Starting filter process:', {
        fetchedAvailableIsArray: Array.isArray(fetchedAvailable),
        fetchedAvailableLength: fetchedAvailable?.length,
        fetchedAvailable: fetchedAvailable,
        optedCodesLength: optedCodes?.length,
        optedCodes: optedCodes
      });
      
      if (Array.isArray(fetchedAvailable) && fetchedAvailable.length > 0) {
        // If no opted papers, show ALL available papers without filtering
        if (!optedCodes || optedCodes.length === 0) {
          console.log('✅ No opted papers - showing ALL available papers:', fetchedAvailable.length);
          filteredAvailable = fetchedAvailable; // Show all papers
        } else {
          // Filter out papers that are already opted
          filteredAvailable = fetchedAvailable.filter(p => {
            if (!p || typeof p !== 'object') {
              console.warn('❌ Invalid paper object:', p);
              return false;
            }
            
            const pcode = String(p.PCODE || p.pCode || p.PCode || p.code || p.TEMPCODE || p.tempCode || '').trim().toUpperCase();
            
            if (!pcode || pcode.length === 0) {
              console.warn('❌ Paper has no PCODE:', p);
              return false;
            }
            
            const isNotOpted = !optedCodes.includes(pcode);
            
            if (!isNotOpted) {
              console.log('🚫 Paper filtered out (already opted):', { paper: p, pcode, optedCodes });
            } else {
              console.log('✅ Paper will be shown:', { paper: p, pcode, optedCodes });
            }
            
            return isNotOpted;
          });
        }
      } else {
        console.warn('⚠️ fetchedAvailable is not a valid array or is empty:', {
          isArray: Array.isArray(fetchedAvailable),
          type: typeof fetchedAvailable,
          value: fetchedAvailable
        });
        filteredAvailable = [];
      }
      
      console.log('📊 Filter result:', {
        beforeFilter: fetchedAvailable.length,
        afterFilter: filteredAvailable.length,
        filteredAvailable: filteredAvailable
      });

      console.log('Filtered papers:', { 
        fetchedAvailable: fetchedAvailable.length, 
        filteredAvailable: filteredAvailable.length, 
        fetchedOpted: fetchedOpted.length,
        sampleAvailable: filteredAvailable[0],
        sampleOpted: fetchedOpted[0],
        allAvailablePapers: fetchedAvailable,
        allFilteredPapers: filteredAvailable
      }); // Debug log

      // Set state - ensure we're setting arrays even if empty
      const finalAvailable = Array.isArray(filteredAvailable) ? filteredAvailable : [];
      const finalOpted = Array.isArray(fetchedOpted) ? fetchedOpted : [];
      
      console.log('📊 Setting state - Final available papers:', finalAvailable.length, finalAvailable); // Debug log
      console.log('📊 Setting state - Final opted papers:', finalOpted.length, finalOpted); // Debug log
      console.log('📊 Final available papers type:', typeof finalAvailable, 'Is array:', Array.isArray(finalAvailable));
      
      // CRITICAL: Set state - use functional update to ensure React sees the change
      setAvailablePapers(() => {
        console.log('🔄 setAvailablePapers called with:', finalAvailable);
        return finalAvailable;
      });
      setOptedPapers(() => {
        console.log('🔄 setOptedPapers called with:', finalOpted);
        return finalOpted;
      });
      setTotalPayableAmount(0); // Reset amount
      
      // Additional debug log after state update
      console.log('✅ State update functions called - Available papers count:', finalAvailable.length);
      console.log('✅ State update functions called - Available papers data:', finalAvailable);
      
      // Force a re-render check
      setTimeout(() => {
        console.log('🔍 Post-setTimeout check - This should show updated state');
      }, 100);

      // Check if student is already registered based on opted papers
      if (fetchedOpted.length > 0) {
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }

    } catch (error) {
      console.error('❌ Error fetching papers:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.data
      });
      
      // Don't clear papers if it's just a warning - try to show what we have
      if (error.message && error.message.includes('Failed to fetch')) {
        alert(`Error loading papers: ${error.message || 'Unknown error'}`);
        setAvailablePapers([]);
        setOptedPapers([]);
      } else {
        // For other errors, log but don't clear - might be partial success
        console.warn('⚠️ Partial error in fetchPapers, but continuing...');
      }
    } finally {
      setLoading(false);
      console.log('🏁 fetchPapers completed, loading set to false');
    }
  };

  // Calculate total amount
  const calculateTotalAmount = useCallback((papers, fee) => {
    // Only calculate fee for papers that are NOT old (i.e., newly selected)
    const newPapersCount = papers.filter(p => !p.isOld).length;
    const total = newPapersCount * fee;
    setTotalPayableAmount(total);
    console.log('Calculated total amount:', total, 'for', newPapersCount, 'papers at', fee, 'per paper'); // Debug log
  }, []);

  // Debug: Log when availablePapers changes
  useEffect(() => {
    console.log('🔄 Available papers state changed:', availablePapers.length, availablePapers);
    console.log('🔄 Available papers is array?', Array.isArray(availablePapers));
    console.log('🔄 Available papers type:', typeof availablePapers);
  }, [availablePapers]);

  // Recalculate fee when opted papers or revaluation type changes
  useEffect(() => {
    if (revaluationType && feePerPaper > 0 && optedPapers.length > 0) {
      calculateTotalAmount(optedPapers, feePerPaper);
    } else if (optedPapers.length === 0) {
      setTotalPayableAmount(0);
    }
  }, [optedPapers, feePerPaper, revaluationType, calculateTotalAmount]);

  // Handle semester change (AutoPostBack behavior - triggers refresh)
  const handleSemesterChange = (e) => {
    const newSemester = e.target.value;
    setSemester(newSemester);
    // Clear papers when semester changes
    setAvailablePapers([]);
    setOptedPapers([]);
    setSelectedPapers([]);
    setTotalPayableAmount(0);
    setFeePerPaper(0); // Reset fee

    // Fetch papers if register number is present and valid
    if (newSemester && registerNumber && registerNumber.trim().length >= 10) {
      console.log('Semester changed, fetching papers with semester:', newSemester); // Debug log
      fetchPapers(registerNumber.trim(), newSemester);
    }
  };

  // Handle register number change
  const handleRegisterNumberChange = (e) => {
    const value = e.target.value.toUpperCase();
    setRegisterNumber(value);
  };

  // Handle register number blur (triggered when user leaves the field)
  const handleRegisterNumberBlur = async () => {
    const trimmedRegNo = registerNumber.trim();
    
    if (trimmedRegNo.length >= 10) {
      try {
        setLoading(true);
        // Fetch student details
        const studentResponse = await getStudentDetails(trimmedRegNo);
        if (studentResponse.success && studentResponse.data) {
          // Handle different response structures
          const studentData = Array.isArray(studentResponse.data) 
            ? studentResponse.data[0] 
            : studentResponse.data;
          
          setStudentName(studentData?.SNAME || studentData?.sName || studentData?.name || '');
          setBranch(studentData?.GRP || studentData?.grp || studentData?.branch || '');
        } else {
          setStudentName('');
          setBranch('');
        }

        // Fetch papers if semester is selected
        if (semester) {
          console.log('Register number changed, fetching papers with semester:', semester); // Debug log
          await fetchPapers(trimmedRegNo, semester);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
        setStudentName('');
        setBranch('');
        // Still try to fetch papers if semester is selected
        if (semester) {
          await fetchPapers(trimmedRegNo, semester);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setStudentName('');
      setBranch('');
      setAvailablePapers([]);
      setOptedPapers([]);
      setSelectedPapers([]);
      setTotalPayableAmount(0);
      setFeePerPaper(0);
    }
  };

  // Handle revaluation type change (AutoPostBack behavior - triggers refresh)
  const handleRevaluationTypeChange = async (type) => {
    setRevaluationType(type);

    // Map type to API code (lowercase for fee API)
    let rvTypeCode = '';
    if (type === 'revaluation') rvTypeCode = 'rv';
    else if (type === 'recounting') rvTypeCode = 'rc';
    else if (type === 'challenge') rvTypeCode = 'chrv'; // CHRV for challenge revaluation

    if (rvTypeCode && semester) {
      try {
        const appData = getAppData();
        const course = appData?.course || '';
        const examMy = appData?.examMY || '';
        const regulation = appData?.regulation || '';

        const response = await getRevaluationFee(regulation, course, examMy, semester, rvTypeCode);
        if (response.success && response.data && response.data.length > 0) {
          const fee = response.data[0].Amount;
          setFeePerPaper(fee);
          calculateTotalAmount(optedPapers, fee);
        } else {
          setFeePerPaper(0);
          calculateTotalAmount(optedPapers, 0);
        }
      } catch (error) {
        console.error("Error fetching fee:", error);
        setFeePerPaper(0);
        calculateTotalAmount(optedPapers, 0);
      }
    } else {
      setFeePerPaper(0);
      calculateTotalAmount(optedPapers, 0);
    }

    // Clear papers when revaluation type changes?
    // Usually, changing type might require re-fetching papers if availability depends on type.
    // But for now, we'll keep papers and just update fee.
    // If we need to clear:
    // setAvailablePapers([]);
    // setOptedPapers([]);
    // setTotalPayableAmount(0);
    // if (semester && registerNumber.length >= 10) {
    //   fetchPapers(registerNumber, semester);
    // }
  };

  // Handle paper selection from available papers (AutoPostBack behavior - automatically moves to opted)
  const handlePaperSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedValues = selectedOptions.map(option => option.value);

    // Automatically move selected papers to opted papers (AutoPostBack behavior)
    if (selectedValues.length > 0) {
      // Get the full paper objects for selected values
      const papersToAdd = availablePapers.filter(paper => {
        const paperValue = paper.PCODE || paper.code || paper;
        return selectedValues.includes(paperValue);
      });

      // Add to opted papers (avoid duplicates)
      const newOptedPapers = [...optedPapers];
      papersToAdd.forEach(paper => {
        const paperValue = paper.PCODE || paper.code || paper;
        if (!newOptedPapers.some(opt => (opt.PCODE || opt.code || opt) === paperValue)) {
          newOptedPapers.push(paper);
        }
      });
      setOptedPapers(newOptedPapers);

      // Clear selection after a brief delay to allow state update
      setTimeout(() => {
        e.target.selectedIndex = -1;
      }, 0);

      // Calculate total amount based on opted papers
      calculateTotalAmount(newOptedPapers, feePerPaper);
    }
  };

  // Handle register button (with validation like vRvReg function)
  const handleRegister = async (e) => {
    e.preventDefault();
    // Validate revaluation type (same as vRvReg function in reference)
    if (!revaluationType || revaluationType === '') {
      alert('Please check revaluation type');
      return false;
    }

    // Filter for new papers to register
    const papersToRegister = optedPapers.filter(p => !p.isOld);

    if (papersToRegister.length === 0) {
      alert('No new papers selected for registration.');
      return;
    }

    // Map type to API code (uppercase for register-paper API)
    let rvTypeCode = '';
    if (revaluationType === 'revaluation') rvTypeCode = 'RV';
    else if (revaluationType === 'recounting') rvTypeCode = 'RC';
    else if (revaluationType === 'challenge') rvTypeCode = 'CHRV'; // CHRV for challenge revaluation

    try {
      setLoading(true);
      const appData = getAppData();
      const examMy = appData?.examMY || '';

      if (!examMy || !registerNumber || !semester) {
        alert("Missing required data for registration.");
        return;
      }

      // Register each paper
      const registrationPromises = papersToRegister.map(paper => {
        const pCode = paper.PCODE || paper.code || paper;
        return registerRevaluationPaper(registerNumber, examMy, semester, pCode, rvTypeCode);
      });

      await Promise.all(registrationPromises);

      alert('Registration successful!');

      // Refresh data
      await fetchPapers(registerNumber, semester);

    } catch (error) {
      console.error("Error registering papers:", error);
      alert('Failed to register one or more papers. Please try again.');
    } finally {
      setLoading(false);
    }

    return true;
  };

  // Handle unregister button
  const handleUnregister = async (e) => {
    e.preventDefault(); // Prevent form submission if button is inside form

    if (!window.confirm("Are you sure you want to unregister all papers?")) {
      return;
    }

    try {
      setLoading(true);
      const appData = getAppData();
      const examMy = appData?.examMY || '';

      if (!examMy || !registerNumber || !semester) {
        alert("Missing required data for unregistration.");
        return;
      }

      await resetRevaluationPapers(registerNumber, examMy, semester);

      alert('Unregistration successful!');

      // Refresh data
      await fetchPapers(registerNumber, semester);

    } catch (error) {
      console.error("Error unregistering papers:", error);
      alert('Failed to unregister papers. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  // Handle bundle data button
  const handleBundleData = async (e) => {
    e.preventDefault(); // Prevent form submission

    try {
      setLoading(true);
      const appData = getAppData();
      const examMy = appData?.examMY || '';
      const course = appData?.course || '';
      const regulation = appData?.regulation || '';
      const userId = localStorage.getItem('userId') || 'admin'; // Get from localStorage or default

      if (!examMy || !course || !regulation) {
        alert("Missing required data (Exam Month/Year, Course, Regulation) to fetch bundle data.");
        return;
      }

      console.log('Fetching bundle data with:', { regulation, examMy, course, userId }); // Debug log

      const response = await getRevaluationBundleData(regulation, examMy, course, userId);

      console.log('Bundle Data API Response:', response); // Debug log
      console.log('Bundle Data Response Type:', typeof response.data); // Debug log
      console.log('Bundle Data Is Array:', Array.isArray(response.data)); // Debug log

      if (response && response.success !== false) {
        // Handle different response structures
        let bundleDataArray = [];
        
        if (response.data) {
          if (Array.isArray(response.data)) {
            bundleDataArray = response.data;
          } else if (response.data && typeof response.data === 'object') {
            // Check if it's an object with array property
            if (response.data.data && Array.isArray(response.data.data)) {
              bundleDataArray = response.data.data;
            } else if (response.data.rows && Array.isArray(response.data.rows)) {
              bundleDataArray = response.data.rows;
            } else {
              // If it's a single object, convert to array
              bundleDataArray = [response.data];
            }
          } else if (response.data && typeof response.data === 'string') {
            // If it's a string (JSON), parse it
            try {
              const parsed = JSON.parse(response.data);
              bundleDataArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (parseError) {
              console.error('Error parsing bundle data:', parseError);
              bundleDataArray = [];
            }
          }
        }

        console.log('Processed bundle data array:', bundleDataArray); // Debug log
        console.log('Bundle data length:', bundleDataArray.length); // Debug log

        if (bundleDataArray && bundleDataArray.length > 0) {
          setBundleData(bundleDataArray);
          setIsBundleDataCollapsed(false); // Expand the section
          console.log('Bundle data set successfully:', bundleDataArray.length, 'rows'); // Debug log
        } else {
          setBundleData([]);
          alert('No bundle data found.');
        }
      } else {
        setBundleData([]);
        const errorMsg = response?.message || 'No bundle data found.';
        console.error('Bundle data error:', errorMsg);
        alert(errorMsg);
      }

    } catch (error) {
      console.error("Error fetching bundle data:", error);
      alert(`Failed to fetch bundle data: ${error.message || 'Unknown error'}`);
      setBundleData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Revaluation Registration</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            REVALUATION REGISTRATION
          </h2>
          <button
            className={styles.collapseBtn}
            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          >
            {isHeaderCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>

        {!isHeaderCollapsed && (
          <div className={styles.boxContent}>
            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              {/* Semester and Register Number Row */}
              <table className={styles.formTable}>
                <tbody>
                  <tr>
                    <td className={styles.tableCell}></td>
                    <td className={styles.tableCell}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Semester</label>
                        <select
                          className={styles.select}
                          value={semester}
                          onChange={handleSemesterChange}
                        >
                          <option value="">Select an Option</option>
                          {semesters.map((sem, index) => {
                            // Extract semester value - handle different response structures
                            const semValue = sem.SEM || sem.sem || sem.sem1 || sem || '';
                            const semDisplay = semValue || 'Unknown';
                            return (
                              <option key={index} value={semValue}>
                                {semDisplay}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Register Number</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Enter Register Number..."
                          value={registerNumber}
                          onChange={handleRegisterNumberChange}
                          onBlur={handleRegisterNumberBlur}
                          onKeyDown={(e) => {
                            if (e.keyCode === 13) {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                    </td>
                    {studentName && (
                      <td className={styles.studentInfoCell}>
                        <span className={styles.studentName}>{studentName}</span>
                      </td>
                    )}
                    {branch && (
                      <td className={styles.studentInfoCell}>
                        <span className={styles.branch}>{branch}</span>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>

              {/* Revaluation Type Radio Buttons */}
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="revaluationType"
                    value="revaluation"
                    checked={revaluationType === 'revaluation'}
                    onChange={() => handleRevaluationTypeChange('revaluation')}
                    className={styles.radio}
                  />
                  Revalution
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="revaluationType"
                    value="recounting"
                    checked={revaluationType === 'recounting'}
                    onChange={() => handleRevaluationTypeChange('recounting')}
                    className={styles.radio}
                  />
                  Recounting
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="revaluationType"
                    value="challenge"
                    checked={revaluationType === 'challenge'}
                    onChange={() => handleRevaluationTypeChange('challenge')}
                    className={styles.radio}
                  />
                  Revaluation By Challenge
                </label>
              </div>

              {/* Papers and Opted Papers Section */}
              <table className={styles.papersTable}>
                <tbody>
                  <tr>
                    <td className={styles.tableSpacer}></td>
                    <td className={styles.papersTableCell}>
                      <table className={styles.papersInnerTable}>
                        <tbody>
                          <tr>
                            <td>
                              <label className={styles.papersLabel}>Paper(s)</label>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              {loading ? (
                                <div className={styles.loadingText}>Loading papers...</div>
                              ) : (
                                <select
                                  multiple
                                  className={styles.papersListBox}
                                  size="10"
                                  onChange={handlePaperSelection}
                                >
                                  {(() => {
                                    // Debug rendering
                                    console.log('🎨 Rendering papers list - availablePapers:', availablePapers);
                                    console.log('🎨 Is array?', Array.isArray(availablePapers));
                                    console.log('🎨 Length:', availablePapers?.length);
                                    
                                    if (!Array.isArray(availablePapers)) {
                                      console.warn('⚠️ availablePapers is not an array:', typeof availablePapers, availablePapers);
                                      return <option disabled>No papers available (not array)</option>;
                                    }
                                    
                                    if (availablePapers.length === 0) {
                                      console.log('ℹ️ availablePapers is empty array');
                                      return <option disabled>No papers available</option>;
                                    }
                                    
                                    console.log('✅ Rendering', availablePapers.length, 'papers');
                                    return availablePapers.map((paper, index) => {
                                      // Ensure paper is a valid object
                                      if (!paper || typeof paper !== 'object') {
                                        console.warn('❌ Invalid paper object at index', index, paper);
                                        return null;
                                      }
                                      
                                      // Try multiple field name variations for PCODE and PNAME
                                      const pcode = paper.PCODE || paper.pCode || paper.PCode || paper.code || paper.TEMPCODE || paper.tempCode || '';
                                      const pname = paper.PNAME || paper.pName || paper.PName || paper.name || '';
                                      const displayText = pname ? `${pcode} - ${pname}` : (pcode || 'Unknown Paper');
                                      
                                      // Use a more unique key (without Date.now() to avoid re-renders)
                                      const uniqueKey = `paper-${pcode}-${index}-${paper.REGNO || ''}`;
                                      
                                      if (!pcode) {
                                        console.warn('❌ Paper missing PCODE at index', index, paper);
                                        return null;
                                      }
                                      
                                      console.log('✅ Rendering paper option:', displayText);
                                      return (
                                        <option key={uniqueKey} value={pcode}>
                                          {displayText}
                                        </option>
                                      );
                                    }).filter(Boolean); // Remove null entries
                                  })()}
                                </select>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td className={styles.tableSpacer}></td>
                    <td className={styles.papersTableCell}>
                      <table className={styles.papersInnerTable}>
                        <tbody>
                          <tr>
                            <td>
                              <label className={styles.optedPapersLabel}>Opted Papers</label>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <select
                                multiple
                                className={styles.optedPapersListBox}
                                size="10"
                                readOnly
                              >
                                {optedPapers.length === 0 ? (
                                  <option disabled>No opted papers</option>
                                ) : (
                                  optedPapers.map((paper, index) => {
                                    const paperValue = paper.PCODE || paper.pCode || paper.PCode || paper.code || '';
                                    const paperName = paper.PNAME || paper.pName || paper.PName || paper.name || '';
                                    return (
                                      <option key={index} value={paperValue}>
                                        {paperName || paperValue || 'Unknown Paper'}
                                      </option>
                                    );
                                  })
                                )}
                              </select>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td className={styles.tableSpacer}></td>
                  </tr>
                </tbody>
              </table>

              {/* Total Payable Amount and Buttons */}
              <div className={styles.actionSection}>
                <div className={styles.amountGroup}>
                  <label className={styles.amountLabel}>Total Payable Amount :</label>
                  <input
                    type="text"
                    className={styles.amountInput}
                    value={totalPayableAmount}
                    readOnly
                  />
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.registerBtn}
                    onClick={handleRegister}
                  >
                    Register
                  </button>
                  {isRegistered && (
                    <button
                      className={styles.unregisterBtn}
                      onClick={handleUnregister}
                      style={{ display: isRegistered ? 'inline-block' : 'none' }}
                    >
                      Unregister
                    </button>
                  )}
                  {hasReceipt && (
                    <button
                      className={styles.cancelReceiptBtn}
                      onClick={handleCancelReceipt}
                    >
                      Cancel Receipt
                    </button>
                  )}
                </div>
              </div>

              {/* REVALUATION BUNDLE DATA Section */}
              <div className={styles.bundleDataSection}>
                <div className={styles.bundleDataHeader}>
                  <h3>REVALUATION BUNDLE DATA</h3>
                  <button
                    className={styles.collapseBtn}
                    onClick={() => setIsBundleDataCollapsed(!isBundleDataCollapsed)}
                  >
                    {isBundleDataCollapsed ? <FaChevronDown /> : <FaChevronUp />}
                  </button>
                </div>
                {!isBundleDataCollapsed && (
                  <div className={styles.bundleDataContent}>
                    {loading ? (
                      <div className={styles.loadingText}>Loading bundle data...</div>
                    ) : bundleData.length === 0 ? (
                      <div className={styles.emptyTable}>No bundle data available. Click "Bundle Data" button to load.</div>
                    ) : (
                      <div className={styles.tableResponsive}>
                        <table className={styles.bundleTable}>
                          <thead>
                            <tr>
                              {bundleData[0] && Object.keys(bundleData[0]).map((key) => (
                                <th key={key}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {bundleData.map((row, index) => (
                              <tr key={index}>
                                {row && Object.values(row).map((val, i) => (
                                  <td key={i}>{val !== null && val !== undefined ? String(val) : ''}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons for Bundle Data */}
              <div className={styles.bundleActions}>
                <button
                  className={styles.bundleDataBtn}
                  onClick={handleBundleData}
                >
                  Bundle Data
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Cancel Receipt Modal */}
      {showCancelReceiptModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeModalBtn} onClick={closeCancelReceiptModal}>
              <FaTimes />
            </button>
            <div className={styles.modalBody}>
              <div className={styles.modalInputGroup}>
                <label>Receipt NO : </label>
                <input
                  type="text"
                  value={receiptNumberSearch}
                  onChange={handleReceiptNumberSearchChange}
                  onBlur={handleReceiptSearchBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleReceiptSearchBlur()}
                  className={styles.input}
                />
              </div>
              <br />
              {receiptData.length > 0 ? (
                <div className={styles.tableResponsive}>
                  <table className={styles.bundleTable}>
                    <thead>
                      <tr>
                        {Object.keys(receiptData[0]).map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((val, i) => (
                            <td key={i}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                receiptNumberSearch && <p>No data found for this receipt number.</p>
              )}
              <br />
              <div className={styles.modalActions}>
                <input
                  type="button"
                  value="Submit"
                  onClick={handleDeleteReceipt}
                  className={styles.submitBtn}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevaluationRegistration;

