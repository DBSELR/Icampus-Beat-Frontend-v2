import React, { useState, useEffect } from 'react';
import { FaBook, FaChevronUp } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import { getAppData, getGroftingExammy, getGroftingSems, runGrofting } from '../utils/api';

const GroftingProcess = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';

  const [exammy, setExammy] = useState('');
  const [semester, setSemester] = useState('');
  const [exammyOptions, setExammyOptions] = useState([]);
  const [semOptions, setSemOptions] = useState([]);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  useEffect(() => {
    if (!course || !regulation) return;
    getGroftingExammy(course, regulation)
      .then(res => {
        if (res.success && res.data) {
          setExammyOptions(res.data.map(r => String(r.exammy || r.EXAMMY || r.ExamMy || r.examMy || r)));
        }
      })
      .catch(() => {});
  }, [course, regulation]);

  const handleExammyChange = async (val) => {
    setExammy(val);
    setSemester('');
    setSemOptions([]);
    if (!val || !course) return;
    try {
      const res = await getGroftingSems(course, val, regulation);
      if (res.success && res.data) {
        setSemOptions(res.data.map(r => String(r.sem || r.SEM || r.Sem || r)));
      }
    } catch {}
  };

  const handleSubmit = async () => {
    if (!course)  { showMessage('Course not set. Please set from Dashboard.', 'error'); return; }
    if (!exammy)  { showMessage('Please select ExamMY.', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await runGrofting(course, exammy);
      showMessage(res.message || 'Grofting process completed.', res.success ? 'success' : 'error');
    } catch (err) {
      showMessage(err.message || 'Grofting process failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box} style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className={globalStyles.boxHeader}>
          <h2><FaBook className={globalStyles.headerIcon} /> Grafting Process</h2>
          <button
            className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>
          {message.text && (
            <div style={{
              margin: '0 auto 24px', padding: '12px 20px', maxWidth: '600px',
              borderRadius: '8px', textAlign: 'center', fontWeight: '600',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {message.text}
            </div>
          )}

          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>
              {/* Course (readonly from appData) */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Course</label>
                <input
                  type="text"
                  value={course}
                  readOnly
                  className={globalStyles.input}
                  style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                />
              </div>

              {/* Exammy */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Exammy</label>
                <select
                  value={exammy}
                  onChange={e => handleExammyChange(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value=''>Select Exammy</option>
                  {exammyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Semester */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <select
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value=''>Select...</option>
                  {semOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Submit */}
              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                <button onClick={handleSubmit} className={`${globalStyles.btn} ${globalStyles.saveBtn}`} disabled={submitting}>
                  {submitting ? 'Processing...' : 'Submit'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: '4px' }}>
              <p style={{ margin: 0, color: '#92400e', fontSize: '14px', fontWeight: '500' }}>Note: After Grofting Process To Run the Result Process</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroftingProcess;
