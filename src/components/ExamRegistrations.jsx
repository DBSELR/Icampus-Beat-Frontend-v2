import React, { useState, useEffect } from 'react';
import { FaEdit, FaTimes } from 'react-icons/fa';
import { getExamRegistrationStudent, getExamRegistrationFailedPapers, getAppData, registerExam, unregisterExam, getRegisteredList, getToBeRegisteredList, getReceiptDuplicate, cancelReceipt, getReceiptPrint, getExamRegistrationFeeRegular, getExamRegistrationFeeSupply, getExamNotifications, getExamRegistrationSems, getExamRegistrationBatchSemester, checkExamNotification, checkRegistered, registerAllExamRegistrations, unregisterAllExamRegistrations, getFeeFineList } from '../utils/api';
import styles from './ExamRegistrations.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

// Helper function to convert number to Roman numeral
const convertToRoman = (num) => {
  const romanNumerals = [
    { value: 8, numeral: 'VIII' },
    { value: 7, numeral: 'VII' },
    { value: 6, numeral: 'VI' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 3, numeral: 'III' },
    { value: 2, numeral: 'II' },
    { value: 1, numeral: 'I' }
  ];
  
  for (let i = 0; i < romanNumerals.length; i++) {
    if (num >= romanNumerals[i].value) {
      return romanNumerals[i].numeral;
    }
  }
  return num.toString();
};

