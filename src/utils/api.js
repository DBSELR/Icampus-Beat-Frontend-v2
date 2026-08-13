// API utility for backend communication
import { BASE_URL } from '../config';





// Helper function to get MAC address (simplified version)
const getMacAddress = () => {
  // For now, return a placeholder. In a real app, you might use a library
  // or implement a more sophisticated method to get the actual MAC address
  return "placeholder-mac-address";
};

// Token expiration utilities
export const TOKEN_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

export const isTokenExpired = () => {
  const tokenTimestamp = localStorage.getItem('tokenTimestamp');
  if (!tokenTimestamp) return true;

  const now = Date.now();
  const tokenAge = now - parseInt(tokenTimestamp);
  return tokenAge > TOKEN_EXPIRATION_TIME;
};

export const getTokenTimeRemaining = () => {
  const tokenTimestamp = localStorage.getItem('tokenTimestamp');
  if (!tokenTimestamp) return 0;

  const now = Date.now();
  const tokenAge = now - parseInt(tokenTimestamp);
  const timeRemaining = TOKEN_EXPIRATION_TIME - tokenAge;

  return Math.max(0, timeRemaining);
};

export const clearAllAppData = () => {
  // Clear all localStorage data
  localStorage.clear();
  console.log('All app data cleared');
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const url = BASE_URL ? `${BASE_URL}${endpoint}` : endpoint;

  // Get token from localStorage for authenticated requests
  const token = localStorage.getItem('token');
  const tokenTimestamp = localStorage.getItem('tokenTimestamp');

  // Check if token is expired before making API call
  if (token && isTokenExpired()) {
    console.log('Token expired during API call, clearing data');
    clearAllAppData();
    // Redirect to login (this will be handled by AuthContext)
    window.location.href = '/login';
    throw new Error('Token expired');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add Authorization header if token exists
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // For FormData, remove Content-Type so browser sets it with the multipart boundary
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);
    
    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    const hasJsonContent = contentType && contentType.includes('application/json');
    const text = await response.text();
    
    let data = {};
    if (hasJsonContent && text) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        // If JSON parsing fails, use empty object
        console.warn('Failed to parse JSON response:', parseError);
        data = {};
      }
    }
    
    if (!response.ok) {
      // Try to get error message from response
      const errorMessage = data?.message || data?.Message || `HTTP error! status: ${response.status}`;
      console.error('API call failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Login API call
export const loginUser = async (userId, password) => {
  // Use PascalCase to match backend model exactly
  const requestBody = {
    UserId: userId,
    Password: password,
    MacAddress: getMacAddress() || "Y",
  };

  console.log('Login request body:', requestBody);

  return apiCall('/api/Login', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Regulations API call
export const getRegulations = async () => {
  return apiCall('/api/Dropdown/regulations', {
    method: 'GET',
    headers: {
      'Accept': '*/*',
    },
  });
};

// Courses API call
export const getCourses = async (regulation) => {
  const endpoint = regulation
    ? `/api/Dropdown/courses?regulation=${regulation}`
    : '/api/Dropdown/courses';

  return apiCall(endpoint, {
    method: 'GET',
    headers: {
      'Accept': '*/*',
    },
  });
};

// ExamMY API call
export const getExamMY = async (regulation, course) => {
  const endpoint = regulation && course
    ? `/api/Dropdown/exammy?regulation=${regulation}&course=${course}`
    : '/api/Dropdown/exammy';

  return apiCall(endpoint, {
    method: 'GET',
    headers: {
      'Accept': '*/*',
    },
  });
};

// Save dropdown selections
export const saveSelection = async (regulation, course, examMY) => {
  try {
    const response = await apiCall('/api/Dropdown/save-selection', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regulation,
        course,
        examMY
      }),
    });

    if (response.success) {
      console.log('Save Selection API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save selection');
    }
  } catch (error) {
    console.error('Error saving selection:', error);
    throw error;
  }
};

// Get batches for courses
export const getBatches = async (course) => {
  try {
    const response = await apiCall(`/api/Paper/batches?course=${course}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Batches API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch batches');
    }
  } catch (error) {
    console.error('Error fetching batches:', error);
    throw error;
  }
};

export const getBranchPriorityBranches = async (course, regulation) => {
  try {
    const response = await apiCall(`/api/BranchPriorityMaster/course/branches?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Branch Priority Branches API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'branches not found') {
      return response;
    }

    throw new Error(response.message || 'Failed to fetch branch priority branches');
  } catch (error) {
    console.error('Error fetching branch priority branches:', error);
    throw error;
  }
};

export const getBranchPriorityData = async (session, id = 0) => {
  try {
    const response = await apiCall(`/api/BranchPriorityMaster/branchpriority?id=${encodeURIComponent(id)}&session=${encodeURIComponent(session)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Branch Priority Data API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'no data found') {
      return response;
    }

    throw new Error(response.message || 'Failed to fetch branch priority data');
  } catch (error) {
    console.error('Error fetching branch priority data:', error);
    throw error;
  }
};

export const deleteBranchPriority = async (payload) => {
  try {
    const response = await apiCall('/api/BranchPriorityMaster/delete/branchpriority', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success) {
      console.log('Delete Branch Priority API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to delete branch priority');
  } catch (error) {
    console.error('Error deleting branch priority:', error);
    throw error;
  }
};

export const saveExam = async (examPayload) => {
  try {
    const response = await apiCall('/api/Exam/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(examPayload),
    });

    if (response.success) {
      console.log('Save Exam API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to save exam notification');
  } catch (error) {
    console.error('Error saving exam notification:', error);
    throw error;
  }
};

export const saveExamWithNotification = async (examPayload) => {
  try {
    const response = await apiCall('/api/Exam/save-with-notification', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(examPayload),
    });

    if (response.success) {
      console.log('Save Exam With Notification API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to save exam notification with release dates');
  } catch (error) {
    console.error('Error saving exam with notification:', error);
    throw error;
  }
};

export const deleteExam = async (aExamId) => {
  try {
    const response = await apiCall(`/api/Exam/master?aExamId=${encodeURIComponent(aExamId)}`, {
      method: 'DELETE',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Delete Exam API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to delete exam');
  } catch (error) {
    console.error('Error deleting exam:', error);
    throw error;
  }
};

export const getCourseReport = async (params) => {
  const query = new URLSearchParams(params ?? {}).toString();
  const endpoint = query ? `/api/CourseReport/list?${query}` : '/api/CourseReport/list';
  try {
    const response = await apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Report API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'subject list loaded') {
      return response;
    }

    throw new Error(response.message || 'Failed to load course report');
  } catch (error) {
    console.error('Error fetching course report:', error);
    throw error;
  }
};

export const getCourseReportBatches = async (course, regulation) => {
  try {
    const response = await apiCall(`/api/CourseReport/batches?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Report Batches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load course report batches');
  } catch (error) {
    console.error('Error fetching course report batches:', error);
    throw error;
  }
};

export const getCourseReportBranches = async (course, regulation, batch) => {
  try {
    const response = await apiCall(`/api/CourseReport/branches?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}&batch=${encodeURIComponent(batch)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Report Branches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load course report branches');
  } catch (error) {
    console.error('Error fetching course report branches:', error);
    throw error;
  }
};

export const getCourseReportSems = async (course, regulation, batch) => {
  try {
    const response = await apiCall(`/api/CourseReport/sems?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}&batch=${encodeURIComponent(batch)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Report Sems API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load course report sems');
  } catch (error) {
    console.error('Error fetching course report sems:', error);
    throw error;
  }
};

export const getCourseGradeReport = async (params) => {
  const query = new URLSearchParams(params ?? {}).toString();
  const endpoint = query ? `/api/CourseGradeReport/list?${query}` : '/api/CourseGradeReport/list';
  try {
    const response = await apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Grade Report API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'subject list loaded') {
      return response;
    }

    throw new Error(response.message || 'Failed to load course grade report');
  } catch (error) {
    console.error('Error fetching course grade report:', error);
    throw error;
  }
};

export const getCourseGradeReportBatches = async (course, regulation) => {
  try {
    const response = await apiCall(`/api/CourseGradeReport/batches?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Grade Report Batches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load course grade report batches');
  } catch (error) {
    console.error('Error fetching course grade report batches:', error);
    throw error;
  }
};

export const getSemesterGradeReport = async (params) => {
  const query = new URLSearchParams(params ?? {}).toString();
  const endpoint = query ? `/api/SemesterGradeReport/list?${query}` : '/api/SemesterGradeReport/list';
  try {
    const response = await apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Semester Grade Report API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'subject list loaded') {
      return response;
    }

    throw new Error(response.message || 'Failed to load semester grade report');
  } catch (error) {
    console.error('Error fetching semester grade report:', error);
    throw error;
  }
};

export const getSemesterGradeReportBatches = async (course, regulation) => {
  try {
    const response = await apiCall(`/api/SemesterGradeReport/batches?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Semester Grade Report Batches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semester grade report batches');
  } catch (error) {
    console.error('Error fetching semester grade report batches:', error);
    throw error;
  }
};

export const getRoomMasterReport = async (params) => {
  const query = new URLSearchParams(params ?? {}).toString();
  const endpoint = query ? `/api/RoomMasterReport/list?${query}` : '/api/RoomMasterReport/list';
  try {
    const response = await apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Room Master Report API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'subject list loaded') {
      return response;
    }

    throw new Error(response.message || 'Failed to load room master report');
  } catch (error) {
    console.error('Error fetching room master report:', error);
    throw error;
  }
};

export const saveBranchPriority = async (payload) => {
  try {
    const response = await apiCall('/api/BranchPriorityMaster/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success) {
      console.log('Save Branch Priority API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to save branch priority');
  } catch (error) {
    console.error('Error saving branch priority:', error);
    throw error;
  }
};

// Get branches for courses and regulation
export const getBranches = async (course, regu) => {
  try {
    const response = await apiCall(`/api/Paper/branches?course=${course}&regu=${regu}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Branches API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch branches');
    }
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
};

// Get semesters for course, batch, and branch
export const getSemesters = async (course, batch, branch) => {
  try {
    const response = await apiCall(`/api/Paper/sems?course=${course}&batch=${batch}&branch=${branch}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Semesters API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch semesters');
    }
  } catch (error) {
    console.error('Error fetching semesters:', error);
    throw error;
  }
};

// Get streams for course, batch, branch, and semester
export const getStreams = async (course, batch, branch, sem) => {
  try {
    const response = await apiCall(`/api/Paper/streams?course=${course}&batch=${batch}&branch=${branch}&sem=${sem}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Streams API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch streams');
    }
  } catch (error) {
    console.error('Error fetching streams:', error);
    throw error;
  }
};

// Get paper list for course, regulation, branch, semester, and stream
export const getPaperList = async (course, regu, branch, sem, stream) => {
  try {
    const response = await apiCall(`/api/Paper/list?course=${course}&regu=${regu}&branch=${branch}&sem=${sem}&stream=${stream}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Paper List API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch paper list');
    }
  } catch (error) {
    console.error('Error fetching paper list:', error);
    throw error;
  }
};

// Get paper details for a specific paper
export const getPaperDetails = async (course, regu, sem, pcode, branch) => {
  try {
    const response = await apiCall(`/api/Paper/details?course=${course}&regu=${regu}&sem=${sem}&pcode=${pcode}&branch=${branch}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Paper Details API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch paper details');
    }
  } catch (error) {
    console.error('Error fetching paper details:', error);
    throw error;
  }
};

// Copy paper data from one batch to another
export const copyPaper = async (course, toBatch, fromBatch, sem, userId) => {
  try {
    const response = await apiCall('/api/Paper/copy', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course: course,
        toBatch: toBatch,
        fromBatch: fromBatch,
        sem: sem,
        userId: userId
      }),
    });

    if (response.success) {
      console.log('Copy Paper API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to copy paper');
    }
  } catch (error) {
    console.error('Error copying paper:', error);
    throw error;
  }
};

// Delete paper
export const deletePaper = async (regu, sem, branch, pcode) => {
  try {
    const response = await apiCall(`/api/Paper/delete?Regu=${regu}&Sem=${sem}&Branch=${branch}&PCode=${pcode}`, {
      method: 'DELETE',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Delete Paper API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete paper');
    }
  } catch (error) {
    console.error('Error deleting paper:', error);
    throw error;
  }
};

// Save paper
export const savePaper = async (paperData) => {
  try {
    const response = await apiCall('/api/Paper/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paperData),
    });

    if (response.success) {
      console.log('Save Paper API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save paper');
    }
  } catch (error) {
    console.error('Error saving paper:', error);
    throw error;
  }
};

// Reorder papers
export const reorderPapers = async (regu, sem, branch, course, stream, orderedPaperCodes) => {
  try {
    const response = await apiCall('/api/Paper/reorder', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regu: regu,
        sem: sem,
        branch: branch,
        course: course,
        stream: stream,
        orderedPaperCodes: orderedPaperCodes
      }),
    });

    if (response.success) {
      console.log('Reorder Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to reorder papers');
    }
  } catch (error) {
    console.error('Error reordering papers:', error);
    throw error;
  }
};

// Get employee grid data
export const getEmployeeGrid = async () => {
  try {
    const response = await apiCall('/api/Employee/grid', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Employee Grid API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch employee data');
    }
  } catch (error) {
    console.error('Error fetching employee data:', error);
    throw error;
  }
};

// Register employee with files
export const registerEmployee = async (employeeData, imageFile = null, signatureFile = null) => {
  try {
    // Create FormData object
    const formData = new FormData();

    // Add hasHeader field
    formData.append('hasHeader', 'true');

    // Add all employee data fields
    formData.append('EmployeeId', employeeData.employeeId || '');
    formData.append('EmployeeName', employeeData.employeeName || '');
    formData.append('UserName', employeeData.userName || '');
    formData.append('Password', employeeData.password || '');
    formData.append('UserGroup', employeeData.userGroup || '');
    formData.append('Course', employeeData.course || '');
    formData.append('ExamMY', employeeData.examMY || '');
    formData.append('Gender', employeeData.gender || '');
    formData.append('Dob', employeeData.dob || '');
    formData.append('Category', employeeData.category || '');
    formData.append('Mobile', employeeData.mobile || '');
    formData.append('Department', employeeData.department || '');
    formData.append('Qualification', employeeData.qualification || '');
    formData.append('Doj', employeeData.doj || '');
    formData.append('TeachingSubject', employeeData.teachingSubject || '');
    formData.append('Email', employeeData.email || '');
    formData.append('Designation', employeeData.designation || '');
    formData.append('AadharNo', employeeData.aadharNo || '');
    formData.append('IsActive', employeeData.isActive ? 'true' : 'false');

    // Add files if provided
    if (imageFile) {
      formData.append('Photo', imageFile);
    }
    if (signatureFile) {
      formData.append('Signature', signatureFile);
    }

    // For FormData requests, we need to bypass the default Content-Type header
    // Use fetch directly to avoid apiCall's default JSON headers
    const token = localStorage.getItem('token');
    const url = `${BASE_URL || ''}/api/Employee/register-with-files`;

    const headers = {
      'Accept': '*/*',
    };

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }

    const response = await fetchResponse.json();

    if (response.success) {
      console.log('Employee Register API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to register employee');
    }
  } catch (error) {
    console.error('Error registering employee:', error);
    throw error;
  }
};

// Get employee details by ID
export const getEmployeeDetails = async (employeeId) => {
  try {
    const response = await apiCall(`/api/Employee/${employeeId}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Employee Details API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch employee details');
    }
  } catch (error) {
    console.error('Error fetching employee details:', error);
    throw error;
  }
};

// Delete employee
export const deleteEmployee = async (empId, userName) => {
  try {
    const response = await apiCall(`/api/Employee/${empId}?userName=${userName}`, {
      method: 'DELETE',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Delete Employee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete employee');
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Get user groups
export const getUserGroups = async () => {
  try {
    const response = await apiCall('/api/Employee/usergroups', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('User Groups API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch user groups');
    }
  } catch (error) {
    console.error('Error fetching user groups:', error);
    throw error;
  }
};

// Get assigned forms for a user group (User Rights / User Forms)
// Backend may implement GET /api/Employee/usergroup-forms?group=...
export const getUserGroupForms = async (userGroup) => {
  try {
    const response = await apiCall(`/api/Employee/usergroup-forms?group=${encodeURIComponent(userGroup)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.success && Array.isArray(response.data)) return response.data;
    return [];
  } catch (e) {
    return [];
  }
};

// Save user group form assignments (User Rights)
// Backend may implement POST /api/Employee/user-forms with body { userGroup, forms: [{ menuId, subMenuId }] }
export const saveUserForms = async (userGroup, forms) => {
  try {
    const response = await apiCall('/api/Employee/user-forms', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userGroup, forms }),
    });
    return response;
  } catch (e) {
    throw e;
  }
};

// Delete a user group (User Rights)
// Backend may implement DELETE /api/Employee/usergroup?name=...
export const deleteUserGroup = async (userGroup) => {
  try {
    const response = await apiCall(`/api/Employee/usergroup?name=${encodeURIComponent(userGroup)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    return response;
  } catch (e) {
    throw e;
  }
};

// Backup database (Settings > BackUp Database)
// Backend may implement POST /api/Backup/run or similar
export const backupDatabase = async () => {
  try {
    const response = await apiCall('/api/Backup/run', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return response;
  } catch (e) {
    throw e;
  }
};

// Submit fingerprint template (Settings > BioMetric Entry)
// Backend may implement POST /api/Biometric/submit with body { template }
export const submitBiometricTemplate = async (template) => {
  try {
    const response = await apiCall('/api/Biometric/submit', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    });
    return response;
  } catch (e) {
    throw e;
  }
};

// --- Export to Student Portal ---
// Get batch list for Export to StdPortal (optional backend: GET /api/ExportToPortal/batches?course=...)
export const getExportToPortalBatches = async (course) => {
  if (!course) return { success: true, data: [] };
  try {
    const res = await apiCall(`/api/ExportToPortal/batches?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.success && Array.isArray(res.data)) return res;
    const batchRes = await getBatches(course);
    if (batchRes.success && Array.isArray(batchRes.data)) return { success: true, data: batchRes.data };
    return { success: true, data: [] };
  } catch (e) {
    return { success: true, data: [] };
  }
};

// Get sem list for Export to StdPortal (optional backend, or use 1-8)
export const getExportToPortalSems = async (batch) => {
  try {
    const res = await apiCall(`/api/ExportToPortal/sems?batch=${encodeURIComponent(batch)}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.success && Array.isArray(res.data)) return res;
  } catch (_) {}
  const sems = Array.from({ length: 8 }, (_, i) => ({ sem: i + 1, value: String(i + 1), text: String(i + 1) }));
  return { success: true, data: sems };
};

// Export to Portal: Tables Export 1, Tables Export 2, RCRV, Only Subject Data
export const exportToPortal = async (batch, sem, regSup, exportType) => {
  const response = await apiCall('/api/ExportToPortal/export', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch, sem, regSup, exportType }),
  });
  return response;
};

// Export to Student Portal RegnoWise
export const exportToPortalRegnoWise = async (regNo) => {
  const response = await apiCall('/api/ExportToPortal/export-regno', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ regNo }),
  });
  return response;
};

// --- Internal Marks (Post-Exams > Internal Marks Entry) ---
// GET /api/InternalMarks/papers?regulation=&examMY=&sem=&course=&grp=
export const getInternalMarksPapers = async (regulation, examMY, sem, course, grp) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  if (course) params.set('course', course);
  if (grp) params.set('grp', grp);
  const response = await apiCall(`/api/InternalMarks/papers?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return response;
};

// GET /api/InternalMarks/students?regulation=&examMY=&sem=&course=&grp=&pCode=
export const getInternalMarksStudents = async (regulation, examMY, sem, course, grp, pCode) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  if (course) params.set('course', course);
  if (grp) params.set('grp', grp);
  if (pCode) params.set('pCode', pCode);
  const response = await apiCall(`/api/InternalMarks/students?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return response;
};

// POST /api/InternalMarks/save  body: { ashid: number, marks: string }
export const saveInternalMarks = async (ashid, marks) => {
  const response = await apiCall('/api/InternalMarks/save', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ashid: Number(ashid), marks: String(marks) }),
  });
  return response;
};

// --- Practical Marks (Post-Exams > Practical Marks Entry) ---
// GET /api/PracticalMarks/papers?regulation=&examMY=&sem=&course=&grp=
export const getPracticalMarksPapers = async (regulation, examMY, sem, course, grp) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  if (course) params.set('course', course);
  if (grp) params.set('grp', grp);
  const response = await apiCall(`/api/PracticalMarks/papers?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return response;
};

// GET /api/PracticalMarks/students?regulation=&examMY=&sem=&course=&grp=&pCode=
export const getPracticalMarksStudents = async (regulation, examMY, sem, course, grp, pCode) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  if (course) params.set('course', course);
  if (grp) params.set('grp', grp);
  if (pCode) params.set('pCode', pCode);
  const response = await apiCall(`/api/PracticalMarks/students?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return response;
};

// POST /api/PracticalMarks/save  body: { ashid: number, marks: string }
export const savePracticalMarks = async (ashid, marks) => {
  const response = await apiCall('/api/PracticalMarks/save', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ashid: Number(ashid), marks: String(marks) }),
  });
  return response;
};

// ============================================
// OMR Marks Entry (OmrMarksEntry)
// GET /api/OmrMarksEntry/load — query: omrNumber, course, regulation, examMY, regSup
// POST /api/OmrMarksEntry/save — body: regulation, examMY, course, omrNumber (number), marks (string), type ("RV"|"V3"), sem (string)
// ============================================

