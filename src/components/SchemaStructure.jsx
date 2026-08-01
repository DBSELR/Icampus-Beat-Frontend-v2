import React, { useState, useEffect, useMemo } from 'react';
import { FaProjectDiagram } from 'react-icons/fa';
import styles from './Evaluation.module.css';
import ss from './SchemaStructure.module.css';
import {
  getAppData,
  getSchemaStructureSchemas,
  checkSchemaStructureName,
  loadSchemaStructureForEdit,
  saveSchemaStructure,
  deleteSchemaStructure,
} from '../utils/api';

const NO_OF_QUESTIONS = [{ value: '0', text: 'Select' }, ...Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), text: String(i + 1) }))];
const MAX_SECTIONS    = [{ value: '0', text: 'Select' }, ...'ABCDEFGHIJ'.split('').map((c, i) => ({ value: String(i + 1), text: c }))];

const emptyQuestion = (idx = 1) => ({
  qno: String(idx),
  maxMrk: '',
  qStatus: 'C',
  maxNoofQuestions: '',
  maxSections: '',
});

const SchemaStructure = () => {
  const appData    = getAppData() || {};
  const course     = (appData.course     || '').trim();
  const regulation = (appData.regulation || '').trim();

  const [schemaName,    setSchemaName]    = useState('');
  const [maxMarks,      setMaxMarks]      = useState('');
  const [savedSchema,   setSavedSchema]   = useState('');
  const [noOfQuestions, setNoOfQuestions] = useState('0');
  const [maxSections,   setMaxSections]   = useState('0');
  const [choiceType,    setChoiceType]    = useState('compulsory');
  const [message,       setMessage]       = useState(null);
  const [error,         setError]         = useState('');
  const [schemasList,   setSchemasList]   = useState([]);
  const [questions,     setQuestions]     = useState([emptyQuestion(1)]);
  const [semester,      setSemester]      = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [checkingName,  setCheckingName]  = useState(false);
  const [nameAvailable, setNameAvailable] = useState(null);

  const canLoadSchemas = !!(course && regulation && semester);

  useEffect(() => {
    const sem = (appData.examSemester || '').trim();
    if (sem) setSemester(sem);
  }, [appData.examSemester]);

  useEffect(() => {
    if (!canLoadSchemas) { setSchemasList([]); return; }
    (async () => {
      try {
        setIsLoading(true);
        const res = await getSchemaStructureSchemas(course, regulation, semester);
        if (res?.success && Array.isArray(res?.data)) {
          const list = (res.data || []).map(row => {
            const name = row.SCHEMANAME ?? row.schemaName ?? row.Schemaname ?? '';
            return name ? String(name) : '';
          }).filter(Boolean);
          setSchemasList([...new Set(list)]);
        } else {
          setSchemasList([]);
        }
      } catch { setSchemasList([]); }
      finally  { setIsLoading(false); }
    })();
  }, [course, regulation, semester, canLoadSchemas]);

  const handleSchemaNameBlur = async () => {
    const name = (schemaName || '').trim();
    if (!name) { setNameAvailable(null); return; }
    try {
      setCheckingName(true);
      const res      = await checkSchemaStructureName(name);
      const countRow = Array.isArray(res?.data) ? res.data[0] : res?.data;
      const countVal = countRow?.CNT ?? countRow?.Count ?? countRow?.count ?? countRow?.TOTAL ?? 0;
      const exists   = Number(countVal) > 0;
      setNameAvailable(!exists);
      setError(exists ? `Schema '${name}' already exists. Select it from Saved Schema to edit.` : '');
    } catch { setNameAvailable(null); }
    finally  { setCheckingName(false); }
  };

  const handleSavedSchemaChange = async (value) => {
    setSavedSchema(value);
    setError('');
    setMessage(null);
    if (!value) { setSchemaName(''); setQuestions([emptyQuestion(1)]); return; }
    try {
      setIsLoading(true);
      const res  = await loadSchemaStructureForEdit(value);
      const rows = Array.isArray(res?.data) ? res.data : [];
      if (!rows.length) { setSchemaName(value); setQuestions([emptyQuestion(1)]); return; }
      const first = rows[0] || {};
      setSchemaName(first.SCHEMANAME ?? first.schemaName ?? value);
      setMaxMarks(String(first.MaxMarks ?? first.MAXMARKS ?? first.maxMarks ?? '') || '');
      setNoOfQuestions(String(first.MaxNoofQuestions ?? first.MAXNOOFQUESTIONS ?? first.maxNoofquestions ?? '0'));
      setMaxSections(String(first.MaxSections ?? first.MAXSECTIONS ?? first.maxSections ?? '0'));
      const qrows = rows
        .filter(r => r.QNO ?? r.qno)
        .map((r, idx) => ({
          qno:             String(r.QNO    ?? r.qno    ?? (idx + 1)),
          maxMrk:          String(r.MaxMrk ?? r.MAXMRK ?? r.maxMrk ?? ''),
          qStatus:         String(r.QStatus ?? r.QSTATUS ?? r.qStatus ?? 'O'),
          maxNoofQuestions:String(r.QMaxNoofQuestions ?? r.MaxNoofQuestions ?? r.MAXNOOFQUESTIONS ?? r.maxNoofQuestions ?? ''),
          maxSections:     String(r.QMaxSections ?? r.MaxSections ?? r.MAXSECTIONS ?? r.maxSections ?? ''),
        }));
      setQuestions(qrows.length ? qrows : [emptyQuestion(1)]);
    } catch (err) {
      setError(err?.message || 'Failed to load schema');
      setQuestions([emptyQuestion(1)]);
    } finally { setIsLoading(false); }
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const visibleQuestions = useMemo(() => {
    const maxQ = parseInt(noOfQuestions, 10) || 0;
    if (!maxQ) return questions;
    if (questions.length < maxQ)
      return [...questions, ...Array.from({ length: maxQ - questions.length }, (_, i) => emptyQuestion(questions.length + i + 1))];
    return questions.slice(0, maxQ);
  }, [questions, noOfQuestions]);

  const grandTotal = useMemo(() =>
    visibleQuestions.reduce((sum, q) => sum + (parseFloat(q.maxMrk || '0') || 0), 0),
  [visibleQuestions]);

  const handleSave = async () => {
    const name = (schemaName || savedSchema || '').trim();
    if (!name)                   { setError('Please fill OR select Schema Name'); return; }
    if (!semester)               { setError('Please select Semester');            return; }
    if (noOfQuestions === '0')   { setError('Please select No. of Questions');    return; }
    if (maxSections   === '0')   { setError('Please select Max Sections');        return; }
    if (!course || !regulation)  { setError('Please select Course and Regulation in header.'); return; }
    setError(''); setMessage(null);

    const questionsPayload = visibleQuestions
      .filter(q => q.maxMrk && q.qno)
      .map(q => ({ qno: q.qno, maxMrk: q.maxMrk, qStatus: q.qStatus || 'O', maxNoofQuestions: q.maxNoofQuestions || '', maxSections: q.maxSections || '' }));

    const payload = { schemaName: name, course, regulation, sem: semester, maxMarks: maxMarks || String(grandTotal || ''), maxNoofQuestions: noOfQuestions, maxSections, questions: questionsPayload };
    try {
      setIsLoading(true);
      const res = await saveSchemaStructure(payload);
      setMessage(res?.message || `Schema '${name}' saved.`);
      if (!schemasList.includes(name)) { setSchemasList(prev => [...prev, name]); setSavedSchema(name); }
    } catch (err) {
      setError(err?.message || 'Failed to save schema');
    } finally { setIsLoading(false); }
  };

  const handleClear = () => {
    setSchemaName(''); setMaxMarks(''); setSavedSchema('');
    setNoOfQuestions('0'); setMaxSections('0'); setChoiceType('compulsory');
    setQuestions([emptyQuestion(1)]); setMessage(null); setError(''); setNameAvailable(null);
  };

  const handleDelete = async () => {
    const name = (savedSchema || schemaName || '').trim();
    if (!name) { setError('Select a schema to delete.'); return; }
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`Are you sure you want to delete Schema '${name}'?`)) return;
    try {
      setIsLoading(true);
      const res = await deleteSchemaStructure(name);
      setMessage(res?.message || `Schema '${name}' deleted.`);
      setSchemasList(prev => prev.filter(s => s !== name));
      handleClear();
    } catch (err) {
      setError(err?.message || 'Failed to delete schema');
    } finally { setIsLoading(false); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>

        <div className={styles.boxHeader}>
          <h2><FaProjectDiagram className={styles.headerIcon} /> Schema Structure</h2>
        </div>

        <div className={styles.boxContent}>

          {/* ── Top form ── */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Schema Name</label>
              <input
                type="text"
                className={styles.input}
                value={schemaName}
                onChange={e => setSchemaName(e.target.value)}
                onBlur={handleSchemaNameBlur}
                placeholder="Enter schema name"
              />
              {checkingName && <span className={ss.hint}>Checking…</span>}
              {nameAvailable === true && !error && <span className={ss.hintOk}>Available</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Max Marks</label>
              <input
                type="text"
                className={styles.input}
                value={maxMarks}
                onChange={e => setMaxMarks(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Semester</label>
              <select className={styles.select} value={semester} onChange={e => setSemester(e.target.value)}>
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Saved Schema</label>
              <select className={styles.select} value={savedSchema} onChange={e => handleSavedSchemaChange(e.target.value)}>
                <option value="">— Select Schema —</option>
                {schemasList.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>No. of Questions</label>
              <select className={styles.select} value={noOfQuestions} onChange={e => setNoOfQuestions(e.target.value)}>
                {NO_OF_QUESTIONS.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Max Sections</label>
              <select className={styles.select} value={maxSections} onChange={e => setMaxSections(e.target.value)}>
                {MAX_SECTIONS.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            </div>
          </div>

          {/* ── Section header ── */}
          <div className={ss.sectionBar}>
            <span className={ss.sectionLeft}>Schema Structure</span>
            <span className={ss.sectionRight}>Choice / Best of</span>
          </div>

          {/* ── Choice radios ── */}
          <div className={ss.radioRow}>
            {[
              { val: 'compulsory',  label: 'Compulsory',   color: '#16a34a' },
              { val: 'subquestion', label: 'Sub Question',  color: '#ea580c' },
              { val: 'section',     label: 'Section',       color: '#c026d3' },
              { val: 'question',    label: 'Question',      color: '#2563eb' },
            ].map(opt => (
              <label key={opt.val} className={ss.radioLabel}>
                <input type="radio" name="choice" checked={choiceType === opt.val} onChange={() => setChoiceType(opt.val)} />
                <span style={{ color: opt.color, fontWeight: 600 }}>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* ── Question grid ── */}
          <div className={ss.tableWrapper}>
            <table className={ss.schemaTable}>
              <thead>
                <tr>
                  <th>Q.No</th>
                  <th>Max Marks</th>
                  <th>Status (C/O)</th>
                  <th>Max No. of Questions</th>
                  <th>Max Sections</th>
                </tr>
              </thead>
              <tbody>
                {visibleQuestions.map((q, idx) => (
                  <tr key={idx}>
                    <td>
                      <input className={styles.tableInput} value={q.qno}
                        onChange={e => handleQuestionChange(idx, 'qno', e.target.value)} />
                    </td>
                    <td>
                      <input className={styles.tableInput} value={q.maxMrk}
                        onChange={e => handleQuestionChange(idx, 'maxMrk', e.target.value)} />
                    </td>
                    <td>
                      <select className={styles.tableInput} value={q.qStatus}
                        onChange={e => handleQuestionChange(idx, 'qStatus', e.target.value)}>
                        <option value="C">Compulsory</option>
                        <option value="O">Optional</option>
                      </select>
                    </td>
                    <td>
                      <input type="text" className={styles.tableInput} value={q.maxNoofQuestions}
                        onChange={e => handleQuestionChange(idx, 'maxNoofQuestions', e.target.value)} />
                    </td>
                    <td>
                      <input type="text" className={styles.tableInput} value={q.maxSections}
                        onChange={e => handleQuestionChange(idx, 'maxSections', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          <div className={ss.footer}>
            <div className={ss.totals}>
              <span className={ss.totalLabel}>Grand Total</span>
              <input type="text" readOnly value={grandTotal || ''} className={ss.totalInput} />
              <span className={ss.totalLabel}>Max. Marks</span>
              <input type="text" readOnly value={maxMarks || grandTotal || ''} className={ss.totalInput} />
            </div>
            <div className={ss.actions}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}  disabled={isLoading}>
                {isLoading ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnWarning}`} onClick={handleClear}>Clear</button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`}  onClick={handleDelete}>Delete</button>
            </div>
          </div>

          {/* ── Messages ── */}
          {error   && <p className={ss.msgError}>{error}</p>}
          {message && !error && <p className={ss.msgSuccess}>{message}</p>}

        </div>
      </div>
    </div>
  );
};

export default SchemaStructure;