const ExamRegistrations = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // H.T.No. input state
  const [htNo, setHtNo] = useState('');
  const [studentName, setStudentName] = useState('');

  // Semester papers state (8 semesters) - stores available papers per semester
  const [semesterPapers, setSemesterPapers] = useState({
    sem1: [],
    sem2: [],
    sem3: [],
    sem4: [],
    sem5: [],
    sem6: [],
    sem7: [],
    sem8: []
  });

  // Selected papers per semester
  const [selectedPapersBySem, setSelectedPapersBySem] = useState({
    sem1: [],
    sem2: [],
    sem3: [],
    sem4: [],
    sem5: [],
    sem6: [],
    sem7: [],
    sem8: []
  });

  // All selected papers (for display panel) - stores full paper objects
  const [selectedPapers, setSelectedPapers] = useState([]);

  // All checkboxes state
  const [allChecked, setAllChecked] = useState({
    sem1: false,
    sem2: false,
    sem3: false,
    sem4: false,
    sem5: false,
    sem6: false,
    sem7: false,
    sem8: false
  });

  // Fee amounts state
  const [feeAmounts, setFeeAmounts] = useState({
    examAmount: 0,
    fineAmount: 0,
    concessionAmount: 0,
    totalPayable: 0
  });

  // Semester fee labels state
  const [semesterFees, setSemesterFees] = useState({
    sem1: '---',
    sem2: '---',
    sem3: '---',
    sem4: '---',
    sem5: '---',
    sem6: '---',
    sem7: '---',
    sem8: '---'
  });

  // Metadata about semester fee (type: REG/SUP, base paper count used for fee)
  const [semesterFeeMeta, setSemesterFeeMeta] = useState({
    sem1: { type: null, baseCount: 0 },
    sem2: { type: null, baseCount: 0 },
    sem3: { type: null, baseCount: 0 },
    sem4: { type: null, baseCount: 0 },
    sem5: { type: null, baseCount: 0 },
    sem6: { type: null, baseCount: 0 },
    sem7: { type: null, baseCount: 0 },
    sem8: { type: null, baseCount: 0 }
  });

  // Warning modal state for regular/supplementary conflict
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Helper to recalculate fee amounts based on selected semesters and semesterFees
  const recalculateFeeFromSemesterFees = (selectedBySemOverride) => {
    const selectedMap = selectedBySemOverride || selectedPapersBySem;

    let examAmount = 0;

    // Sum fee for each semester that has at least one selected paper
    Object.keys(selectedMap).forEach(semKey => {
      const selectedInSem = selectedMap[semKey] || [];
      if (selectedInSem.length > 0) {
        const semFeeStr = semesterFees[semKey];
        const semFee = semFeeStr && semFeeStr !== '---'
          ? parseFloat(semFeeStr) || 0
          : 0;

        const meta = semesterFeeMeta[semKey] || { type: null, baseCount: 0 };

        // If supply semester, use more accurate rules
        if (meta.type === 'SUP' && meta.baseCount > 0) {
          // When only one paper is selected and we have a dedicated single-paper fee from API,
          // use that exact amount instead of proportional calculation.
          if (selectedInSem.length === 1 && meta.singlePaperFee) {
            const singleFee = parseFloat(meta.singlePaperFee) || 0;
            examAmount += singleFee;
          } else {
            // Fallback: proportional to number of selected papers
            const ratio = selectedInSem.length / meta.baseCount;
            examAmount += semFee * ratio;
          }
        } else {
          // Regular semester (all-or-none) or unknown → use full semester fee
          examAmount += semFee;
        }
      }
    });

    const fineAmount = feeAmounts.fineAmount || 0;
    const concessionAmount = feeAmounts.concessionAmount || 0;
    const totalPayable = examAmount + fineAmount - concessionAmount;

    setFeeAmounts({
      examAmount,
      fineAmount,
      concessionAmount,
      totalPayable
    });
  };

  // Modal states
  const [showCancelReceiptModal, setShowCancelReceiptModal] = useState(false);
  const [showRePrintModal, setShowRePrintModal] = useState(false);
  const [showRegisterAllModal, setShowRegisterAllModal] = useState(false);

  // Cancel Receipt modal state
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptRegNo, setReceiptRegNo] = useState('');
  const [receiptData, setReceiptData] = useState([]);
  const [receiptRegNoList, setReceiptRegNoList] = useState([]); // List of registration numbers for the receipt

  // Re-Print modal state
  const [rePrintReceiptNo, setRePrintReceiptNo] = useState('');

  // Register All modal state
  const [batchSem, setBatchSem] = useState('');
  const [batchSemOptions, setBatchSemOptions] = useState([]);
  const [loadingBatchSem, setLoadingBatchSem] = useState(false);

  // Show unregister button (when student is already registered)
  const [showUnregister, setShowUnregister] = useState(false);

  // Loading state for student info
  const [loadingStudent, setLoadingStudent] = useState(false);

  // Exam notification state
  const [examNotificationData, setExamNotificationData] = useState(null);
  const [allowedSemesters, setAllowedSemesters] = useState([]);
  const [examEndDate, setExamEndDate] = useState(null);
  const [isStudentRegistered, setIsStudentRegistered] = useState(false);

  // Fetch exam notifications on component mount and when app data changes
  useEffect(() => {
    const fetchExamNotifications = async () => {
      const appData = getAppData();
      if (appData?.examMY && appData?.course && appData?.regulation) {
        try {
          const response = await getExamNotifications(
            appData.examMY,
            appData.course,
            appData.regulation
          );
          
          if (response.success && response.data && response.data.length > 0) {
            // Get the first notification (or combine all)
            const notification = response.data[0];
            setExamNotificationData(notification);
            
            // Extract semesters from notification (could be in SEM, Semesters, or SEMS field)
            const semestersStr = notification.Semesters || notification.SEM || notification.SEMS || notification.sem || '';
            if (semestersStr) {
              // Parse semesters (could be comma-separated or space-separated)
              const semesters = semestersStr.split(/[,\s]+/).filter(s => s.trim() !== '').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s >= 1 && s <= 8);
              setAllowedSemesters(semesters);
            }
            
            // Extract end date
            const endDateStr = notification.ExReg_End_Date || notification.ExRegEndDate || notification.EXREG_END_DATE || '';
            if (endDateStr) {
              setExamEndDate(new Date(endDateStr));
            }
          }
        } catch (error) {
          console.error('Error fetching exam notifications:', error);
        }
      }
    };

    fetchExamNotifications();
  }, []);

  // Fetch student information when H.T.No. or allowed semesters (from Exam Notification) change
  useEffect(() => {
    const fetchStudentInfo = async () => {
      if (!htNo || htNo.length < 10) {
        // Clear student info if H.T.No. is too short
        setStudentName('');
        setSemesterPapers({
          sem1: [], sem2: [], sem3: [], sem4: [],
          sem5: [], sem6: [], sem7: [], sem8: []
        });
        // Reset fee labels
        setSemesterFees({
          sem1: '---', sem2: '---', sem3: '---', sem4: '---',
          sem5: '---', sem6: '---', sem7: '---', sem8: '---'
        });
        return;
      }

      setLoadingStudent(true);
      try {
        const appData = getAppData();
        
        // Don't check notification here - it will be checked when papers are selected
        // Only check using existing examEndDate state (fallback)
        // TEMPORARILY DISABLED - Notification date check
        // if (examEndDate && new Date() > examEndDate) {
        //   alert('Please check the notification date');
        //   setLoadingStudent(false);
        //   return;
        // }

        // Fetch student information
        const response = await getExamRegistrationStudent(htNo);

        // Check if API returns "No Data" (student already registered)
        if (!response.success && response.message && 
            (response.message.toLowerCase().includes('no data') || 
             response.message.toLowerCase() === 'no data')) {
          alert('No Data');
          setStudentName('');
          setSemesterPapers({
            sem1: [], sem2: [], sem3: [], sem4: [],
            sem5: [], sem6: [], sem7: [], sem8: []
          });
          setHtNo('');
          setLoadingStudent(false);
          return;
        }

        if (response.success && response.data && response.data.length > 0) {
          const studentData = response.data[0];
          // Display student name (SNAME field)
          setStudentName(studentData.SNAME || '');

          // Check if student is already registered
          if (appData?.examMY && appData?.course && appData?.regulation) {
            try {
              const registeredListResponse = await getRegisteredList(
                appData.examMY,
                appData.course,
                appData.regulation,
                'REG'
              );
              
              if (registeredListResponse.success && registeredListResponse.data) {
                const isRegistered = registeredListResponse.data.some(
                  item => (item.Regno || item.REGNO || item.regNo || '').toUpperCase() === htNo.toUpperCase()
                );
                
                if (isRegistered) {
                  alert('No Data');
                  setStudentName('');
                  setSemesterPapers({
                    sem1: [], sem2: [], sem3: [], sem4: [],
                    sem5: [], sem6: [], sem7: [], sem8: []
                  });
                  setHtNo('');
                  setLoadingStudent(false);
                  return;
                }
                setIsStudentRegistered(false);
              }
            } catch (error) {
              console.error('Error checking registration status:', error);
            }
          }

          // Fetch failed papers for this student
          if (appData?.examMY) {
            try {
              const failedPapersResponse = await getExamRegistrationFailedPapers(
                htNo,
                appData.examMY,
                appData.course || '',
                appData.regulation || '',
                '' // sem optional – SP returns all relevant
              );

              if (failedPapersResponse.success && failedPapersResponse.data) {
                // Group papers by semester
                const papersBySemester = {
                  sem1: [], sem2: [], sem3: [], sem4: [],
                  sem5: [], sem6: [], sem7: [], sem8: []
                };

                failedPapersResponse.data.forEach(paper => {
                  const sem = parseInt(paper.SEM);
                  if (sem >= 1 && sem <= 8) {
                    // Filter: Only include semesters that are in Exam Notification
                    if (allowedSemesters.length === 0 || allowedSemesters.includes(sem)) {
                      // Check if paper is already registered (REGD field)
                      const isAlreadyRegistered = paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1' ||
                                                 paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1';
                      
                      // Only include papers that are NOT already registered
                      if (!isAlreadyRegistered) {
                        const semKey = `sem${sem}`;
                        papersBySemester[semKey].push({
                          pcode: paper.PCODE,
                          pname: paper.PNAME,
                          cr: paper.CR,
                          gr: paper.GR,
                          exammy: paper.EXAMMY, // Store actual EXAMMY from paper data
                          papres: paper.PAPRES,
                          regd: paper.REGD,
                          regsup: paper.REGSUP
                        });
                      }
                    }
                  }
                });

                setSemesterPapers(papersBySemester);

                // Fetch fees (and fine) for each semester that has papers
                const feePromises = [];
                const updatedFees = {
                  sem1: '---', sem2: '---', sem3: '---', sem4: '---',
                  sem5: '---', sem6: '---', sem7: '---', sem8: '---'
                };
                const updatedFeeMeta = {
                  sem1: { type: null, baseCount: 0 },
                  sem2: { type: null, baseCount: 0 },
                  sem3: { type: null, baseCount: 0 },
                  sem4: { type: null, baseCount: 0 },
                  sem5: { type: null, baseCount: 0 },
                  sem6: { type: null, baseCount: 0 },
                  sem7: { type: null, baseCount: 0 },
                  sem8: { type: null, baseCount: 0 }
                };

                for (let sem = 1; sem <= 8; sem++) {
                  const semKey = `sem${sem}`;
                  if (papersBySemester[semKey].length > 0) {
                    // Check if this semester has supply papers
                    const hasSupply = papersBySemester[semKey].some(p => p.regsup === 'SUP');
                    const hasRegular = papersBySemester[semKey].some(p => !p.regsup || p.regsup === 'REG' || p.regsup === '');

                    // Fetch fee based on paper type
                      if (hasSupply) {
                      // For supply, use fCount (number of failed papers)
                      const fCount = papersBySemester[semKey].filter(p => p.regsup === 'SUP').length;
                      feePromises.push(
                        getExamRegistrationFeeSupply(
                          fCount,
                          appData.course || '',
                          appData.examMY || '',
                          appData.regulation || '',
                          htNo,
                          sem
                        ).then(feeResponse => {
                          console.log(`Supply Fee Response for sem ${sem}:`, feeResponse); // Debug log
                          if (feeResponse && feeResponse.success && feeResponse.data) {
                            // Handle different response structures
                            let feeData = feeResponse.data;
                            if (Array.isArray(feeData) && feeData.length > 0) {
                              feeData = feeData[0];
                            }
                            // Try multiple possible field names for amount
                            const feeAmount = feeData.Amount || feeData.amount || feeData.AMOUNT || feeData.Fee || feeData.fee || feeData.FEE;
                            if (feeAmount !== undefined && feeAmount !== null && feeAmount !== '') {
                              // Format the amount (remove decimals if .00, otherwise show 2 decimals)
                              const formattedAmount = typeof feeAmount === 'number' 
                                ? (feeAmount % 1 === 0 ? feeAmount.toString() : feeAmount.toFixed(2))
                                : feeAmount;
                              updatedFees[semKey] = formattedAmount;
                              updatedFeeMeta[semKey] = {
                                ...(updatedFeeMeta[semKey] || {}),
                                type: 'SUP',
                                baseCount: fCount
                              };
                              console.log(`Set supply fee for sem ${sem}:`, formattedAmount); // Debug log
                            } else {
                              console.warn(`No fee amount found in response for sem ${sem}:`, feeData);
                            }
                          } else {
                            console.warn(`No fee data in response for sem ${sem}:`, feeResponse);
                          }
                        }).catch(err => {
                          console.error(`Error fetching supply fee for sem ${sem}:`, err);
                        })
                      );

                      // Additionally, when there are multiple supply papers (fCount > 1),
                      // also fetch fee for a single paper (fCount = 1) for the same semester.
                      if (fCount > 1) {
                        feePromises.push(
                          getExamRegistrationFeeSupply(
                            1,
                            appData.course || '',
                            appData.examMY || '',
                            appData.regulation || '',
                            htNo,
                            sem
                          ).then(singleFeeResponse => {
                            console.log(`Single-paper Supply Fee Response for sem ${sem}:`, singleFeeResponse);
                            if (singleFeeResponse && singleFeeResponse.success && singleFeeResponse.data) {
                              let singleFeeData = singleFeeResponse.data;
                              if (Array.isArray(singleFeeData) && singleFeeData.length > 0) {
                                singleFeeData = singleFeeData[0];
                              }
                              const singleFeeAmount = singleFeeData.Amount || singleFeeData.amount || singleFeeData.AMOUNT || singleFeeData.Fee || singleFeeData.fee || singleFeeData.FEE;
                              if (singleFeeAmount !== undefined && singleFeeAmount !== null && singleFeeAmount !== '') {
                                const formattedSingleAmount = typeof singleFeeAmount === 'number'
                                  ? (singleFeeAmount % 1 === 0 ? singleFeeAmount.toString() : singleFeeAmount.toFixed(2))
                                  : singleFeeAmount;

                                // Store single-paper fee in metadata for this semester
                                updatedFeeMeta[semKey] = {
                                  ...(updatedFeeMeta[semKey] || { type: 'SUP', baseCount: fCount }),
                                  singlePaperFee: formattedSingleAmount
                                };

                                console.log(`Set single-paper supply fee for sem ${sem}:`, formattedSingleAmount);
                              } else {
                                console.warn(`No single-paper fee amount found in response for sem ${sem}:`, singleFeeData);
                              }
                            } else {
                              console.warn(`No single-paper fee data in response for sem ${sem}:`, singleFeeResponse);
                            }
                          }).catch(err => {
                            console.error(`Error fetching single-paper supply fee for sem ${sem}:`, err);
                          })
                        );
                      }
                    } else if (hasRegular) {
                      // For regular, need regu, grp from student data
                      const regu = studentData.REGU || studentData.regu || studentData.REGULATION || '';
                      const grp = studentData.GRP || studentData.grp || studentData.BRANCH || '';
                      feePromises.push(
                        getExamRegistrationFeeRegular(
                          regu,
                          sem.toString(),
                          appData.course || '',
                          grp,
                          appData.examMY || '',
                          appData.regulation || '',
                          htNo
                        ).then(feeResponse => {
                          console.log(`Regular Fee Response for sem ${sem}:`, feeResponse); // Debug log
                          if (feeResponse && feeResponse.success && feeResponse.data) {
                            // Handle different response structures
                            let feeData = feeResponse.data;
                            if (Array.isArray(feeData) && feeData.length > 0) {
                              feeData = feeData[0];
                            }
                            // Try multiple possible field names for amount
                            const feeAmount = feeData.Amount || feeData.amount || feeData.AMOUNT || feeData.Fee || feeData.fee || feeData.FEE;
                            if (feeAmount !== undefined && feeAmount !== null && feeAmount !== '') {
                              // Format the amount (remove decimals if .00, otherwise show 2 decimals)
                              const formattedAmount = typeof feeAmount === 'number' 
                                ? (feeAmount % 1 === 0 ? feeAmount.toString() : feeAmount.toFixed(2))
                                : feeAmount;
                              updatedFees[semKey] = formattedAmount;
                              updatedFeeMeta[semKey] = { type: 'REG', baseCount: papersBySemester[semKey].length };
                              console.log(`Set regular fee for sem ${sem}:`, formattedAmount); // Debug log
                            } else {
                              console.warn(`No fee amount found in response for sem ${sem}:`, feeData);
                            }
                          } else {
                            console.warn(`No fee data in response for sem ${sem}:`, feeResponse);
                          }
                        }).catch(err => {
                          console.error(`Error fetching regular fee for sem ${sem}:`, err);
                        })
                      );
                    }
                  }
                }

                // Fetch fine fee list (actual API: /api/Fee/fine/list)
                try {
                  const fineRes = await getFeeFineList(
                    appData.course || '',
                    appData.examMY || '',
                    appData.regulation || ''
                  );
                  if (fineRes && fineRes.success && Array.isArray(fineRes.data) && fineRes.data.length > 0) {
                    const fineRow = fineRes.data[0];
                    const amount =
                      fineRow.FINEAMOUNT || fineRow.FineAmount || fineRow.fineAmount || fineRow.AMOUNT || fineRow.amount;
                    if (amount !== undefined && amount !== null && amount !== '') {
                      const fineVal =
                        typeof amount === 'number'
                          ? amount
                          : parseFloat(String(amount));
                      if (!isNaN(fineVal)) {
                        setFeeAmounts(prev => {
                          const updatedFine = fineVal;
                          const totalPayable = prev.examAmount + updatedFine - prev.concessionAmount;
                          return {
                            ...prev,
                            fineAmount: updatedFine,
                            totalPayable
                          };
                        });
                      }
                    }
                  }
                } catch (fineErr) {
                  console.error('Error fetching fine fee list:', fineErr);
                }

                // Wait for all fee fetches to complete
                await Promise.all(feePromises);
                console.log('Updated fees after all API calls:', updatedFees); // Debug log
                setSemesterFees(updatedFees);
                setSemesterFeeMeta(updatedFeeMeta);
              }
            } catch (error) {
              console.error('Error fetching failed papers:', error);
              // Don't show alert for failed papers error, just log it
            }
          }
        } else {
          setStudentName('');
          alert('Student not found. Please check the H.T.No.');
        }
      } catch (error) {
        console.error('Error fetching student info:', error);
        setStudentName('');
        alert('Failed to fetch student information. Please try again.');
      } finally {
        setLoadingStudent(false);
      }
    };

    // Debounce the API call - wait 500ms after user stops typing or when allowed semesters update
    const timeoutId = setTimeout(() => {
      fetchStudentInfo();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [htNo, allowedSemesters]);

  // Handle H.T.No. change
  const handleHtNoChange = (e) => {
    const value = e.target.value.toUpperCase();
    setHtNo(value);

    // Clear data if H.T.No. is cleared
    if (!value) {
      setStudentName('');
      setSelectedPapers([]);
      setSelectedPapersBySem({
        sem1: [], sem2: [], sem3: [], sem4: [],
        sem5: [], sem6: [], sem7: [], sem8: []
      });
      setFeeAmounts({
        examAmount: 0,
        fineAmount: 0,
        concessionAmount: 0,
        totalPayable: 0
      });
    }
  };


  // Helper function to check exam notification and registration status for a specific semester
  const checkNotificationForSemester = async (semester) => {
    const appData = getAppData();
    if (!appData?.examMY || !appData?.course || !appData?.regulation) {
      return { canProceed: true, message: '' }; // If no app data, allow selection
    }

    const sem = semester.replace('sem', '');
    if (!sem) {
      return { canProceed: true, message: '' }; // If no semester, allow selection
    }

    try {
      // First check if semester is already registered
      const checkRegisteredResponse = await checkRegistered(htNo, sem, appData.examMY);
      
      if (checkRegisteredResponse.data && checkRegisteredResponse.data.isRegistered) {
        // Semester is already registered - show popup and don't allow selection
        alert('Notification is valid. No data.');
        return { canProceed: false, message: 'Notification is valid. No data.' };
      }

      // If not registered, check notification date
      // TEMPORARILY DISABLED - Notification date check
      // const notificationCheck = await checkExamNotification(
      //   appData.examMY,
      //   appData.course,
      //   appData.regulation,
      //   sem
      // );
      
      // If API returns success: false or message indicates date exceeded
      // if (!notificationCheck.success || 
      //     (notificationCheck.message && notificationCheck.message.toLowerCase().includes('notification date'))) {
      //   alert('Please check the notification date');
      //   return { canProceed: false, message: 'Please check the notification date' };
      // }
      
      return { canProceed: true, message: '' };
    } catch (error) {
      console.error('Error checking exam notification:', error);
      // Allow selection even if notification check fails
      return { canProceed: true, message: '' };
    }
  };

  // Handle "All" checkbox change
  const handleAllCheckboxChange = async (semester) => {
    const newCheckedState = !allChecked[semester];
    
    // If selecting all, check for regular/supplementary conflict
    if (newCheckedState) {
      // First check notification and registration status for this semester
      const checkResult = await checkNotificationForSemester(semester);
      if (!checkResult.canProceed) {
        // If semester is already registered, don't add papers to selected papers panel
        // Clear any existing selections for this semester
        setSelectedPapersBySem(prev => {
          const updated = { ...prev, [semester]: [] };
          // Update selected papers display - remove papers from this semester
          const allSelected = [];
          Object.keys(updated).forEach(sem => {
            updated[sem].forEach(pcode => {
              const paper = semesterPapers[sem].find(p => p.pcode === pcode);
              if (paper) {
                allSelected.push({
                  pcode: paper.pcode,
                  pname: paper.pname,
                  regsup: paper.regsup || 'REG',
                  sem: sem
                });
              }
            });
          });
          setSelectedPapers(allSelected);
          return updated;
        });
        setAllChecked(prev => ({ ...prev, [semester]: false }));
        return; // Don't update selection if check fails
      }
      // Get all currently selected papers across all other semesters
      const allCurrentSelected = [];
      Object.keys(selectedPapersBySem).forEach(semKey => {
        if (semKey !== semester) {
          selectedPapersBySem[semKey].forEach(pcode => {
            const paper = semesterPapers[semKey].find(p => p.pcode === pcode);
            if (paper) allCurrentSelected.push(paper);
          });
        }
      });

      // Check if current semester has both regular and supplementary
      const semHasRegular = semesterPapers[semester].some(p => !p.regsup || p.regsup === 'REG' || p.regsup === '');
      const semHasSupplementary = semesterPapers[semester].some(p => p.regsup === 'SUP');

      // Check existing selections
      const hasRegular = allCurrentSelected.some(p => !p.regsup || p.regsup === 'REG' || p.regsup === '');
      const hasSupplementary = allCurrentSelected.some(p => p.regsup === 'SUP');

      // If conflict would occur
      if ((hasSupplementary && semHasRegular) || (hasRegular && semHasSupplementary)) {
        setWarningMessage('Only regular or supplementary papers can be selected. You cannot select both.');
        setShowWarningModal(true);
        return; // Don't update selection
      }
    }

    setAllChecked(prev => ({
      ...prev,
      [semester]: newCheckedState
    }));

    // Select or deselect all papers for this semester
    if (newCheckedState) {
      // Select all papers (get pcode values)
      const allPcodes = semesterPapers[semester].map(p => p.pcode);
      setSelectedPapersBySem(prev => {
        const updated = {
          ...prev,
          [semester]: allPcodes
        };
        
        // Immediately update selected papers display with new state
        const allSelected = [];
        Object.keys(updated).forEach(sem => {
          updated[sem].forEach(pcode => {
            const paper = semesterPapers[sem].find(p => p.pcode === pcode);
            if (paper) {
              allSelected.push({
                pcode: paper.pcode,
                pname: paper.pname,
                regsup: paper.regsup || 'REG',
                sem: sem
              });
            }
          });
        });
        setSelectedPapers(allSelected);

        // Calculate fees based on semester-wise fee (450, 650, ...)
        recalculateFeeFromSemesterFees(updated);
        
        return updated;
      });
    } else {
      // Deselect all papers
      setSelectedPapersBySem(prev => {
        const updated = {
          ...prev,
          [semester]: []
        };
        
        // Immediately update selected papers display with new state
        const allSelected = [];
        Object.keys(updated).forEach(sem => {
          updated[sem].forEach(pcode => {
            const paper = semesterPapers[sem].find(p => p.pcode === pcode);
            if (paper) {
              allSelected.push({
                pcode: paper.pcode,
                pname: paper.pname,
                regsup: paper.regsup || 'REG',
                sem: sem
              });
            }
          });
        });
        setSelectedPapers(allSelected);

        // Calculate fees based on semester-wise fee (450, 650, ...)
        recalculateFeeFromSemesterFees(updated);
        
        return updated;
      });
    }
  };

  // Handle paper selection from listbox
  const handlePaperSelection = async (semester, selectedOptions) => {
    // Get currently selected papers (full objects)
    const currentSelected = selectedPapersBySem[semester].map(pcode => 
      semesterPapers[semester].find(p => p.pcode === pcode)
    ).filter(Boolean);

    // Get newly selected papers (full objects)
    const newSelected = selectedOptions.map(pcode => 
      semesterPapers[semester].find(p => p.pcode === pcode)
    ).filter(Boolean);

    // Check if we're adding or removing
    const isAdding = newSelected.length > currentSelected.length;
    const newlyAdded = newSelected.filter(p => !currentSelected.find(cp => cp.pcode === p.pcode));

    // Check for regular/supplementary conflict
    if (isAdding && newlyAdded.length > 0) {
      // First check notification and registration status for this semester if papers are being added
      const checkResult = await checkNotificationForSemester(semester);
      if (!checkResult.canProceed) {
        // If semester is already registered, don't add papers to selected papers panel
        // Reset selection to previous state (keep existing selection, don't add new ones)
        setSelectedPapersBySem(prev => {
          // Keep previous selection for this semester
          const updated = { ...prev };
          // Update selected papers display - only show papers that were already selected
          const allSelected = [];
          Object.keys(updated).forEach(sem => {
            updated[sem].forEach(pcode => {
              const paper = semesterPapers[sem].find(p => p.pcode === pcode);
              if (paper) {
                allSelected.push({
                  pcode: paper.pcode,
                  pname: paper.pname,
                  regsup: paper.regsup || 'REG',
                  sem: sem
                });
              }
            });
          });
          setSelectedPapers(allSelected);
          return updated;
        });
        return; // Don't update selection if check fails
      }
      // Get all currently selected papers across all semesters
      const allCurrentSelected = [];
      Object.keys(selectedPapersBySem).forEach(semKey => {
        if (semKey !== semester) {
          selectedPapersBySem[semKey].forEach(pcode => {
            const paper = semesterPapers[semKey].find(p => p.pcode === pcode);
            if (paper) allCurrentSelected.push(paper);
          });
        }
      });
      // Add current semester's existing selections
      currentSelected.forEach(paper => allCurrentSelected.push(paper));

      // Check if we have both regular and supplementary
      const hasRegular = allCurrentSelected.some(p => !p.regsup || p.regsup === 'REG' || p.regsup === '');
      const hasSupplementary = allCurrentSelected.some(p => p.regsup === 'SUP');

      // Check newly added papers
      const newHasRegular = newlyAdded.some(p => !p.regsup || p.regsup === 'REG' || p.regsup === '');
      const newHasSupplementary = newlyAdded.some(p => p.regsup === 'SUP');

      // If we're trying to add regular when supplementary exists, or vice versa
      if ((hasSupplementary && newHasRegular) || (hasRegular && newHasSupplementary)) {
        setWarningMessage('Only regular or supplementary papers can be selected. You cannot select both.');
        setShowWarningModal(true);
        return; // Don't update selection
      }
    }

    // Update selection and immediately update display
    setSelectedPapersBySem(prev => {
      const updated = {
        ...prev,
        [semester]: selectedOptions
      };
      
      // Immediately update selected papers display with new state
      const allSelected = [];
      Object.keys(updated).forEach(sem => {
        updated[sem].forEach(pcode => {
          const paper = semesterPapers[sem].find(p => p.pcode === pcode);
          if (paper) {
            allSelected.push({
              pcode: paper.pcode,
              pname: paper.pname,
              regsup: paper.regsup || 'REG',
              sem: sem
            });
          }
        });
      });
      setSelectedPapers(allSelected);

      // Calculate fees based on semester-wise fee (450, 650, ...)
      recalculateFeeFromSemesterFees(updated);
      
      return updated;
    });

    // Update "All" checkbox state
    if (selectedOptions.length === semesterPapers[semester].length && semesterPapers[semester].length > 0) {
      setAllChecked(prev => ({ ...prev, [semester]: true }));
    } else {
      setAllChecked(prev => ({ ...prev, [semester]: false }));
    }
  };

  // Update selected papers display panel
  const updateSelectedPapersDisplay = () => {
    const allSelected = [];
    Object.keys(selectedPapersBySem).forEach(sem => {
      selectedPapersBySem[sem].forEach(pcode => {
        const paper = semesterPapers[sem].find(p => p.pcode === pcode);
        if (paper) {
          allSelected.push({
            pcode: paper.pcode,
            pname: paper.pname,
            regsup: paper.regsup || 'REG',
            sem: sem
          });
        }
      });
    });
    setSelectedPapers(allSelected);
    // Calculate fees immediately after updating selected papers
    recalculateFeeFromSemesterFees();
  };

  // Calculate fees based on selected papers
  const calculateFees = () => {
    // Use semester-wise fee structure instead of per-paper * 100
    recalculateFeeFromSemesterFees();
  };

  // Handle Register button
  const handleRegister = async () => {
    if (selectedPapers.length === 0) {
      alert('Please select at least one paper to register');
      return;
    }
    if (!htNo) {
      alert('Please enter H.T.No.');
      return;
    }

    try {
      const appData = getAppData();
      if (!appData?.examMY) {
        alert('Exam Month/Year not found. Please check application data.');
        return;
      }

      // Check exam notification end date using new API for each semester
      // TEMPORARILY DISABLED - Notification date check
      // if (appData?.examMY && appData?.course && appData?.regulation) {
      //   try {
      //     // Get unique semesters from selected papers
      //     const selectedSemesters = new Set();
      //     Object.keys(selectedPapersBySem).forEach(semKey => {
      //       if (selectedPapersBySem[semKey].length > 0) {
      //         const sem = semKey.replace('sem', '');
      //         selectedSemesters.add(sem);
      //       }
      //     });

      //     // Check notification for each selected semester
      //     for (const sem of selectedSemesters) {
      //       const notificationCheck = await checkExamNotification(
      //         appData.examMY,
      //         appData.course,
      //         appData.regulation,
      //         sem
      //       );
      //       
      //       // If API returns success: false or message indicates date exceeded
      //       if (!notificationCheck.success || 
      //           (notificationCheck.message && notificationCheck.message.toLowerCase().includes('notification date'))) {
      //         alert('Please check the notification date');
      //         return;
      //       }
      //     }
      //   } catch (error) {
      //     console.error('Error checking exam notification:', error);
      //     // Continue with registration even if notification check fails
      //   }
      // }

      // Also check using existing examEndDate state (fallback)
      // TEMPORARILY DISABLED - Notification date check
      // if (examEndDate && new Date() > examEndDate) {
      //   alert('Please check the notification date');
      //   return;
      // }

      // Get user ID from localStorage
      const userId = localStorage.getItem('userId') || 'DBS';

      // Determine registration per semester (isSupply should be per semester, not global)
      const registrationPromises = [];
      const selectedSemesters = new Set();

          // Group selected papers by semester AND examMy (papers can have different exam months/years)
      // First, group by semester, then by examMy within each semester
      const papersBySemAndExamMy = {};
      
      for (const semKey of Object.keys(selectedPapersBySem)) {
        if (selectedPapersBySem[semKey].length > 0) {
          const sem = semKey.replace('sem', '');
          
          selectedPapersBySem[semKey].forEach(selectedPcode => {
            const paper = semesterPapers[semKey].find(p => p.pcode === selectedPcode);
            if (paper) {
              // Check if paper is already registered (regd field)
              const isAlreadyRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
              
              // Only register papers that are NOT already registered
              if (!isAlreadyRegistered) {
                // Get actual EXAMMY from paper data (use paper's exammy, fallback to appData.examMY)
                const paperExamMy = paper.exammy || paper.EXAMMY || appData.examMY || '';
                
                // Create key for grouping: sem_examMy
                const groupKey = `${sem}_${paperExamMy}`;
                
                if (!papersBySemAndExamMy[groupKey]) {
                  papersBySemAndExamMy[groupKey] = {
                    sem: sem,
                    examMy: paperExamMy,
                    papers: [],
                    isSupply: false,
                    hasRegular: false
                  };
                }
                
                papersBySemAndExamMy[groupKey].papers.push(paper);
                
                // Check if paper is supply
                const paperRegSup = (paper.regsup || paper.REGSUP || '').toString().toUpperCase();
                if (paperRegSup === 'SUP') {
                  papersBySemAndExamMy[groupKey].isSupply = true;
                } else {
                  papersBySemAndExamMy[groupKey].hasRegular = true;
                }
              }
            }
          });
        }
      }

      // Process each group (semester + examMy combination)
      for (const groupKey of Object.keys(papersBySemAndExamMy)) {
        const group = papersBySemAndExamMy[groupKey];
        const { sem, examMy, papers: papersForThisGroup, isSupply: isSupplyForThisGroup, hasRegular } = group;
        
        if (papersForThisGroup.length > 0) {
          selectedSemesters.add(sem);
          
          // Check if student is already registered for this specific semester in the CURRENT ExamMY (from navbar)
          let isStudentAlreadyRegisteredForSem = false;
          try {
            const checkRegisteredResponse = await checkRegistered(
              htNo,
              sem,
              appData.examMY || examMy
            );
            if (checkRegisteredResponse.data && checkRegisteredResponse.data.isRegistered) {
              isStudentAlreadyRegisteredForSem = true;
            }
          } catch (error) {
            console.error('Error checking registration status for sem:', sem, 'examMy:', examMy, error);
            // Continue with registration even if check fails
          }

          let finalIsSupply;
          
          if (isSupplyForThisGroup) {
            // Supply papers: Always use INSERT (isSupply = true, uses SP_SH_EXAMREG_SAVE)
            finalIsSupply = true;
          } else if (hasRegular) {
            // Regular papers: 
            // - If student is NOT registered → use INSERT (isSupply = true, uses SP_SH_EXAMREG_SAVE)
            // - If student is already registered → use UPDATE (isSupply = false, uses sp_SH_ExamReg_Update)
            finalIsSupply = !isStudentAlreadyRegisteredForSem;
          } else {
            // Fallback: default to INSERT for first-time registration
            finalIsSupply = !isStudentAlreadyRegisteredForSem;
          }

          // Build papers array for this group
          const paperCodes = papersForThisGroup.map(p => p.pcode).join('_') + '_';
          // Ensure regSup is correctly set: 'SUP' for supply papers, 'REG' for regular papers
          const hasAnySupplyPaper = papersForThisGroup.some(p => {
            const paperRegSup = (p.regsup || p.REGSUP || '').toString().toUpperCase();
            return paperRegSup === 'SUP';
          });
          const regSup = (isSupplyForThisGroup || hasAnySupplyPaper) ? 'SUP' : 'REG';
          
          // Get fee for this semester (use semKey to get fee)
          const semKey = `sem${sem}`;
          const semFeeStr = semesterFees[semKey];
          const semFee = semFeeStr && semFeeStr !== '---' ? parseFloat(semFeeStr) || 0 : 0;
          
          // Build registration data — use active Exam M/Y from header (appData.examMY),
          // fallback to examMy from paper data if needed
          const registrationData = {
            regNo: htNo,
            sem: sem,
            examMy: appData.examMY || examMy,
            userId: userId,
            isSupply: finalIsSupply,
            course: appData.course || '',
            regulation: appData.regulation || '',
            regSup: regSup,
            examFee: semFee,
            fineFee: feeAmounts.fineAmount || 0,
            appFee: 0, // TODO: Calculate app fee if needed
            concession: feeAmounts.concessionAmount || 0,
            totalAmount: feeAmounts.totalPayable || semFee,
            papers: [{
              sem: sem,
              papers: paperCodes,
              pCount: papersForThisGroup.length,
              regSup: regSup,
              examFee: semFee,
              fineFee: feeAmounts.fineAmount || 0
            }]
          };

          registrationPromises.push(registerExam(registrationData));
        }
      }

      // Check if there are any papers to register
      if (registrationPromises.length === 0) {
        alert('All selected papers are already registered. Please select unregistered papers.');
        return;
      }

      // Execute all registrations
      const registrationResults = await Promise.all(registrationPromises);
      
      // Check if any registration failed
      const failedRegistrations = registrationResults.filter(r => !r.success);
      if (failedRegistrations.length > 0) {
        const errorMessages = failedRegistrations.map(r => r.message || 'Registration failed').join('\n');
        alert(`Some registrations failed:\n${errorMessages}`);
        return;
      }

      alert(`Successfully registered ${selectedPapers.length} paper(s) for ${htNo}\nTotal Amount: ₹${feeAmounts.totalPayable}`);

      // Clear all student data after successful registration (student should not be visible)
      setHtNo('');
      setStudentName('');
      setSelectedPapers([]);
      setSelectedPapersBySem({
        sem1: [], sem2: [], sem3: [], sem4: [],
        sem5: [], sem6: [], sem7: [], sem8: []
      });
      setAllChecked({
        sem1: false, sem2: false, sem3: false, sem4: false,
        sem5: false, sem6: false, sem7: false, sem8: false
      });
      setSemesterPapers({
        sem1: [], sem2: [], sem3: [], sem4: [],
        sem5: [], sem6: [], sem7: [], sem8: []
      });
      setSemesterFees({
        sem1: '---', sem2: '---', sem3: '---', sem4: '---',
        sem5: '---', sem6: '---', sem7: '---', sem8: '---'
      });
      setFeeAmounts({
        examAmount: 0,
        fineAmount: 0,
        concessionAmount: 0,
        totalPayable: 0
      });
      setShowUnregister(false);
      setIsStudentRegistered(false);

    } catch (error) {
      console.error('Registration error:', error);
      alert(`Failed to register: ${error.message}`);
    }
  };

  // Handle Unregister button
  const handleUnregister = async () => {
    if (!htNo) {
      alert('Please enter H.T.No.');
      return;
    }

    const confirmUnregister = window.confirm(`Are you sure you want to unregister ${htNo} from the exam?`);
    if (!confirmUnregister) {
      return;
    }

    try {
      const appData = getAppData();
      if (!appData?.examMY) {
        alert('Exam Month/Year not found. Please check application data.');
        return;
      }

      const unregistrationData = {
        regNo: htNo,
        examMy: appData.examMY
      };

      await unregisterExam(unregistrationData);

      alert(`Successfully unregistered ${htNo} from the exam`);

      // Hide unregister button after successful unregistration
      setShowUnregister(false);

      // Clear selections
      setSelectedPapers([]);
      setSelectedPapersBySem({
        sem1: [], sem2: [], sem3: [], sem4: [],
        sem5: [], sem6: [], sem7: [], sem8: []
      });

    } catch (error) {
      console.error('Unregistration error:', error);
      alert(`Failed to unregister: ${error.message}`);
    }
  };

  // Handle Re-Print button
  const handleRePrint = () => {
    setShowRePrintModal(true);
  };

  // Handle Re-Print Submit
  const handleRePrintSubmit = async () => {
    if (!rePrintReceiptNo) {
      alert('Please enter receipt number');
      return;
    }

    try {
      const response = await getReceiptPrint(rePrintReceiptNo);

      if (response.success && response.data && response.data.length > 0) {
        // Receipt data found - trigger print
        printReceipt(response.data, rePrintReceiptNo);

        // Close modal
        setShowRePrintModal(false);
        setRePrintReceiptNo('');
      } else {
        alert('No receipt found with this receipt number.');
      }
    } catch (error) {
      console.error('Error fetching receipt for print:', error);
      alert(`Failed to fetch receipt: ${error.message}`);
    }
  };

  // Helper function to print receipt
  const printReceipt = (receiptData, receiptNo) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    // Generate HTML content for receipt
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${receiptNo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          h2 {
            text-align: center;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .receipt-header {
            margin-bottom: 20px;
          }
          .receipt-info {
            margin-bottom: 10px;
          }
          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h2>Exam Registration Receipt</h2>
        <div class="receipt-header">
          <div class="receipt-info"><strong>Receipt No:</strong> ${receiptNo}</div>
          <div class="receipt-info"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              ${Object.keys(receiptData[0]).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${receiptData.map(row => `
              <tr>
                ${Object.values(row).map(value => `<td>${value || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br>
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Handle Cancel Receipt button
  const handleCancelReceipt = () => {
    setShowCancelReceiptModal(true);
  };

  // Fetch receipt registration numbers when receipt number changes
  useEffect(() => {
    const fetchReceiptData = async () => {
      if (!receiptNo || receiptNo.length === 0) {
        setReceiptRegNoList([]);
        setReceiptRegNo('');
        return;
      }

      try {
        const response = await getReceiptDuplicate(receiptNo);

        if (response.success && response.data && response.data.length > 0) {
          // Extract registration numbers from response
          const regNos = response.data.map(item => item.Regno);
          setReceiptRegNoList(regNos);

          // Auto-select first registration number
          if (regNos.length > 0) {
            setReceiptRegNo(regNos[0]);
          }
        } else {
          setReceiptRegNoList([]);
          setReceiptRegNo('');
          alert('No registration data found for this receipt number.');
        }
      } catch (error) {
        console.error('Error fetching receipt data:', error);
        setReceiptRegNoList([]);
        setReceiptRegNo('');
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchReceiptData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [receiptNo]);

  // Handle Cancel Receipt Submit
  const handleCancelReceiptSubmit = async () => {
    if (!receiptNo) {
      alert('Please enter receipt number');
      return;
    }
    if (!receiptRegNo) {
      alert('Please select a registration number');
      return;
    }

    const confirmCancel = window.confirm(`Are you sure you want to cancel receipt ${receiptNo} for ${receiptRegNo}?`);
    if (!confirmCancel) {
      return;
    }

    try {
      await cancelReceipt(receiptNo, receiptRegNo);

      alert(`Successfully cancelled receipt ${receiptNo} for ${receiptRegNo}`);

      // Close modal and reset
      setShowCancelReceiptModal(false);
      setReceiptNo('');
      setReceiptRegNo('');
      setReceiptRegNoList([]);
    } catch (error) {
      console.error('Error cancelling receipt:', error);
      alert(`Failed to cancel receipt: ${error.message}`);
    }
  };

  // Handle Registered List button
  const handleRegisteredList = async () => {
    try {
      const appData = getAppData();
      if (!appData?.examMY || !appData?.course || !appData?.regulation) {
        alert('Application data (Exam MY, Course, Regulation) not found. Please check settings.');
        return;
      }

      // Fetch registered list
      const response = await getRegisteredList(appData.examMY, appData.course, appData.regulation, 'REG');

      if (response.success && response.data && response.data.length > 0) {
        // Export to CSV
        exportToCSV(response.data, `Registered_List_${appData.examMY}_${appData.course}_${appData.regulation}.csv`);
      } else {
        alert('No registered students found.');
      }
    } catch (error) {
      console.error('Error exporting registered list:', error);
      alert(`Failed to export registered list: ${error.message}`);
    }
  };

  // Handle To be Registered List button
  const handleToBeRegisteredList = async () => {
    try {
      const appData = getAppData();
      if (!appData?.examMY || !appData?.course || !appData?.regulation) {
        alert('Application data (Exam MY, Course, Regulation) not found. Please check settings.');
        return;
      }

      // Fetch to-be-registered list
      const response = await getToBeRegisteredList(appData.examMY, appData.course, appData.regulation);

      if (response.success && response.data && response.data.length > 0) {
        // Export to CSV
        exportToCSV(response.data, `ToBeRegistered_List_${appData.examMY}_${appData.course}_${appData.regulation}.csv`);
      } else {
        alert('No students to be registered found.');
      }
    } catch (error) {
      console.error('Error exporting to-be-registered list:', error);
      alert(`Failed to export to-be-registered list: ${error.message}`);
    }
  };

  // Helper function to export data to CSV
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvContent += values.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Register Or Unregister All button
  const handleRegisterOrUnregisterAll = () => {
    setShowRegisterAllModal(true);
    fetchBatchSemOptions(); // Fetch semesters from Exam Notification
  };

  // Handle Register All Submit
  const handleRegisterAllSubmit = async () => {
    if (!batchSem) {
      alert('Please select Batch-Sem');
      return;
    }
    
    try {
      const appData = getAppData();
      if (!appData?.course) {
        alert('Course information not found. Please set course first.');
        return;
      }

      // batchSem holds regusem value from API (e.g. "202" => regu="20", sem="2")
      const regusem = batchSem.trim();
      if (regusem.length < 2) {
        alert('Invalid Batch-Sem value.');
        return;
      }

      const sem = regusem.slice(-1);        // last digit is semester
      const regu = regusem.slice(0, -1);    // remaining part is regulation/batch

      const response = await registerAllExamRegistrations(appData.course, regu, sem);

      if (response.message) {
        alert(response.message);
      } else {
        alert('Register all completed successfully.');
      }
    } catch (error) {
      console.error('Error in register-all:', error);
      alert(error.message || 'Failed to register all students.');
    } finally {
      setShowRegisterAllModal(false);
      setBatchSem('');
    }
  };

  // Handle Unregister All Submit
  const handleUnregisterAllSubmit = async () => {
    if (!batchSem) {
      alert('Please select Batch-Sem');
      return;
    }
    
    try {
      const appData = getAppData();
      if (!appData?.course) {
        alert('Course information not found. Please set course first.');
        return;
      }

      // batchSem holds regusem value from API (e.g. "202" => regu="20", sem="2")
      const regusem = batchSem.trim();
      if (regusem.length < 2) {
        alert('Invalid Batch-Sem value.');
        return;
      }

      const sem = regusem.slice(-1);        // last digit is semester
      const regu = regusem.slice(0, -1);    // remaining part is regulation/batch

      const response = await unregisterAllExamRegistrations(appData.course, regu, sem);

      if (response.message) {
        alert(response.message);
      } else {
        alert('Unregister all completed successfully.');
      }
    } catch (error) {
      console.error('Error in unregister-all:', error);
      alert(error.message || 'Failed to unregister all students.');
    } finally {
      setShowRegisterAllModal(false);
      setBatchSem('');
    }
  };

  // Fetch batch-sem options based on current ExamMY
  const fetchBatchSemOptions = async () => {
    try {
      setLoadingBatchSem(true);
      setBatchSemOptions([]); // Clear previous options
      const appData = getAppData();
      
      if (!appData?.examMY || !appData?.course) {
        console.warn('Missing app data for batch-sem fetch:', appData);
        setBatchSemOptions([]);
        setLoadingBatchSem(false);
        return;
      }

      console.log('Fetching batch-sem options with:', {
        course: appData.course,
        examMY: appData.examMY
      });

      const response = await getExamRegistrationBatchSemester(
        appData.course,
        appData.examMY
      );

      console.log('Batch-Semester API Response:', response);

      if (response.success && response.data) {
        let formattedOptions = [];
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          formattedOptions = response.data.map(item => {
            // If the item is already a string, use it both as value and label
            if (typeof item === 'string') {
              return { value: item, label: item };
            }
            
            // Display text: BATCH-SEM (e.g. "2021-II SEM")
            const label =
              item.BATCH_SEM ||
              item.batchSem ||
              item.BatchSem ||
              item.batch_sem ||
              item['BATCH-SEM'] ||
              '';

            // Hidden value used for API: regusem (e.g. "202")
            const regusem =
              item.regusem ||
              item.REGUSEM ||
              item.reguSem ||
              item.regu_sem ||
              item.ReguSem ||
              '';

            if (!label && !regusem) {
              return null;
            }

            // Fallbacks if some fields are missing
            let finalLabel = label;
            if (!finalLabel) {
              const batch = item.BATCH || item.batch || item.Batch || '';
              const sem = item.SEM || item.sem || item.Sem || item.SEMESTER || item.semester || '';
              if (batch && sem) {
                finalLabel = `${batch}-${sem}`;
              }
            }

            const finalValue = regusem || finalLabel;

            return {
              value: String(finalValue),
              label: String(finalLabel)
            };
          }).filter(Boolean); // Remove null/empty values
        } else if (typeof response.data === 'string') {
          // If response.data is a single string
          formattedOptions = [{ value: response.data, label: response.data }];
        } else if (response.data && typeof response.data === 'object') {
          // If response.data is a single object
          const label =
            response.data.BATCH_SEM ||
            response.data.batchSem ||
            response.data.BatchSem ||
            response.data.batch_sem ||
            response.data['BATCH-SEM'] ||
            '';
          const regusem =
            response.data.regusem ||
            response.data.REGUSEM ||
            response.data.reguSem ||
            response.data.regu_sem ||
            response.data.ReguSem ||
            '';

          if (label || regusem) {
            formattedOptions = [{
              value: String(regusem || label),
              label: String(label || regusem)
            }];
          }
        }
        
        console.log('Formatted batch-sem options:', formattedOptions);
        
        if (formattedOptions.length === 0) {
          console.warn('No batch-sem options found after formatting. Raw data:', response.data);
        }
        
        setBatchSemOptions(formattedOptions);
      } else {
        console.warn('Invalid API response structure:', response);
        setBatchSemOptions([]);
      }
    } catch (error) {
      console.error('Error fetching batch-sem options:', error);
      alert(`Error loading batch-sem options: ${error.message}`);
      setBatchSemOptions([]);
    } finally {
      setLoadingBatchSem(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Exam Registration</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            EXAM REGISTRATION
          </h2>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.mainLayout}>
            {/* Left Section */}
            <div className={styles.leftSection}>
              {/* H.T.No. Input */}
              <div className={styles.htNoSection}>
                <label className={styles.htNoLabel}>
                  H.T.No.<span className={styles.spacer}></span>:<span className={styles.spacer}></span>
                </label>
                <input
                  type="text"
                  className={styles.htNoInput}
                  placeholder="Enter H.T.No."
                  value={htNo}
                  onChange={handleHtNoChange}
                  onKeyDown={(e) => {
                    if (e.keyCode === 13) {
                      e.preventDefault();
                    }
                  }}
                />
                {loadingStudent && (
                  <span className={styles.loadingText}>Loading...</span>
                )}
                {studentName && (
                  <span className={styles.studentName}>{studentName}</span>
                )}
              </div>

              {/* Semester Papers Grid */}
              <div className={styles.semesterGrid}>
                {/* Semester I */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester I Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester I: ${semesterFees.sem1}`}>
                      {semesterFees.sem1 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem1}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem1');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem1.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem1.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem1];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem1', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem1.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester II */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester II Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester II: ${semesterFees.sem2}`}>
                      {semesterFees.sem2 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem2}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem2');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem2.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem2.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem2];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem2', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem2.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester III */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester III Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester III: ${semesterFees.sem3}`}>
                      {semesterFees.sem3 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem3}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem3');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem3.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem3.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem3];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem3', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem3.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester IV */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester IV Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester IV: ${semesterFees.sem4}`}>
                      {semesterFees.sem4 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem4}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem4');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem4.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem4.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem4];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem4', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem4.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester V */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester V Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester V: ${semesterFees.sem5}`}>
                      {semesterFees.sem5 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem5}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem5');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem5.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem5.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem5];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem5', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem5.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester VI */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester VI Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester VI: ${semesterFees.sem6}`}>
                      {semesterFees.sem6 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem6}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem6');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem6.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem6.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem6];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem6', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem6.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester VII */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester VII Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester VII: ${semesterFees.sem7}`}>
                      {semesterFees.sem7 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem7}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem7');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem7.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem7.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem7];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem7', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem7.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
                {/* Semester VIII */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester VIII Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={`Fee for Semester VIII: ${semesterFees.sem8}`}>
                      {semesterFees.sem8 || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem8}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem8');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem8.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem8.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += ` ${styles.registered}`;
                      else if (isSupply) textClass += ` ${styles.supply}`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem8];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem8', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem8.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className={styles.rightSection}>
              {/* OPTED / REGISTERED PAPER(S) Panel */}
              <div className={styles.selectedPapersSection}>
                <label className={styles.selectedPapersLabel}>
                  OPTED / REGISTERED PAPER(S)
                </label>
                <div className={styles.selectedPapersPanel}>
                  {selectedPapers.length === 0 ? (
                    <div className={styles.emptyPanel}>No papers selected</div>
                  ) : (
                    <ul className={styles.selectedPapersList}>
                      {selectedPapers.map((paper, index) => {
                        const isSupply = paper.regsup === 'SUP';
                        return (
                          <li 
                            key={index}
                            className={isSupply ? styles.supplyPaperText : styles.regularPaperText}
                          >
                            {paper.pcode} - {paper.pname}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Fee Details */}
              <div className={styles.feeDetailsSection}>
                <table className={styles.feeTable}>
                  <tbody>
                    <tr>
                      <td className={styles.feeLabel}>Exam Amount :</td>
                      <td>
                        <input
                          type="text"
                          className={styles.feeInput}
                          value={feeAmounts.examAmount}
                          readOnly
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className={styles.feeLabel}>Fine Amount :</td>
                      <td>
                        <input
                          type="text"
                          className={styles.feeInput}
                          value={feeAmounts.fineAmount}
                          readOnly
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className={styles.feeLabel}>Concession Amount :</td>
                      <td>
                        <input
                          type="text"
                          className={styles.feeInput}
                          value={feeAmounts.concessionAmount}
                          readOnly
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className={styles.feeLabel}>Total Payable Amount :</td>
                      <td>
                        <input
                          type="text"
                          className={styles.feeInput}
                          value={feeAmounts.totalPayable}
                          readOnly
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className={styles.actionButtonsSection}>
                <div className={styles.buttonRow}>
                  <button className={styles.registerBtn} onClick={handleRegister}>
                    Register
                  </button>
                  {showUnregister && (
                    <button className={styles.unregisterBtn} onClick={handleUnregister}>
                      Unregister
                    </button>
                  )}
                  <button className={styles.rePrintBtn} onClick={handleRePrint}>
                    Re-Print
                  </button>
                  <button className={styles.cancelReceiptBtn} onClick={handleCancelReceipt}>
                    Cancel Receipt
                  </button>
                </div>
                <div className={styles.buttonRow}>
                  <button className={styles.registeredListBtn} onClick={handleRegisteredList}>
                    Registered List
                  </button>
                  <button className={styles.toBeRegisteredListBtn} onClick={handleToBeRegisteredList}>
                    To be Registered List
                  </button>
                </div>
                <div className={styles.buttonRow}>
                  <button className={styles.registerAllBtn} onClick={handleRegisterOrUnregisterAll}>
                    Register Or Unregister All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Receipt Modal */}
      {showCancelReceiptModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCancelReceiptModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Cancel Receipt</h3>
              <button className={styles.modalCloseBtn} onClick={() => setShowCancelReceiptModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label>Receipt No.</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  placeholder="Enter receipt number"
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalFormGroup}>
                <label>Reg No.</label>
                <select
                  value={receiptRegNo}
                  onChange={(e) => setReceiptRegNo(e.target.value)}
                  className={styles.modalSelect}
                  disabled={receiptRegNoList.length === 0}
                >
                  <option value="">Select Reg No.</option>
                  {receiptRegNoList.map((regNo, index) => (
                    <option key={index} value={regNo}>
                      {regNo}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.modalSubmitBtn} onClick={handleCancelReceiptSubmit}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-Print Modal */}
      {showRePrintModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRePrintModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Re-Print Receipt</h3>
              <button className={styles.modalCloseBtn} onClick={() => setShowRePrintModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label>Receipt No.</label>
                <input
                  type="text"
                  value={rePrintReceiptNo}
                  onChange={(e) => setRePrintReceiptNo(e.target.value)}
                  placeholder="Enter receipt number"
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.modalSubmitBtn} onClick={handleRePrintSubmit}>
                  Re-Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Regular/Supplementary Conflict - Top Right */}
      {showWarningModal && (
        <div className={styles.warningModalTopRight}>
          <div className={styles.warningModalContent}>
            <div className={styles.warningModalHeader}>
              <h3>Warning</h3>
              <button className={styles.warningModalCloseBtn} onClick={() => setShowWarningModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.warningModalBody}>
              <p className={styles.warningModalMessage}>
                {warningMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Register/Unregister All Modal */}
      {showRegisterAllModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRegisterAllModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Register or Unregister All</h3>
              <button className={styles.modalCloseBtn} onClick={() => setShowRegisterAllModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalMessage}>
                Register or UnRegister all students for regular batches only batch
              </p>
              <div className={styles.modalFormGroup}>
                <label>Select Batch-Sem</label>
                <select
                  value={batchSem}
                  onChange={(e) => setBatchSem(e.target.value)}
                  className={styles.modalSelect}
                  disabled={loadingBatchSem}
                >
                  <option value="">Select Batch-Sem</option>
                  {loadingBatchSem ? (
                    <option value="" disabled>Loading...</option>
                  ) : (
                    batchSemOptions.map((option, index) => (
                      <option
                        key={index}
                        value={option.value ?? option}
                      >
                        {option.label ?? option}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.modalSubmitBtn} onClick={handleRegisterAllSubmit}>
                  Register
                </button>
                <button className={styles.modalSubmitBtn} onClick={handleUnregisterAllSubmit}>
                  UnRegister
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRegistrations;