// GET /api/OmrMarksEntry/load?omrNumber=&course=&regulation=&examMY=&regSup=
export const loadOmrMarks = async (omrNumber, course, regulation, examMY, regSup = '') => {
  const params = new URLSearchParams();
  if (omrNumber != null && String(omrNumber).trim() !== '') params.set('omrNumber', String(omrNumber).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (regSup != null && String(regSup).trim() !== '') params.set('regSup', String(regSup).trim());

  const response = await apiCall(`/api/OmrMarksEntry/load?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// POST /api/OmrMarksEntry/save — no URL params; body: regulation, examMY, course, omrNumber (number), marks (string), type ("RV"|"V3"), sem (string)
export const saveOmrMarks = async ({
  regulation,
  examMY,
  course,
  omrNumber,
  marks,
  type,
  sem,
}) => {
  const numOmr = Number(omrNumber);
  if (Number.isNaN(numOmr) || numOmr <= 0) {
    throw new Error('OmrNumber must be a positive number (use numeric OMRNUMBER from load result).');
  }
  const typeVal = String(type || '').trim().toUpperCase();
  if (typeVal !== 'RV' && typeVal !== 'V3') {
    throw new Error("Type must be 'RV' or 'V3'.");
  }
  const payload = {
    regulation: String(regulation ?? '').trim(),
    examMY: String(examMY ?? '').trim(),
    course: String(course ?? '').trim(),
    omrNumber: numOmr,
    marks: String(marks ?? '').trim(),
    type: typeVal,
    sem: String(sem ?? '').trim(),
  };

  const response = await apiCall('/api/OmrMarksEntry/save', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
};

// ============================================
// Exam My Update (ExamMyUpdate)
// GET /api/ExamMyUpdate/load?regulation=&course=&batch=&branch=&sem=
// POST /api/ExamMyUpdate/update — body: { rows: [{ act_EXAMMY, regulation, batch, course, branch, sem, regno, exammy }] }
// DELETE /api/ExamMyUpdate/delete/{ashid}
// ============================================

// GET /api/ExamMyUpdate/load
export const loadExamMyUpdate = async (regulation, course, batch, branch, sem) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (batch != null && String(batch).trim() !== '') params.set('batch', String(batch).trim());
  if (branch != null && String(branch).trim() !== '') params.set('branch', String(branch).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/ExamMyUpdate/load?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// POST /api/ExamMyUpdate/update — body: { Rows: [{ ACT_EXAMMY, Regulation, Batch, Course, Branch, Sem, REGNO, EXAMMY }] }
export const updateExamMyUpdate = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('At least one row is required');
  }
  const payload = {
    Rows: rows.map((r) => ({
      ACT_EXAMMY: String(r.act_EXAMMY ?? r.ACT_EXAMMY ?? '').trim(),
      Regulation: String(r.regulation ?? r.Regulation ?? '').trim(),
      Batch: String(r.batch ?? r.Batch ?? '').trim(),
      Course: String(r.course ?? r.Course ?? '').trim(),
      Branch: String(r.branch ?? r.Branch ?? '').trim(),
      Sem: String(r.sem ?? r.Sem ?? '').trim(),
      REGNO: String(r.regno ?? r.REGNO ?? '').trim(),
      EXAMMY: String(r.exammy ?? r.EXAMMY ?? '').trim(),
    })),
  };
  const response = await apiCall('/api/ExamMyUpdate/update', {
    method: 'POST',
    headers: { Accept: '*/*', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
};

// DELETE /api/ExamMyUpdate/delete/{ashid}
export const deleteExamMyUpdate = async (ashid) => {
  const id = typeof ashid === 'number' ? ashid : parseInt(String(ashid || '').trim(), 10);
  if (Number.isNaN(id) || id <= 0) {
    throw new Error('Valid ASHID is required');
  }
  const response = await apiCall(`/api/ExamMyUpdate/delete/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Regno Exammywise Subjects (RegnoExammywiseSubjects)
// GET /api/RegnoExammywiseSubjects/load?regNo=&course=&regulation=&examMY=
// GET /api/RegnoExammywiseSubjects/load-get?regNo=&course=&regulation=&examMY=&regSup=
// POST /api/RegnoExammywiseSubjects/save — body: { regNo, papers: [{ ashid, smarks, pmarks, tmarks, rvmarks, v3, mrK_FIN }] }
// ============================================

// GET /api/RegnoExammywiseSubjects/load
export const loadRegnoExammywiseSubjects = async (regNo, course, regulation, examMY) => {
  const params = new URLSearchParams();
  if (regNo != null && String(regNo).trim() !== '') params.set('regNo', String(regNo).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());

  const response = await apiCall(`/api/RegnoExammywiseSubjects/load?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/RegnoExammywiseSubjects/load-get (with regSup = Reg or Sup)
export const loadRegnoExammywiseSubjectsGet = async (regNo, course, regulation, examMY, regSup) => {
  const params = new URLSearchParams();
  if (regNo != null && String(regNo).trim() !== '') params.set('regNo', String(regNo).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (regSup != null && String(regSup).trim() !== '') params.set('regSup', String(regSup).trim());

  const response = await apiCall(`/api/RegnoExammywiseSubjects/load-get?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// POST /api/RegnoExammywiseSubjects/save
export const saveRegnoExammywiseSubjects = async (regNo, papers) => {
  const payload = {
    regNo: String(regNo ?? '').trim(),
    papers: (papers || []).map((p) => ({
      ashid: Number(p.ashid ?? p.ASHID ?? p.aSHID ?? 0),
      smarks: p.smarks != null && p.smarks !== '' ? String(p.smarks) : '',
      pmarks: p.pmarks != null && p.pmarks !== '' ? String(p.pmarks) : '',
      tmarks: p.tmarks != null && p.tmarks !== '' ? String(p.tmarks) : (p.TMARKS != null && p.TMARKS !== '' ? String(p.TMARKS) : ''),
      rvmarks: p.rvmarks != null && p.rvmarks !== '' ? String(p.rvmarks) : (p.RVMARKS != null && p.RVMARKS !== '' ? String(p.RVMARKS) : ''),
      v3: p.v3 != null && p.v3 !== '' ? String(p.v3) : (p.V3 != null && p.V3 !== '' ? String(p.V3) : ''),
      mrK_FIN: p.mrK_FIN != null && p.mrK_FIN !== '' ? String(p.mrK_FIN) : (p.MRK_FIN != null && p.MRK_FIN !== '' ? String(p.MRK_FIN) : ''),
    })),
  };
  const response = await apiCall('/api/RegnoExammywiseSubjects/save', {
    method: 'POST',
    headers: { Accept: '*/*', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
};

// ============================================
// Reg. No. Wise Marks Entry (RegNoMarksEntry)
// ============================================

// GET /api/RegNoMarksEntry/student?regNo=&examMY=&batch=&sem=&course=
export const getRegNoMarksStudent = async (regNo, examMY, batch, sem, course) => {
  const params = new URLSearchParams();
  if (regNo) params.set('regNo', regNo);
  if (examMY) params.set('examMY', examMY);
  if (batch) params.set('batch', batch);
  if (sem) params.set('sem', sem);
  if (course) params.set('course', course);

  const response = await apiCall(`/api/RegNoMarksEntry/student?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return response;
};

// POST /api/RegNoMarksEntry/save
// body: { regNo: string, papers: [{ ashid, ptype, smarks, tmarks, rvmarks, v3, mrK_FIN, pmarks }] }
export const saveRegNoMarks = async (regNo, papers) => {
  const payload = {
    regNo,
    papers: (papers || []).map((p) => ({
      ashid: p.ashid ?? p.ASHID,
      ptype: p.ptype ?? p.PTYPE ?? '',
      smarks: p.smarks ?? p.SMARKS ?? null,
      tmarks: p.tmarks ?? p.TMARKS ?? null,
      rvmarks: p.rvmarks ?? p.RVMARKS ?? null,
      v3: p.v3 ?? p.V3 ?? null,
      mrK_FIN: p.mrK_FIN ?? p.MRK_FIN ?? null,
      pmarks: p.pmarks ?? p.PMARKS ?? null,
    })),
  };

  const response = await apiCall('/api/RegNoMarksEntry/save', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
};

// Check if user exists
export const checkUser = async (userId) => {
  try {
    const response = await apiCall(`/api/Employee/checkuser/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    console.log('Check User API Response:', response);
    return response;
  } catch (error) {
    console.error('Error checking user:', error);
    throw error;
  }
};

// Get fee structures
export const getFeeStructures = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/Fee/structures?course=${course}&examMy=${examMy}&regulation=${regulation}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Fee Structures API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch fee structures');
    }
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    throw error;
  }
};

// Get fine fee list
export const getFineFeeList = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/Fee/fine/list?course=${course}&examMy=${examMy}&regulation=${regulation}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Fine Fee List API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch fine fee list');
    }
  } catch (error) {
    console.error('Error fetching fine fee list:', error);
    throw error;
  }
};

// Save fine fee
export const saveFineFee = async (fineData) => {
  try {
    const response = await apiCall('/api/Fee/fine/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fineData),
    });

    if (response.success) {
      console.log('Save Fine Fee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save fine fee');
    }
  } catch (error) {
    console.error('Error saving fine fee:', error);
    throw error;
  }
};

// ------------------------
// Exam Fee Concession APIs
// ------------------------

// Get semesters for ExamFeeConcession (for a course & regulation)
export const getExamFeeConcessionSems = async (course, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/ExamFeeConcession/sems?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('ExamFeeConcession Sems API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to load Exam Fee Concession semesters');
    }
  } catch (error) {
    console.error('Error loading Exam Fee Concession semesters:', error);
    throw error;
  }
};

// Get student + fee information for ExamFeeConcession by registration number
export const getExamFeeConcessionStudent = async (regNo) => {
  try {
    const response = await apiCall(
      `/api/ExamFeeConcession/student?regno=${encodeURIComponent(regNo || '')}`,
      {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      }
    );

    if (response.success !== undefined) {
      console.log('ExamFeeConcession Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to load Exam Fee Concession student data');
    }
  } catch (error) {
    console.error('Error loading Exam Fee Concession student data:', error);
    throw error;
  }
};

// Get ExamFeeConcession grid data
export const getExamFeeConcessionGrid = async (course, examMy, regNo, sem = 0) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMy: examMy || '',
      regno: regNo || '',
      sem: sem ?? 0,
    }).toString();

    const response = await apiCall(`/api/ExamFeeConcession/grid?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('ExamFeeConcession Grid API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to load Exam Fee Concession grid');
    }
  } catch (error) {
    console.error('Error loading Exam Fee Concession grid:', error);
    throw error;
  }
};

// Check if semester is Regular or Supply
export const checkExamFeeConcessionRegSup = async (regu, sem, course, examMy) => {
  try {
    const queryParams = new URLSearchParams({
      regu: regu || '',
      sem: sem || 0,
      course: course || '',
      examMy: examMy || ''
    }).toString();

    const response = await apiCall(`/api/ExamFeeConcession/checkregsup?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Check Exam Fee Concession RegSup API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to check RegSup');
    }
  } catch (error) {
    console.error('Error checking Exam Fee Concession RegSup:', error);
    throw error;
  }
};

// Get fee data (automatically uses REG or SUP based on semester type)
export const getExamFeeConcessionFee = async (course, examMy, regulation, regu, sem, grp, regno) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMy: examMy || '',
      regulation: regulation || '',
      regu: regu || '',
      sem: sem || '',
      grp: grp || '',
      regno: regno || ''
    }).toString();

    const response = await apiCall(`/api/ExamFeeConcession/fee?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Exam Fee Concession Fee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to load fee data');
    }
  } catch (error) {
    console.error('Error loading Exam Fee Concession fee:', error);
    throw error;
  }
};

// Save ExamFeeConcession record
export const saveExamFeeConcession = async (payload) => {
  try {
    const response = await apiCall('/api/ExamFeeConcession/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success !== undefined) {
      console.log('Save ExamFeeConcession API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save Exam Fee Concession');
    }
  } catch (error) {
    console.error('Error saving Exam Fee Concession:', error);
    throw error;
  }
};

// Delete ExamFeeConcession record by id
export const deleteExamFeeConcession = async (id) => {
  try {
    const response = await apiCall('/api/ExamFeeConcession/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (response.success !== undefined) {
      console.log('Delete ExamFeeConcession API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete Exam Fee Concession record');
    }
  } catch (error) {
    console.error('Error deleting Exam Fee Concession record:', error);
    throw error;
  }
};

// Get course-branch grid data
export const getCourseBranchGrid = async (type, course, regulation) => {
  try {
    const response = await apiCall(`/api/Cgp/grid?type=${encodeURIComponent(type)}&string=${encodeURIComponent(course)}&regulation=${regulation}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Course Branch Grid API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch course branch grid');
    }
  } catch (error) {
    console.error('Error fetching course branch grid:', error);
    throw error;
  }
};

// Save course-branch data
export const saveCourseBranch = async (courseBranchData) => {
  try {
    const response = await apiCall('/api/Cgp/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseBranchData),
    });

    if (response.success) {
      console.log('Save Course Branch API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save course branch');
    }
  } catch (error) {
    console.error('Error saving course branch:', error);
    throw error;
  }
};

// Delete course-branch data
export const deleteCourseBranch = async (courseBranchData) => {
  try {
    const response = await apiCall('/api/Cgp/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseBranchData),
    });

    if (response.success) {
      console.log('Delete Course Branch API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete course branch');
    }
  } catch (error) {
    console.error('Error deleting course branch:', error);
    throw error;
  }
};

// Get semester grade batches
export const getSemesterGradeBatches = async (course) => {
  try {
    const response = await apiCall(`/api/SemesterGrade/batches?course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Semester Grade Batches API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch semester grade batches');
    }
  } catch (error) {
    console.error('Error fetching semester grade batches:', error);
    throw error;
  }
};

// Get semester grade REGU mapping
export const getSemesterGradeReguMapping = async (course, type = 'TBL_SEMGRADE') => {
  try {
    const response = await apiCall(`/api/SemesterGrade/regu?course=${encodeURIComponent(course)}&type=${type}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Semester Grade REGU Mapping API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch semester grade REGU mapping');
    }
  } catch (error) {
    console.error('Error fetching semester grade REGU mapping:', error);
    throw error;
  }
};

// Get semester grade grid data
export const getSemesterGradeGrid = async (course, regu) => {
  try {
    const response = await apiCall(`/api/SemesterGrade/grid?course=${encodeURIComponent(course)}&regu=${regu}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Semester Grade Grid API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch semester grade grid');
    }
  } catch (error) {
    console.error('Error fetching semester grade grid:', error);
    throw error;
  }
};

// Save semester grade
export const saveSemesterGrade = async (gradeData) => {
  try {
    const response = await apiCall('/api/SemesterGrade/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gradeData),
    });

    if (response.success) {
      console.log('Save Semester Grade API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save semester grade');
    }
  } catch (error) {
    console.error('Error saving semester grade:', error);
    throw error;
  }
};

// Delete semester grade
export const deleteSemesterGrade = async (id) => {
  try {
    const response = await apiCall('/api/SemesterGrade/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: id }),
    });

    if (response.success) {
      console.log('Delete Semester Grade API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete semester grade');
    }
  } catch (error) {
    console.error('Error deleting semester grade:', error);
    throw error;
  }
};

// Copy semester grades
export const copySemesterGrades = async (fromBatch, toBatch, course, type = 'TBL_SEMGRADE') => {
  try {
    const response = await apiCall('/api/SemesterGrade/copy', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromBatch: fromBatch,
        toBatch: toBatch,
        course: course,
        type: type
      }),
    });

    if (response.success) {
      console.log('Copy Semester Grades API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to copy semester grades');
    }
  } catch (error) {
    console.error('Error copying semester grades:', error);
    throw error;
  }
};

// Get class grade batches
export const getClassGradeBatches = async (course) => {
  try {
    const response = await apiCall(`/api/ClassGrade/batches?course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Class Grade Batches API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch class grade batches');
    }
  } catch (error) {
    console.error('Error fetching class grade batches:', error);
    throw error;
  }
};

// Get class grade grid data
export const getClassGradeGrid = async (course, regu) => {
  try {
    const response = await apiCall(`/api/ClassGrade/grid?course=${encodeURIComponent(course)}&regu=${regu}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Class Grade Grid API Response:', response);
      return response;
    }

    if (response.message && response.message.toLowerCase() === 'no class grades found') {
      return response;
    }

    throw new Error(response.message || 'Failed to fetch class grade grid data');
  } catch (error) {
    console.error('Error fetching class grade grid data:', error);
    throw error;
  }
};

// Save class grade
export const saveClassGrade = async (classGradeData) => {
  try {
    const response = await apiCall('/api/ClassGrade/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(classGradeData),
    });

    if (response.success) {
      console.log('Save Class Grade API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save class grade');
    }
  } catch (error) {
    console.error('Error saving class grade:', error);
    throw error;
  }
};

// Delete class grade
export const deleteClassGrade = async (id) => {
  try {
    const response = await apiCall('/api/ClassGrade/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Id: id }),
    });

    if (response.success) {
      console.log('Delete Class Grade API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete class grade');
    }
  } catch (error) {
    console.error('Error deleting class grade:', error);
    throw error;
  }
};

// Copy class grades
export const copyClassGrades = async (fromRegu, toRegu, course, recreate = false) => {
  try {
    const response = await apiCall('/api/ClassGrade/copy', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FromRegu: fromRegu,
        ToRegu: toRegu,
        Course: course,
        Recreate: recreate
      }),
    });

    if (response.success) {
      console.log('Copy Class Grades API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to copy class grades');
    }
  } catch (error) {
    console.error('Error copying class grades:', error);
    throw error;
  }
};

// Save fee heads
export const saveFeeHeads = async (feeHeadsData) => {
  try {
    const response = await apiCall('/api/FeeHeads/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feeHeadsData),
    });

    if (response.success) {
      console.log('Save Fee Heads API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save fee heads');
    }
  } catch (error) {
    console.error('Error saving fee heads:', error);
    throw error;
  }
};

// Get fee heads data
export const getFeeHeadsData = async (course) => {
  try {
    const response = await apiCall(`/api/FeeHeads?course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Fee Heads API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch fee heads data');
    }
  } catch (error) {
    console.error('Error fetching fee heads data:', error);
    throw error;
  }
};

// Delete fee heads
export const deleteFeeHeads = async (id) => {
  try {
    const response = await apiCall('/api/FeeHeads/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ID: id }),
    });

    if (response.success) {
      console.log('Delete Fee Heads API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete fee heads');
    }
  } catch (error) {
    console.error('Error deleting fee heads:', error);
    throw error;
  }
};

// Get room list
export const getRoomList = async (session) => {
  try {
    const response = await apiCall(`/api/Room/list?session=${encodeURIComponent(session)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Room List API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch room list');
    }
  } catch (error) {
    console.error('Error fetching room list:', error);
    throw error;
  }
};

// Save room
export const saveRoom = async (roomData) => {
  try {
    const response = await apiCall('/api/Room/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomData),
    });

    if (response.success) {
      console.log('Save Room API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save room');
    }
  } catch (error) {
    console.error('Error saving room:', error);
    throw error;
  }
};

// Delete room
export const deleteRoom = async (roomNo) => {
  try {
    const response = await apiCall('/api/Room/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomNo: roomNo }),
    });

    if (response.success) {
      console.log('Delete Room API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete room');
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
};

// Consolidated storage management
export const getAppData = () => {
  const data = localStorage.getItem('appData');
  if (data) {
    return JSON.parse(data);
  }

  // Migrate from individual storage to consolidated storage
  return migrateToConsolidatedStorage();
};

// Migrate individual localStorage items to consolidated storage
const migrateToConsolidatedStorage = () => {
  const selectedRegulation = localStorage.getItem('selectedRegulation');
  const selectedCourse = localStorage.getItem('selectedCourse');
  const selectedExamMY = localStorage.getItem('selectedExamMY');
  const token = localStorage.getItem('token');

  if (selectedRegulation || selectedCourse || selectedExamMY) {
    console.log('Migrating individual storage to consolidated storage...');

    const consolidatedData = {
      regulation: selectedRegulation,
      course: selectedCourse,
      examMY: selectedExamMY,
      token: token,
      lastUpdated: new Date().toISOString()
    };

    // Set consolidated data
    setAppData(consolidatedData);

    // Clean up individual items
    localStorage.removeItem('selectedRegulation');
    localStorage.removeItem('selectedCourse');
    localStorage.removeItem('selectedExamMY');
    localStorage.removeItem('regulationData');
    localStorage.removeItem('courseData');
    localStorage.removeItem('examMYData');

    console.log('Migration completed:', consolidatedData);
    return consolidatedData;
  }

  return null;
};

export const setAppData = (data) => {
  localStorage.setItem('appData', JSON.stringify(data));
};

export const updateAppData = (updates) => {
  const currentData = getAppData() || {};
  const updatedData = {
    ...currentData,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  setAppData(updatedData);
  return updatedData;
};

// Individual getters for backward compatibility
export const getStoredRegulation = () => {
  const appData = getAppData();
  return appData?.regulation || null;
};

export const getStoredCourse = () => {
  const appData = getAppData();
  return appData?.course || null;
};

export const getStoredExamMY = () => {
  const appData = getAppData();
  return appData?.examMY || null;
};

// Individual setters that update the consolidated storage
export const setStoredRegulation = (regulation, token) => {
  updateAppData({
    regulation: regulation,
    token: token,
    regulationTimestamp: new Date().toISOString()
  });
};

export const setStoredCourse = (course, token) => {
  updateAppData({
    course: course,
    token: token,
    courseTimestamp: new Date().toISOString()
  });
};

export const setStoredExamMY = (examMY, token) => {
  updateAppData({
    examMY: examMY,
    token: token,
    examMYTimestamp: new Date().toISOString()
  });
};

// Clear all dropdown data
export const clearDropdownData = () => {
  const appData = getAppData();
  if (appData) {
    const { regulation, course, examMY, regulationTimestamp, courseTimestamp, examMYTimestamp, ...rest } = appData;
    setAppData(rest);
  }
};

// StudentwiseMasterCreation API functions
export const getStudentMasterBranches = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/StudentMaster/branches?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Student Master Branches API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student master branches');
    }
  } catch (error) {
    console.error('Error fetching student master branches:', error);
    throw error;
  }
};

export const getStudentMasterSems = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/StudentMaster/sems?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Student Master Sems API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student master sems');
    }
  } catch (error) {
    console.error('Error fetching student master sems:', error);
    throw error;
  }
};

// Get TimeTableAndSeating semesters
export const getTimeTableSeatingSems = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/sems?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Sems API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch timetable seating semesters');
    }
  } catch (error) {
    console.error('Error fetching timetable seating semesters:', error);
    throw error;
  }
};

// Get TimeTableAndSeating timetable data
export const getTimeTableSeatingTimetable = async (course, examMy, sem, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/timetable?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Timetable API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch timetable data');
    }
  } catch (error) {
    console.error('Error fetching timetable data:', error);
    throw error;
  }
};

// Get TimeTableAndSeating papers/courses
export const getTimeTableSeatingPapers = async (course, examMy, sem, eDate, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/papers?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&eDate=${encodeURIComponent(eDate)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch papers');
    }
  } catch (error) {
    console.error('Error fetching papers:', error);
    throw error;
  }
};

// Get TimeTableAndSeating exam dates
export const getTimeTableSeatingDates = async (course, examMy, sem, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/dates?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Dates API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam dates');
    }
  } catch (error) {
    console.error('Error fetching exam dates:', error);
    throw error;
  }
};

// Get TimeTableAndSeating paper data
export const getTimeTableSeatingPaperData = async (course, examMy, sem, pcode, regulation, examType) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/paper-data?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&pcode=${encodeURIComponent(pcode)}&regulation=${encodeURIComponent(regulation)}&examType=${encodeURIComponent(examType)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Paper Data API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch paper data');
    }
  } catch (error) {
    console.error('Error fetching paper data:', error);
    throw error;
  }
};

// Get TimeTableAndSeating Room Allotment papers/courses
export const getTimeTableSeatingRAPapers = async (course, examMy, sem, eDate, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/ra/papers?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&eDate=${encodeURIComponent(eDate)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating RA Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch RA papers');
    }
  } catch (error) {
    console.error('Error fetching RA papers:', error);
    throw error;
  }
};

// Get TimeTableAndSeating Room Allotment paper data
export const getTimeTableSeatingRAPaperData = async (course, examMy, sem, pcode, eDate, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/ra/paper-data?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&pcode=${encodeURIComponent(pcode)}&eDate=${encodeURIComponent(eDate)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating RA Paper Data API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch RA paper data');
    }
  } catch (error) {
    console.error('Error fetching RA paper data:', error);
    throw error;
  }
};

// Get TimeTableAndSeating branches
export const getTimeTableSeatingBranches = async (course, examMy, sem, regulation) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/branches?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&sem=${encodeURIComponent(sem)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Branches API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch branches');
    }
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
};

// Search rooms for autocomplete
export const searchRooms = async (prefixText) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/rooms/search?prefixText=${encodeURIComponent(prefixText)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Search Rooms API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to search rooms');
    }
  } catch (error) {
    console.error('Error searching rooms:', error);
    throw error;
  }
};

// Get TimeTableAndSeating export format
export const getTimeTableSeatingExportFormat = async (regulation, course, examMy) => {
  try {
    const response = await apiCall(`/api/TimeTableAndSeating/dates/format?regulation=${encodeURIComponent(regulation)}&course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get TimeTableAndSeating Export Format API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch export format');
    }
  } catch (error) {
    console.error('Error fetching export format:', error);
    throw error;
  }
};

