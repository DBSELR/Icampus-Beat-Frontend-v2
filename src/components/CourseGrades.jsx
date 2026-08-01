import React, { useMemo, useState, useEffect } from 'react';
import styles from './CourseGrades.module.css';
import {
  getAppData,
  getClassGradeBatches,
  getClassGradeGrid,
  saveClassGrade,
  deleteClassGrade,
  copyClassGrades,
} from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const initialForm = {
  batch: '',
  marksFrom: '',
  marksTo: '',
  grade: '',
  gradePoint: '',
};
const CourseGrades = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  const [formData, setFormData] = useState(initialForm);
  const [batches, setBatches] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [course, setCourse] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [copying, setCopying] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromBatch, setCopyFromBatch] = useState('');
  const [copyToBatch, setCopyToBatch] = useState('');
  const [copyToRegu, setCopyToRegu] = useState('');

  const isEdit = useMemo(() => selectedRow != null, [selectedRow]);

  useEffect(() => {
    const appData = getAppData();
    const courseValue = appData?.course || '';
    setCourse(courseValue);

    if (!courseValue) {
      setError('Course not selected. Please choose a course from the header.');
      return;
    }

    fetchBatches(courseValue);
  }, []);

  const fetchBatches = async (courseValue) => {
    setBatchLoading(true);
    setError('');
    try {
      const response = await getClassGradeBatches(courseValue);
      const batchList = response?.success && Array.isArray(response.data) ? response.data : [];
      setBatches(batchList);

      if (batchList.length) {
        const firstBatch = batchList[0];
        const batchName = firstBatch.BATCH || firstBatch.batch || '';
        const reguValue = firstBatch.REGU || firstBatch.regu || '';
        setFormData((prev) => ({ ...prev, batch: batchName }));
        setCopyToBatch(batchName);
        setCopyToRegu(reguValue);
        fetchGrades(courseValue, reguValue);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load batches');
      setBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const fetchGrades = async (courseValue, regu) => {
    if (!courseValue || !regu) {
      setGrades([]);
      return;
    }

    setGradesLoading(true);
    setMessage('');
    try {
      const response = await getClassGradeGrid(courseValue, regu);
      setError('');

      if (!response?.success) {
        setGrades([]);
        setMessage(response?.message || 'No grade records found for the selected batch.');
        return;
      }

      const gradeRows = Array.isArray(response.data)
        ? response.data.map((row, index) => {
            const marksFrom = row.SGPA_FROM ?? row.MRK_FROM ?? row.marksFrom ?? 0;
            const marksTo = row.SGPA_TO ?? row.MRK_TO ?? row.marksTo ?? 0;
            const gradeValue = row.CLASS ?? row.GR ?? row.grade ?? '';
            const gradePointValue = row.GRADE_POINT ?? row.GRADEPOINT ?? row.GRPTS ?? row.gradePoint ?? 0;
            const apiId = row.ID ?? row.id ?? null;

            return {
              id: apiId ?? `${row.REGU || regu}-${marksFrom}-${index}`,
              apiId,
              regu: row.REGU || row.regu || regu,
              marksFrom: Number(marksFrom),
              marksTo: Number(marksTo),
              grade: gradeValue.toString(),
              gradePoint: Number(gradePointValue),
            };
          })
        : [];

      setGrades(gradeRows);
      setMessage(gradeRows.length ? '' : 'No grade records found for the selected batch.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load grade details');
      setGrades([]);
    } finally {
      setGradesLoading(false);
      setSelectedRow(null);
      setFormData((prev) => ({ ...prev, marksFrom: '', marksTo: '', grade: '', gradePoint: '' }));
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'batch') {
      setFormData((prev) => ({ ...prev, batch: value }));
      setCopyToBatch(value);
      const batchInfo = batches.find((item) => (item.BATCH || item.batch) === value);
      const regu = batchInfo?.REGU || batchInfo?.regu || '';
      setCopyToRegu(regu);
      fetchGrades(course, regu);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData((prev) => ({ ...initialForm, batch: prev.batch }));
    setSelectedRow(null);
  };

  const handleSave = async () => {
    const missingFields = [
      { key: 'batch', value: formData.batch },
      { key: 'marksFrom', value: formData.marksFrom },
      { key: 'marksTo', value: formData.marksTo },
      { key: 'grade', value: formData.grade },
      { key: 'gradePoint', value: formData.gradePoint },
    ].filter((field) => field.value === '' || field.value === null || field.value === undefined);

    if (missingFields.length > 0) {
      alert('Please fill in all fields.');
      return;
    }

    if (Number(formData.marksFrom) > Number(formData.marksTo)) {
      alert('Marks From should be less than or equal to Marks To.');
      return;
    }

    const batchInfo = batches.find((item) => (item.BATCH || item.batch) === formData.batch);
    const regu = batchInfo?.REGU || batchInfo?.regu;

    if (!regu) {
      alert('Unable to determine regulation for the selected batch.');
      return;
    }

    const payload = {
      Id: isEdit ? String(selectedRow.apiId ?? selectedRow.id ?? '') : '',
      Regu: regu.toString(),
      SgpaFrom: Number(formData.marksFrom),
      SgpaTo: Number(formData.marksTo),
      ClassName: formData.grade.toUpperCase(),
      Course: course,
    };

    try {
      setSaving(true);
      const response = await saveClassGrade(payload);
      if (response.success) {
        alert(response.message || 'Grade saved successfully.');
        fetchGrades(course, regu);
        resetForm();
      } else {
        alert(response.message || 'Failed to save grade.');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save grade.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setSelectedRow(row);
    setFormData({
      batch: formData.batch,
      marksFrom: row.marksFrom,
      marksTo: row.marksTo,
      grade: row.grade,
      gradePoint: row.gradePoint,
    });
  };

  const handleDelete = async (rowId) => {
    const row = grades.find((item) => item.id === rowId);
    if (!row) return;

    if (!window.confirm('Do you want to delete this record?')) {
      return;
    }

    try {
      setDeletingId(rowId);
      await deleteClassGrade(row.apiId || row.id);
      const batchInfo = batches.find((item) => (item.BATCH || item.batch) === formData.batch);
      const regu = batchInfo?.REGU || batchInfo?.regu;
      fetchGrades(course, regu);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete grade.');
    } finally {
      setDeletingId(null);
    }
  };

  const openCopyModal = () => {
    if (!formData.batch) {
      alert('Please select the target batch first.');
      return;
    }

    const batchInfo = batches.find((item) => (item.BATCH || item.batch) === formData.batch);
    setCopyToRegu(batchInfo?.REGU || batchInfo?.regu || '');
    setCopyToBatch('');
    setCopyFromBatch('');
    setShowCopyModal(true);
  };

  const closeCopyModal = () => {
    setShowCopyModal(false);
    setCopying(false);
  };

  const handleCopySave = async () => {
    // Validation 1: From Batch must be selected
    if (!copyFromBatch) {
      alert('Please Select From Batch');
      return;
    }

    // Validation 2: To Batch must be entered
    if (!copyToBatch) {
      alert('Please Enter To Batch');
      return;
    }

    // Validation 3: To Batch year must be greater than From Batch year (same as .NET)
    const fromYear = parseInt(copyFromBatch.substring(0, 4), 10);
    const toYear = parseInt(copyToBatch.substring(0, 4), 10);

    if (!isNaN(fromYear) && !isNaN(toYear) && fromYear >= toYear) {
      alert('To Batch Must be Greater than From Batch');
      return;
    }

    const fromBatchInfo = batches.find((item) => (item.BATCH || item.batch) === copyFromBatch);
    const toBatchInfo = batches.find((item) => (item.BATCH || item.batch) === copyToBatch);

    const fromRegu = fromBatchInfo?.REGU || fromBatchInfo?.regu || '';
    let toRegu = toBatchInfo?.REGU || toBatchInfo?.regu || '';

    if (!fromRegu) {
      alert('Unable to determine regulation for the source batch.');
      return;
    }

    if (!toRegu) {
      toRegu = copyToRegu || copyToBatch;
    }

    if (!toRegu) {
      alert('Unable to determine regulation for the target batch. Please enter a valid value.');
      return;
    }

    try {
      setCopying(true);
      const response = await copyClassGrades(fromRegu.toString(), toRegu.toString(), course);

      // Check if grades already exist (API should return this info)
      if (response?.exists || response?.alreadyExists) {
        const recreate = window.confirm('Grades already created. Do you want to recreate?');
        if (!recreate) {
          setCopying(false);
          return;
        }
        // Call API again with recreate flag or force copy
        const recreateResponse = await copyClassGrades(fromRegu.toString(), toRegu.toString(), course, true);
        alert(recreateResponse.message || 'Grades copied successfully.');
      } else {
        alert(response.message || 'Grades copied successfully.');
      }

      fetchGrades(course, toRegu.toString());
      closeCopyModal();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to copy grade data.');
    } finally {
      setCopying(false);
    }
  };

  const formatValue = (value) => {
    if (Number.isNaN(Number(value))) return value;
    return Number(value).toFixed(2).replace(/\.00$/, '');
  };

  return (
    <div className={styles.wrapper} style={{ '--theme-color': themeColor }}>
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h2>Subject Grade Master</h2>
        </header>
        <div className={styles.cardBody}>
          {error && <div className={`${styles.banner} ${styles.error}`}>{error}</div>}
          {message && !error && <div className={`${styles.banner} ${styles.info}`}>{message}</div>}
          <div className={styles.formRow}>
            <label>Batch</label>
            <select
              name="batch"
              value={formData.batch}
              onChange={handleInputChange}
              disabled={batchLoading}
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => {
                const batchName = batch.BATCH || batch.batch;
                return (
                  <option key={batchName} value={batchName}>
                    {batchName}
                  </option>
                );
              })}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>Marks From</label>
            <input
              type="number"
              name="marksFrom"
              value={formData.marksFrom}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formRow}>
            <label>Marks To</label>
            <input
              type="number"
              name="marksTo"
              value={formData.marksTo}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formRow}>
            <label>Grade</label>
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              className={styles.uppercase}
              maxLength={2}
            />
          </div>
          <div className={styles.formRow}>
            <label>Grade Point</label>
            <input
              type="number"
              step="0.1"
              name="gradePoint"
              value={formData.gradePoint}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <footer className={styles.cardFooter}>
          <div className={styles.footerButtons}>
            <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
            </button>
            <button className={styles.secondaryBtn} onClick={resetForm}>
              Cancel
            </button>
            <div className={styles.copyWrapper}>
            <button
              className={styles.iconBtn}
              onClick={openCopyModal}
              title="Copy grades to batch"
              disabled={copying}
            >
              {copying ? '…' : '📄'}
            </button>
          </div>
        </div>
      </footer>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h2>Grade Details</h2>
        </header>
        <div className={styles.tableWrapper}>
          {gradesLoading ? (
            <div className={styles.loadingState}>Loading grade details...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Regu</th>
                  <th>Marks From</th>
                  <th>Marks To</th>
                  <th>Grade</th>
                  <th>Grade Points</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {grades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>No grades available.</td>
                  </tr>
                ) : (
                  grades.map((row) => (
                    <tr key={row.id}>
                      <td>{row.regu}</td>
                      <td>
                        <button className={styles.linkButton} onClick={() => handleEdit(row)}>
                          {formatValue(row.marksFrom)}
                        </button>
                      </td>
                      <td>{formatValue(row.marksTo)}</td>
                      <td>{row.grade}</td>
                      <td>{formatValue(row.gradePoint)}</td>
                      <td>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(row.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showCopyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Copy Grades Data From Previous Batch</h3>
              <button className={styles.closeBtn} onClick={closeCopyModal} aria-label="Close copy modal">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label>From Batch</label>
                <select value={copyFromBatch} onChange={(event) => setCopyFromBatch(event.target.value)}>
                  <option value="">Select Batch</option>
                  {batches.map((batch) => {
                    const batchName = batch.BATCH || batch.batch;
                    return (
                      <option key={`copy-from-${batchName}`} value={batchName}>
                        {batchName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className={styles.formRow}>
                <label>To Batch</label>
                <input
                  type="text"
                  value={copyToBatch}
                  onChange={(event) => setCopyToBatch(event.target.value)}
                  onBlur={(event) => setCopyToRegu(event.target.value.trim())}
                  placeholder="e.g., 2017-2021"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.primaryBtn} onClick={handleCopySave} disabled={copying}>
                {copying ? 'Copying...' : 'Save'}
              </button>
              <button className={styles.secondaryBtn} onClick={closeCopyModal} disabled={copying}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseGrades;

