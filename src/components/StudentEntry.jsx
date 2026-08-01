import React, { useState, useEffect } from 'react';
import { FaChevronUp, FaUserGraduate, FaFileExport, FaListUl, FaChartBar } from 'react-icons/fa';
import styles from './StudentEntry.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';
import {
  getBatches,
  getBranches,
  getStudentList,
  getStudentDetails,
  getStoredCourse,
  registerStudent,
  uploadStudentPhoto,
  uploadStudentSignature,
  getAppData,
  inactivateStudent,
  reactivateStudent,
  readmitStudent
} from '../utils/api';

const StudentEntry = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form data state
  const [formData, setFormData] = useState({
    batch: '',
    registerNo: '',
    regulation: '',
    stream: '',
    rollNo: '',
    section: '',
    studentName: '',
    dateOfBirth: '',
    gender: '',
    caste: '',
    email: 'DBS',
    mobileNo: '9000000000',
    aadhaarNo: '521525465215',
    nationality: '',
    religion: '',
    dateOfAdmitted: '',
    fatherName: '',
    motherName: '',
    address: '',
    district: '',
    state: '',
    pincode: '',
    mole1: '',
    mole2: '',
    admissionNo: '',
    remarks: '',
    branch: '',
    isActive: false,
    reAdmission: false
  });

  // File upload states
  const [studentImage, setStudentImage] = useState(null);
  const [studentSignature, setStudentSignature] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Student details table state
  const [studentDetails, setStudentDetails] = useState([]);
  const [showStudentDetails, setShowStudentDetails] = useState(true);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [selectedStudentRegNo, setSelectedStudentRegNo] = useState(null);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [selectedBatchRegu, setSelectedBatchRegu] = useState('');

  // Modal states
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveData, setInactiveData] = useState({
    semester: '',
    remarks: ''
  });
  const [showReadmissionModal, setShowReadmissionModal] = useState(false);
  const [readmissionData, setReadmissionData] = useState({
    newRegNo: '',
    batch: '',
    semester: ''
  });


  // Ensure native date picker opens when the field itself is clicked
  const handleDateFieldClick = (event) => {
    if (event?.target && typeof event.target.showPicker === 'function') {
      event.target.showPicker();
    }
  };

  // API functions
  const fetchBatches = async (course) => {
    try {
      setBatchesLoading(true);

      const response = await getBatches(course);

      if (response.success && response.data) {
        setBatches(response.data);
        console.log('Batches loaded:', response.data);
      } else {
        console.error('Failed to load batches:', response.message);
        setBatches([]);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchBranches = async (course, regulation) => {
    try {
      setBranchesLoading(true);

      const response = await getBranches(course, regulation);

      if (response.success && response.data) {
        setBranches(response.data);
        console.log('Branches loaded:', response.data);
        console.log('Sample branch structure:', response.data[0]);
      } else {
        console.error('Failed to load branches:', response.message);
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  const fetchStudentDetails = async (regulation, course, branch) => {
    try {
      setStudentDetailsLoading(true);

      const response = await getStudentList(regulation, course, branch);

      if (response.success && response.data) {
        // Map API response to table format
        const mappedData = response.data.map((student, index) => ({
          regu: student.regu || '-',
          regNo: student.regNo || '-',
          sName: student.sName || '-',
          fName: student.fName || '-',
          gender: student.gender || '-',
          caste: student.caste || '-',
          course: student.course || '-',
          grp: student.grp || '-',
          medium: student.medium || '-',
          isactive: student.isactive || 'False'
        }));

        setStudentDetails(mappedData);
        console.log('Student details loaded:', mappedData);
      } else {
        console.error('Failed to load student details:', response.message);
        setStudentDetails([]);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      setStudentDetails([]);
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle Is Active checkbox change
  const handleIsActiveChange = (e) => {
    const isChecked = e.target.checked;

    if (!isChecked) {
      // When unchecking "Is Active", show the inactive modal
      if (!formData.registerNo) {
        alert('Please enter Register Number first');
        return;
      }
      setShowInactiveModal(true);
    } else {
      // When checking "Is Active", just update the state
      setFormData(prev => ({
        ...prev,
        isActive: true
      }));
    }
  };

  // Handle Re Admission checkbox change
  const handleReAdmissionChange = (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      // When checking "Re Admission", show the readmission modal
      if (!formData.registerNo) {
        alert('Please enter Register Number first');
        return;
      }
      setShowReadmissionModal(true);
    } else {
      // When unchecking "Re Admission", just update the state
      setFormData(prev => ({
        ...prev,
        reAdmission: false
      }));
    }
  };

  // Handle inactive modal input changes
  const handleInactiveInputChange = (e) => {
    const { name, value } = e.target;
    setInactiveData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle inactive modal submit
  const handleInactiveSubmit = async () => {
    if (!inactiveData.semester) {
      alert('Please enter semester');
      return;
    }

    try {
      setLoading(true);
      const response = await inactivateStudent(
        formData.registerNo,
        parseInt(inactiveData.semester),
        inactiveData.remarks
      );

      if (response.success) {
        alert('Student inactivated successfully!');
        setFormData(prev => ({
          ...prev,
          isActive: false
        }));
        setShowInactiveModal(false);
        setInactiveData({ semester: '', remarks: '' });

        // Refresh student list
        if (formData.batch && formData.branch) {
          const course = getStoredCourse() || 'B.TECH';
          const branchCode = extractBranchCode(formData.branch);
          const selectedBatchData = batches.find(batch => batch.batch === formData.batch);
          if (selectedBatchData && branchCode) {
            await fetchStudentDetails(selectedBatchData.regu, course, branchCode);
          }
        }
      } else {
        alert('Failed to inactivate student: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error inactivating student:', error);
      alert('Error inactivating student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle inactive modal close
  const handleInactiveModalClose = () => {
    setShowInactiveModal(false);
    setInactiveData({ semester: '', remarks: '' });
    // Keep isActive as true since user cancelled
  };

  // Handle readmission modal input changes
  const handleReadmissionInputChange = (e) => {
    const { name, value } = e.target;
    setReadmissionData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle readmission modal submit
  const handleReadmissionSubmit = async () => {
    if (!readmissionData.newRegNo) {
      alert('Please enter new Register Number');
      return;
    }
    if (!readmissionData.batch) {
      alert('Please enter batch');
      return;
    }
    if (!readmissionData.semester) {
      alert('Please enter semester');
      return;
    }

    try {
      setLoading(true);
      const response = await readmitStudent(
        formData.registerNo,
        readmissionData.newRegNo,
        readmissionData.batch,
        parseInt(readmissionData.semester)
      );

      if (response.success) {
        alert('Student readmitted successfully!');
        setFormData(prev => ({
          ...prev,
          reAdmission: true
        }));
        setShowReadmissionModal(false);
        setReadmissionData({ newRegNo: '', batch: '', semester: '' });

        // Refresh student list
        if (formData.batch && formData.branch) {
          const course = getStoredCourse() || 'B.TECH';
          const branchCode = extractBranchCode(formData.branch);
          const selectedBatchData = batches.find(batch => batch.batch === formData.batch);
          if (selectedBatchData && branchCode) {
            await fetchStudentDetails(selectedBatchData.regu, course, branchCode);
          }
        }
      } else {
        alert('Failed to readmit student: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error readmitting student:', error);
      alert('Error readmitting student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle readmission modal close
  const handleReadmissionModalClose = () => {
    setShowReadmissionModal(false);
    setReadmissionData({ newRegNo: '', batch: '', semester: '' });
    // Keep reAdmission as false since user cancelled
  };


  // Auto-search student when Register No. is entered (with debounce)
  useEffect(() => {
    const searchStudent = async () => {
      // Only search if registerNo has a value and is not empty
      if (!formData.registerNo || formData.registerNo.trim() === '') {
        return;
      }

      const timeoutId = setTimeout(async () => {
        try {
          setStudentDataLoading(true);
          console.log('Searching for student:', formData.registerNo);

          const response = await getStudentDetails(formData.registerNo);

          if (response.success && response.data) {
            const student = response.data;
            console.log('Student found:', student);

            // Populate form with student data
            setFormData(prev => ({
              ...prev,
              // Keep registerNo, batch, and branch as they are
              regulation: student.regulation || prev.regulation,
              stream: student.stream?.toString() || prev.stream,
              rollNo: student.rollNum || prev.rollNo,
              section: student.section || prev.section,
              studentName: student.sName || prev.studentName,
              dateOfBirth: student.dob ? student.dob.split('T')[0] : prev.dateOfBirth,
              gender: student.gender || prev.gender,
              caste: student.caste || prev.caste,
              email: student.email || prev.email,
              mobileNo: student.mobile || prev.mobileNo,
              aadhaarNo: student.aadhaarNo || prev.aadhaarNo,
              nationality: student.nationality || prev.nationality,
              religion: student.religion || prev.religion,
              dateOfAdmitted: student.dateOfAdmitted ? student.dateOfAdmitted.split('T')[0] : prev.dateOfAdmitted,
              fatherName: student.fName || prev.fatherName,
              motherName: student.mName || prev.motherName,
              address: student.address || prev.address,
              district: student.district || prev.district,
              state: student.state || prev.state,
              pincode: student.pincode || prev.pincode,
              mole1: student.molE1 || prev.mole1,
              mole2: student.molE2 || prev.mole2,
              admissionNo: student.admissionNo || prev.admissionNo,
              remarks: student.remarks || prev.remarks,
              isActive: student.isActive === 'True' || student.isActive === true,
              reAdmission: student.reAdmission === 'true' || student.reAdmission === true
            }));

            // Set batch regulation if available
            if (student.regu) {
              setSelectedBatchRegu(student.regu);
            }

            // Handle photo if available
            if (student.photoUrl) {
              setImagePreview(student.photoUrl);
            }

            // Handle signature if available
            if (student.signatureUrl) {
              setSignaturePreview(student.signatureUrl);
            }

            console.log('Form populated with student data');
          } else {
            console.log('No student found with Register No:', formData.registerNo);
          }
        } catch (error) {
          console.error('Error searching for student:', error);
        } finally {
          setStudentDataLoading(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    };

    searchStudent();
  }, [formData.registerNo]); // Only trigger when registerNo changes


  // Handle batch change
  const handleBatchChange = async (e) => {
    const selectedBatch = e.target.value;
    setFormData(prev => ({
      ...prev,
      batch: selectedBatch,
      branch: '' // Reset branch when batch changes
    }));

    // Get course from localStorage using proper API function
    const course = getStoredCourse() || 'B.TECH';

    // Find the regulation from the selected batch
    const selectedBatchData = batches.find(batch => batch.batch === selectedBatch);
    if (selectedBatchData && selectedBatchData.regu) {
      setSelectedBatchRegu(selectedBatchData.regu);
      // Fetch branches for the selected batch's regulation
      await fetchBranches(course, selectedBatchData.regu);
    } else {
      setBranches([]);
      setSelectedBatchRegu('');
    }
  };

  // Extract short branch code from full branch name
  const extractBranchCode = (branchName) => {
    if (!branchName) return '';

    // Split by ' - ' and take the first part (short code)
    const parts = branchName.split(' - ');
    return parts[0].trim();
  };

  // Handle branch change
  const handleBranchChange = async (e) => {
    const selectedBranch = e.target.value;
    setFormData(prev => ({
      ...prev,
      branch: selectedBranch
    }));

    // If both batch and branch are selected, fetch student details
    if (formData.batch && selectedBranch) {
      const course = getStoredCourse() || 'B.TECH';

      // Extract short branch code for API call
      const branchCode = extractBranchCode(selectedBranch);
      console.log('Full branch name:', selectedBranch);
      console.log('Extracted branch code:', branchCode);

      // Find the regulation from the selected batch
      const selectedBatchData = batches.find(batch => batch.batch === formData.batch);
      if (selectedBatchData && selectedBatchData.regu) {
        await fetchStudentDetails(selectedBatchData.regu, course, branchCode);
      }
    } else {
      // Clear student details if branch is deselected
      setStudentDetails([]);
    }
  };

  // Handle file upload for student image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStudentImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file upload for student signature
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStudentSignature(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignaturePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validation functions
  const validateAlphabet = (e) => {
    const keyCode = e.which || e.keyCode;
    if (!((keyCode >= 65 && keyCode <= 90) || (keyCode >= 97 && keyCode <= 122) || keyCode === 32)) {
      e.preventDefault();
    }
  };

  const validateNumeric = (e) => {
    const keyCode = e.which || e.keyCode;
    if (!(keyCode === 8 || keyCode === 9 || keyCode === 46 ||
      (keyCode >= 37 && keyCode <= 40) ||
      (keyCode >= 48 && keyCode <= 57) ||
      (keyCode >= 96 && keyCode <= 105))) {
      e.preventDefault();
    }
  };

  const validateEmail = (email) => {
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return emailPattern.test(email);
  };

  // Form validation
  const validateForm = () => {
    if (!formData.batch) {
      alert('Please Select Batch');
      return false;
    }
    if (!formData.branch) {
      alert('Please Select Branch');
      return false;
    }
    if (!formData.regulation) {
      alert('Please Enter Regulation');
      return false;
    }
    if (!formData.registerNo) {
      alert('Please Enter Register Number');
      return false;
    }
    if (!formData.studentName) {
      alert('Please Enter Student Name');
      return false;
    }
    if (formData.mobileNo.length !== 10) {
      alert('Mobile Number Must be 10 Digits');
      return false;
    }
    if (formData.aadhaarNo.length !== 12) {
      alert('Aadhar Number Must be 12 Digits');
      return false;
    }
    if (formData.email && !validateEmail(formData.email)) {
      alert('Please enter valid email');
      return false;
    }
    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    const currentBatch = formData.batch;
    const currentBranch = formData.branch;
    const branchCode = extractBranchCode(currentBranch);

    const appData = getAppData();
    const courseFromStorage = appData?.course || getStoredCourse() || '';
    const examMY = appData?.examMY || '';
    const regulationFromStorage = appData?.regulation || '';

    if (!courseFromStorage) {
      alert('Course not found. Please select course from header.');
      return;
    }

    if (!branchCode) {
      alert('Unable to determine branch code. Please re-select the branch.');
      return;
    }

    const batchMeta = batches.find(batch => batch.batch === currentBatch);
    const reguValue = batchMeta?.regu || selectedBatchRegu || '';

    if (!reguValue) {
      alert('Unable to determine REGU for the selected batch. Please re-select the batch.');
      return;
    }

    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = userInfo.userId || userInfo.UserId || '';

    if (!userId) {
      alert('User information missing. Please login again.');
      return;
    }

    const studentPayload = {
      regNo: formData.registerNo,
      rollNo: formData.rollNo,
      section: formData.section,
      sem: '',
      medium: '',
      name: formData.studentName,
      fatherName: formData.fatherName,
      motherName: formData.motherName,
      dob: formData.dateOfBirth,
      gender: formData.gender,
      district: formData.district,
      pincode: formData.pincode,
      email: formData.email,
      caste: formData.caste,
      address: formData.address,
      state: formData.state,
      mobile: formData.mobileNo,
      regu: reguValue,
      batch: currentBatch,
      course: courseFromStorage,
      branch: branchCode,
      stream: parseInt(formData.stream, 10) || 0,
      isReadmitted: formData.reAdmission,
      newRegNo: '',
      isActive: formData.isActive,
      regulation: formData.regulation || regulationFromStorage || '',
      remarks: formData.remarks,
      userID: userId,
      exammy: examMY,
      aadhaarNo: formData.aadhaarNo,
      nationality: formData.nationality,
      religion: formData.religion,
      mole1: formData.mole1,
      mole2: formData.mole2,
      admissionNo: formData.admissionNo,
      admissionDate: formData.dateOfAdmitted,
    };

    setLoading(true);

    try {
      const registerResponse = await registerStudent(studentPayload);

      if (registerResponse.success) {
        const uploadErrors = [];

        try {
          if (studentImage) {
            await uploadStudentPhoto(formData.registerNo, studentImage);
          }
        } catch (photoError) {
          console.error('Error uploading student photo:', photoError);
          uploadErrors.push('photo');
        }

        try {
          if (studentSignature) {
            await uploadStudentSignature(formData.registerNo, studentSignature);
          }
        } catch (signatureError) {
          console.error('Error uploading student signature:', signatureError);
          uploadErrors.push('signature');
        }

        if (uploadErrors.length === 0) {
          alert('Student data saved successfully!');
        } else if (uploadErrors.length === 1) {
          alert(`Student data saved, but failed to upload ${uploadErrors[0]} file.`);
        } else {
          alert('Student data saved, but failed to upload photo and signature files.');
        }

        if (reguValue && branchCode && courseFromStorage) {
          await fetchStudentDetails(reguValue, courseFromStorage, branchCode);
        }

        handleCancel();
      }
    } catch (error) {
      console.error('Error saving student data:', error);
      alert('Error saving student data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      batch: '',
      registerNo: '',
      regulation: '',
      stream: '',
      rollNo: '',
      section: '',
      studentName: '',
      dateOfBirth: '',
      gender: '',
      caste: '',
      email: 'DBS',
      mobileNo: '9000000000',
      aadhaarNo: '521525465215',
      nationality: '',
      religion: '',
      dateOfAdmitted: '',
      fatherName: '',
      motherName: '',
      address: '',
      district: '',
      state: '',
      pincode: '',
      mole1: '',
      mole2: '',
      admissionNo: '',
      remarks: '',
      branch: '',
      isActive: false,
      reAdmission: false
    });
    setImagePreview(null);
    setSignaturePreview(null);
    setStudentImage(null);
    setStudentSignature(null);
    setSelectedStudentRegNo(null);
    setSelectedBatchRegu('');
  };

  // Handle bulk photo upload
  const handleBulkPhotoUpload = () => {
    // Implement bulk photo upload functionality
    console.log('Bulk photo upload clicked');
  };

  // Handle student row click to populate form
  const handleStudentRowClick = async (regNo) => {
    try {
      setStudentDataLoading(true);
      setSelectedStudentRegNo(regNo);

      console.log('Fetching student details for:', regNo);
      const response = await getStudentDetails(regNo);

      if (response.success && response.data) {
        const student = response.data;

        // Map API response to form data
        setFormData({
          batch: formData.batch, // Keep existing batch
          branch: formData.branch, // Keep existing branch
          registerNo: student.regNo || '',
          regulation: student.regulation || '',
          stream: student.stream?.toString() || '',
          rollNo: student.rollNum || '',
          section: student.section || '',
          studentName: student.sName || '',
          dateOfBirth: student.dob ? student.dob.split('T')[0] : '',
          gender: student.gender || '',
          caste: student.caste || '',
          email: student.email || '',
          mobileNo: student.mobile || '',
          aadhaarNo: student.aadhaarNo || '',
          nationality: student.nationality || '',
          religion: student.religion || '',
          dateOfAdmitted: student.dateOfAdmitted ? student.dateOfAdmitted.split('T')[0] : '',
          fatherName: student.fName || '',
          motherName: student.mName || '',
          address: student.address || '',
          district: student.district || '',
          state: student.state || '',
          pincode: student.pincode || '',
          mole1: student.molE1 || '',
          mole2: student.molE2 || '',
          admissionNo: student.admissionNo || '',
          remarks: student.remarks || '',
          isActive: student.isActive === 'True' || student.isActive === true,
          reAdmission: student.reAdmission === 'true' || student.reAdmission === true
        });

        if (student.regu) {
          setSelectedBatchRegu(student.regu);
        }

        // Handle photo if available
        if (student.photo) {
          setImagePreview(student.photo);
        }

        // Handle signature if available
        if (student.sign) {
          setSignaturePreview(student.sign);
        }

        console.log('Student data loaded successfully:', student);
      } else {
        console.error('Failed to load student details:', response.message);
        alert('Failed to load student details');
      }
    } catch (error) {
      console.error('Error loading student details:', error);
      alert('Error loading student details: ' + error.message);
    } finally {
      setStudentDataLoading(false);
    }
  };

  // Handle student details toggle
  const toggleStudentDetails = () => {
    setShowStudentDetails(!showStudentDetails);
  };

  // Load initial data
  useEffect(() => {
    // Load batches on component mount
    const course = getStoredCourse() || 'B.TECH';
    console.log('Course retrieved for batches:', course);
    fetchBatches(course);
  }, []);

  const themeStyle = {
    '--theme-color': themeColor,
    '--theme-color-bg': `${themeColor}15`,
    '--theme-color-border': `${themeColor}33`,
  };

  return (
    <div className={styles.pageRoot} style={themeStyle}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>
          <FaUserGraduate style={{ color: themeColor }} />
          Student Entry
        </h1>
        <div className={styles.headerButtons}>
          <button className={`${styles.btn} ${styles.btnWarning}`} onClick={() => console.log('Detained List')}>
            <FaListUl style={{ marginRight: '6px' }}/> Detained List
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => console.log('ReadmissionList')}>
            Readmission List
          </button>
          <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={() => console.log('BranchWise Student Count')}>
            <FaChartBar style={{ marginRight: '6px' }}/> BranchWise Count
          </button>
          <button className={`${styles.btn} ${styles.btnInfo}`} onClick={() => console.log('Distinction Passed List')}>
            Distinction List
          </button>
          <button className={`${styles.btn} ${styles.btnInfo}`} onClick={() => console.log('Std Data Batchwise Export')}>
            <FaFileExport style={{ marginRight: '6px' }}/> Export Data
          </button>
          <button className={styles.minimizeBtn}>
            <FaChevronUp />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Loading Overlay */}
        {studentDataLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}>Loading student data...</div>
          </div>
        )}

        {/* Form Container */}
        <div className={styles.formContainer}>
          {/* Basic Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Basic Information</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Batch *</label>
                  <select name="batch" value={formData.batch} onChange={handleBatchChange} className={styles.select} disabled={batchesLoading}>
                    {batchesLoading ? <option value="">Loading...</option>
                      : batches.length === 0 ? <option value="">No batches available</option>
                      : <><option value="">Select Batch</option>{batches.map((b, i) => <option key={i} value={b.batch}>{b.batch}</option>)}</>}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch *</label>
                  <select name="branch" value={formData.branch} onChange={handleBranchChange} className={styles.select} disabled={branchesLoading || !formData.batch}>
                    {branchesLoading ? <option value="">Loading...</option>
                      : !formData.batch ? <option value="">Select batch first</option>
                      : branches.length === 0 ? <option value="">No branches available</option>
                      : <><option value="">Select Branch</option>{branches.map((b, i) => <option key={i} value={b.branch || b.value}>{b.branch || b.label}</option>)}</>}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Regulation *</label>
                  <input type="text" name="regulation" value={formData.regulation} onChange={handleInputChange} className={styles.input} placeholder="e.g. R17" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Register No. *</label>
                  <input type="text" name="registerNo" value={formData.registerNo} onChange={handleInputChange} className={styles.input} placeholder="Register Number" />
                </div>
              </div>
            </div>
          </div>

          {/* Student Details Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Student Details</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Student Name *</label>
                  <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="Full Name" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Roll No.</label>
                  <input type="text" name="rollNo" value={formData.rollNo} onChange={handleInputChange} onKeyPress={validateNumeric} className={styles.input} placeholder="e.g. 001" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Section</label>
                  <input type="text" name="section" value={formData.section} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="e.g. A" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Stream</label>
                  <input type="text" name="stream" value={formData.stream} onChange={handleInputChange} className={styles.input} placeholder="Stream Code" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} onClick={handleDateFieldClick} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className={styles.select}>
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Caste</label>
                  <select name="caste" value={formData.caste} onChange={handleInputChange} className={styles.select}>
                    <option value="">Select Caste</option>
                    <option value="OC">OC</option>
                    <option value="BC-A">BC-A</option>
                    <option value="BC-B">BC-B</option>
                    <option value="BC-C">BC-C</option>
                    <option value="BC-D">BC-D</option>
                    <option value="BC-E">BC-E</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date of Admission</label>
                  <input type="date" name="dateOfAdmitted" value={formData.dateOfAdmitted} onChange={handleInputChange} onClick={handleDateFieldClick} className={styles.input} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Contact Information</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mobile No. *</label>
                  <input type="tel" name="mobileNo" value={formData.mobileNo} onChange={handleInputChange} onKeyPress={validateNumeric} className={styles.input} placeholder="10-digit mobile" maxLength="10" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={styles.input} placeholder="email@example.com" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Aadhaar No</label>
                  <input type="text" name="aadhaarNo" value={formData.aadhaarNo} onChange={handleInputChange} onKeyPress={validateNumeric} className={styles.input} placeholder="12-digit Aadhaar" maxLength="12" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Admission No.</label>
                  <input type="text" name="admissionNo" value={formData.admissionNo} onChange={handleInputChange} className={styles.input} placeholder="Admission Number" />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Personal Information</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nationality</label>
                  <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="Nationality" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Religion</label>
                  <input type="text" name="religion" value={formData.religion} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="Religion" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>MOLE 1</label>
                  <input type="text" name="mole1" value={formData.mole1} onChange={handleInputChange} className={styles.input} placeholder="Identification Mark 1" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>MOLE 2</label>
                  <input type="text" name="mole2" value={formData.mole2} onChange={handleInputChange} className={styles.input} placeholder="Identification Mark 2" />
                </div>
              </div>
            </div>
          </div>

          {/* Family Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Family Information</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Father's Name</label>
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="Father's Full Name" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mother's Name</label>
                  <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="Mother's Full Name" />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Address Information</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
                <label className={styles.label}>Address</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} className={styles.textarea} placeholder="Complete Address" rows="3" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>District</label>
                  <input type="text" name="district" value={formData.district} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="District" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} onKeyPress={validateAlphabet} className={styles.input} placeholder="State" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Pincode</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} onKeyPress={validateNumeric} className={styles.input} placeholder="Pincode" maxLength="6" />
                </div>
              </div>
            </div>
          </div>

          {/* Documents & Status Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Documents & Status</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.uploadRow}>
                <div className={styles.uploadGroup}>
                  <label className={styles.label}>Student Photo</label>
                  <div className={styles.uploadContainer}>
                    <div className={styles.imagePreview}>
                      {imagePreview ? <img src={imagePreview} alt="Student" className={styles.previewImage} /> : <div className={styles.noImage}>No Image</div>}
                    </div>
                    <div className={styles.fileUpload}>
                      <input type="file" id="studentImage" onChange={handleImageUpload} accept=".jpg,.jpeg" className={styles.fileInput} />
                      <label htmlFor="studentImage" className={styles.fileLabel}>Choose Photo</label>
                    </div>
                  </div>
                </div>
                <div className={styles.uploadGroup}>
                  <label className={styles.label}>Student Signature</label>
                  <div className={styles.uploadContainer}>
                    <div className={styles.signaturePreview}>
                      {signaturePreview ? <img src={signaturePreview} alt="Signature" className={styles.previewSignature} /> : <div className={styles.noSignature}>No Signature</div>}
                    </div>
                    <div className={styles.fileUpload}>
                      <input type="file" id="studentSignature" onChange={handleSignatureUpload} accept=".jpg,.jpeg" className={styles.fileInput} />
                      <label htmlFor="studentSignature" className={styles.fileLabel}>Choose Signature</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.statusRow}>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleIsActiveChange} />
                    Is Active
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" name="reAdmission" checked={formData.reAdmission} onChange={handleReAdmissionChange} />
                    Re Admission
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Additional Information</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} className={styles.textarea} placeholder="Any additional remarks or notes" rows="3" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={`${styles.btn} ${styles.btnDefault}`} onClick={handleBulkPhotoUpload}>
            Bulk Photo Upload
          </button>
          <button className={`${styles.btn} ${styles.btnDefault}`} onClick={handleCancel}>
            Cancel
          </button>
          <button className={styles.btnSuccess} onClick={handleSave} disabled={loading} style={{ background: themeColor, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600', padding: '10px 24px', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {loading ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </div>

      {/* Student Details Section */}
      <div className={styles.studentDetailsSection}>
        <div className={styles.studentDetailsHeader}>
          <h3 className={styles.studentDetailsTitle}>
            <FaUserGraduate style={{ color: themeColor }} />
            Student List
          </h3>
          <button className={`${styles.minimizeBtn} ${!showStudentDetails ? styles.rotated : ''}`} onClick={toggleStudentDetails}>
            <FaChevronUp />
          </button>
        </div>

        {showStudentDetails && (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Regu</th>
                  <th>RegNo</th>
                  <th>Student's Name</th>
                  <th>Father's Name</th>
                  <th>Gender</th>
                  <th>Caste</th>
                  <th>Course</th>
                  <th>GRP</th>
                  <th>Medium</th>
                  <th>Isactive</th>
                </tr>
              </thead>
              <tbody>
                {studentDetailsLoading ? (
                  <tr><td colSpan="11" className={styles.centerText}>Loading student data...</td></tr>
                ) : studentDetails.length === 0 ? (
                  <tr><td colSpan="11" className={styles.centerText}>{formData.batch && formData.branch ? 'No student data found' : 'Please select batch and branch to view student details'}</td></tr>
                ) : (
                  studentDetails.map((student, index) => (
                    <tr
                      key={index}
                      className={`${styles.dataRow} ${selectedStudentRegNo === student.regNo ? styles.selectedRow : ''}`}
                      onClick={() => handleStudentRowClick(student.regNo)}
                      style={{ cursor: studentDataLoading ? 'wait' : 'pointer' }}
                    >
                      <td className={styles.centerText}>{index + 1}</td>
                      <td className={styles.centerText}>{student.regu}</td>
                      <td className={styles.centerText}>{student.regNo}</td>
                      <td className={styles.studentName}>{student.sName}</td>
                      <td>{student.fName}</td>
                      <td className={styles.centerText}>{student.gender}</td>
                      <td className={styles.centerText}>{student.caste}</td>
                      <td>{student.course}</td>
                      <td>{student.grp}</td>
                      <td>{student.medium}</td>
                      <td className={styles.centerText}>{student.isactive}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inactive Student Modal */}
      {showInactiveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Mark Candidate Inactive</h3>
              <button className={styles.modalCloseBtn} onClick={handleInactiveModalClose}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Inactive From Semester</label>
                <input type="number" name="semester" value={inactiveData.semester} onChange={handleInactiveInputChange} className={styles.modalInput} placeholder="e.g. 3" />
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Remarks</label>
                <textarea name="remarks" value={inactiveData.remarks} onChange={handleInactiveInputChange} className={styles.modalTextarea} placeholder="Reason for inactivation" rows="4" />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={handleInactiveModalClose}>Cancel</button>
              <button className={styles.modalSaveBtn} onClick={handleInactiveSubmit} disabled={loading} style={{ background: '#dc2626' }}>{loading ? 'Processing...' : 'Mark Inactive'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Readmission Modal */}
      {showReadmissionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Re-Admission Details</h3>
              <button className={styles.modalCloseBtn} onClick={handleReadmissionModalClose}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Old Reg No.</label>
                <input type="text" value={formData.registerNo} className={styles.modalInput} readOnly style={{ backgroundColor: '#f8fafc', color: '#64748b' }} />
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>New Reg No.</label>
                <input type="text" name="newRegNo" value={readmissionData.newRegNo} onChange={handleReadmissionInputChange} className={styles.modalInput} placeholder="New Register Number" />
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Batch</label>
                <input type="text" name="batch" value={readmissionData.batch} onChange={handleReadmissionInputChange} className={styles.modalInput} placeholder="New Batch" />
              </div>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Semester</label>
                <input type="number" name="semester" value={readmissionData.semester} onChange={handleReadmissionInputChange} className={styles.modalInput} placeholder="Semester" />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={handleReadmissionModalClose}>Cancel</button>
              <button className={styles.modalSaveBtn} onClick={handleReadmissionSubmit} disabled={loading}>{loading ? 'Processing...' : 'Save Re-Admission'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEntry;