// Save room allotment
export const saveRoomAllotment = async (roomData) => {
  try {
    const response = await apiCall('/api/TimeTableAndSeating/save/rooms', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomData),
    });

    if (response.success) {
      console.log('Save Room Allotment API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save room allotment');
    }
  } catch (error) {
    console.error('Error saving room allotment:', error);
    throw error;
  }
};

// Save exam date
export const saveExamDate = async (examDateData) => {
  try {
    const response = await apiCall('/api/TimeTableAndSeating/save/date', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(examDateData),
    });

    if (response.success) {
      console.log('Save Exam Date API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save exam date');
    }
  } catch (error) {
    console.error('Error saving exam date:', error);
    throw error;
  }
};

// Save exam session
export const saveExamSession = async (sessionData) => {
  try {
    const response = await apiCall('/api/TimeTableAndSeating/save/session', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });

    if (response.success) {
      console.log('Save Exam Session API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save exam session');
    }
  } catch (error) {
    console.error('Error saving exam session:', error);
    throw error;
  }
};

// Get semesters for exam registration
export const getExamRegistrationSems = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/sems?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`);

    if (response.success) {
      console.log('Get Exam Registration Sems API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam registration semesters');
    }
  } catch (error) {
    console.error('Error fetching exam registration semesters:', error);
    throw error;
  }
};

// Get batch-semester options for Register/Unregister All
export const getExamRegistrationBatchSemester = async (course, examMy) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/batch-semester?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}`);

    if (response.success) {
      console.log('Get Exam Registration Batch-Semester API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch batch-semester options');
    }
  } catch (error) {
    console.error('Error fetching batch-semester options:', error);
    throw error;
  }
};

// Register all students for selected batch-semester
export const registerAllExamRegistrations = async (course, regu, sem) => {
  try {
    const response = await apiCall('/api/ExamRegistration/register-all', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course,
        regu,
        sem,
      }),
    });

    if (response.success !== undefined) {
      console.log('Register All Exam Registrations API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to register all students');
    }
  } catch (error) {
    console.error('Error registering all students:', error);
    throw error;
  }
};

// Unregister all students for selected batch-semester
export const unregisterAllExamRegistrations = async (course, regu, sem) => {
  try {
    const response = await apiCall('/api/ExamRegistration/unregister-all', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course,
        regu,
        sem,
      }),
    });

    if (response.success !== undefined) {
      console.log('Unregister All Exam Registrations API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to unregister all students');
    }
  } catch (error) {
    console.error('Error unregistering all students:', error);
    throw error;
  }
};

// Get fee structure for regular exam registration
export const getExamRegistrationFeeRegular = async (regu, sem, course, grp, examMy, regulation, regNo) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/fee/regular?regu=${encodeURIComponent(regu)}&sem=${encodeURIComponent(sem)}&course=${encodeURIComponent(course)}&grp=${encodeURIComponent(grp)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}&regNo=${encodeURIComponent(regNo)}`);

    if (response.success) {
      console.log('Get Exam Registration Fee Regular API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch regular fee structure');
    }
  } catch (error) {
    console.error('Error fetching regular fee structure:', error);
    throw error;
  }
};

// Get fee structure for supply exam registration
export const getExamRegistrationFeeSupply = async (fCount, course, examMy, regulation, regNo, sem) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/fee/supply?fCount=${encodeURIComponent(fCount)}&course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}&regNo=${encodeURIComponent(regNo)}&sem=${encodeURIComponent(sem)}`);

    if (response.success) {
      console.log('Get Exam Registration Fee Supply API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch supply fee structure');
    }
  } catch (error) {
    console.error('Error fetching supply fee structure:', error);
    throw error;
  }
};

// Get student information for exam registration
export const getExamRegistrationStudent = async (regNo) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/student?regNo=${encodeURIComponent(regNo)}`);

    if (response.success) {
      console.log('Get Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student information');
    }
  } catch (error) {
    console.error('Error fetching student information:', error);
    throw error;
  }
};

// Get failed papers for exam registration
export const getExamRegistrationFailedPapers = async (regNo, examMy, course = '', regulation = '', sem = '') => {
  try {
    const params = new URLSearchParams();
    params.set('regNo', regNo || '');
    if (examMy) params.set('examMy', examMy);
    if (course) params.set('course', course);
    if (regulation) params.set('regulation', regulation);
    if (sem) params.set('sem', sem);

    const response = await apiCall(`/api/ExamRegistration/failed-papers?${params.toString()}`);

    if (response.success) {
      console.log('Get Failed Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch failed papers');
    }
  } catch (error) {
    console.error('Error fetching failed papers:', error);
    throw error;
  }
};

// Register student for exam
// registrationData should include:
// - regNo, sem, examMy, userId, isSupply (required)
// - course, regulation, regSup, examFee, fineFee, appFee, concession, totalAmount (optional but recommended)
// - papers: array of { sem, papers (comma-separated codes), pCount, regSup, examFee, fineFee } (optional)
export const registerExam = async (registrationData) => {
  try {
    const response = await apiCall('/api/ExamRegistration/register', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    // Handle both success: true and success: false cases
    // The API may return success: false with message "No Data" if already registered
    if (response.success !== undefined) {
      console.log('Register Exam API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to register for exam');
    }
  } catch (error) {
    console.error('Error registering for exam:', error);
    throw error;
  }
};

// Get fine fee list (actual API: Fee controller)
// GET /api/Fee/fine/list?course=B.Tech&examMy=Apr-2019&regulation=R18
export const getFeeFineList = async (course, examMy, regulation) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMy) params.set('examMy', examMy);
  if (regulation) params.set('regulation', regulation);

  try {
    const response = await apiCall(`/api/Fee/fine/list?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response;
  } catch (error) {
    console.error('Error fetching fine fee list:', error);
    throw error;
  }
};

// Fine check (optional — use when applying fine with date range and fid)
// GET /api/Fee/fine/check?course=&examMy=&sem=&fineAmt=&fromDate=&toDate=&fid=&regulation=
export const getFeeFineCheck = async (course, examMy, sem, fineAmt, fromDate, toDate, fid, regulation) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMy) params.set('examMy', examMy);
  if (sem) params.set('sem', sem);
  if (fineAmt != null && fineAmt !== '') params.set('fineAmt', fineAmt);
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  if (fid != null && fid !== '') params.set('fid', fid);
  if (regulation) params.set('regulation', regulation);

  try {
    const response = await apiCall(`/api/Fee/fine/check?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response;
  } catch (error) {
    console.error('Error fetching fine check:', error);
    throw error;
  }
};

// Unregister student from exam
export const unregisterExam = async (unregistrationData) => {
  try {
    const response = await apiCall('/api/ExamRegistration/unregister', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unregistrationData),
    });

    if (response.success) {
      console.log('Unregister Exam API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to unregister from exam');
    }
  } catch (error) {
    console.error('Error unregistering from exam:', error);
    throw error;
  }
};

// Get registered students list
export const getRegisteredList = async (examMy, course, regulation, status = 'REG') => {
  try {
    const response = await apiCall(`/api/ExamRegistration/registered-list?examMy=${encodeURIComponent(examMy)}&course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}&status=${encodeURIComponent(status)}`);

    if (response.success) {
      console.log('Get Registered List API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch registered list');
    }
  } catch (error) {
    console.error('Error fetching registered list:', error);
    throw error;
  }
};

// Get to-be-registered students list (status = 'TOREG')
export const getToBeRegisteredList = async (examMy, course, regulation) => {
  try {
    return await getRegisteredList(examMy, course, regulation, 'TOREG');
  } catch (error) {
    console.error('Error fetching to-be-registered list:', error);
    throw error;
  }
};

// Get receipt duplicate data (registration numbers for a receipt)
export const getReceiptDuplicate = async (receiptNo) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/receipt/duplicate?receiptNo=${encodeURIComponent(receiptNo)}`);

    if (response.success) {
      console.log('Get Receipt Duplicate API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch receipt data');
    }
  } catch (error) {
    console.error('Error fetching receipt duplicate:', error);
    throw error;
  }
};

// Cancel/Delete receipt
export const cancelReceipt = async (receiptNo, regNo) => {
  try {
    const response = await apiCall('/api/ExamRegistration/receipt/cancel', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receiptNo, regNo }),
    });

    if (response.success) {
      console.log('Cancel Receipt API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to cancel receipt');
    }
  } catch (error) {
    console.error('Error cancelling receipt:', error);
    throw error;
  }
};

// Get receipt data for printing
export const getReceiptPrint = async (receiptNo) => {
  try {
    const response = await apiCall(`/api/ExamRegistration/receipt/print?receiptNo=${encodeURIComponent(receiptNo)}`);

    if (response.success) {
      console.log('Get Receipt Print API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'No receipt found');
    }
  } catch (error) {
    console.error('Error fetching receipt for print:', error);
    throw error;
  }
};

// Check Exam Notification (check if notification end date is exceeded)
// sem parameter is required - should not be empty
export const checkExamNotification = async (examMy, course, regulation, sem) => {
  try {
    // Validate required parameters
    if (!examMy || !course || !regulation || !sem) {
      throw new Error('examMy, course, regulation, and sem are required parameters');
    }

    const queryParams = new URLSearchParams({
      examMy: examMy,
      course: course,
      regulation: regulation,
      sem: sem
    }).toString();

    const response = await apiCall(`/api/ExamRegistration/check-notification?${queryParams}`);

    if (response.success !== undefined) {
      console.log('Check Exam Notification API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to check exam notification');
    }
  } catch (error) {
    console.error('Error checking exam notification:', error);
    throw error;
  }
};

// Check if student is already registered for exam
export const checkRegistered = async (regNo, sem, examMy) => {
  try {
    const queryParams = new URLSearchParams({
      regNo: regNo || '',
      sem: sem || '',
      examMy: examMy || ''
    }).toString();

    const response = await apiCall(`/api/ExamRegistration/check-registered?${queryParams}`);

    if (response.success !== undefined) {
      console.log('Check Registered API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to check registration status');
    }
  } catch (error) {
    console.error('Error checking registration status:', error);
    throw error;
  }
};

// StudentwiseMasterCreation create master API function
export const createStudentMaster = async (masterData) => {
  try {
    const response = await apiCall('/api/StudentMaster/create-master', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(masterData),
    });

    if (response.success) {
      console.log('Create Student Master API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to create student master');
    }
  } catch (error) {
    console.error('Error creating student master:', error);
    throw error;
  }
};

// Get student subjects
export const getStudentSubjects = async (course, examMy, regulation, sem, regno) => {
  try {
    const response = await apiCall(`/api/StudentMaster/student/subjects?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regu=${encodeURIComponent(regulation)}&sem=${encodeURIComponent(sem)}&regno=${encodeURIComponent(regno)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Student Subjects API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student subjects');
    }
  } catch (error) {
    console.error('Error fetching student subjects:', error);
    throw error;
  }
};

// ProgrammeBranches copy API function
export const copyCourseBranch = async (copyData) => {
  try {
    const response = await apiCall('/api/Cgp/copy', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(copyData),
    });

    if (response.success) {
      console.log('Copy Course Branch API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to copy course branch data');
    }
  } catch (error) {
    console.error('Error copying course branch data:', error);
    throw error;
  }
};

// Exam Notifications API functions
export const getExamRegulations = async () => {
  try {
    const response = await apiCall('/api/Exam/regulations', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Exam Regulations API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam regulations');
    }
  } catch (error) {
    console.error('Error fetching exam regulations:', error);
    throw error;
  }
};

export const getExamCourses = async (regulation) => {
  try {
    const response = await apiCall(`/api/Exam/courses?regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Exam Courses API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam courses');
    }
  } catch (error) {
    console.error('Error fetching exam courses:', error);
    throw error;
  }
};

export const getExistingExams = async (regulation, examMy, course) => {
  try {
    // Use masterlist API instead of existing API (only needs regulation and course)
    const response = await apiCall(`/api/Exam/masterlist?regulation=${encodeURIComponent(regulation)}&course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Exam Master List API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam master list');
    }
  } catch (error) {
    console.error('Error fetching exam master list:', error);
    throw error;
  }
};

// Get existing exam (different from getExistingExams - uses existing endpoint)
export const getExamExisting = async (regulation, examMy, course) => {
  try {
    const response = await apiCall(`/api/Exam/existing?regulation=${encodeURIComponent(regulation)}&examMy=${encodeURIComponent(examMy)}&course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Exam Existing API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch existing exam');
    }
  } catch (error) {
    console.error('Error fetching existing exam:', error);
    throw error;
  }
};

// Get exam batch by course
export const getExamBatch = async (regu, course) => {
  try {
    const response = await apiCall(`/api/Exam/batch?regu=${encodeURIComponent(regu)}&course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Exam Batch API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam batch');
    }
  } catch (error) {
    console.error('Error fetching exam batch:', error);
    throw error;
  }
};

// Save exam regsup
export const saveExamRegSup = async (regSupPayload) => {
  try {
    const response = await apiCall('/api/Exam/regsup/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regSupPayload),
    });

    if (response.success) {
      console.log('Save Exam RegSup API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save exam regsup');
    }
  } catch (error) {
    console.error('Error saving exam regsup:', error);
    throw error;
  }
};

// Get exam notifications
export const getExamNotifications = async (examMy, course, regulation) => {
  try {
    const response = await apiCall(`/api/Exam/notifications?examMy=${encodeURIComponent(examMy)}&course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Exam Notifications API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam notifications');
    }
  } catch (error) {
    console.error('Error fetching exam notifications:', error);
    throw error;
  }
};

// Master Creation regular data
export const getMasterRegularData = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/Master/regular-data?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Master Creation Regular Data API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch master regular data');
    }
  } catch (error) {
    console.error('Error fetching master regular data:', error);
    throw error;
  }
};

export const updateMasterPaper = async (payload) => {
  try {
    const response = await apiCall('/api/Master/update-pap', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success) {
      console.log('Update Master Paper API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to update paper data');
    }
  } catch (error) {
    console.error('Error updating master paper:', error);
    throw error;
  }
};

export const getMasterSummary = async (course, examMy, regulation) => {
  try {
    const response = await apiCall(`/api/Master/master-data?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Master Summary API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch master summary');
    }
  } catch (error) {
    console.error('Error fetching master summary:', error);
    throw error;
  }
};

export const checkMasterExists = async (course, examMy, batch, sem) => {
  try {
    const response = await apiCall(`/api/Master/exists?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&batch=${encodeURIComponent(batch)}&sem=${encodeURIComponent(sem)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    console.log('Master Exists API Response:', response);
    return response;
  } catch (error) {
    console.error('Error checking master existence:', error);
    throw error;
  }
};

export const createMaster = async (payload) => {
  try {
    const response = await apiCall('/api/Master/create', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // For master creation, we should NOT surface backend "Create failed" messages
    // to the user. Always return the response and let the caller decide what to show.
    console.log('Create Master API Response:', response);
    return response;
  } catch (error) {
    console.error('Error creating master:', error);
    throw error;
  }
};

export const exportMasterData = async (course, examMy, regulation) => {
  try {
    const token = localStorage.getItem('token');
    const url = `${BASE_URL || ''}/api/Master/export?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}`;

    const headers = {
      'Accept': '*/*',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error exporting master data:', error);
    throw error;
  }
};

// Get student list
export const getStudentList = async (regu, course, branch) => {
  try {
    const response = await apiCall(`/api/Student/list?regu=${regu}&course=${encodeURIComponent(course)}&branch=${branch}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Student List API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student list');
    }
  } catch (error) {
    console.error('Error fetching student list:', error);
    throw error;
  }
};

// Get student details by registration number
export const getStudentDetails = async (regNo) => {
  try {
    const response = await apiCall(`/api/Student/${regNo}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Student Details API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student details');
    }
  } catch (error) {
    console.error('Error fetching student details:', error);
    throw error;
  }
};

// Register student (JSON payload)
export const registerStudent = async (studentData) => {
  try {
    const response = await apiCall('/api/Student/register', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });

    if (response.success) {
      console.log('Register Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to register student');
    }
  } catch (error) {
    console.error('Error registering student:', error);
    throw error;
  }
};

// Helper to upload student asset (photo/signature)
const uploadStudentAsset = async (endpoint, formData) => {
  try {
    const token = localStorage.getItem('token');
    const url = `${BASE_URL || ''}${endpoint}`;

    const headers = {
      'Accept': '*/*',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log(`Student asset upload (${endpoint}) response:`, data);
      return data;
    } else {
      throw new Error(data.message || 'Failed to upload student asset');
    }
  } catch (error) {
    console.error(`Error uploading student asset (${endpoint}):`, error);
    throw error;
  }
};

// Upload student photo
export const uploadStudentPhoto = async (regNo, photoFile) => {
  if (!photoFile) {
    return { success: true, message: 'No photo provided' };
  }

  const formData = new FormData();
  formData.append('RegNo', regNo || '');
  formData.append('Photo', photoFile);

  return uploadStudentAsset('/api/Student/upload/photo', formData);
};

// Upload student signature
export const uploadStudentSignature = async (regNo, signatureFile) => {
  if (!signatureFile) {
    return { success: true, message: 'No signature provided' };
  }

  const formData = new FormData();
  formData.append('RegNo', regNo || '');
  formData.append('Signature', signatureFile);

  return uploadStudentAsset('/api/Student/upload/signature', formData);
};

// Inactivate student
export const inactivateStudent = async (regNo, semester, remarks) => {
  try {
    const response = await apiCall('/api/Student/inactivate', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regNo,
        semester,
        remarks
      }),
    });

    if (response.success) {
      console.log('Inactivate Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to inactivate student');
    }
  } catch (error) {
    console.error('Error inactivating student:', error);
    throw error;
  }
};

// Reactivate student
export const reactivateStudent = async (oldRegNo, newRegNo, batch) => {
  try {
    const response = await apiCall('/api/Student/reactivate', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldRegNo,
        newRegNo,
        batch
      }),
    });

    if (response.success) {
      console.log('Reactivate Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to reactivate student');
    }
  } catch (error) {
    console.error('Error reactivating student:', error);
    throw error;
  }
};

// Readmit student
export const readmitStudent = async (regNo, newRegNo, batch, semester) => {
  try {
    const response = await apiCall('/api/Student/readmit', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        RegNo: regNo,
        NewRegNo: newRegNo,
        Batch: batch,
        Semester: semester
      }),
    });

    if (response.success) {
      console.log('Readmit Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to readmit student');
    }
  } catch (error) {
    console.error('Error readmitting student:', error);
    throw error;
  }
};

// Get Revaluation Semesters
export const getRevaluationSemesters = async (course, examMy, regulation) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      course: course || '',
      examMy: examMy || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/Revaluation/sems?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Semesters API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch revaluation semesters');
    }
  } catch (error) {
    console.error('Error fetching revaluation semesters:', error);
    throw error;
  }
};

// Get Revaluation Papers
export const getRevaluationPapers = async (examMy, regNo, sem) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      examMy: examMy || '',
      regno: regNo || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/Revaluation/papers?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch revaluation papers');
    }
  } catch (error) {
    console.error('Error fetching revaluation papers:', error);
    throw error;
  }
};

// Get Revaluation Opted Papers
export const getRevaluationOptedPapers = async (examMy, regNo, sem) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      examMy: examMy || '',
      regno: regNo || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/Revaluation/opted?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Opted Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch revaluation opted papers');
    }
  } catch (error) {
    console.error('Error fetching revaluation opted papers:', error);
    throw error;
  }
};

// Check Revaluation Status (Date/Close Check)
export const checkRevaluationStatus = async (regulation, course, examMy, sem, regNo) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || '',
      examMy: examMy || '',
      sem: sem || '',
      regno: regNo || ''
    }).toString();

    const response = await apiCall(`/api/Revaluation/check-close?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Status API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to check revaluation status');
    }
  } catch (error) {
    console.error('Error checking revaluation status:', error);
    throw error;
  }
};

// Get Revaluation Fee
export const getRevaluationFee = async (regulation, course, examMy, sem, rvType) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || '',
      examMy: examMy || '',
      sem: sem || '',
      rvType: rvType || ''
    }).toString();

    const response = await apiCall(`/api/Revaluation/fee?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Fee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch revaluation fee');
    }
  } catch (error) {
    console.error('Error fetching revaluation fee:', error);
    throw error;
  }
};

// Register Revaluation Paper
export const registerRevaluationPaper = async (regNo, examMy, sem, pCode, registrationType) => {
  try {
    const response = await apiCall('/api/Revaluation/register-paper', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regno: regNo,
        examMy: examMy,
        sem: sem,
        pCode: pCode,
        registrationType: registrationType
      }),
    });

    if (response.success) {
      console.log('Register Revaluation Paper API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to register revaluation paper');
    }
  } catch (error) {
    console.error('Error registering revaluation paper:', error);
    throw error;
  }
};

// Reset Revaluation Papers (Unregister)
export const resetRevaluationPapers = async (regNo, examMy, sem) => {
  try {
    const response = await apiCall('/api/Revaluation/reset-papers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regno: regNo,
        examMy: examMy,
        sem: sem
      }),
    });

    if (response.success) {
      console.log('Reset Revaluation Papers API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to reset revaluation papers');
    }
  } catch (error) {
    console.error('Error resetting revaluation papers:', error);
    throw error;
  }
};

// Pay Revaluation Fee (Generate Receipt)
export const payRevaluationFee = async (exFeePay, appFee, concession) => {
  try {
    const response = await apiCall('/api/Revaluation/fee-pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exFeePay: exFeePay,
        appFee: appFee || 0,
        concession: concession || 0
      }),
    });

    if (response.success) {
      console.log('Pay Revaluation Fee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to pay revaluation fee');
    }
  } catch (error) {
    console.error('Error paying revaluation fee:', error);
    throw error;
  }
};

// Get Revaluation Bundle Data
export const getRevaluationBundleData = async (regulation, examMy, course, userId) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      examMy: examMy || '',
      course: course || '',
      userId: userId || 'admin' // Default to admin if not provided
    }).toString();

    const response = await apiCall(`/api/Revaluation/bundle?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Bundle Data API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch revaluation bundle data');
    }
  } catch (error) {
    console.error('Error fetching revaluation bundle data:', error);
    throw error;
  }
};

// Get Revaluation Receipt Data
export const getRevaluationReceipt = async (receiptNo) => {
  try {
    const response = await apiCall(`/api/Revaluation/receipt?receiptNo=${receiptNo}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Revaluation Receipt API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch revaluation receipt');
    }
  } catch (error) {
    console.error('Error fetching revaluation receipt:', error);
    throw error;
  }
};

