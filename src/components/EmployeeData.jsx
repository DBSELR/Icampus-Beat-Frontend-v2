import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaChevronUp, FaTrash, FaSync, FaEye, FaEyeSlash, FaCalendarAlt } from 'react-icons/fa';
import { getEmployeeGrid, registerEmployee, getEmployeeDetails, deleteEmployee, getUserGroups, checkUser, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './EmployeeData.module.css';

const EmployeeData = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    facultyId: '',
    facultyName: '',
    department: '',
    designation: '',
    qualification: '',
    teachingSubject: '',
    dateOfJoining: '',
    gender: '',
    dateOfBirth: '',
    mobileNo: '',
    aadhaarNo: '',
    emailId: '',
    userName: '',
    password: '',
    confirmPassword: '',
    userGroup: '',
    isActive: true
  });

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Table data
  const [tableData, setTableData] = useState([]);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // Save loading state
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Employee details loading state
  const [employeeDetailsLoading, setEmployeeDetailsLoading] = useState(false);
  
  // Delete loading state
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Selected employee state
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // Edit mode state - tracks if we're editing an existing employee
  const [isEditMode, setIsEditMode] = useState(false);

  // File upload states
  const [imageFile, setImageFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  // User groups state
  const [userGroups, setUserGroups] = useState([]);
  const [userGroupsLoading, setUserGroupsLoading] = useState(false);

  // File input refs for resetting
  const imageInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  // Fetch employee data function
  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      console.log('Fetching employee data from API...');
      const response = await getEmployeeGrid();
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        // Map API response to table format
        const mappedData = response.data.map((employee, index) => ({
          id: index + 1,
          employeeId: employee.employeeID || '-',
          employeeName: employee.employeeName || '-',
          mobile: employee.mobile || '-',
          department: employee.department || '-',
          designation: employee.designation || '-',
          qualification: employee.qualification || '-',
          userGroup: employee.usergroup || '-',
          isActive: employee.isActive || 'false'
        }));
        setTableData(mappedData);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load employee data on component mount
  useEffect(() => {
    fetchEmployeeData();
  }, []);

  // Fetch user groups on component mount
  useEffect(() => {
    const fetchUserGroups = async () => {
      setUserGroupsLoading(true);
      try {
        const response = await getUserGroups();
        if (response.success && response.data) {
          setUserGroups(response.data);
        } else {
          setUserGroups([]);
        }
      } catch (error) {
        console.error('Error loading user groups:', error);
        setUserGroups([]);
      } finally {
        setUserGroupsLoading(false);
      }
    };

    fetchUserGroups();
  }, []);

  // Handle employee selection from table
  const handleEmployeeSelect = async (employeeId) => {
    setSelectedEmployee(employeeId);
    setEmployeeDetailsLoading(true);
    
    try {
      const response = await getEmployeeDetails(employeeId);
      
      if (response.success && response.data) {
        const employee = response.data;
        
        // Map employee details to form data
        setFormData({
          facultyId: employee.employeeID || '',
          facultyName: employee.employeeName || '',
          department: employee.department || '',
          designation: employee.designation || '',
          qualification: employee.qualification || '',
          teachingSubject: employee.teachingSubject || '',
          dateOfJoining: employee.doj ? employee.doj.split('T')[0] : '', // Convert to YYYY-MM-DD format
          gender: employee.gender || '',
          dateOfBirth: employee.dob ? employee.dob.split('T')[0] : '', // Convert to YYYY-MM-DD format
          mobileNo: employee.mobile || '',
          aadhaarNo: employee.aadharNo || '',
          emailId: employee.email || '',
          userName: employee.userName || '',
          password: employee.pwd || '', // Populate password from pwd field
          confirmPassword: employee.pwd || '', // Populate confirm password from pwd field
          userGroup: employee.usergroup || '',
          isActive: employee.isActive === 'true' || employee.isActive === true
        });
        
        // Load existing images if URLs are provided
        if (employee.photoUrl) {
          setImagePreview(employee.photoUrl);
          setImageFile(null);
        } else {
          setImagePreview(null);
          setImageFile(null);
        }
        
        if (employee.signatureUrl) {
          setSignaturePreview(employee.signatureUrl);
          setSignatureFile(null);
        } else {
          setSignaturePreview(null);
          setSignatureFile(null);
        }
        
        // Clear file input values
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (signatureInputRef.current) signatureInputRef.current.value = '';
        
        setIsEditMode(true);
        setIsFormCollapsed(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Employee details not found');
      }
    } catch (error) {
      alert('Error loading employee details: ' + error.message);
    } finally {
      setEmployeeDetailsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle file upload for image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file upload for signature
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignaturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validate required fields
    if (!formData.facultyId || !formData.facultyName || !formData.department || 
        !formData.designation || !formData.qualification || !formData.dateOfJoining || 
        !formData.gender || !formData.dateOfBirth || !formData.mobileNo || 
        !formData.aadhaarNo || !formData.emailId || !formData.userName || 
        !formData.password || !formData.confirmPassword || !formData.userGroup) {
      alert('Please fill all required fields');
      return;
    }

    // Validate mobile number (10 digits)
    if (formData.mobileNo.length !== 10) {
      alert('Mobile Number Must be 10 Digits');
      return;
    }

    // Validate Aadhaar number (12 digits)
    if (formData.aadhaarNo.length !== 12) {
      alert('Aadhaar Number Must be 12 Digits');
      return;
    }

    // Validate email format
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(formData.emailId)) {
      alert('Please enter valid email');
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      alert('Password and confirm password should be same');
      return;
    }

    setSaveLoading(true);

    try {
      // Check if user already exists - only for new registration, not for updates
      if (!isEditMode) {
        const checkUserResponse = await checkUser(formData.facultyId);
        
        if (checkUserResponse && checkUserResponse.exists === true) {
          alert('User already exists! Please use a different Faculty ID.');
          setSaveLoading(false);
          return;
        }
      }

      // Get course and examMY from localStorage (from header dropdowns)
      const appData = getAppData();
      const course = appData?.course || '';
      const examMY = appData?.examMY || '';

      // Prepare employee data for API
      const employeeData = {
        employeeId: formData.facultyId,
        employeeName: formData.facultyName,
        userName: formData.userName,
        password: formData.password,
        userGroup: formData.userGroup,
        course: course,
        examMY: examMY,
        gender: formData.gender,
        dob: formData.dateOfBirth,
        category: '', // Not in form, using empty string
        mobile: formData.mobileNo,
        department: formData.department,
        qualification: formData.qualification,
        doj: formData.dateOfJoining,
        teachingSubject: formData.teachingSubject,
        email: formData.emailId,
        designation: formData.designation,
        aadharNo: formData.aadhaarNo,
        isActive: formData.isActive
      };

      const response = await registerEmployee(employeeData, imageFile, signatureFile);

      if (response.success) {
        if (isEditMode) {
          alert('Employee updated successfully!');
        } else {
          alert('Employee registered successfully!');
        }

        handleCancel();
        fetchEmployeeData();
      } else {
        const action = isEditMode ? 'update' : 'register';
        alert(`Failed to ${action} employee: ` + (response.message || 'Unknown error'));
      }
    } catch (error) {
      const action = isEditMode ? 'updating' : 'registering';
      alert(`Error ${action} employee: ` + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      facultyId: '',
      facultyName: '',
      department: '',
      designation: '',
      qualification: '',
      teachingSubject: '',
      dateOfJoining: '',
      gender: '',
      dateOfBirth: '',
      mobileNo: '',
      aadhaarNo: '',
      emailId: '',
      userName: '',
      password: '',
      confirmPassword: '',
      userGroup: '',
      isActive: true
    });
    setImageFile(null);
    setSignatureFile(null);
    setImagePreview(null);
    setSignaturePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (signatureInputRef.current) signatureInputRef.current.value = '';
    setSelectedEmployee('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsEditMode(false);
  };

  // Handle delete record
  const handleDelete = async (id) => {
    const employee = tableData.find(item => item.id === id);
    
    if (!employee) {
      alert('Employee not found');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${employee?.employeeName || 'this faculty'}?`)) {
      return;
    }

    setDeleteLoading(true);

    try {
      const detailsResponse = await getEmployeeDetails(employee.employeeId);
      
      if (!detailsResponse.success || !detailsResponse.data) {
        alert('Failed to get employee details for deletion');
        return;
      }

      const userName = detailsResponse.data.userName || employee.employeeId;

      const response = await deleteEmployee(employee.employeeId, userName);

      if (response.success) {
        alert('Employee deleted successfully!');
        
        if (selectedEmployee === employee.employeeId) {
          handleCancel();
        }
        
        fetchEmployeeData();
      } else {
        alert('Failed to delete employee: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Error deleting employee: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      
      {/* ── Page Header ─────────────────────────────── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          Faculty Data Master
        </h1>
        <div className={styles.headerMeta}>
          <div className={styles.dateChip}>
            <FaCalendarAlt style={{ color: themeColor }} />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Main Card ───────────────────────────────── */}
      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaUser style={{ color: themeColor }} />
            {isEditMode ? 'Edit Faculty' : 'Add Faculty'}
          </h2>
          <div className={styles.headerActions}>
            <button
              className={styles.iconBtn}
              onClick={fetchEmployeeData}
              title="Refresh Employee Data"
              disabled={loading}
            >
              <FaSync className={loading ? styles.spinning : ''} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              title="Toggle Form"
            >
              <FaChevronUp className={isFormCollapsed ? styles.rotated : ''} />
            </button>
          </div>
        </div>

        {/* ── Form Section ────────────────────────────── */}
        <div className={`${styles.formSection} ${isFormCollapsed ? styles.collapsed : ''}`}>
          <div className={styles.formGrid}>
            
            {/* Left Column */}
            <div className={styles.formColumn}>
              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Faculty ID</label>
                <input
                  type="text"
                  name="facultyId"
                  value={employeeDetailsLoading ? 'Loading...' : formData.facultyId}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="Enter Faculty ID"
                  disabled={employeeDetailsLoading || isEditMode}
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Faculty Name</label>
                <input
                  type="text"
                  name="facultyName"
                  value={employeeDetailsLoading ? 'Loading...' : formData.facultyName}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="Enter Faculty Name"
                  disabled={employeeDetailsLoading}
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="e.g. CSE"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="e.g. Assistant Professor"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Qualification</label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="e.g. M.Tech, Ph.D"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Teaching Subject(s)</label>
                <input
                  type="text"
                  name="teachingSubject"
                  value={formData.teachingSubject}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="e.g. Data Structures"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Date of Joining</label>
                <input
                  type="date"
                  name="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  style={{ '--theme-color': themeColor }}
                >
                  <option value="">-- Select Gender --</option>
                  <option value="M">MALE</option>
                  <option value="F">FEMALE</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className={styles.formColumn}>
              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Mobile No.</label>
                <input
                  type="text"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Aadhaar No.</label>
                <input
                  type="text"
                  name="aadhaarNo"
                  value={formData.aadhaarNo}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="12 digit Aadhaar number"
                  maxLength="12"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Email Id</label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="Enter email address"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>User Name</label>
                <input
                  type="text"
                  name="userName"
                  value={formData.userName}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="Login Username"
                  style={{ '--theme-color': themeColor }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Enter password"
                    style={{ '--theme-color': themeColor }}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>Confirm Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Confirm password"
                    style={{ '--theme-color': themeColor }}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>User Group</label>
                <select
                  name="userGroup"
                  value={formData.userGroup}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  disabled={userGroupsLoading}
                  style={{ '--theme-color': themeColor }}
                >
                  {userGroupsLoading ? (
                    <option value="">Loading user groups...</option>
                  ) : userGroups.length === 0 ? (
                    <option value="">No user groups available</option>
                  ) : (
                    <>
                      <option value="">Select User Group</option>
                      {userGroups.map((group, index) => (
                        <option key={index} value={group}>
                          {group}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Upload Section */}
            <div className={styles.uploadSection}>
              <div className={styles.uploadBox}>
                <label className={styles.formLabel}>Faculty Photo</label>
                <div className={styles.imagePreview}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Faculty" />
                  ) : (
                    <div className={styles.noImage}>No Image</div>
                  )}
                </div>
                <div className={styles.fileUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.fileInput}
                    id="imageUpload"
                    ref={imageInputRef}
                  />
                  <label htmlFor="imageUpload" className={styles.fileLabel}>
                    {imageFile ? imageFile.name : (imagePreview && !imageFile ? 'Current image loaded' : 'No file selected')}
                  </label>
                  <label htmlFor="imageUpload" className={styles.chooseFileBtn} style={{ '--theme-color': themeColor, '--theme-color-border': themeColor + '80', '--theme-color-bg': themeColor + '15' }}>
                    {imagePreview && !imageFile ? 'Change File' : 'Choose File'}
                  </label>
                </div>
              </div>

              <div className={styles.uploadBox}>
                <label className={styles.formLabel}>Faculty Signature</label>
                <div className={styles.signaturePreview}>
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="Signature" />
                  ) : (
                    <div className={styles.noSignature}>NO SIGNATURE</div>
                  )}
                </div>
                <div className={styles.fileUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className={styles.fileInput}
                    id="signatureUpload"
                    ref={signatureInputRef}
                  />
                  <label htmlFor="signatureUpload" className={styles.fileLabel}>
                    {signatureFile ? signatureFile.name : (signaturePreview && !signatureFile ? 'Current signature loaded' : 'No file selected')}
                  </label>
                  <label htmlFor="signatureUpload" className={styles.chooseFileBtn} style={{ '--theme-color': themeColor, '--theme-color-border': themeColor + '80', '--theme-color-bg': themeColor + '15' }}>
                    {signaturePreview && !signatureFile ? 'Change File' : 'Choose File'}
                  </label>
                </div>
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    style={{ '--theme-color': themeColor }}
                  />
                  Is Active Faculty
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.formActions}>
            <button className={styles.btnSecondary} onClick={handleCancel}>
              Cancel
            </button>
            <button 
              className={styles.btnPrimary} 
              onClick={handleSave}
              disabled={saveLoading}
              style={{ '--theme-color': themeColor }}
            >
              {saveLoading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Record' : 'Save Record')}
            </button>
          </div>
        </div>

        {/* ── Data Table ──────────────────────────────── */}
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.centerText}>Employee ID</th>
                <th>Employee Name</th>
                <th className={styles.centerText}>Mobile</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Qualification</th>
                <th>User Group</th>
                <th className={styles.centerText}>IsActive</th>
                <th className={styles.centerText}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className={styles.loadingState}>
                    Loading employee data...
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.emptyState}>
                    No employee data found
                  </td>
                </tr>
              ) : (
                tableData.map((item) => (
                  <tr 
                    key={item.id}
                    className={`${selectedEmployee === item.employeeId ? styles.selectedRow : ''} ${employeeDetailsLoading ? styles.loading : ''}`}
                    onClick={() => !employeeDetailsLoading && handleEmployeeSelect(item.employeeId)}
                    style={{ 
                      cursor: employeeDetailsLoading ? 'wait' : 'pointer',
                      '--theme-color': themeColor,
                      '--theme-color-bg': themeColor + '15'
                    }}
                  >
                    <td className={styles.centerText}>{item.employeeId}</td>
                    <td className={styles.employeeName}>{item.employeeName}</td>
                    <td className={styles.centerText}>{item.mobile}</td>
                    <td>{item.department}</td>
                    <td>{item.designation}</td>
                    <td>{item.qualification}</td>
                    <td>{item.userGroup}</td>
                    <td className={styles.centerText}>{item.isActive}</td>
                    <td className={styles.centerText}>
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click when delete button is clicked
                          handleDelete(item.id);
                        }}
                        title="Delete"
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? '...' : <FaTrash />}
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
  );
};

export default EmployeeData;