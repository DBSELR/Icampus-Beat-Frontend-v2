import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { getRegulations, getCourses, getExamMY, saveSelection, getAppData, updateAppData } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const CustomSelect = ({ label, value, options, onChange, disabled, placeholder, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="header-select-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <div className="header-select-label">{label}</div>
      <div
        className={`premium-select custom-dropdown-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span className="select-value" style={{ opacity: value ? 1 : 0.6 }}>
          {loading ? 'Loading...' : (value || placeholder)}
        </span>
        <i className={`fe fe-chevron-down select-icon`} style={{
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)'
        }}></i>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="custom-options-menu" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0,0,0,0.05)',
          zIndex: 2000,
          maxHeight: '300px',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '6px'
        }}>
          {options.length === 0 ? (
            <div style={{ padding: '10px 15px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            options.map((opt, idx) => {
              const isSelected = value === opt.value;
              return (
                <div
                  key={idx}
                  className={`custom-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: isSelected ? '600' : '500',
                    color: isSelected ? 'var(--theme-color)' : '#475569',
                    backgroundColor: isSelected ? 'var(--theme-color-light)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    marginBottom: '2px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.color = 'var(--theme-color)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  {opt.label}
                  {isSelected && <i className="fa fa-check" style={{ fontSize: '12px' }}></i>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const Header = ({ onToggleSidebar, sidebarVisible = true }) => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  const { token } = useAuth();

  const [regulations, setRegulations] = useState([]);
  const [selectedRegulation, setSelectedRegulation] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [examMYs, setExamMYs] = useState([]);
  const [selectedExamMY, setSelectedExamMY] = useState('');
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [examMYLoading, setExamMYLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load initial data
  useEffect(() => {
    const appData = getAppData();
    if (appData) {
      if (appData.regulation) setSelectedRegulation(appData.regulation);
      if (appData.course) setSelectedCourse(appData.course);
      if (appData.examMY) setSelectedExamMY(appData.examMY);
    }
    const fetchRegulations = async () => {
      if (token && regulations.length === 0) {
        setLoading(true);
        try {
          const response = await getRegulations();
          if (response.success) setRegulations(response.data);
        } catch (error) {
          console.error('Failed to fetch regulations:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchRegulations();
  }, [token]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (token && selectedRegulation) {
        setCoursesLoading(true);
        try {
          const response = await getCourses(selectedRegulation);
          if (response.success) setCourses(response.data);
        } catch (error) {
          console.error('Failed to fetch courses:', error);
        } finally {
          setCoursesLoading(false);
        }
      }
    };
    if (selectedRegulation) fetchCourses();
  }, [token, selectedRegulation]);

  useEffect(() => {
    const fetchExamMY = async () => {
      if (token && selectedRegulation && selectedCourse) {
        setExamMYLoading(true);
        try {
          const response = await getExamMY(selectedRegulation, selectedCourse);
          if (response.success) setExamMYs(response.data);
        } catch (error) {
          console.error('Failed to fetch ExamMY:', error);
        } finally {
          setExamMYLoading(false);
        }
      }
    };
    if (selectedCourse) fetchExamMY();
  }, [token, selectedRegulation, selectedCourse]);

  const handleRegulationChange = (regulation) => {
    setSelectedRegulation(regulation);
    setCourses([]);
    setSelectedCourse('');
    setExamMYs([]);
    setSelectedExamMY('');
    updateAppData({ regulation, course: null, examMY: null });
  };

  const handleCourseChange = (course) => {
    setSelectedCourse(course);
    setExamMYs([]);
    setSelectedExamMY('');
    updateAppData({ course, examMY: null });
  };

  const handleExamMYChange = (examMY) => {
    setSelectedExamMY(examMY);
    updateAppData({ examMY });
    if (selectedRegulation && selectedCourse && examMY) {
      handleSaveSelection(selectedRegulation, selectedCourse, examMY);
    }
  };

  const handleSaveSelection = async (regulation, course, examMY) => {
    try {
      const response = await saveSelection(regulation, course, examMY);
      if (response.success) {
        setSaveMessage('Saved!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Header bar spans full width minus sidebar width
  const headerBarStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: sidebarVisible ? '320px' : '0',
    height: '64px',
    backgroundColor: 'rgba(246, 248, 251, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
    boxShadow: 'none',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: '16px',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box',
  };

  return (
    <div style={headerBarStyle}>
      {/* Sidebar toggle arrow — always visible in header when sidebar is closed */}
      {!sidebarVisible && (
        <button
          onClick={() => onToggleSidebar && onToggleSidebar()}
          title="Open sidebar"
          style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: `${themeColor}15`, border: `1px solid ${themeColor}33`,
            color: themeColor, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${themeColor}25`; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${themeColor}15`; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <i className="fa fa-chevron-right" />
        </button>
      )}

      {/* Spacer pushes selects to the right */}
      <div style={{ flex: 1 }} />

      <div className="header-bar-inner" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Regulation */}
        <div className="header-select-container">
          <CustomSelect
            label="Regulation"
            value={selectedRegulation}
            placeholder="Select Regulation"
            loading={loading}
            disabled={loading}
            options={regulations.map(reg => ({ value: reg.regulation, label: reg.regulation }))}
            onChange={handleRegulationChange}
          />
        </div>

        {/* Course */}
        <div className="header-select-container">
          <CustomSelect
            label="Course"
            value={selectedCourse}
            placeholder="Select Course"
            loading={coursesLoading}
            disabled={coursesLoading || !selectedRegulation}
            options={courses.map(c => ({ value: c.course, label: c.course }))}
            onChange={handleCourseChange}
          />
        </div>

        {/* Exam M/Y */}
        <div className="header-select-container">
          <CustomSelect
            label="Exam M/Y"
            value={selectedExamMY}
            placeholder="Select ExamMY"
            loading={examMYLoading}
            disabled={examMYLoading || !selectedRegulation || !selectedCourse}
            options={examMYs.map(e => ({ value: e.exammy, label: e.exammy }))}
            onChange={handleExamMYChange}
          />
        </div>

        {/* Save Message */}
        {saveMessage && (
          <span style={{
            background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac',
            borderRadius: '20px', padding: '4px 14px', fontSize: '12px',
            fontFamily: 'Inter, sans-serif', fontWeight: 600,
            animation: 'fadeIn 0.25s ease', flexShrink: 0,
          }}>
            <i className="fa fa-check mr-1" /> {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default Header;