// Get student basic information for StudentScreen
export const getStudentScreenInfo = async (regNo) => {
  try {
    const response = await apiCall(`/api/StudentScreen/${encodeURIComponent(regNo)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Student Screen Info API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student information');
    }
  } catch (error) {
    console.error('Error fetching student screen info:', error);
    throw error;
  }
};

// Get maximum semester for student
export const getStudentMaxSem = async (regNo) => {
  try {
    const response = await apiCall(`/api/StudentScreen/${encodeURIComponent(regNo)}/maxsems`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Student Max Sem API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch maximum semester');
    }
  } catch (error) {
    console.error('Error fetching student max sem:', error);
    throw error;
  }
};

// Get student grades/failed courses for StudentScreen
export const getStudentScreenGrades = async (regNo, examMy) => {
  try {
    const response = await apiCall(`/api/StudentScreen/${encodeURIComponent(regNo)}/grades?examMy=${encodeURIComponent(examMy)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Student Screen Grades API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student grades');
    }
  } catch (error) {
    console.error('Error fetching student screen grades:', error);
    throw error;
  }
};

// Get miscellaneous fee items for a student
export const getMiscFeeItems = async (regNo) => {
  try {
    const response = await apiCall(`/api/MiscFee/load?regno=${encodeURIComponent(regNo)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Misc Fee Items API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch miscellaneous fee items');
    }
  } catch (error) {
    console.error('Error fetching miscellaneous fee items:', error);
    throw error;
  }
};

// Save miscellaneous fee payment
export const saveMiscFeePayment = async (paymentData) => {
  try {
    const response = await apiCall('/api/MiscFee/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (response.success) {
      console.log('Save Misc Fee Payment API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save fee payment');
    }
  } catch (error) {
    console.error('Error saving misc fee payment:', error);
    throw error;
  }
};

// Delete miscellaneous fee receipt
export const deleteMiscFeeReceipt = async (receiptNo) => {
  try {
    const response = await apiCall('/api/MiscFee/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receiptNo }),
    });

    if (response.success) {
      console.log('Delete Misc Fee Receipt API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete receipt');
    }
  } catch (error) {
    console.error('Error deleting misc fee receipt:', error);
    throw error;
  }
};

// Export miscellaneous fee data
export const exportMiscFee = async () => {
  try {
    const token = localStorage.getItem('token');
    const url = `${BASE_URL || ''}/api/MiscFee/export`;

    const headers = {
      'Accept': '*/*',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error exporting misc fee data:', error);
    throw error;
  }
};

// Save regular fee structure
export const saveRegularFee = async (feeData) => {
  try {
    const response = await apiCall('/api/Fee/save/regular', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feeData),
    });

    if (response.success) {
      console.log('Save Regular Fee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save regular fee');
    }
  } catch (error) {
    console.error('Error saving regular fee:', error);
    throw error;
  }
};

// Get supplementary fee grid
export const getSupplementaryFeeGrid = async (course, examMy, regulation, type = 'S_FEE') => {
  try {
    const response = await apiCall(`/api/Fee/supply/grid?course=${encodeURIComponent(course)}&examMy=${encodeURIComponent(examMy)}&regulation=${encodeURIComponent(regulation)}&type=${encodeURIComponent(type)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Supplementary Fee Grid API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch supplementary fee grid');
    }
  } catch (error) {
    console.error('Error fetching supplementary fee grid:', error);
    throw error;
  }
};

// Save supplementary fee
export const saveSupplementaryFee = async (feeData) => {
  try {
    const response = await apiCall('/api/Fee/supply/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feeData),
    });

    if (response.success) {
      console.log('Save Supplementary Fee API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save supplementary fee');
    }
  } catch (error) {
    console.error('Error saving supplementary fee:', error);
    throw error;
  }
};

// Save duplicate certificate
export const saveDupCertificate = async (certificateData) => {
  try {
    const response = await apiCall('/api/DupCertificate/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(certificateData),
    });

    if (response.success) {
      console.log('Save Duplicate Certificate API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save duplicate certificate');
    }
  } catch (error) {
    console.error('Error saving duplicate certificate:', error);
    throw error;
  }
};

// Get receipt data
export const getReceiptData = async (receiptNo) => {
  try {
    const response = await apiCall(`/api/DupCertificate/receipt/${encodeURIComponent(receiptNo)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Get Receipt Data API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch receipt data');
    }
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    throw error;
  }
};

// Get receipt list (GET method)
// GET /api/Receipt/list?ExamMy=Apr-2019&Course=B.Tech&FDate=03-03-2019&TDate=05-05-2019
export const getReceiptList = async (examMy, course, fDate, tDate, userId = '') => {
  try {
    const queryParams = new URLSearchParams({
      ExamMy: examMy || '',
      Course: course || '',
      FDate: fDate || '',
      TDate: tDate || ''
      // Note: UserId is optional, not included in the example URL
    }).toString();

    const response = await apiCall(`/api/Receipt/list?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    // Return response even if success is false (no data found is a valid response)
    console.log('Get Receipt List API Response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching receipt list:', error);
    throw error;
  }
};

// Get receipt list (POST method)
// POST /api/Receipt/list
// Body: { "examMy": "Apr-2019", "course": "B.Tech", "fDate": "03-03-2019", "tDate": "05-05-2019", "userId": "" }
export const getReceiptListPost = async (examMy, course, fDate, tDate, userId = '') => {
  try {
    const response = await apiCall('/api/Receipt/list', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        examMy: examMy || '',
        course: course || '',
        fDate: fDate || '',
        tDate: tDate || '',
        userId: userId || ''
      }),
    });

    console.log('Post Receipt List API Response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching receipt list (POST):', error);
    throw error;
  }
};

// Search receipts by registration number (GET method)
// GET /api/Receipt/search?regno=12671A0449
export const searchReceiptByRegNo = async (regNo) => {
  try {
    const response = await apiCall(`/api/Receipt/search?regno=${encodeURIComponent(regNo)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    // Return response even if success is false (so component can handle the message)
    console.log('Search Receipt by RegNo (GET) API Response:', response);
    return response;
  } catch (error) {
    console.error('Error searching receipt by registration number:', error);
    throw error;
  }
};

// Search receipts by registration number (POST method)
// POST /api/Receipt/search
// Body: { "regno": "12671A0449" }
export const searchReceiptByRegNoPost = async (regNo) => {
  try {
    const response = await apiCall('/api/Receipt/search', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regno: regNo || ''
      }),
    });

    console.log('Search Receipt by RegNo (POST) API Response:', response);
    return response;
  } catch (error) {
    console.error('Error searching receipt by registration number (POST):', error);
    throw error;
  }
};

// Get receipt detail by receipt number (GET method)
// GET /api/Receipt/{receiptNo}?course=B.Tech&examMy=Apr-2019
export const getReceiptDetail = async (receiptNo, course, examMy) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMy: examMy || ''
    }).toString();

    const response = await apiCall(`/api/Receipt/${encodeURIComponent(receiptNo)}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    console.log('Get Receipt Detail (GET) API Response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching receipt detail (GET):', error);
    throw error;
  }
};

// Get receipt detail by receipt number (POST method)
// POST /api/Receipt/detail
// Body: { "course": "B.Tech", "examMy": "Apr-2019", "receiptNo": "1602" }
export const getReceiptDetailPost = async (receiptNo, course, examMy) => {
  try {
    const response = await apiCall('/api/Receipt/detail', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course: course || '',
        examMy: examMy || '',
        receiptNo: receiptNo || ''
      }),
    });

    console.log('Get Receipt Detail (POST) API Response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching receipt detail (POST):', error);
    throw error;
  }
};

// Check reg count
export const checkRegCount = async (regNo, sem, examMy, certificateName) => {
  try {
    const response = await apiCall(
      `/api/DupCertificate/check/regcount?regNo=${encodeURIComponent(regNo)}&sem=${sem}&examMy=${encodeURIComponent(examMy)}&certificateName=${encodeURIComponent(certificateName)}`,
      {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      }
    );

    if (response.success !== undefined) {
      return response;
    } else {
      throw new Error(response.message || 'Failed to check reg count');
    }
  } catch (error) {
    console.error('Error checking reg count:', error);
    throw error;
  }
};

// Check receipt count
export const checkReceiptCount = async (receiptNo, regNo, sem, examMy, certificateName) => {
  try {
    const response = await apiCall(
      `/api/DupCertificate/check/receiptcount?receiptNo=${encodeURIComponent(receiptNo)}&regNo=${encodeURIComponent(regNo)}&sem=${sem}&examMy=${encodeURIComponent(examMy)}&certificateName=${encodeURIComponent(certificateName)}`,
      {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      }
    );

    if (response.success !== undefined) {
      return response;
    } else {
      throw new Error(response.message || 'Failed to check receipt count');
    }
  } catch (error) {
    console.error('Error checking receipt count:', error);
    throw error;
  }
};

// Get marks memo data
export const getMarksMemo = async (regulation, examMy, course, semester, rv, branch, regNo, date) => {
  try {
    const queryParams = new URLSearchParams({
      Regulation: regulation || '',
      ExamMy: examMy || '',
      Course: course || '',
      Semester: semester || '',
      RV: rv || 'N',
      Branch: branch || '',
      RegNo: regNo || '',
      Date: date || ''
    }).toString();

    const response = await apiCall(`/api/DupCertificate/marks-memo?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Marks Memo API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch marks memo');
    }
  } catch (error) {
    console.error('Error fetching marks memo:', error);
    throw error;
  }
};

// Get hall ticket data
export const getHallTicket = async (examMy, course, regNo, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      examMy: examMy || '',
      course: course || '',
      regNo: regNo || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/DupCertificate/hallticket?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Hall Ticket API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch hall ticket');
    }
  } catch (error) {
    console.error('Error fetching hall ticket:', error);
    throw error;
  }
};

// Room Allotment API functions
// Get semesters for room allotment
export const getRoomAllotmentSems = async (course) => {
  try {
    const response = await apiCall(`/api/RoomAllotment/sems?course=${encodeURIComponent(course)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Allotment Sems API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch semesters');
    }
  } catch (error) {
    console.error('Error fetching room allotment semesters:', error);
    throw error;
  }
};

// Get sessions for room allotment
export const getRoomAllotmentSessions = async (course, sem, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/sessions?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Allotment Sessions API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch sessions');
    }
  } catch (error) {
    console.error('Error fetching room allotment sessions:', error);
    throw error;
  }
};

// Get exam dates for room allotment
export const getRoomAllotmentExamDates = async (course, sem, examMy, section, regulation, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      examMy: examMy || '',
      section: section || '',
      regulation: regulation || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/examdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Allotment Exam Dates API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch exam dates');
    }
  } catch (error) {
    console.error('Error fetching room allotment exam dates:', error);
    throw error;
  }
};

// Get rooms for room allotment
export const getRoomAllotmentRooms = async (course, session) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      session: session || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/rooms?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Allotment Rooms API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch rooms');
    }
  } catch (error) {
    console.error('Error fetching room allotment rooms:', error);
    throw error;
  }
};

// Get pcodes for room allotment
export const getRoomAllotmentPcodes = async (course, regulation, examMy, examDate, sem, regsup) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || '',
      examMy: examMy || '',
      examDate: examDate || '',
      sem: sem || '',
      regsup: regsup || 'REG'
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/pcodes?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Allotment Pcodes API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch pcodes');
    }
  } catch (error) {
    console.error('Error fetching room allotment pcodes:', error);
    throw error;
  }
};

// Load regnos into room allotment table (returns nothing, just loads data)
// Note: This API loads data into RoomAllotment table, it returns nothing to FE
export const loadRoomAllotmentRegnos = async (course, regulation, examMy, examDate, sem, roomNo, regsup, examType, session, pcode, maxnum) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || '',
      examMy: examMy || '',
      examDate: examDate || '',
      sem: sem || '',
      roomNo: roomNo || '',
      regsup: regsup || 'REG',
      examType: examType || 'External',
      session: session || '',
      pcode: pcode || '',
      maxnum: maxnum || '10'
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/regnos?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    // This API returns nothing, just loads data into table
    // Don't throw error even if response is empty/null
    console.log('Load Room Allotment Regnos API Response:', response);
    return response || { success: true, message: 'Data loaded into table' };
  } catch (error) {
    console.error('Error loading room allotment regnos:', error);
    // Don't throw error, just log it since this API just loads data
    return { success: false, message: error.message || 'Failed to load regnos' };
  }
};

// Get allotted data for display
export const getRoomAllotmentAlloted = async (course, examMy, sem, roomNo, examDate, daySession, regsup, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMy: examMy || '',
      sem: sem || '',
      roomNo: roomNo || '',
      examDate: examDate || '',
      daySession: daySession || '',
      regsup: regsup || 'REG',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/alloted?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Allotment Alloted API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch allotted data');
    }
  } catch (error) {
    console.error('Error fetching room allotment allotted data:', error);
    throw error;
  }
};

// Save room allotment data
export const saveRoomAllotmentData = async (payload) => {
  try {
    const response = await apiCall('/api/RoomAllotment/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success !== undefined) {
      console.log('Save Room Allotment Data API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save room allotment');
    }
  } catch (error) {
    console.error('Error saving room allotment:', error);
    throw error;
  }
};

// Reset room allotment
export const resetRoomAllotment = async (payload) => {
  try {
    const response = await apiCall('/api/RoomAllotment/reset', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success !== undefined) {
      console.log('Reset Room Allotment API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to reset room allotment');
    }
  } catch (error) {
    console.error('Error resetting room allotment:', error);
    throw error;
  }
};

// Export room allotment
export const exportRoomAllotment = async (course, examMy, sem, examDate, daySession, roomNo) => {
  try {
    const token = localStorage.getItem('token');
    const queryParams = new URLSearchParams({
      course: course || '',
      examMy: examMy || '',
      sem: sem || '',
      examDate: examDate || '',
      daySession: daySession || '',
      roomNo: roomNo || ''
    }).toString();

    const url = `${BASE_URL || ''}/api/RoomAllotment/export?${queryParams}`;

    const headers = {
      'Accept': '*/*',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Check if response is JSON (error message)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Guide says: Response is "Array of data objects (convert to Excel on frontend)"
    // Check content type to determine if JSON or blob
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // If JSON, return the data array (frontend will convert to Excel)
      const jsonData = await response.json();
      return jsonData.data || jsonData; // Return data array
    }
    
    // If blob (Excel file), return as blob
    return await response.blob();
  } catch (error) {
    console.error('Error exporting room allotment:', error);
    throw error;
  }
};

// ============================================
// Additional Room Allotment APIs from Guide
// ============================================

// Get room configuration (NOOFROWS, NOOFCOLUMNS) - Step 5
export const getRoomAllotmentRoomConfig = async (roomNo, daySession) => {
  try {
    const queryParams = new URLSearchParams({
      roomNo: roomNo || '',
      daySession: daySession || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/roomconfig?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Room Config API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch room config');
    }
  } catch (error) {
    console.error('Error fetching room config:', error);
    throw error;
  }
};

// Get course groups (branches) for each column's ListBox - Step 5
export const getRoomAllotmentCourseGroups = async (course, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/coursegroups?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Course Groups API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch course groups');
    }
  } catch (error) {
    console.error('Error fetching course groups:', error);
    throw error;
  }
};

// Reset student status to available ('') - Step 7
export const resetRoomAllotmentStudentStatus = async (regno) => {
  try {
    const response = await apiCall(`/api/RoomAllotment/students/resetstatus?regno=${encodeURIComponent(regno)}`, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Reset Student Status API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to reset student status');
    }
  } catch (error) {
    console.error('Error resetting student status:', error);
    throw error;
  }
};

// Load students with row order logic - Step 7 (if Row Order checkbox is checked)
export const getRoomAllotmentStudentsRowOrder = async (rowCount, groups) => {
  try {
    const queryParams = new URLSearchParams({
      rowCount: String(rowCount || 0),
      groups: groups || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/students/roworder?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Students Row Order API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch students with row order');
    }
  } catch (error) {
    console.error('Error fetching students with row order:', error);
    throw error;
  }
};

// Load students from RoomAllotment table - Step 7 (if Row Order checkbox is NOT checked)
export const getRoomAllotmentStudentsRoomAllotment = async (count, groups) => {
  try {
    const queryParams = new URLSearchParams({
      count: String(count || 0),
      groups: groups || ''
    }).toString();

    const response = await apiCall(`/api/RoomAllotment/students/roomallotment?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Students Room Allotment API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch students from room allotment');
    }
  } catch (error) {
    console.error('Error fetching students from room allotment:', error);
    throw error;
  }
};

// Mark student as temporarily allocated ('T') - Step 7
export const markRoomAllotmentStudentAllocated = async (regno) => {
  try {
    const response = await apiCall(`/api/RoomAllotment/students/markallocated?regno=${encodeURIComponent(regno)}`, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Mark Student Allocated API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to mark student as allocated');
    }
  } catch (error) {
    console.error('Error marking student as allocated:', error);
    throw error;
  }
};

// Check if there are unallocated students - Step 8 (optional check before submit)
export const getRoomAllotmentUnallocatedCount = async () => {
  try {
    const response = await apiCall('/api/RoomAllotment/students/unallocated/count', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response !== undefined) {
      console.log('Get Unallocated Count API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch unallocated count');
    }
  } catch (error) {
    console.error('Error fetching unallocated count:', error);
    throw error;
  }
};

// Apply for all dates
export const applyRoomAllotmentForAllDates = async (course, examMy, sem, examType) => {
  try {
    const response = await apiCall('/api/RoomAllotment/applyalldates', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course: course || '',
        examMy: examMy || '',
        sem: sem || '',
        examType: examType || ''
      }),
    });

    if (response.success !== undefined) {
      console.log('Apply Room Allotment For All Dates API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to apply for all dates');
    }
  } catch (error) {
    console.error('Error applying room allotment for all dates:', error);
    throw error;
  }
};

// Condonation Fee API functions
// Get semesters for condonation
export const getCondonationSems = async (course, regulation, examMy, regsup, regno) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || '',
      examMy: examMy || '',
      regsup: regsup || '',
      regno: regno || ''
    }).toString();

    const response = await apiCall(`/api/Condonation/sems?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Condonation Sems API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch semesters');
    }
  } catch (error) {
    console.error('Error fetching condonation semesters:', error);
    throw error;
  }
};

// Get student data for condonation
export const getCondonationStudent = async (regno) => {
  try {
    const response = await apiCall(`/api/Condonation/student?regno=${encodeURIComponent(regno)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Condonation Student API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch student data');
    }
  } catch (error) {
    console.error('Error fetching condonation student:', error);
    throw error;
  }
};

// Get grid data for condonation
export const getCondonationGrid = async (regno, examMy, course, sem) => {
  try {
    const queryParams = new URLSearchParams({
      regno: regno || '',
      examMy: examMy || '',
      course: course || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/Condonation/grid?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Condonation Grid API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch grid data');
    }
  } catch (error) {
    console.error('Error fetching condonation grid:', error);
    throw error;
  }
};

// Check dates for condonation
export const checkCondonationDates = async (regno, examMy, course, regulation, sem) => {
  try {
    const queryParams = new URLSearchParams({
      regno: regno || '',
      examMy: examMy || '',
      course: course || '',
      regulation: regulation || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/Condonation/checkdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Check Condonation Dates API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to check dates');
    }
  } catch (error) {
    console.error('Error checking condonation dates:', error);
    throw error;
  }
};

// Save condonation
export const saveCondonation = async (payload) => {
  try {
    const response = await apiCall('/api/Condonation/save', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.success !== undefined) {
      console.log('Save Condonation API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to save condonation');
    }
  } catch (error) {
    console.error('Error saving condonation:', error);
    throw error;
  }
};

// Delete condonation
export const deleteCondonation = async (id, regno) => {
  try {
    const response = await apiCall('/api/Condonation/delete', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
        regno: regno || ''
      }),
    });

    if (response.success !== undefined) {
      console.log('Delete Condonation API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to delete condonation');
    }
  } catch (error) {
    console.error('Error deleting condonation:', error);
    throw error;
  }
};

// Get format for condonation
export const getCondonationFormat = async () => {
  try {
    const response = await apiCall('/api/Condonation/format', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Get Condonation Format API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to fetch format');
    }
  } catch (error) {
    console.error('Error fetching condonation format:', error);
    throw error;
  }
};

// Export condonation list
export const exportCondonation = async (examMy, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      examMy: examMy || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/Condonation/export?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined) {
      console.log('Export Condonation API Response:', response);
      return response;
    } else {
      throw new Error(response.message || 'Failed to export condonation');
    }
  } catch (error) {
    console.error('Error exporting condonation:', error);
    throw error;
  }
};

// ============================================
// Cancel Receipt APIs
// ============================================

// Get student details for cancel receipt
// Get student data for cancel receipt
// GET /api/CancelReceipt/student?regno=20671A0112
export const getCancelReceiptStudent = async (regno) => {
  try {
    const response = await apiCall(`/api/CancelReceipt/student?regno=${encodeURIComponent(regno)}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success || response.data) {
      console.log('Cancel Receipt Student API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Student not found');
  } catch (error) {
    console.error('Error fetching cancel receipt student:', error);
    throw error;
  }
};

// Get receipt subjects for cancel receipt
// GET /api/CancelReceipt/subjects?regno=23671d2006&examMy=Mar-2025
export const getCancelReceiptSubjects = async (regno, examMy) => {
  try {
    const query = new URLSearchParams({
      regno: regno || '',
      examMy: examMy || ''
    }).toString();
    
    const response = await apiCall(`/api/CancelReceipt/subjects?${query}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    // Return response even if success is false (empty array is a valid response)
    // Component will handle empty arrays and show appropriate message

    return response;
  } catch (error) {
    console.error('Error fetching cancel receipt subjects:', error);
    throw error;
  }
};

// Cancel receipt using POST
// POST /api/CancelReceipt/cancel
// Body: { "receiptNo": "7957", "regNo": "23671d0701", "userId": "EXAM2" }
export const cancelReceiptPost = async (receiptNo, regNo, userId) => {
  try {
    const response = await apiCall('/api/CancelReceipt/cancel', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptNo: receiptNo || '',
        regNo: regNo || '',
        userId: userId || ''
      }),
    });

    if (response.success) {
      console.log('Cancel Receipt POST API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to cancel receipt');
  } catch (error) {
    console.error('Error cancelling receipt (POST):', error);
    throw error;
  }
};

// Cancel receipt using DELETE
// DELETE /api/CancelReceipt/{receiptNo}?regno=21671a7318&userId=EXAM2
export const cancelReceiptDelete = async (receiptNo, regno, userId) => {
  try {
    const query = new URLSearchParams({
      regno: regno || '',
      userId: userId || ''
    }).toString();
    
    const response = await apiCall(`/api/CancelReceipt/${encodeURIComponent(receiptNo)}?${query}`, {
      method: 'DELETE',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success) {
      console.log('Cancel Receipt DELETE API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to cancel receipt');
  } catch (error) {
    console.error('Error cancelling receipt (DELETE):', error);
    throw error;
  }
};

// ============================================
// Consolidated Fee Report APIs
// ============================================

// Get Consolidated Fee Report data
// GET /api/ConsolidatedFeeReport/data?regulation=R20&course=B.Tech&examMY=Feb-2022&fDate=03-03-2025&tDate=05-05-2025
export const getConsolidatedFeeReportData = async (regulation, course, examMY, fDate, tDate) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || '',
      examMY: examMY || '',
      fDate: fDate || '',
      tDate: tDate || ''
    }).toString();

    const response = await apiCall(`/api/ConsolidatedFeeReport/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Consolidated Fee Report Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load consolidated fee report data');
  } catch (error) {
    console.error('Error fetching consolidated fee report data:', error);
    throw error;
  }
};

// Export Consolidated Fee Report
// GET /api/ConsolidatedFeeReport/export?regulation=R20&course=B.Tech&examMY=Feb-2022&fDate=03-03-2025&tDate=05-05-2025
export const exportConsolidatedFeeReport = async (regulation, course, examMY, fDate, tDate) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || '',
      examMY: examMY || '',
      fDate: fDate || '',
      tDate: tDate || ''
    }).toString();

    const response = await apiCall(`/api/ConsolidatedFeeReport/export?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Consolidated Fee Report Export API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to export consolidated fee report');
  } catch (error) {
    console.error('Error exporting consolidated fee report:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const getConsolidatedFeeReport = async (regulation, course, examMy, fDate, tDate) => {
  return await getConsolidatedFeeReportData(regulation, course, examMy, fDate, tDate);
};

// ============================================
// Supply Lab Registered APIs
// ============================================

// Get semesters for Supply Lab Registered
// GET /api/SupplyLabRegistered/semesters?course=B.Tech
export const getSupplyLabSemesters = async (course) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || ''
    }).toString();

    const response = await apiCall(`/api/SupplyLabRegistered/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Supply Lab Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching supply lab semesters:', error);
    throw error;
  }
};

