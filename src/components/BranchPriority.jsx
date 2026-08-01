import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { FaUser, FaChevronUp, FaCog, FaTimes } from 'react-icons/fa';
import styles from './BranchPriority.module.css';
import { getAppData, getStoredCourse, getStoredExamMY, getStoredRegulation, getBranchPriorityBranches, getBranchPriorityData, saveBranchPriority, deleteBranchPriority } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const BranchPriority = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form data state
  const [formData, setFormData] = useState({
    session: '1',
    branch: '',
  });

  // Table data state
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');

  // Selected branch state
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Branch dropdown options
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchError, setBranchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [appMeta, setAppMeta] = useState({ course: '', examMY: '' });

  // Dropdown options
  const sessionOptions = ['1', '2'];

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'session') {
      setSelectedBranch(null);
      setFormData(prev => ({
        ...prev,
        session: value,
        branch: '',
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: name === 'branch' ? value.trim() : value,
    }));
  };

  useLayoutEffect(() => {
    if (selectedBranch) {
      const normalizedBranch = typeof selectedBranch.branch === 'string' ? selectedBranch.branch.trim() : selectedBranch.branch;
      setFormData({
        session: selectedBranch.session.toString(),
        branch: normalizedBranch,
      });
    }
  }, [selectedBranch]);

  useEffect(() => {
    const appData = getAppData();
    const course = appData?.course || getStoredCourse();
    const regulation = appData?.regulation || getStoredRegulation();
    const examMY = appData?.examMY || getStoredExamMY();

    setAppMeta({ course: course || '', examMY: examMY || '' });

    if (!course || !regulation) {
      setBranchError('Course or regulation not selected. Please choose them from the header.');
      setBranchOptions([]);
      return;
    }

    const fetchBranches = async () => {
      setBranchesLoading(true);
      setBranchError('');
      try {
        const response = await getBranchPriorityBranches(course, regulation);
        const list = response?.success && Array.isArray(response.data) ? response.data : [];
        const options = Array.from(new Set(list
          .map(item => {
            const value = item?.GRP || item?.grp || item?.branch;
            return typeof value === 'string' ? value.trim() : '';
          })
          .filter(Boolean)
        ));

        setBranchOptions(options);

        setFormData(prev => ({
          ...prev,
          branch: options.includes(typeof prev.branch === 'string' ? prev.branch.trim() : '')
            ? (typeof prev.branch === 'string' ? prev.branch.trim() : prev.branch)
            : ''
        }));
      } catch (error) {
        console.error('Error fetching branch options:', error);
        setBranchError(error.message || 'Failed to load branches');
        setBranchOptions([]);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const fetchBranchPriority = useCallback(async (sessionValue) => {
    if (!sessionValue) {
      setTableData([]);
      return;
    }

    setTableLoading(true);
    setTableError('');
    try {
      const response = await getBranchPriorityData(sessionValue, 0);
      const rows = response?.success && Array.isArray(response.data) ? response.data : [];
      const normalized = rows.map((row, index) => {
        const priority = Number(row.PRIORITY ?? row.priority ?? row.Priority ?? index + 1);
        const branchNameRaw = row.Branch ?? row.BRANCH ?? row.branch ?? '';
        const branchName = typeof branchNameRaw === 'string' ? branchNameRaw.trim() : '';
        const session = Number(row.DaySession ?? row.DAYSESSION ?? row.session ?? sessionValue);
        const sem = row.SEM ?? row.sem ?? row.Sem ?? null;
        const id = row.ID ?? row.Id ?? row.id ?? `${branchName}-${priority}-${session}`;

        return {
          id,
          priority,
          branch: branchName,
          session,
          sem,
        };
      }).sort((a, b) => a.priority - b.priority);

      setTableData(normalized);

      setBranchOptions(prev => {
        const combined = new Set(prev);
        normalized.forEach(item => {
          if (item.branch) {
            combined.add(item.branch);
          }
        });
        return Array.from(combined);
      });

      setSelectedBranch(prev => {
        if (!prev) return null;
        const match = normalized.find(item => item.id === prev.id);
        return match || null;
      });

      if (!response?.success && response?.message) {
        setTableError(response.message);
      }
    } catch (error) {
      console.error('Error loading branch priority data:', error);
      setTableError(error.message || 'Failed to load branch priority data');
      setTableData([]);
      setSelectedBranch(null);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranchPriority(formData.session);
  }, [formData.session, fetchBranchPriority]);

  // Handle branch selection from table
  const handleBranchSelect = (branch) => {
    const sessionString = branch.session.toString();
    const normalizedBranch = typeof branch.branch === 'string' ? branch.branch.trim() : branch.branch;
    console.debug('[BranchPriority] Row selected', {
      rawBranch: branch.branch,
      normalizedBranch,
      sessionString,
      branchOptions,
    });
    setSelectedBranch({ ...branch, branch: normalizedBranch, session: Number(sessionString) });
    setFormData({
      session: sessionString,
      branch: normalizedBranch,
    });
  };

  useEffect(() => {
    console.debug('[BranchPriority] Form data updated', formData);
  }, [formData]);

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.branch) {
      alert('Please select a branch');
      return;
    }

    if (!appMeta.course) {
      alert('Course not selected. Please choose a course from the header.');
      return;
    }

    if (!appMeta.examMY) {
      alert('Exam month & year not selected. Please choose it from the header.');
      return;
    }

    // Check for duplicate branch entry when creating new
    if (!selectedBranch) {
      const existingBranch = tableData.find(item =>
        item.branch === formData.branch &&
        item.session === parseInt(formData.session, 10)
      );

      if (existingBranch) {
        alert('Branch already exists for this session');
        return;
      }
    }

    const priorityValue = selectedBranch ? selectedBranch.priority : tableData.length + 1;

    const daySessionValue = Number(formData.session);

    const semValue = selectedBranch?.sem ?? null;

    const payload = {
      Request: {
        Priority: String(priorityValue),
        Sem: semValue,
        Branch: formData.branch.trim(),
        EDate: null,
        DaySession: daySessionValue,
        Course: appMeta.course,
        ExamMy: appMeta.examMY,
      },
    };

    try {
      setSaving(true);
      const response = await saveBranchPriority(payload);
      alert(response.message || 'Branch priority saved successfully!');
      await fetchBranchPriority(daySessionValue);

      setFormData(prev => ({
        ...prev,
        branch: ''
      }));
      setSelectedBranch(null);
    } catch (error) {
      console.error('Error saving branch priority:', error);
      alert(error.message || 'Failed to save branch priority');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      session: '1',
      branch: ''
    });
    setSelectedBranch(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedBranch) {
      alert('Please select a branch to delete');
      return;
    }

    if (!window.confirm(`Do you want to delete ${selectedBranch.branch}?`)) {
      return;
    }

    try {
      setSaving(true);
      const payload = {
        Request: {
          priority: selectedBranch.priority,
          branch: typeof selectedBranch.branch === 'string' ? selectedBranch.branch.trim() : selectedBranch.branch,
          daySession: String(selectedBranch.session),
        },
      };
      const response = await deleteBranchPriority(payload);
      alert(response.message || 'Branch deleted successfully!');
      await fetchBranchPriority(formData.session);
      setFormData({
        session: formData.session,
        branch: '',
      });
      setSelectedBranch(null);
    } catch (error) {
      console.error('Error deleting branch priority:', error);
      alert(error.message || 'Failed to delete branch priority');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUser className={styles.headerIcon} />
            Branch Master
          </h2>
          <div className={styles.headerButtons}>
            <button className={styles.headerBtn} title="Settings">
              <FaCog />
            </button>
            <button
              className={`${styles.headerBtn} ${styles.minimizeBtn} ${isFormCollapsed ? styles.rotated : ''}`}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              title="Minimize"
            >
              <FaChevronUp />
            </button>
            <button className={styles.headerBtn} title="Close">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className={styles.boxContent}>
          <div className={styles.contentRow}>
            {/* Left Section - Form */}
            <div className={styles.leftSection}>
              <div className={`${styles.formSection} ${isFormCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.formContainer}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Session</label>
                      <select
                        name="session"
                        value={formData.session}
                        onChange={handleInputChange}
                        className={styles.dropdown}
                      >
                        {sessionOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Branch</label>
                      <select
                        name="branch"
                        value={formData.branch || ''}
                        onChange={handleInputChange}
                        className={styles.dropdown}
                        disabled={branchesLoading || branchOptions.length === 0}
                      >
                        <option value="">Select Branch</option>
                        {branchOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {branchError && <p className={styles.errorMessage}>{branchError}</p>}
                    </div>
                  </div>

                  <div className={styles.actionButtons}>
                    <button onClick={handleSave} className={styles.saveBtn} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleCancel} className={styles.cancelBtn} disabled={saving}>Cancel</button>
                    <button onClick={handleDelete} className={styles.deleteBtn} disabled={saving}>Delete</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Table */}
            <div className={styles.rightSection}>
              <div className={styles.tableHeader}>
                <div className={styles.headerCell}>PRIORITY</div>
                <div className={styles.headerCell}>BRANCH</div>
                <div className={styles.headerCell}>SESSION</div>
              </div>
              <div className={styles.tableContainer}>
                {tableLoading ? (
                  <div className={styles.tableMessage}>Loading branch priorities...</div>
                ) : tableError ? (
                  <div className={styles.tableMessage}>{tableError}</div>
                ) : tableData.length === 0 ? (
                  <div className={styles.tableMessage}>No branch priorities found.</div>
                ) : (
                  tableData.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.tableRow} ${selectedBranch?.id === item.id ? styles.selected : ''}`}
                      onClick={() => handleBranchSelect(item)}
                    >
                      <div className={styles.tableCell}>{item.priority}</div>
                      <div className={styles.tableCell}>{item.branch}</div>
                      <div className={styles.tableCell}>{item.session}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchPriority; 