// Get batches for Supply Lab Registered
// GET /api/SupplyLabRegistered/batches
export const getSupplyLabBatches = async () => {
  try {
    const response = await apiCall(`/api/SupplyLabRegistered/batches`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Supply Lab Batches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load batches');
  } catch (error) {
    console.error('Error fetching supply lab batches:', error);
    throw error;
  }
};

// Get Supply Lab Registered data
// GET /api/SupplyLabRegistered/data?course=B.Tech&examMY=Feb-2023&sem=4&regu=R20
export const getSupplyLabData = async (course, examMy, sem, regu) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMy || '',
      sem: sem || '',
      regu: regu || ''
    }).toString();

    const response = await apiCall(`/api/SupplyLabRegistered/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Supply Lab Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load supply lab data');
  } catch (error) {
    console.error('Error fetching supply lab data:', error);
    throw error;
  }
};

// ============================================
// Credits Mismatch APIs
// ============================================

// Get batches for Credits Mismatch
// GET /api/CreditsMismatch/batches?regulation=R20
export const getCreditsMismatchBatches = async (regulation) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/CreditsMismatch/batches?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Credits Mismatch Batches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load batches');
  } catch (error) {
    console.error('Error fetching credits mismatch batches:', error);
    throw error;
  }
};

// Get exam month-years for Credits Mismatch
// GET /api/CreditsMismatch/exammy?course=B.Tech&regulation=R20
export const getCreditsMismatchExamMy = async (course, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/CreditsMismatch/exammy?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Credits Mismatch ExamMy API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam month-years');
  } catch (error) {
    console.error('Error fetching credits mismatch exammy:', error);
    throw error;
  }
};

// Get semesters for Credits Mismatch
// GET /api/CreditsMismatch/semesters?regulation=R20&examMy=Jan-2025
export const getCreditsMismatchSemesters = async (regulation, examMy) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      examMy: examMy || ''
    }).toString();

    const response = await apiCall(`/api/CreditsMismatch/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Credits Mismatch Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching credits mismatch semesters:', error);
    throw error;
  }
};

// Get Credits Mismatch data
// GET /api/CreditsMismatch/data?regulation=R20&examMy=Jan-2025&batch=20&course=B.Tech&sem=4
export const getCreditsMismatchData = async (regulation, examMy, batch, course, sem) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      examMy: examMy || '',
      batch: batch || '',
      course: course || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/CreditsMismatch/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Credits Mismatch Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load credits mismatch data');
  } catch (error) {
    console.error('Error fetching credits mismatch data:', error);
    throw error;
  }
};

// ============================================
// Exam Un Registration APIs
// ============================================

// Load exam unregistration data
// GET /api/ExamUnRegistration/loaddata?regulation=R20&course=B.Tech&examMY=Jan-2023&regno=20671A0225
export const getExamUnRegistrationData = async (regulation, course, examMY, regno) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || '',
      examMY: examMY || '',
      regno: regno || ''
    }).toString();

    const response = await apiCall(`/api/ExamUnRegistration/loaddata?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Exam Un Registration Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam unregistration data');
  } catch (error) {
    console.error('Error fetching exam unregistration data:', error);
    throw error;
  }
};

// Unregister student from exam
// POST /api/ExamUnRegistration/unregister
// Body: { regulation, course, examMY, regno }
export const unregisterExamStudent = async (regulation, course, examMY, regno) => {
  try {
    const response = await apiCall('/api/ExamUnRegistration/unregister', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regulation: regulation || '',
        course: course || '',
        examMY: examMY || '',
        regno: regno || ''
      }),
    });

    if (response.success !== undefined) {
      console.log('Exam Un Registration API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to unregister student');
  } catch (error) {
    console.error('Error unregistering student:', error);
    throw error;
  }
};

// ============================================
// Unblock Registrations APIs
// ============================================

// Get exam month-years for unblock registrations
// GET /api/UnblockRegistrations/exammy
export const getUnblockExamMy = async () => {
  try {
    const response = await apiCall('/api/UnblockRegistrations/exammy', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Unblock ExamMy API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam month-years');
  } catch (error) {
    console.error('Error fetching unblock exammy:', error);
    throw error;
  }
};

// Get blocked students for selected exammy
// GET /api/UnblockRegistrations/blockedstudents?exammy=Feb-2022
export const getBlockedStudents = async (exammy) => {
  try {
    const queryParams = new URLSearchParams({
      exammy: exammy || ''
    }).toString();

    const response = await apiCall(`/api/UnblockRegistrations/blockedstudents?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Blocked Students API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load blocked students');
  } catch (error) {
    console.error('Error fetching blocked students:', error);
    throw error;
  }
};

// Unblock selected students
// POST /api/UnblockRegistrations/unblock
// Body: { exammy: string, regnos: string[] }
export const unblockStudents = async (exammy, regnos) => {
  try {
    const response = await apiCall('/api/UnblockRegistrations/unblock', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exammy: exammy || '',
        regnos: Array.isArray(regnos) ? regnos : []
      }),
    });

    if (response.success !== undefined) {
      console.log('Unblock Students API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to unblock students');
  } catch (error) {
    console.error('Error unblocking students:', error);
    throw error;
  }
};

// ============================================
// Time Table APIs (Report/View)
// ============================================

// Get semesters for time table
// GET /api/TimeTable/semesters?course=B.Tech&examMY=Feb-2022
export const getTimeTableSemesters = async (course, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/TimeTable/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Time Table Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching time table semesters:', error);
    throw error;
  }
};

// Get time table data
// GET /api/TimeTable/data?Course=B.Tech&ExamMY=Feb-2022&Sem=3
export const getTimeTableData = async (course, examMY, sem) => {
  try {
    const queryParams = new URLSearchParams({
      Course: course || '',
      ExamMY: examMY || '',
      Sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/TimeTable/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Time Table Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load time table data');
  } catch (error) {
    console.error('Error fetching time table data:', error);
    throw error;
  }
};

// ============================================
// Hall Ticket APIs
// ============================================

// Get batches for hall tickets
// GET /api/HallTicket/batches?course=B.Tech&regulation=R20
export const getHallTicketBatches = async (course, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/HallTicket/batches?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Hall Ticket Batches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load batches');
  } catch (error) {
    console.error('Error fetching hall ticket batches:', error);
    throw error;
  }
};

// Get branches for hall tickets
// GET /api/HallTicket/branches?course=B.Tech&regulation=R20&batch=21
export const getHallTicketBranches = async (course, regulation, batch) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || '',
      batch: batch || ''
    }).toString();

    const response = await apiCall(`/api/HallTicket/branches?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Hall Ticket Branches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load branches');
  } catch (error) {
    console.error('Error fetching hall ticket branches:', error);
    throw error;
  }
};

// Get semesters for hall tickets
// GET /api/HallTicket/semesters?course=B.Tech&regulation=R20&examMY=feb-2022
export const getHallTicketSemesters = async (course, regulation, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/HallTicket/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Hall Ticket Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching hall ticket semesters:', error);
    throw error;
  }
};

// Prepare hall tickets
// POST /api/HallTicket/prepare
// Body: { examMY, course, regulation, batch, branch, sem, regno, selectionFormula }
export const prepareHallTickets = async (examMY, course, regulation, batch, branch, sem, regno, selectionFormula = '') => {
  try {
    const response = await apiCall('/api/HallTicket/prepare', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        examMY: examMY || '',
        course: course || '',
        regulation: regulation || '',
        batch: batch || '',
        branch: branch || '',
        sem: sem || '',
        regno: regno || '',
        selectionFormula: selectionFormula || ''
      }),
    });

    if (response.success !== undefined) {
      console.log('Prepare Hall Tickets API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to prepare hall tickets');
  } catch (error) {
    console.error('Error preparing hall tickets:', error);
    throw error;
  }
};

// Get hall ticket data
// GET /api/HallTicket/data?ExamMY=Feb-2022&Course=B.Tech&Regulation=R20&Batch=21&Branch=CE&Sem=3&Regno=20671A0575
// All parameters are optional - can filter by ExamMY, Course, Regulation, Batch, Branch, Sem, Regno
export const getHallTicketData = async (examMY, course, regulation, batch, branch, sem, regno) => {
  try {
    // Build query params - only include non-empty values
    const params = {};
    if (examMY) params.ExamMY = examMY;
    if (course) params.Course = course;
    if (regulation) params.Regulation = regulation;
    if (batch) params.Batch = batch;
    if (branch) params.Branch = branch;
    if (sem) params.Sem = sem;
    if (regno) params.Regno = regno;

    const queryParams = new URLSearchParams(params).toString();

    const response = await apiCall(`/api/HallTicket/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Hall Ticket Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load hall ticket data');
  } catch (error) {
    console.error('Error fetching hall ticket data:', error);
    throw error;
  }
};

// ============================================
// Question Paper Statement APIs
// ============================================

// Get semesters for Question Paper Statement
// GET /api/QPStatement/semesters?course=B.Tech&regulation=R20&examMY=Feb-2022
export const getQPStatementSemesters = async (course, regulation, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      regulation: regulation || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/QPStatement/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('QP Statement Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching QP statement semesters:', error);
    throw error;
  }
};

// Get Question Paper Statement data
// GET /api/QPStatement/data?Course=B.Tech&ExamMY=Feb-2022&Regulation=R20&Sem=3
export const getQPStatementData = async (course, examMY, regulation, sem) => {
  try {
    const queryParams = new URLSearchParams({
      Course: course || '',
      ExamMY: examMY || '',
      Regulation: regulation || '',
      Sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/QPStatement/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('QP Statement Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load question paper statement data');
  } catch (error) {
    console.error('Error fetching QP statement data:', error);
    throw error;
  }
};

// ============================================
// OMR Sheet APIs
// ============================================

// Get semesters for OMR Sheet
// GET /api/OMRSheet/semesters?course=B.Tech&examMY=Feb-2022
export const getOMRSheetSemesters = async (course, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/OMRSheet/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('OMR Sheet Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching OMR sheet semesters:', error);
    throw error;
  }
};

// Get exam dates for OMR Sheet
// GET /api/OMRSheet/examdates?course=B.Tech&examMY=Feb-2022&sem=3
export const getOMRSheetExamDates = async (course, examMY, sem) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/OMRSheet/examdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('OMR Sheet Exam Dates API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam dates');
  } catch (error) {
    console.error('Error fetching OMR sheet exam dates:', error);
    throw error;
  }
};

// Get rooms for OMR Sheet
// GET /api/OMRSheet/rooms?course=B.Tech&examMY=May-2024&sem=8&edate=06-05-2024
export const getOMRSheetRooms = async (course, examMY, sem, edate) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || '',
      sem: sem || '',
      edate: edate || ''
    }).toString();

    const response = await apiCall(`/api/OMRSheet/rooms?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('OMR Sheet Rooms API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load rooms');
  } catch (error) {
    console.error('Error fetching OMR sheet rooms:', error);
    throw error;
  }
};

// Get OMR Sheet data
// GET /api/OMRSheet/data?Regulation=R20&Course=B.tech&ExamMY=May-2024&Sem=8
export const getOMRSheetData = async (regulation, course, examMY, sem, edate, room) => {
  try {
    const queryParams = new URLSearchParams({
      Regulation: regulation || '',
      Course: course || '',
      ExamMY: examMY || '',
      Sem: sem || '',
      Edate: edate || '',
      Room: room || ''
    }).toString();

    const response = await apiCall(`/api/OMRSheet/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('OMR Sheet Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load OMR sheet data');
  } catch (error) {
    console.error('Error fetching OMR sheet data:', error);
    throw error;
  }
};

// Generate OMR numbers
// POST /api/OMRSheet/generateomrnumbers
// Body: { regulation, course, examMY, sem, edate, room }
export const generateOMRNumbers = async (regulation, course, examMY, sem, edate, room) => {
  try {
    const response = await apiCall('/api/OMRSheet/generateomrnumbers', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regulation: regulation || '',
        course: course || '',
        examMY: examMY || '',
        sem: sem || '',
        edate: edate || '',
        room: room || ''
      }),
    });

    if (response.success !== undefined) {
      console.log('Generate OMR Numbers API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to generate OMR numbers');
  } catch (error) {
    console.error('Error generating OMR numbers:', error);
    throw error;
  }
};

// Export OMR data
// GET /api/OMRSheet/export?examMY=May-2024&course=B.Tech&regulation=R20
export const exportOMRData = async (examMY, course, regulation) => {
  try {
    const queryParams = new URLSearchParams({
      examMY: examMY || '',
      course: course || '',
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/OMRSheet/export?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('OMR Sheet Export API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to export OMR data');
  } catch (error) {
    console.error('Error exporting OMR data:', error);
    throw error;
  }
};

// ============================================
// Nominal Rolls APIs
// ============================================

// Get semesters for Nominal Rolls
// GET /api/NominalRolls/semesters?course=B.Tech&examMY=Feb-2022
export const getNominalRollsSemesters = async (course, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/NominalRolls/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Nominal Rolls Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching nominal rolls semesters:', error);
    throw error;
  }
};

// Get exam dates for Nominal Rolls
// GET /api/NominalRolls/examdates?course=B.Tech&examMY=Feb-2022&sem=3
export const getNominalRollsExamDates = async (course, examMY, sem) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || '',
      sem: sem || ''
    }).toString();

    const response = await apiCall(`/api/NominalRolls/examdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Nominal Rolls Exam Dates API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam dates');
  } catch (error) {
    console.error('Error fetching nominal rolls exam dates:', error);
    throw error;
  }
};

// Get rooms for Nominal Rolls
// GET /api/NominalRolls/rooms?course=B.Tech&examMY=May-2024&sem=8&edate=06-05-2024
export const getNominalRollsRooms = async (course, examMY, sem, edate) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || '',
      sem: sem || '',
      edate: edate || ''
    }).toString();

    const response = await apiCall(`/api/NominalRolls/rooms?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Nominal Rolls Rooms API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load rooms');
  } catch (error) {
    console.error('Error fetching nominal rolls rooms:', error);
    throw error;
  }
};

// Get Nominal Rolls data
// GET /api/NominalRolls/data?Course=B.Tech&ExamMY=Feb-2022&Regulation=R20&Sem=3&Edate=03-05-2022&IsReadmit=true
export const getNominalRollsData = async (course, examMY, regulation, sem, edate, room, isReadmit) => {
  try {
    const queryParams = new URLSearchParams({
      Course: course || '',
      ExamMY: examMY || '',
      Regulation: regulation || '',
      Sem: sem || '',
      Edate: edate || '',
      Room: room || '',
      IsReadmit: isReadmit === true ? 'true' : (isReadmit === false ? 'false' : '')
    }).toString();

    const response = await apiCall(`/api/NominalRolls/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Nominal Rolls Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load nominal rolls data');
  } catch (error) {
    console.error('Error fetching nominal rolls data:', error);
    throw error;
  }
};

// ============================================
// Cancel Receipt List APIs
// ============================================

// Get courses for Cancel Receipt List
// GET /api/CancelReceiptList/courses?regulation=R20
export const getCancelReceiptListCourses = async (regulation) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || ''
    }).toString();

    const response = await apiCall(`/api/CancelReceiptList/courses?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Cancel Receipt List Courses API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load courses');
  } catch (error) {
    console.error('Error fetching cancel receipt list courses:', error);
    throw error;
  }
};

// Get exam month-years for Cancel Receipt List
// GET /api/CancelReceiptList/exammys?regulation=R20&course=B.Tech
export const getCancelReceiptListExamMYs = async (regulation, course) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || ''
    }).toString();

    const response = await apiCall(`/api/CancelReceiptList/exammys?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Cancel Receipt List ExamMYs API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam month-years');
  } catch (error) {
    console.error('Error fetching cancel receipt list examMYs:', error);
    throw error;
  }
};

// Get Cancel Receipt List data
// GET /api/CancelReceiptList/data?course=B.Tech&examMY=Apr-2025
export const getCancelReceiptListData = async (course, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/CancelReceiptList/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Cancel Receipt List Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load cancel receipt list data');
  } catch (error) {
    console.error('Error fetching cancel receipt list data:', error);
    throw error;
  }
};

// Export Cancel Receipt List data
// GET /api/CancelReceiptList/export?course=B.Tech&examMY=Apr-2025
export const exportCancelReceiptList = async (course, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/CancelReceiptList/export?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Cancel Receipt List Export API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to export cancel receipt list data');
  } catch (error) {
    console.error('Error exporting cancel receipt list data:', error);
    throw error;
  }
};

// ============================================
// ExamFee Collection APIs
// ============================================

// Get ExamFee Collection data
// GET /api/ExamFeeCollection/data?examMY=Apr-2019&course=B.Tech&fDate=03-03-2019&tDate=05-05-2019
export const getExamFeeCollectionData = async (examMY, course, fDate, tDate, userID) => {
  try {
    const queryParams = new URLSearchParams({
      examMY: examMY || '',
      course: course || '',
      fDate: fDate || '',
      tDate: tDate || '',
      userID: userID || ''
    }).toString();

    const response = await apiCall(`/api/ExamFeeCollection/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('ExamFee Collection Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam fee collection data');
  } catch (error) {
    console.error('Error fetching exam fee collection data:', error);
    throw error;
  }
};

// Export ExamFee Collection data
// GET /api/ExamFeeCollection/export?regulation=R20&course=B.Tech&examMY=Apr-2019&fDate=03-03-2019&tDate=05-05-2019
export const exportExamFeeCollection = async (regulation, course, examMY, fDate, tDate) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      course: course || '',
      examMY: examMY || '',
      fDate: fDate || '',
      tDate: tDate || ''
    }).toString();

    const response = await apiCall(`/api/ExamFeeCollection/export?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('ExamFee Collection Export API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to export exam fee collection data');
  } catch (error) {
    console.error('Error exporting exam fee collection data:', error);
    throw error;
  }
};

// ============================================
// Seating Arrangement APIs
// ============================================

// Get semesters for Seating Arrangement
// GET /api/SeatingArrangement/semesters?course=B.Tech
export const getSeatingArrangementSemesters = async (course) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || ''
    }).toString();

    const response = await apiCall(`/api/SeatingArrangement/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Seating Arrangement Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching seating arrangement semesters:', error);
    throw error;
  }
};

// Get sessions for Seating Arrangement
// GET /api/SeatingArrangement/sessions?course=B.Tech&sem=3&examType=External
export const getSeatingArrangementSessions = async (course, sem, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/SeatingArrangement/sessions?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Seating Arrangement Sessions API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load sessions');
  } catch (error) {
    console.error('Error fetching seating arrangement sessions:', error);
    throw error;
  }
};

// Get exam dates for Seating Arrangement
// GET /api/SeatingArrangement/examdates?course=B.Tech&sem=3&session=1&examMY=Feb-2022&examType=External
export const getSeatingArrangementExamDates = async (course, sem, session, examMY, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      session: session || '',
      examMY: examMY || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/SeatingArrangement/examdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Seating Arrangement Exam Dates API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam dates');
  } catch (error) {
    console.error('Error fetching seating arrangement exam dates:', error);
    throw error;
  }
};

// Get rooms for Seating Arrangement
// GET /api/SeatingArrangement/rooms?course=B.Tech&session=1
export const getSeatingArrangementRooms = async (course, session) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      session: session || ''
    }).toString();

    const response = await apiCall(`/api/SeatingArrangement/rooms?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Seating Arrangement Rooms API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load rooms');
  } catch (error) {
    console.error('Error fetching seating arrangement rooms:', error);
    throw error;
  }
};

// Get Seating Arrangement data
// GET /api/SeatingArrangement/data?course=B.Tech&examMY=Dec-2024&sem=3&session=1&edate=12-30-2024&room=M-112&examType=External
export const getSeatingArrangementData = async (course, examMY, sem, session, edate, room, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || '',
      sem: sem || '',
      session: session || '',
      edate: edate || '',
      examType: examType || ''
    });

    // Add room only if provided (optional parameter)
    if (room) {
      queryParams.append('room', room);
    }

    const response = await apiCall(`/api/SeatingArrangement/data?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Seating Arrangement Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load seating arrangement data');
  } catch (error) {
    console.error('Error fetching seating arrangement data:', error);
    throw error;
  }
};

// ============================================
// Mid Hall Tickets APIs
// ============================================

// Prepare/generate mid hall ticket data
// POST /api/MidHallTicket/prepare
export const prepareMidHallTickets = async (request) => {
  try {
    const response = await apiCall('/api/MidHallTicket/prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        examMY: request.examMY || '',
        course: request.course || '',
        regulation: request.regulation || '',
        sem: request.sem || '',
        batch: request.batch || '',
        branch: request.branch || '',
        regno: request.regno || '',
        examType: request.examType || ''
      }),
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Prepare Mid Hall Tickets API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to prepare mid hall tickets');
  } catch (error) {
    console.error('Error preparing mid hall tickets:', error);
    throw error;
  }
};

// Get mid hall ticket data after preparation
// GET /api/MidHallTicket/data?examMY=Feb-2022&course=B.Tech&regulation=R20&sem=3&batch=20&branch=CSE&examType=MID-I
export const getMidHallTicketData = async (params) => {
  try {
    const queryParams = new URLSearchParams({
      examMY: params.examMY || '',
      course: params.course || '',
      regulation: params.regulation || ''
    });

    // Add optional parameters only if they have values
    if (params.sem) queryParams.append('sem', params.sem);
    if (params.batch) queryParams.append('batch', params.batch);
    if (params.branch) queryParams.append('branch', params.branch);
    if (params.regno) queryParams.append('regno', params.regno);
    if (params.examType) queryParams.append('examType', params.examType);

    const response = await apiCall(`/api/MidHallTicket/data?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Get Mid Hall Ticket Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load mid hall ticket data');
  } catch (error) {
    console.error('Error fetching mid hall ticket data:', error);
    throw error;
  }
};

// ============================================
// RoomWise Nominal Rolls APIs
// ============================================

// Helper to ensure exam date is always in yyyy-mm-dd format for RoomWise Nominal Rolls APIs
const formatToYMD = (dateValue) => {
  if (!dateValue) return '';

  // If it's already a Date object, convert directly
  if (dateValue instanceof Date && !isNaN(dateValue)) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dateStr = String(dateValue).trim();

  // If already in yyyy-mm-dd, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to handle dd-mm-yyyy or mm-dd-yyyy (e.g. 18-05-2024 or 05-18-2024)
  const dashParts = dateStr.split('-');
  if (dashParts.length === 3) {
    const [p1, p2, p3] = dashParts;
    if (p3.length === 4 && /^\d{4}$/.test(p3)) {
      const year = p3;
      const month = String(p2).padStart(2, '0');
      const day = String(p1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback: let JS Date try to parse and then format
  const parsed = new Date(dateStr);
  if (!isNaN(parsed)) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // As a last resort, send the original value
  return dateStr;
};

// Get semesters for RoomWise Nominal Rolls
// GET /api/RoomWiseNominalRolls/semesters?course=B.Tech&examMY=May-2024
export const getRoomWiseNominalRollsSemesters = async (course, examMY) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      examMY: examMY || ''
    }).toString();

    const response = await apiCall(`/api/RoomWiseNominalRolls/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('RoomWise Nominal Rolls Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching roomwise nominal rolls semesters:', error);
    throw error;
  }
};

// Get exam dates for RoomWise Nominal Rolls
// GET /api/RoomWiseNominalRolls/examdates?course=B.Tech&sem=7&examMY=May-2024&regulation=R20&examType=External
export const getRoomWiseNominalRollsExamDates = async (course, sem, examMY, regulation, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      examMY: examMY || '',
      regulation: regulation || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomWiseNominalRolls/examdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('RoomWise Nominal Rolls Exam Dates API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam dates');
  } catch (error) {
    console.error('Error fetching roomwise nominal rolls exam dates:', error);
    throw error;
  }
};

// Get branches for RoomWise Nominal Rolls
// GET /api/RoomWiseNominalRolls/branches?course=B.Tech&sem=7&examMY=May-2024&regulation=R20&edate=18-05-2024&examType=External
export const getRoomWiseNominalRollsBranches = async (course, sem, examMY, regulation, edate, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      examMY: examMY || '',
      regulation: regulation || '',
      edate: edate ? formatToYMD(edate) : '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomWiseNominalRolls/branches?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('RoomWise Nominal Rolls Branches API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load branches');
  } catch (error) {
    console.error('Error fetching roomwise nominal rolls branches:', error);
    throw error;
  }
};

// Get RoomWise Nominal Rolls data
// GET /api/RoomWiseNominalRolls/data?course=B.Tech&examMY=May-2024&regulation=R20&examType=External&sem=7&edate=05-18-2024&branch=CSE
export const getRoomWiseNominalRollsData = async (params) => {
  try {
    const queryParams = new URLSearchParams({
      course: params.course || '',
      examMY: params.examMY || '',
      regulation: params.regulation || '',
      examType: params.examType || ''
    });

    // Add optional parameters only if they have values
    if (params.sem) queryParams.append('sem', params.sem);
    if (params.edate) queryParams.append('edate', formatToYMD(params.edate));
    if (params.branch) queryParams.append('branch', params.branch);

    const response = await apiCall(`/api/RoomWiseNominalRolls/data?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('RoomWise Nominal Rolls Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load roomwise nominal rolls data');
  } catch (error) {
    console.error('Error fetching roomwise nominal rolls data:', error);
    throw error;
  }
};

// ============================================
// Room Abstract APIs
// ============================================

// Get semesters for Room Abstract
// GET /api/RoomAbstract/semesters?course=B.Tech
export const getRoomAbstractSemesters = async (course) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || ''
    }).toString();

    const response = await apiCall(`/api/RoomAbstract/semesters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Room Abstract Semesters API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load semesters');
  } catch (error) {
    console.error('Error fetching room abstract semesters:', error);
    throw error;
  }
};

// Get sessions for Room Abstract
// GET /api/RoomAbstract/sessions?course=B.Tech&sem=3&examType=External
export const getRoomAbstractSessions = async (course, sem, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomAbstract/sessions?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Room Abstract Sessions API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load sessions');
  } catch (error) {
    console.error('Error fetching room abstract sessions:', error);
    throw error;
  }
};

// Get exam dates for Room Abstract
// GET /api/RoomAbstract/examdates?course=B.Tech&sem=3&session=1&examMY=Feb-2022&examType=External
export const getRoomAbstractExamDates = async (course, sem, session, examMY, examType) => {
  try {
    const queryParams = new URLSearchParams({
      course: course || '',
      sem: sem || '',
      session: session || '',
      examMY: examMY || '',
      examType: examType || ''
    }).toString();

    const response = await apiCall(`/api/RoomAbstract/examdates?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Room Abstract Exam Dates API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load exam dates');
  } catch (error) {
    console.error('Error fetching room abstract exam dates:', error);
    throw error;
  }
};

// Get Room Abstract data
// GET /api/RoomAbstract/data?course=B.Tech&examMY=May-2024&sem=8&session=1&edate=05-06-2024&examType=External&regsup=1
export const getRoomAbstractData = async (params) => {
  try {
    const queryParams = new URLSearchParams({
      course: params.course || '',
      examMY: params.examMY || '',
      sem: params.sem || '',
      session: params.session || '',
      edate: params.edate || '',
      examType: params.examType || '',
      regsup: params.regsup || ''
    }).toString();

    const response = await apiCall(`/api/RoomAbstract/data?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('Room Abstract Data API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load room abstract data');
  } catch (error) {
    console.error('Error fetching room abstract data:', error);
    throw error;
  }
};

// ============================================
// Absentees Entry (Theory) APIs
// ============================================

// Load AbsenteesEntry papers for selected sem / branch
// GET /api/AbsenteesEntry/papers?regulation=R20&examMY=Dec-2023&sem=7&course=B.TECH&grp=CE
export const getAbsenteesPapers = async (regulation, examMY, sem, course, grp) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      examMY: examMY || '',
      sem: sem || '',
      course: course || '',
      grp: grp || ''
    }).toString();

    const response = await apiCall(`/api/AbsenteesEntry/papers?${queryParams}`, {
      method: 'GET',
      headers: {
        Accept: '*/*'
      }
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('AbsenteesEntry Papers API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load absentees papers');
  } catch (error) {
    console.error('Error fetching absentees papers:', error);
    throw error;
  }
};

// Load AbsenteesEntry students for selected paper
// GET /api/AbsenteesEntry/students?regulation=R20&examMY=Dec-2023&sem=7&course=B.TECH&grp=CE&pCode=J410A
export const getAbsenteesStudents = async (regulation, examMY, sem, course, grp, pCode) => {
  try {
    const queryParams = new URLSearchParams({
      regulation: regulation || '',
      examMY: examMY || '',
      sem: sem || '',
      course: course || '',
      grp: grp || '',
      pCode: pCode || ''
    }).toString();

    const response = await apiCall(`/api/AbsenteesEntry/students?${queryParams}`, {
      method: 'GET',
      headers: {
        Accept: '*/*'
      }
    });

    if (response.success !== undefined || response.data !== undefined) {
      console.log('AbsenteesEntry Students API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to load absentees students');
  } catch (error) {
    console.error('Error fetching absentees students:', error);
    throw error;
  }
};

// Save absentee code (AB / MP) for a single student
// POST /api/AbsenteesEntry/save  → { ASHID, Code }
export const saveAbsenteesEntry = async (ashid, code) => {
  try {
    const payload = {
      ASHID: ashid,
      Code: code
    };

    const response = await apiCall('/api/AbsenteesEntry/save', {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.success !== undefined) {
      console.log('AbsenteesEntry Save API Response:', response);
      return response;
    }

    throw new Error(response.message || 'Failed to save absentee entry');
  } catch (error) {
    console.error('Error saving absentee entry:', error);
    throw error;
  }
};

// ============================================
// Mid Absentees Entry (MidAbsenteesEntry)
// GET /api/MidAbsenteesEntry/papers?regulation=&examMY=&sem=&course=&grp=
// GET /api/MidAbsenteesEntry/students?...&pCode=&examType=  (examType 1=MID-I, 2=MID-II)
// POST /api/MidAbsenteesEntry/save — body: { ashid, code, examType }
// ============================================

// GET /api/MidAbsenteesEntry/papers
export const getMidAbsenteesPapers = async (regulation, examMY, sem, course, grp) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (grp != null && String(grp).trim() !== '') params.set('grp', String(grp).trim());

  const response = await apiCall(`/api/MidAbsenteesEntry/papers?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/MidAbsenteesEntry/students (examType: "1" = MID-I, "2" = MID-II)
export const getMidAbsenteesStudents = async (regulation, examMY, sem, course, grp, pCode, examType) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (grp != null && String(grp).trim() !== '') params.set('grp', String(grp).trim());
  if (pCode != null && String(pCode).trim() !== '') params.set('pCode', String(pCode).trim());
  if (examType != null && String(examType).trim() !== '') params.set('examType', String(examType).trim());

  const response = await apiCall(`/api/MidAbsenteesEntry/students?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// POST /api/MidAbsenteesEntry/save — body: { ashid, code ("AB"|"MP"), examType ("1"|"2") }
export const saveMidAbsenteesEntry = async (ashid, code, examType) => {
  const payload = {
    ashid: Number(ashid),
    code: String(code || '').trim().toUpperCase(),
    examType: String(examType === 1 || examType === 2 ? examType : examType ?? '').toString(),
  };
  if (payload.code !== 'AB' && payload.code !== 'MP') {
    throw new Error("Code must be 'AB' or 'MP'");
  }
  if (payload.examType !== '1' && payload.examType !== '2') {
    throw new Error("ExamType must be '1' (MID-I) or '2' (MID-II)");
  }
  const response = await apiCall('/api/MidAbsenteesEntry/save', {
    method: 'POST',
    headers: { Accept: '*/*', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
};

// ============================================
// Internal Checklist (InternalChecklist)
// GET /api/InternalChecklist/report?course=&examMY=&regulation=&regu=&grp=&sem=
// GET /api/InternalChecklist/semesters?course=&regulation=  (regulation = 2-char regu e.g. "20")
// GET /api/InternalChecklist/branches?course=&regulation=
// ============================================

// GET /api/InternalChecklist/report
export const getInternalChecklistReport = async (course, examMY, regulation, regu, grp, sem) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (regu != null && String(regu).trim() !== '') params.set('regu', String(regu).trim());
  if (grp != null && String(grp).trim() !== '') params.set('grp', String(grp).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/InternalChecklist/report?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/InternalChecklist/semesters (regulation = 2-char regu e.g. "20")
export const getInternalChecklistSemesters = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());

  const response = await apiCall(`/api/InternalChecklist/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/InternalChecklist/branches (regulation = 2-char regu e.g. "20")
export const getInternalChecklistBranches = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());

  const response = await apiCall(`/api/InternalChecklist/branches?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Practical Checklist (PracticalChecklist)
// Same shape as InternalChecklist endpoints
// GET /api/PracticalChecklist/report?course=&examMY=&regulation=&regu=&grp=&sem=
// GET /api/PracticalChecklist/semesters?course=&regulation=
// GET /api/PracticalChecklist/branches?course=&regulation=
// ============================================

// GET /api/PracticalChecklist/report
export const getPracticalChecklistReport = async (course, examMY, regulation, regu, grp, sem) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (regu != null && String(regu).trim() !== '') params.set('regu', String(regu).trim());
  if (grp != null && String(grp).trim() !== '') params.set('grp', String(grp).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/PracticalChecklist/report?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/PracticalChecklist/semesters (regulation = 2-char regu e.g. "20")
export const getPracticalChecklistSemesters = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());

  const response = await apiCall(`/api/PracticalChecklist/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/PracticalChecklist/branches (regulation = 2-char regu e.g. "20")
export const getPracticalChecklistBranches = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());

  const response = await apiCall(`/api/PracticalChecklist/branches?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// D Form (DForm) — Post Exam-Reports
// GET /api/DForm/report?regulation=&course=&examMY=&sem=&eDate=&isReadmit=
// GET /api/DForm/semesters?course=&regulation=
// GET /api/DForm/edates?course=&examMY=&sem=
// ============================================

// GET /api/DForm/report
export const getDFormReport = async (regulation, course, examMY, sem, eDate, isReadmit = false) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (eDate != null && String(eDate).trim() !== '') params.set('eDate', String(eDate).trim());
  if (isReadmit != null) params.set('isReadmit', String(!!isReadmit));

  const response = await apiCall(`/api/DForm/report?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/DForm/semesters
export const getDFormSemesters = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());

  const response = await apiCall(`/api/DForm/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/DForm/edates
export const getDFormEDates = async (course, examMY, sem) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/DForm/edates?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Absentees List (AbsenteesList) — Theory
// GET /api/AbsenteesList/semesters?course=
// GET /api/AbsenteesList/edates?course=&examMY=&sem=
// GET /api/AbsenteesList/report?regulation=&course=&examMY=&sem=&eDate=
// ============================================

// GET /api/AbsenteesList/semesters
export const getAbsenteesListSemesters = async (course) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());

  const response = await apiCall(`/api/AbsenteesList/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/AbsenteesList/edates
export const getAbsenteesListEDates = async (course, examMY, sem) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/AbsenteesList/edates?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// GET /api/AbsenteesList/report
export const getAbsenteesListReport = async (regulation, course, examMY, sem, eDate) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (eDate != null && String(eDate).trim() !== '') params.set('eDate', String(eDate).trim());

  const response = await apiCall(`/api/AbsenteesList/report?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Student Wise Present List (StudentWisePresentList)
// GET /api/StudentWisePresentList/semesters?course=&regulation=&examMY=
// GET /api/StudentWisePresentList/report?course=&regulation=&examMY=&sem=&regsup=
// ============================================

export const getStudentWisePresentListSemesters = async (course, regulation, examMY) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  const response = await apiCall(`/api/StudentWisePresentList/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getStudentWisePresentListReport = async (course, regulation, examMY, sem, regsup) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (regsup != null && String(regsup).trim() !== '') params.set('regsup', String(regsup).trim());
  const response = await apiCall(`/api/StudentWisePresentList/report?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// D Form Mid (DFormMid)
// GET /api/DFormMid/semesters?course=&regulation=&examMY=
// GET /api/DFormMid/edates?course=&regulation=&examMY=&sem=&examType=  (examType 1=Mid1, 2=Mid2)
// GET /api/DFormMid/report?regulation=&course=&examMY=&sem=&eDate=&examType=&isReadmit=
// ============================================

export const getDFormMidSemesters = async (course, regulation, examMY) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  const response = await apiCall(`/api/DFormMid/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getDFormMidEDates = async (course, regulation, examMY, sem, examType) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (examType != null && String(examType).trim() !== '') params.set('examType', String(examType).trim());
  const response = await apiCall(`/api/DFormMid/edates?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getDFormMidReport = async (regulation, course, examMY, sem, eDate, examType, isReadmit = false) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());
  if (sem != null && sem !== '') params.set('sem', String(sem));
  if (eDate != null && String(eDate).trim() !== '') params.set('eDate', String(eDate).trim());
  if (examType != null && String(examType).trim() !== '') params.set('examType', String(examType).trim());
  params.set('isReadmit', isReadmit === true ? 'true' : 'false');
  const response = await apiCall(`/api/DFormMid/report?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Schema Structure (SchemaStructure) — Evaluation
// GET /api/SchemaStructure/schemas?course=&regulation=&sem=
// GET /api/SchemaStructure/check?schemaName=
// GET /api/SchemaStructure/load-edit?schemaName=
// GET /api/SchemaStructure/load?schemaName=
// POST /api/SchemaStructure/save
// DELETE /api/SchemaStructure?schemaName=
// ============================================

export const getSchemaStructureSchemas = async (course, regulation, sem) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/SchemaStructure/schemas?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const checkSchemaStructureName = async (schemaName) => {
  const params = new URLSearchParams();
  if (schemaName != null && String(schemaName).trim() !== '') params.set('schemaName', String(schemaName).trim());

  const response = await apiCall(`/api/SchemaStructure/check?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const loadSchemaStructureForEdit = async (schemaName) => {
  const params = new URLSearchParams();
  if (schemaName != null && String(schemaName).trim() !== '') params.set('schemaName', String(schemaName).trim());

  const response = await apiCall(`/api/SchemaStructure/load-edit?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const loadSchemaStructure = async (schemaName) => {
  const params = new URLSearchParams();
  if (schemaName != null && String(schemaName).trim() !== '') params.set('schemaName', String(schemaName).trim());

  const response = await apiCall(`/api/SchemaStructure/load?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const saveSchemaStructure = async (payload) => {
  const body = payload || {};
  const response = await apiCall('/api/SchemaStructure/save', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response;
};

export const deleteSchemaStructure = async (schemaName) => {
  const params = new URLSearchParams();
  if (schemaName != null && String(schemaName).trim() !== '') params.set('schemaName', String(schemaName).trim());

  const response = await apiCall(`/api/SchemaStructure?${params.toString()}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Apply Schema (ApplySchema) — Evaluation
// GET  /api/ApplySchema/semesters?course=&regulation=&examMY=
// GET  /api/ApplySchema/papers?course=&regulation=&sem=&examMY=
// GET  /api/ApplySchema/assigned?schemaName=&course=&regulation=&sem=
// POST /api/ApplySchema/save
// DELETE /api/ApplySchema?schemaName=&papCode=
// ============================================

export const getApplySchemaSemesters = async (course, regulation, examMY) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());

  const response = await apiCall(`/api/ApplySchema/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getApplySchemaPapers = async (course, regulation, sem, examMY) => {
  const params = new URLSearchParams();
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());

  const response = await apiCall(`/api/ApplySchema/papers?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getApplySchemaAssigned = async (schemaName, course, regulation, sem) => {
  const params = new URLSearchParams();
  if (schemaName != null && String(schemaName).trim() !== '') params.set('schemaName', String(schemaName).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/ApplySchema/assigned?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const saveApplySchema = async (payload) => {
  const body = payload || {};
  const response = await apiCall('/api/ApplySchema/save', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response;
};

export const deleteApplySchema = async (regulation, course, examMY, papCode, sem) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (course    != null && String(course).trim()    !== '') params.set('course',     String(course).trim());
  if (examMY    != null && String(examMY).trim()    !== '') params.set('examMY',     String(examMY).trim());
  if (papCode   != null && String(papCode).trim()   !== '') params.set('papCode',    String(papCode).trim());
  if (sem       != null && String(sem).trim()       !== '') params.set('sem',        String(sem).trim());

  const response = await apiCall(`/api/ApplySchema?${params.toString()}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return response;
};

// ============================================
// Evaluator Registration (EvaluatorRegistration) — Evaluation
// GET  /api/EvaluatorRegistration/list?userGroup=
// GET  /api/EvaluatorRegistration/dropdown
// GET  /api/EvaluatorRegistration/user-details?userId=
// GET  /api/EvaluatorRegistration/next-userid?userGroup=
// GET  /api/EvaluatorRegistration/user-papers?userId=
// GET  /api/EvaluatorRegistration/departments?regulation=&course=&examMY=
// POST /api/EvaluatorRegistration/save
// ============================================

export const getEvaluatorRegistrationList = async (userGroup) => {
  const params = new URLSearchParams();
  if (userGroup != null && String(userGroup).trim() !== '') params.set('userGroup', String(userGroup).trim());

  const response = await apiCall(`/api/EvaluatorRegistration/list?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getEvaluatorRegistrationDropdown = async () => {
  const response = await apiCall('/api/EvaluatorRegistration/dropdown', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getEvaluatorUserDetails = async (userId) => {
  const params = new URLSearchParams();
  if (userId != null && String(userId).trim() !== '') params.set('userId', String(userId).trim());

  const response = await apiCall(`/api/EvaluatorRegistration/user-details?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getEvaluatorNextUserId = async (userGroup) => {
  const params = new URLSearchParams();
  if (userGroup != null && String(userGroup).trim() !== '') params.set('userGroup', String(userGroup).trim());

  const response = await apiCall(`/api/EvaluatorRegistration/next-userid?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getEvaluatorUserPapers = async (userId) => {
  const params = new URLSearchParams();
  if (userId != null && String(userId).trim() !== '') params.set('userId', String(userId).trim());

  const response = await apiCall(`/api/EvaluatorRegistration/user-papers?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getEvaluatorDepartments = async (regulation, course, examMY) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (course != null && String(course).trim() !== '') params.set('course', String(course).trim());
  if (examMY != null && String(examMY).trim() !== '') params.set('examMY', String(examMY).trim());

  const response = await apiCall(`/api/EvaluatorRegistration/departments?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const saveEvaluatorRegistration = async (payload) => {
  const body = payload || {};
  const response = await apiCall('/api/EvaluatorRegistration/save', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response;
};

// ============================================
// Scripts Assign (ScriptsAssign) — Evaluation
// GET  /api/ScriptsAssign/pending-count
// GET  /api/ScriptsAssign/subjects?userId=
// GET  /api/ScriptsAssign/semesters?evaluatorId=&papCode=
// GET  /api/ScriptsAssign/bundles?papCode=&sem=
// GET  /api/ScriptsAssign/scripts?papCode=&sem=&bundleNo=
// POST /api/ScriptsAssign/save  (multipart/form-data)
// ============================================

export const getScriptsAssignPendingCount = async () => {
  const response = await apiCall('/api/ScriptsAssign/pending-count', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getScriptsAssignSubjects = async (userId) => {
  const params = new URLSearchParams();
  if (userId != null && String(userId).trim() !== '') params.set('userId', String(userId).trim());

  const response = await apiCall(`/api/ScriptsAssign/subjects?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getScriptsAssignSemesters = async (regulation, papCode) => {
  const params = new URLSearchParams();
  if (regulation != null && String(regulation).trim() !== '') params.set('regulation', String(regulation).trim());
  if (papCode != null && String(papCode).trim() !== '') params.set('papCode', String(papCode).trim());

  const response = await apiCall(`/api/ScriptsAssign/semesters?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getScriptsAssignBundles = async (papCode, sem) => {
  const params = new URLSearchParams();
  if (papCode != null && String(papCode).trim() !== '') params.set('papCode', String(papCode).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());

  const response = await apiCall(`/api/ScriptsAssign/bundles?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const getScriptsAssignScripts = async (papCode, sem, bundleNo) => {
  const params = new URLSearchParams();
  if (papCode != null && String(papCode).trim() !== '') params.set('papCode', String(papCode).trim());
  if (sem != null && String(sem).trim() !== '') params.set('sem', String(sem).trim());
  if (bundleNo != null && String(bundleNo).trim() !== '') params.set('bundleNo', String(bundleNo).trim());

  const response = await apiCall(`/api/ScriptsAssign/scripts?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return response;
};

export const saveScriptsAssign = async ({
  evaluatorId,
  papCode,
  sem,
  evalDate,
  bundleNos,
  scriptIds,
  qpFile,
  keyFile,
}) => {
  const formData = new FormData();
  formData.append('evaluatorId', String(evaluatorId ?? '').trim());
  formData.append('papCode', String(papCode ?? '').trim());
  formData.append('sem', String(sem ?? '').trim());
  formData.append('evalDate', String(evalDate ?? '').trim());
  formData.append('bundleNos', (bundleNos || []).join(','));
  formData.append('scriptIds', (scriptIds || []).join(','));
  if (qpFile) formData.append('qpFile', qpFile);
  if (keyFile) formData.append('keyFile', keyFile);

  const response = await apiCall('/api/ScriptsAssign/save', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });
  return response;
};

// ============================================
// StudentResult
// GET /api/StudentResult/details?regNo=
// GET /api/StudentResult/sgpacgpa?regNo=
// GET /api/StudentResult/passed?regNo=&exammy=&con=true
// GET /api/StudentResult/failed?regNo=&exammy=&con=true
// GET /api/StudentResult/all?regNo=&examMY=
// ============================================

export const getStudentResultDetails = async (regNo) => {
  return apiCall(`/api/StudentResult/details?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentResultSgpaCgpa = async (regNo) => {
  return apiCall(`/api/StudentResult/sgpacgpa?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentResultPassed = async (regNo, exammy, con = 'true') => {
  const params = new URLSearchParams();
  params.set('regNo', regNo);
  if (exammy) params.set('exammy', exammy);
  params.set('con', con);
  return apiCall(`/api/StudentResult/passed?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentResultFailed = async (regNo, exammy, con = 'true') => {
  const params = new URLSearchParams();
  params.set('regNo', regNo);
  if (exammy) params.set('exammy', exammy);
  params.set('con', con);
  return apiCall(`/api/StudentResult/failed?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentResultAll = async (regNo, examMY) => {
  const params = new URLSearchParams();
  params.set('regNo', regNo);
  if (examMY) params.set('examMY', examMY);
  return apiCall(`/api/StudentResult/all?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// ============================================
// Topper (ToppersList)
// GET /api/Topper/batch?course=
// GET /api/Topper/maxsem?regu=           (regu = batch number e.g. '20')
// GET /api/Topper/list?regulation=&course=&regu=&sem=&exammy=&rank=&branch=N&caste=N&gender=N&rv=Y
// GET /api/Topper/semwise?regulation=&course=&regu=&sem=&exammy=&rank=&branch=N&caste=N&gender=N&rv=Y
// ============================================

export const getTopperBatch = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/Topper/batch?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getTopperMaxSem = async (regu) => {
  const params = new URLSearchParams();
  if (regu) params.set('regu', regu);
  return apiCall(`/api/Topper/maxsem?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getTopperList = async (regulation, course, regu, sem, exammy, rank, branch = 'N', caste = 'N', gender = 'N', rv = 'Y') => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  if (exammy) params.set('exammy', exammy);
  if (rank) params.set('rank', rank);
  params.set('branch', branch);
  params.set('caste', caste);
  params.set('gender', gender);
  params.set('rv', rv);
  return apiCall(`/api/Topper/list?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getTopperSemwise = async (regulation, course, regu, sem, exammy, rank, branch = 'N', caste = 'N', gender = 'N', rv = 'Y') => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  if (exammy) params.set('exammy', exammy);
  if (rank) params.set('rank', rank);
  params.set('branch', branch);
  params.set('caste', caste);
  params.set('gender', gender);
  params.set('rv', rv);
  return apiCall(`/api/Topper/semwise?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// ============================================
// BackLogsList
// GET /api/BackLogsList/exammy?regulation=&course=
// GET /api/BackLogsList/batch?course=
// GET /api/BackLogsList/list?course=&regu=&examMY=&semFrom=&semTo=&noOfBackLogs=&op=
// GET /api/BackLogsList/regno/data?course=&examMY=&regu=
// GET /api/BackLogsList/regno/count?course=&examMY=&regu=
// ============================================

export const getBackLogsListExammy = async (regulation, course) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  return apiCall(`/api/BackLogsList/exammy?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getBackLogsListBatch = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/BackLogsList/batch?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getBackLogsList = async (course, regu, examMY, semFrom, semTo, noOfBackLogs, op) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (examMY) params.set('examMY', examMY);
  if (semFrom) params.set('semFrom', semFrom);
  if (semTo) params.set('semTo', semTo);
  if (noOfBackLogs) params.set('noOfBackLogs', noOfBackLogs);
  params.set('op', op || '=');
  return apiCall(`/api/BackLogsList/list?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getBackLogsListRegnoData = async (course, examMY, regu, regulation) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/BackLogsList/regno/data?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getBackLogsListRegnoCount = async (course, examMY, regu, regulation) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/BackLogsList/regno/count?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// ============================================
// ReAdmission
// GET    /api/ReAdmission/details?regNo=
// GET    /api/ReAdmission/history?regNo=
// GET    /api/ReAdmission/papertypes           (no params)
// GET    /api/ReAdmission/marks?ashId=
// GET    /api/ReAdmission/paperdetails?pCode=
// PUT    /api/ReAdmission/marks  body: { ashId, pCode, pName, regulation, see, tMarks, mMarks, rvMarks, sMarks, pMarks, entryType, credits, sgpaCr, tMax, tPass, sMax, sPass, pMax, pPass, maxMrk, pass }
// DELETE /api/ReAdmission/{ashId}
// ============================================

export const getReAdmissionDetails = async (regNo) => {
  return apiCall(`/api/ReAdmission/details?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getReAdmissionHistory = async (regNo) => {
  return apiCall(`/api/ReAdmission/history?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getReAdmissionPaperTypes = async () => {
  return apiCall('/api/ReAdmission/papertypes', {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getReAdmissionMarks = async (ashId) => {
  return apiCall(`/api/ReAdmission/marks?ashId=${encodeURIComponent(ashId)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getReAdmissionPaperDetails = async (pCode, regulation, sem) => {
  return apiCall(`/api/ReAdmission/paperdetails?pCode=${encodeURIComponent(pCode)}&regulation=${encodeURIComponent(regulation ?? '')}&sem=${encodeURIComponent(sem ?? '')}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const updateReAdmissionMarks = async (payload) => {
  return apiCall('/api/ReAdmission/marks', {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const deleteReAdmission = async (ashId) => {
  return apiCall(`/api/ReAdmission/${encodeURIComponent(ashId)}`, {
    method: 'DELETE', headers: { Accept: 'application/json' },
  });
};

// ============================================
// StudentHistory
// GET    /api/StudentHistory/details?regNo=
// GET    /api/StudentHistory/sgpacgpa?regNo=
// GET    /api/StudentHistory/history?regNo=
// GET    /api/StudentHistory/marks?ashId=
// GET    /api/StudentHistory/maxexammy?regNo=
// PUT    /api/StudentHistory/marks  body: { ashId, pName, sMarks, tMarks, mMarks, rvMarks, v3, pMarks }
// DELETE /api/StudentHistory/{ashId}
// ============================================

export const getStudentHistoryDetails = async (regNo) => {
  return apiCall(`/api/StudentHistory/details?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentHistorySgpaCgpa = async (regNo) => {
  return apiCall(`/api/StudentHistory/sgpacgpa?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentHistoryHistory = async (regNo) => {
  return apiCall(`/api/StudentHistory/history?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentHistoryMarks = async (ashId) => {
  return apiCall(`/api/StudentHistory/marks?ashId=${encodeURIComponent(ashId)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const getStudentHistoryMaxExammy = async (regNo) => {
  return apiCall(`/api/StudentHistory/maxexammy?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

export const updateStudentHistoryMarks = async (payload) => {
  return apiCall('/api/StudentHistory/marks', {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const deleteStudentHistory = async (ashId) => {
  return apiCall(`/api/StudentHistory/${encodeURIComponent(ashId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
};

// ============================================
// Moderation
// GET  /api/Moderation/batch?course=
// GET  /api/Moderation/branch?course=&examMy=&sem=
// GET  /api/Moderation/papers?course=&sem=
// GET  /api/Moderation/data?course=&examMy=&regu=&sem=&grp=&papCode=
// POST /api/Moderation/save
// ============================================

export const getModerationBatch = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/Moderation/batch?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getModerationBranch = async (course, examMy, sem) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMy) params.set('examMy', examMy);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/Moderation/branch?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getModerationPapers = async (course, sem) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/Moderation/papers?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getModerationData = async (course, examMy, regu, sem, grp, papCode) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMy) params.set('examMy', examMy);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  if (grp) params.set('grp', grp);
  if (papCode) params.set('papCode', papCode);
  return apiCall(`/api/Moderation/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const saveModerationData = async (payload) => {
  return apiCall('/api/Moderation/save', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

// ============================================
// PendingList
// GET /api/PendingList/internal?examMy=&course=&regulation=
// GET /api/PendingList/practical?examMy=&course=&regulation=
// GET /api/PendingList/theory?examMy=&course=&regulation=
// GET /api/PendingList/rv?examMy=&course=&regulation=
// ============================================

export const getPendingListInternal = async (examMy, course, regulation) => {
  const params = new URLSearchParams();
  if (examMy) params.set('examMy', examMy);
  if (course) params.set('course', course);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/PendingList/internal?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getPendingListPractical = async (examMy, course, regulation) => {
  const params = new URLSearchParams();
  if (examMy) params.set('examMy', examMy);
  if (course) params.set('course', course);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/PendingList/practical?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getPendingListTheory = async (examMy, course, regulation) => {
  const params = new URLSearchParams();
  if (examMy) params.set('examMy', examMy);
  if (course) params.set('course', course);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/PendingList/theory?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getPendingListRv = async (examMy, course, regulation) => {
  const params = new URLSearchParams();
  if (examMy) params.set('examMy', examMy);
  if (course) params.set('course', course);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/PendingList/rv?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- SubjectwiseFailedList ---
export const getSubjectwiseFailedBatch = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/SubjectwiseFailedList/batch?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectwiseFailedSems = async (course, regu) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  return apiCall(`/api/SubjectwiseFailedList/sems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectwiseFailedBranches = async (course, regu, sem) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/SubjectwiseFailedList/branches?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectwiseFailedSubjects = async (course, regu, sem, branch) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  if (branch) params.set('branch', branch);
  return apiCall(`/api/SubjectwiseFailedList/subjects?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectwiseFailedList = async (regulation, course, examMY, sem = '') => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/SubjectwiseFailedList/list?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- SubjectWiseGradesCount ---
export const getSubjectWiseGradesCountBatches = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/SubjectWiseGradesCount/batches?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectWiseGradesCountSems = async (course, examMY) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  return apiCall(`/api/SubjectWiseGradesCount/sems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectWiseGradesCountData = async (course, examMY, regu, sem, isReadmit = false) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  params.set('isReadmit', isReadmit ? 'true' : 'false');
  return apiCall(`/api/SubjectWiseGradesCount/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getSubjectWiseGradesCountExcel = async (course, examMY, regu, sem) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/SubjectWiseGradesCount/excel?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- TcIssue ---
export const getTcIssueStudentInfo = async (regNo) =>
  apiCall(`/api/TcIssue/student-info?regNo=${encodeURIComponent(regNo)}`, { method: 'GET', headers: { Accept: 'application/json' } });

export const postTcIssue = async (req) =>
  apiCall('/api/TcIssue/issue', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(req) });

// --- ScIssue ---
export const getScIssueStudentInfo = async (regNo) =>
  apiCall(`/api/ScIssue/student-info?regNo=${encodeURIComponent(regNo)}`, { method: 'GET', headers: { Accept: 'application/json' } });

export const postScIssue = async (req) =>
  apiCall('/api/ScIssue/issue', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(req) });

// --- RvClosingDates ---
export const getRvClosingDates = async (regulation, course, examMY) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  return apiCall(`/api/RvClosingDates?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const updateRvClosingDate = async (payload) => {
  return apiCall('/api/RvClosingDates', {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

// --- RegnoWiseSgpaCgpa (NBA SGPA CGPA) ---
export const getRegnoWiseSgpaCgpaBatch = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/RegnoWiseSgpaCgpa/batch?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getRegnoWiseSgpaCgpaSems = async (course, regu) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  return apiCall(`/api/RegnoWiseSgpaCgpa/sems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getRegnoWiseSgpaCgpaList = async (regulation, course, regu, exammy, sem) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (exammy) params.set('exammy', exammy);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/RegnoWiseSgpaCgpa/list?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getRegnoWiseSgpaCgpaListRegular = async (regulation, course, regu, exammy, sem) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (exammy) params.set('exammy', exammy);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/RegnoWiseSgpaCgpa/list-regular?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- MarksDataIntExt (Marks Data) ---
export const getMarksDataBatch = async () => {
  return apiCall('/api/MarksDataIntExt/batch', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getMarksDataExammy = async (regu) => {
  const params = new URLSearchParams();
  if (regu) params.set('regu', regu);
  return apiCall(`/api/MarksDataIntExt/exammy?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getMarksDataSems = async (regu, examMY) => {
  const params = new URLSearchParams();
  if (regu) params.set('regu', regu);
  if (examMY) params.set('examMY', examMY);
  return apiCall(`/api/MarksDataIntExt/sems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getMarksDataShData = async (regulation, course, regu, examMY, sem) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/MarksDataIntExt/sh-data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getMarksDataResultData = async (regulation, course, examMY, sem) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/MarksDataIntExt/result-data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- CreditSecured ---
export const getCreditSecuredExammy = async (regulation, course) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  return apiCall(`/api/CreditSecured/exammy?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
};
export const getCreditSecuredBatch = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/CreditSecured/batch?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
};
export const getCreditSecuredBranch = async (course, regu) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  return apiCall(`/api/CreditSecured/branch?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
};
export const getCreditSecuredData = async (regulation, course, regu, examMY, branch, noofcredits = 0) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (examMY) params.set('examMY', examMY);
  if (branch) params.set('branch', branch);
  params.set('noofcredits', String(noofcredits));
  return apiCall(`/api/CreditSecured/data?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
};
export const getCreditSecuredTotalData = async (regulation, course, regu, examMY, branch, sem) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (regu) params.set('regu', regu);
  if (examMY) params.set('examMY', examMY);
  if (branch) params.set('branch', branch);
  if (sem) params.set('sem', sem);
  return apiCall(`/api/CreditSecured/total-data?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// UniversityData APIs
// GET /api/UniversityData/batch?course=
export const getUniversityDataBatch = async (course) =>
  apiCall(`/api/UniversityData/batch?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityData/sem?course=&exammy=
export const getUniversityDataSem = async (course, exammy) =>
  apiCall(`/api/UniversityData/sem?course=${encodeURIComponent(course)}&exammy=${encodeURIComponent(exammy)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityData/result-format?course=&regu=&sem=&exammy=
export const getUniversityResultFormat = async (course, regu, sem, exammy) => {
  const p = new URLSearchParams({ course, regu, sem, exammy });
  return apiCall(`/api/UniversityData/result-format?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/registered-format?course=&regu=&sem=&exammy=
export const getUniversityRegisteredFormat = async (course, regu, sem, exammy) => {
  const p = new URLSearchParams({ course, regu, sem, exammy });
  return apiCall(`/api/UniversityData/registered-format?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/registered-format2?course=&regu=&sem=&exammy=
export const getUniversityRegisteredFormat2 = async (course, regu, sem, exammy) => {
  const p = new URLSearchParams({ course, regu, sem, exammy });
  return apiCall(`/api/UniversityData/registered-format2?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/format-data?course=&regu=&sem=&regsup=&exammy=
export const getUniversityFormatData = async (course, regu, sem, regsup = '', exammy = '') => {
  const p = new URLSearchParams({ course, regu, sem, regsup, exammy });
  return apiCall(`/api/UniversityData/format-data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/branch?course=&regu=
export const getUniversityBranch = async (course, regu) =>
  apiCall(`/api/UniversityData/branch?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityData/subject-list?course=&regu=&sem=&regsup=&exammy=&isrv=
export const getUniversitySubjectList = async (course, regu, sem, regsup = '', exammy = '', isrv = false) => {
  const p = new URLSearchParams({ course, regu, sem, regsup, exammy, isrv });
  return apiCall(`/api/UniversityData/subject-list?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/subject-data?course=&regu=&sem=&regsup=&exammy=&isrv=
export const getUniversitySubjectData = async (course, regu, sem, regsup = '', exammy = '', isrv = false) => {
  const p = new URLSearchParams({ course, regu, sem, regsup, exammy, isrv });
  return apiCall(`/api/UniversityData/subject-data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/cd-subject-list?course=&regu=&sem=&regsup=&exammy=&isrv=
export const getUniversityCdSubjectList = async (course, regu, sem, regsup = '', exammy = '', isrv = false) => {
  const p = new URLSearchParams({ course, regu, sem, regsup, exammy, isrv });
  return apiCall(`/api/UniversityData/cd-subject-list?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/cd-student-data?course=&regu=&sem=&regsup=&exammy=&isrv=
export const getUniversityCdStudentData = async (course, regu, sem, regsup = '', exammy = '', isrv = false) => {
  const p = new URLSearchParams({ course, regu, sem, regsup, exammy, isrv });
  return apiCall(`/api/UniversityData/cd-student-data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityData/pc-format?course=&regu=&exammy=&sem=&type=
// type: 'CourseComplete' | 'All' | 'Regnowise' | 'JNTUK CE'
export const getUniversityPcFormat = async (course, regu, exammy = '', sem = '', type = 'CourseComplete') => {
  const p = new URLSearchParams({ course, regu, exammy, sem, type });
  return apiCall(`/api/UniversityData/pc-format?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// TandPData APIs
// GET /api/TandPData/batch?course=
export const getTandPBatch = async (course) =>
  apiCall(`/api/TandPData/batch?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/TandPData/download?course=&regu=&exammy=
export const getTandPData = async (course, regu, exammy = '') => {
  const p = new URLSearchParams({ course, regu, exammy });
  return apiCall(`/api/TandPData/download?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GraceData APIs
// GET /api/GraceData/batch?course=
export const getGraceDataBatch = async (course) =>
  apiCall(`/api/GraceData/batch?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/GraceData/sem?course=&regu=
export const getGraceDataSem = async (course, regu) =>
  apiCall(`/api/GraceData/sem?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/GraceData/data?course=&regu=&exammy=&sem=&isle=false
export const getGraceData = async (course, regu, exammy = '', sem, isle = false) => {
  const p = new URLSearchParams({ course, regu, exammy, sem, isle });
  return apiCall(`/api/GraceData/data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// Grofting Process APIs
// GET /api/Grofting/exammy?course=B.Tech&regulation=R20
export const getGroftingExammy = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course)     params.set('course', course);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/Grofting/exammy?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/Grofting/sems?course=B.Tech&examMy=May-2024&regulation=R20
export const getGroftingSems = async (course, examMy, regulation) => {
  const params = new URLSearchParams();
  if (course)     params.set('course', course);
  if (examMy)     params.set('examMy', examMy);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/Grofting/sems?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// POST /api/Grofting/run — body: { Course, ExamMy }
// SP_GRACING_GROFTING takes only @EXAMMY and @COURSE (no semester/pcode)
export const runGrofting = async (course, examMy) => {
  return apiCall('/api/Grofting/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Course: course, ExamMy: examMy }),
  });
};

// OD Data APIs
// GET /api/OdData/batch?course=
export const getOdDataBatch = async (course) => {
  return apiCall(`/api/OdData/batch?course=${encodeURIComponent(course)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/OdData/branch?course=&regu=
export const getOdDataBranch = async (course, regu) => {
  return apiCall(`/api/OdData/branch?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/OdData/list?course=&regu=&branch=&regno=&isLateral=
export const getOdDataList = async (course, regu, branch = '', regno = '', isLateral = false) => {
  const params = new URLSearchParams({ course, regu, branch, regno, isLateral });
  return apiCall(`/api/OdData/list?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// POST /api/OdData/gracing — body: { Course, Regu, Branch, ExamMy, UserId, RegLetrl }
export const runOdGracing = async (course, regu, branch, examMy, userId = '', regLetrl = 'R') => {
  return apiCall('/api/OdData/gracing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Course: course, Regu: regu, Branch: branch, ExamMy: examMy, UserId: userId, RegLetrl: regLetrl }),
  });
};

// ExcelGally (Result Sheet Excel Export) APIs
// GET /api/ExcelGally/sems?course=
export const getExcelGallySems = async (course) => {
  return apiCall(`/api/ExcelGally/sems?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/ExcelGally/branches?course=&sem=
export const getExcelGallyBranches = async (course, sem) => {
  return apiCall(`/api/ExcelGally/branches?course=${encodeURIComponent(course)}&sem=${encodeURIComponent(sem)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/ExcelGally/data?regulation=&course=&examMY=&sem=&branch=&semType=
export const getExcelGallyData = async (regulation, course, examMY, sem, branch, semType = 'Reg') => {
  const params = new URLSearchParams({ regulation, course, examMY, sem, branch, semType });
  return apiCall(`/api/ExcelGally/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/ExcelGally/backlogs?regulation=&course=&examMY=&sem=&branch=&semType=
export const getExcelGallyBacklogs = async (regulation, course, examMY, sem, branch, semType = 'Reg') => {
  const params = new URLSearchParams({ regulation, course, examMY, sem, branch, semType });
  return apiCall(`/api/ExcelGally/backlogs?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// ResultProcess (Regno Wise Result Process) APIs
// GET /api/ResultProcess/exammy?course=B.Tech&regulation=R20
export const getResultProcessExammy = async (course, regulation) => {
  const params = new URLSearchParams();
  if (course)     params.set('course', course);
  if (regulation) params.set('regulation', regulation);
  return apiCall(`/api/ResultProcess/exammy?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// POST /api/ResultProcess/run — body: { RegNo, ExamMy, Regulation, Course, Sem, Grp }
export const runResultProcess = async (regNo, examMy, regulation, course, sem, grp) => {
  return apiCall('/api/ResultProcess/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ RegNo: regNo, ExamMy: examMy, Regulation: regulation, Course: course, Sem: sem, Grp: grp }),
  });
};

// POST /api/ResultProcess/run-readmit — body: { RegNo, ExamMy, Regulation, Course, Sem, Grp, ReadmitRegulation }
export const runReadmitResultProcess = async (regNo, examMy, regulation, course, sem, grp, readmitRegulation) => {
  return apiCall('/api/ResultProcess/run-readmit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ RegNo: regNo, ExamMy: examMy, Regulation: regulation, Course: course, Sem: sem, Grp: grp, ReadmitRegulation: readmitRegulation }),
  });
};

// OMR Number Update APIs
// GET /api/OmrNumberUpdate/load?regulation=&course=&exammy=
// Returns: aSHID, REGNO, GRP, SEM, TEMPCODE, PCODE, PNAME, OMRNUMBER, PKTNO, SCANNED_SNO, SNO
export const loadOmrNumberGrid = async (regulation, course, exammy) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (exammy) params.set('exammy', exammy);
  return apiCall(`/api/OmrNumberUpdate/load?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// POST /api/OmrNumberUpdate/update
// Body: [{ AshId, OmrNo }, ...]
export const updateOmrNumbers = async (rows) => {
  return apiCall('/api/OmrNumberUpdate/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(rows),
  });
};

// CGPA Year Wise APIs
// GET /api/cgpayearwise/exammy?course=
export const getCgpaYearWiseExammy = async (course = '', regulation = '') => {
  const p = new URLSearchParams({ course, regulation });
  return apiCall(`/api/cgpayearwise/exammy?${p}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/cgpayearwise/batch?examMY=
export const getCgpaYearWiseBatch = async (examMY) => {
  return apiCall(`/api/cgpayearwise/batch?examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/cgpayearwise/sems?examMY=&batch=
export const getCgpaYearWiseSems = async (examMY, batch) => {
  return apiCall(`/api/cgpayearwise/sems?examMY=${encodeURIComponent(examMY)}&batch=${encodeURIComponent(batch)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/cgpayearwise/download?examMY=&batch=
export const getCgpaYearWiseDownload = async (regulation = '', course = '', examMY, regu, sem = '') => {
  const p = new URLSearchParams({ regulation, course, examMY, regu, sem });
  return apiCall(`/api/cgpayearwise/download?${p}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// V3 Data (RV2 Marks Entry) APIs
// GET /api/v3data/sems?course=&regu=&exammy=
export const getV3DataSems = async (course, regu, exammy) => {
  return apiCall(`/api/v3data/sems?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}&exammy=${encodeURIComponent(exammy)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/v3data/data?course=&regu=&exammy=&sem=&diffmarks=&isreadmit=&readmitreg=
export const getV3Data = async (course, regu, exammy, sem, diffmarks = '0', isreadmit = false, readmitreg = '') => {
  const params = new URLSearchParams({
    course,
    regu,
    exammy,
    sem,
    diffmarks: String(diffmarks),
    isreadmit: String(isreadmit),
    readmitreg,
  });
  return apiCall(`/api/v3data/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Pre-Moderation APIs
// GET /api/premoderation/sems?course=&examMY=&regu=
export const getPreModerationSems = async (course, examMY, regu) => {
  return apiCall(`/api/premoderation/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/premoderation/data?course=&examMY=&regu=&sem=
export const getPreModerationData = async (course, examMY, regu, sem) => {
  return apiCall(`/api/premoderation/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&sem=${encodeURIComponent(sem)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Course Percentage APIs
// GET /api/coursepercentage/sems?course=&examMY=
export const getCoursePercentageSems = async (course, examMY) => {
  return apiCall(`/api/coursepercentage/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/coursepercentage/data?course=&examMY=&regu=&sem=&isSup=
export const getCoursePercentageData = async (course, examMY, regu, sem, isSup = false, isRv = false) => {
  const p = new URLSearchParams({ course, examMY, regu, sem, isSup, isRv });
  return apiCall(`/api/coursepercentage/data?${p}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Branch-wise Course Percent APIs
// GET /api/branchwisecoursepercent/sems?course=&examMY=
export const getBranchwiseCoursePercentSems = async (course, examMY) => {
  return apiCall(`/api/branchwisecoursepercent/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/branchwisecoursepercent/data?course=&examMY=&regu=&sem=&isSup=
export const getBranchwiseCoursePercentData = async (course, examMY, regu, sem, isSup = false) => {
  return apiCall(`/api/branchwisecoursepercent/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&sem=${encodeURIComponent(sem)}&isSup=${isSup}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Branch-wise Course Sec Percent APIs (BranchWisePercentController — same SP as BranchwiseCourseSecPercent.aspx)
// GET /api/BranchWisePercent/sems?course=&examMY=
export const getBranchwiseCourseSecPercentSems = async (course, examMY) => {
  return apiCall(`/api/BranchWisePercent/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/BranchWisePercent/data?course=&examMY=&regu=&sem=&isRv=
export const getBranchwiseCourseSecPercentData = async (course, examMY, regu, sem, isRv = false) => {
  return apiCall(`/api/BranchWisePercent/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&sem=${encodeURIComponent(sem)}&isRv=${isRv}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Branch-wise Section Percent APIs (BranchWiseSectionPercentController)
// GET /api/branchwisesectionpercent/sems?course=&examMY=
export const getBranchWiseSectionPercentSems = async (course, examMY) => {
  return apiCall(`/api/branchwisesectionpercent/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/branchwisesectionpercent/data?course=&examMY=&regu=&sem=
export const getBranchWiseSectionPercentData = async (course, examMY, regu, sem) => {
  const params = new URLSearchParams({ course, examMY, regu, sem });
  return apiCall(`/api/branchwisesectionpercent/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Branch-wise Percent APIs
// GET /api/branchwisepercent/sems?course=&examMY=
export const getBranchWisePercentSems = async (course, examMY) => {
  return apiCall(`/api/branchwisepercent/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/branchwisepercent/data?course=&examMY=&regu=&sem=&isRv=
export const getBranchWisePercentData = async (course, examMY, regu, sem, isRv = false) => {
  return apiCall(`/api/branchwisepercent/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&sem=${encodeURIComponent(sem)}&isRv=${isRv}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Passed Result APIs
// GET /api/passedresult/sems?course=&examMY=&regu=
export const getPassedResultSems = async (course, examMY, regu) => {
  return apiCall(`/api/passedresult/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/passedresult/data?course=&examMY=&regu=&sem=
export const getPassedResultData = async (course, examMY, regu, sem) => {
  return apiCall(`/api/passedresult/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&sem=${encodeURIComponent(sem)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Failed In Result Passed In Sub APIs
// GET /api/failedinresultpassedinsub/data?course=&examMY=
export const getFailedInResultPassedInSubData = async (regulation, course, examMY) => {
  const params = new URLSearchParams();
  if (regulation) params.set('regulation', regulation);
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  return apiCall(`/api/failedinresultpassedinsub/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Individual Marks Memo APIs
// GET /api/IndividualMarksMemo/sems?course=&examMY=&regu=
export const getIndividualMarksMemoSems = async (course, examMY, regu) => {
  return apiCall(`/api/IndividualMarksMemo/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/IndividualMarksMemo/branches?course=
export const getIndividualMarksMemoBranches = async (course) => {
  return apiCall(`/api/IndividualMarksMemo/branches?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/IndividualMarksMemo/student-info?regNo=
export const getIndividualMarksMemoStudentInfo = async (regNo) => {
  return apiCall(`/api/IndividualMarksMemo/student-info?regNo=${encodeURIComponent(regNo)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/IndividualMarksMemo/data?regulation=&examMY=&course=&semester=&branch=&regNo=&reportType=
export const getIndividualMarksMemoData = async (regulation, examMY, course, semester, branch, regNo, reportType = 1) => {
  const params = new URLSearchParams({ regulation, examMY, course, semester, branch, regNo, reportType: String(reportType) });
  return apiCall(`/api/IndividualMarksMemo/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Result Grade Sheet (Grade Card) APIs
// GET /api/ResultGradeSheet/sems?course=&examMY=
export const getResultGradeSheetSems = async (course, examMY) => {
  return apiCall(`/api/ResultGradeSheet/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/ResultGradeSheet/data?course=&examMY=&regu=&sem=&isRv=&isReadmit=&readmitRegu=
export const getResultGradeSheetData = async (course, examMY, regu, sem, isRv = false, isReadmit = false, readmitRegu = '') => {
  const params = new URLSearchParams({ course, examMY, regu, sem, isRv: String(isRv), isReadmit: String(isReadmit), readmitRegu });
  return apiCall(`/api/ResultGradeSheet/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// MTECH CMM APIs
// GET /api/mtechcmm/data?course=&examMY=&regu=&grp=
export const getMtechCmmData = async (course, examMY, regu, grp = '') => {
  return apiCall(`/api/mtechcmm/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&grp=${encodeURIComponent(grp)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// PC All Courses APIs
// GET /api/PcAllCourses/batches?course=
export const getPcAllCoursesBatches = async (course) => {
  return apiCall(`/api/PcAllCourses/batches?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/PcAllCourses/branches?course=&batch=
export const getPcAllCoursesBranches = async (course, batch) => {
  return apiCall(`/api/PcAllCourses/branches?course=${encodeURIComponent(course)}&batch=${encodeURIComponent(batch)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/PcAllCourses/data?course=&examMY=&regu=&batch=&branch=&regNo=&isGracing=
export const getPcAllCoursesData = async (course, examMY, regu, batch = '', branch = '', regNo = '', isGracing = false) => {
  const params = new URLSearchParams({ course, examMY, regu, batch, branch, regNo, isGracing: String(isGracing) });
  return apiCall(`/api/PcAllCourses/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// MBA CMM APIs
// GET /api/mbacmm/data?course=&examMY=&regu=&grp=
export const getMbaCmmData = async (course, examMY, regu, grp = '') => {
  return apiCall(`/api/mbacmm/data?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}&grp=${encodeURIComponent(grp)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Award Degree APIs (AwardDegreeController)
// GET /api/AwardDegree/batches?course=
export const getAwardDegreeBatches = async (course) => {
  return apiCall(`/api/AwardDegree/batches?course=${encodeURIComponent(course)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/AwardDegree/exammys?course=&regu=
export const getAwardDegreeExammys = async (course, regu) => {
  return apiCall(`/api/AwardDegree/exammys?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/AwardDegree/data?regu=&examMY=
export const getAwardDegreeData = async (regu, examMY, course = '') => {
  return apiCall(`/api/AwardDegree/data?regu=${encodeURIComponent(regu)}&examMY=${encodeURIComponent(examMY)}&course=${encodeURIComponent(course)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// Award of Class APIs (AwardofClassController)
// GET /api/awardofclass/batches?course=
export const getAwardOfClassBatches = async (course) => {
  return apiCall(`/api/awardofclass/batches?course=${encodeURIComponent(course)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/awardofclass/sems?course=&examMY=
export const getAwardOfClassSems = async (course, examMY) => {
  return apiCall(`/api/awardofclass/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/awardofclass/data?course=&examMY=&regu=&sem=
export const getAwardOfClassData = async (course, examMY, regu, sem) => {
  const params = new URLSearchParams({ course, examMY, regu, sem });
  return apiCall(`/api/awardofclass/data?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/awardofclass/excel?course=&examMY=&regu=&sem=
export const getAwardOfClassExcel = async (course, examMY, regu, sem) => {
  const params = new URLSearchParams({ course, examMY, regu, sem });
  return apiCall(`/api/awardofclass/excel?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// ExamFeeCollection Report APIs (ExamFeeCollectionController — report/* endpoints)
// GET /api/ExamFeeCollection/report/sems?course=&examMY=
export const getExamFeeCollectionReportSems = async (course, examMY) => {
  return apiCall(`/api/ExamFeeCollection/report/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/ExamFeeCollection/report/branches?course=
export const getExamFeeCollectionReportBranches = async (course) => {
  return apiCall(`/api/ExamFeeCollection/report/branches?course=${encodeURIComponent(course)}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// GET /api/ExamFeeCollection/report/data?course=&examMY=&regu=&sem=&branch=
export const getExamFeeCollectionReportData = async (course, examMY, regu, sem, branch) => {
  const params = new URLSearchParams({ course, examMY, regu: regu || '', sem, branch: branch || '' });
  return apiCall(`/api/ExamFeeCollection/report/data?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' },
  });
};

// RV Marks Check List APIs (RvMarksCheckListController)
// GET /api/rvmarkschecklist/sems?course=
export const getRvMarksCheckListSems = async (course) => {
  return apiCall(`/api/rvmarkschecklist/sems?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/rvmarkschecklist/data?course=&examMY=&regu=&sem=&isReadmit=&readmitRegu=&reportType=
export const getRvMarksCheckListData = async (course, examMY, regu, sem, isReadmit, readmitRegu, reportType) => {
  const params = new URLSearchParams({
    course, examMY, regu, sem,
    isReadmit: isReadmit ? 'true' : 'false',
    readmitRegu: readmitRegu || '',
    reportType: String(reportType || 1),
  });
  return apiCall(`/api/rvmarkschecklist/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// SGPA & CGPA H.T.No Wise APIs (SgpaCgpaHtnoWiseController)
// GET /api/SgpaCgpaHtnoWise/batches?course=
export const getSgpaCgpaHtnoWiseBatches = async (course) => {
  return apiCall(`/api/SgpaCgpaHtnoWise/batches?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/SgpaCgpaHtnoWise/branches?course=
export const getSgpaCgpaHtnoWiseBranches = async (course) => {
  return apiCall(`/api/SgpaCgpaHtnoWise/branches?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/SgpaCgpaHtnoWise/examMYs?course=&regu=
export const getSgpaCgpaHtnoWiseExamMYs = async (course, regu) => {
  return apiCall(`/api/SgpaCgpaHtnoWise/examMYs?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/SgpaCgpaHtnoWise/data?course=&examMY=&regu=&branch=&withRv=
export const getSgpaCgpaHtnoWiseData = async (course, examMY, regu, branch, withRv) => {
  const params = new URLSearchParams({
    course, examMY, regu,
    branch: branch || '',
    withRv: withRv ? 'true' : 'false',
  });
  return apiCall(`/api/SgpaCgpaHtnoWise/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Tabulation Register APIs
// GET /api/tabulationregister/batches?course=
export const getTabulationRegisterBatches = async (course) => {
  return apiCall(`/api/tabulationregister/batches?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/tabulationregister/branches?course=&regu=
export const getTabulationRegisterBranches = async (course, regu) => {
  return apiCall(`/api/tabulationregister/branches?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/tabulationregister/examMYs?course=&regu=
export const getTabulationRegisterExamMYs = async (course, regu) => {
  return apiCall(`/api/tabulationregister/examMYs?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/tabulationregister/data?course=&examMY=&regu=&branch=&regNo=&isReadmit=&readmitRegu=
export const getTabulationRegisterData = async (course, examMY, regu, branch, regNo, isReadmit, readmitRegu) => {
  const params = new URLSearchParams({
    course, examMY, regu, branch,
    regNo: regNo || '',
    isReadmit: isReadmit ? 'true' : 'false',
    readmitRegu: readmitRegu || '',
  });
  return apiCall(`/api/tabulationregister/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Result Sheet V1 Marks APIs (ResultSheetController)
// GET /api/resultsheet/sems?course=&examMY=&regu=
export const getResultSheetSems = async (course, examMY, regu) => {
  return apiCall(`/api/resultsheet/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/resultsheet/data?course=&examMY=&regu=&sem=&isReadmit=&readmitRegu=
export const getResultSheetData = async (course, examMY, regu, sem, isReadmit, readmitRegu) => {
  const params = new URLSearchParams({
    course, examMY, regu, sem,
    isReadmit: isReadmit ? 'true' : 'false',
    readmitRegu: readmitRegu || '',
  });
  return apiCall(`/api/resultsheet/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- Transcript ---
export const getTranscriptSems = async (course, examMY, regu) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  return apiCall(`/api/Transcript/sems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getTranscriptBranches = async (course) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  return apiCall(`/api/Transcript/branches?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getTranscriptData = async (course, examMY, regu, sem, branch = '', regNo = '', isMarksMemo = true) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  params.set('branch', branch || '');
  params.set('regNo', regNo || '');
  params.set('isMarksMemo', isMarksMemo ? 'true' : 'false');
  return apiCall(`/api/Transcript/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// --- ResultSheetModeration ---
export const getResultSheetModerationSems = async (course, examMY, regu) => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  return apiCall(`/api/ResultSheetModeration/sems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

export const getResultSheetModerationData = async (course, examMY, regu, sem, isReadmit = false, readmitRegu = '') => {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (examMY) params.set('examMY', examMY);
  if (regu) params.set('regu', regu);
  if (sem) params.set('sem', sem);
  params.set('isReadmit', isReadmit ? 'true' : 'false');
  params.set('readmitRegu', readmitRegu || '');
  return apiCall(`/api/ResultSheetModeration/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Result Sheet V1 & RV Grades APIs (ResultSheetGraftingController)
// GET /api/resultsheetgrafting/sems?course=&examMY=&regu=
export const getResultSheetGraftingSems = async (course, examMY, regu) => {
  return apiCall(`/api/ResultSheetGrafting/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/resultsheetgrafting/data?course=&examMY=&regu=&sem=&isReadmit=&readmitRegu=
export const getResultSheetGraftingData = async (course, examMY, regu, sem, isReadmit, readmitRegu) => {
  const params = new URLSearchParams({
    course, examMY, regu, sem,
    isReadmit: isReadmit ? 'true' : 'false',
    readmitRegu: readmitRegu || '',
  });
  return apiCall(`/api/ResultSheetGrafting/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// CGC All Programmes APIs (maps to BtechCmmController)
// GET /api/btechcmm/batches?course=
export const getCgcAllProgrammesBatches = async (course) => {
  return apiCall(`/api/btechcmm/batches?course=${encodeURIComponent(course)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/btechcmm/branches?course=&batch=
export const getCgcAllProgrammesBranches = async (course, batch) => {
  return apiCall(`/api/btechcmm/branches?course=${encodeURIComponent(course)}&batch=${encodeURIComponent(batch)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/btechcmm/data?course=&examMY=&regu=&batch=&branch=&regNo=&isGracing=&isLateral=
export const getCgcAllProgrammesData = async (course, examMY, regu, batch, branch, regNo, isGracing, isLateral) => {
  const params = new URLSearchParams({
    course,
    examMY,
    regu,
    batch,
    branch,
    regNo: regNo || '',
    isGracing: isGracing ? 'true' : 'false',
    isLateral: isLateral ? 'true' : 'false',
  });
  return apiCall(`/api/btechcmm/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// Result Check List APIs
// GET /api/resultchecklist/sems?course=&examMY=&regu=
export const getResultCheckListSems = async (course, examMY, regu) => {
  return apiCall(`/api/resultchecklist/sems?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regu=${encodeURIComponent(regu)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// GET /api/resultchecklist/data?course=&examMY=&regu=&sem=&isReadmit=&readmitRegu=&checkListType=
export const getResultCheckListData = async (course, examMY, regu, sem, isReadmit, readmitRegu, checkListType) => {
  const params = new URLSearchParams({
    course,
    examMY,
    regu,
    sem,
    isReadmit: isReadmit ? 'true' : 'false',
    readmitRegu: readmitRegu || '',
    checkListType: checkListType || '1',
  });
  return apiCall(`/api/resultchecklist/data?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
};

// UniversityCdData APIs (University_CD_Data.aspx)
// GET /api/UniversityCdData/batch?course=&regulation=
export const getUniversityCdDataBatch = async (course, regulation) =>
  apiCall(`/api/UniversityCdData/batch?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityCdData/sem?course=&examMY=&regulation=
export const getUniversityCdDataSem = async (course, examMY, regulation = '') =>
  apiCall(`/api/UniversityCdData/sem?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regulation=${encodeURIComponent(regulation)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityCdData/subject-list?course=&regulation=&examMY=&sem=
export const getUnivCdDataSubjectList = async (course, regulation, examMY, sem) => {
  const p = new URLSearchParams({ course, regulation, examMY, sem });
  return apiCall(`/api/UniversityCdData/subject-list?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversityCdData/students-data?course=&regulation=&examMY=&sem=&regSup=
export const getUniversityCdStudentsData = async (course, regulation, examMY, sem, regSup = 'REG') => {
  const p = new URLSearchParams({ course, regulation, examMY, sem, regSup });
  return apiCall(`/api/UniversityCdData/students-data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// AuditCourse APIs (AuditCourse.aspx)
// GET /api/AuditCourse/batch?course=
export const getAuditCourseBatch = async (course) =>
  apiCall(`/api/AuditCourse/batch?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/AuditCourse/sem?course=&regu=
export const getAuditCourseSem = async (course, regu) =>
  apiCall(`/api/AuditCourse/sem?course=${encodeURIComponent(course)}&regu=${encodeURIComponent(regu)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/AuditCourse/academic-year?course=
export const getAuditCourseAcademicYear = async (course) =>
  apiCall(`/api/AuditCourse/academic-year?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/AuditCourse/data?course=&regu=&sem=&academicYear=
export const getAuditCourseData = async (course, regu, sem, academicYear) => {
  const p = new URLSearchParams({ course, regu, sem, academicYear });
  return apiCall(`/api/AuditCourse/data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// RvSummeryReport APIs
// GET /api/RvSummeryReport/rv-summary?regulation=&course=&examMY=
export const getRvSummaryData = async (regulation, course, examMY) =>
  apiCall(`/api/RvSummeryReport/rv-summary?regulation=${encodeURIComponent(regulation)}&course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/RvSummeryReport/supply-summary?regulation=&course=&examMY=
export const getSupplySummaryData = async (regulation, course, examMY) =>
  apiCall(`/api/RvSummeryReport/supply-summary?regulation=${encodeURIComponent(regulation)}&course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// UniversitySubjectData APIs
// GET /api/UniversitySubjectData/batch?course=&regulation=
export const getUniversitySubjectDataBatch = async (course, regulation) =>
  apiCall(`/api/UniversitySubjectData/batch?course=${encodeURIComponent(course)}&regulation=${encodeURIComponent(regulation)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversitySubjectData/sem?course=&examMY=&regulation=
export const getUniversitySubjectDataSem = async (course, examMY, regulation = '') =>
  apiCall(`/api/UniversitySubjectData/sem?course=${encodeURIComponent(course)}&examMY=${encodeURIComponent(examMY)}&regulation=${encodeURIComponent(regulation)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversitySubjectData/subject-list?course=&regulation=&examMY=&sem=
export const getUnivSubjectDataSubjectList = async (course, regulation, examMY, sem) => {
  const p = new URLSearchParams({ course, regulation, examMY, sem });
  return apiCall(`/api/UniversitySubjectData/subject-list?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// GET /api/UniversitySubjectData/students-data?course=&regulation=&examMY=&sem=&regSup=
export const getUniversityStudentsData = async (course, regulation, examMY, sem, regSup = 'REG') => {
  const p = new URLSearchParams({ course, regulation, examMY, sem, regSup });
  return apiCall(`/api/UniversitySubjectData/students-data?${p}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// UniversityPcFormate APIs (University_PC_Formate.aspx / BTECHPC.aspx)
// GET /api/UniversityPcFormate/batch?course=
export const getUniversityPcFormateBatch = async (course) =>
  apiCall(`/api/UniversityPcFormate/batch?course=${encodeURIComponent(course)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityPcFormate/branch?course=&batch=
export const getUniversityPcFormateBranch = async (course, batch) =>
  apiCall(`/api/UniversityPcFormate/branch?course=${encodeURIComponent(course)}&batch=${encodeURIComponent(batch)}`, { method: 'GET', headers: { Accept: 'application/json' } });

// GET /api/UniversityPcFormate/data?course=&examMY=&regu=&batch=&branch=&isGracing=&isLateral=
export const getUniversityPcFormateData = async (course, examMY, regu, batch = '', branch = '', isGracing = false, isLateral = false) => {
  const params = new URLSearchParams({ course, examMY, regu, batch, branch, isGracing, isLateral });
  return apiCall(`/api/UniversityPcFormate/data?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
};

// Export the base API call function for other API calls
export { apiCall };
