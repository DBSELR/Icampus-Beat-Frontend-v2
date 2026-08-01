import React, { useState, useEffect } from 'react';
import { FaTasks } from 'react-icons/fa';
import styles from './Evaluation.module.css';
import as from './ApplySchema.module.css';
import { getAppData } from '../utils/api';
import {
  getSchemaStructureSchemas,
  getApplySchemaSemesters,
  getApplySchemaPapers,
  getApplySchemaAssigned,
  saveApplySchema,
  deleteApplySchema,
} from '../utils/api';

// Extract TempCode from composite "PCode@TempCode@PName@Sem"
const getTempCode = (composite) => {
  const parts = String(composite || '').split('@');
  return parts.length > 1 ? parts[1] : parts[0];
};

const ApplySchema = () => {
  const appData    = getAppData() || {};
  const course     = (appData.course     || '').trim();
  const regulation = (appData.regulation || '').trim();
  const examMY     = (appData.examMY     || '').trim();

  const [savedSchema,      setSavedSchema]      = useState('');
  const [semester,         setSemester]         = useState('');
  const [semesters,        setSemesters]        = useState([]);
  const [schemas,          setSchemas]          = useState([]);
  const [papers,           setPapers]           = useState([]); // { code: composite, name, tempCode, assigned }
  const [selectedPapCodes, setSelectedPapCodes] = useState([]);
  const [grandTotal,       setGrandTotal]       = useState('');
  const [maxMarksLabel,    setMaxMarksLabel]     = useState('');
  const [message,          setMessage]          = useState(null);
  const [error,            setError]            = useState('');
  const [loading,          setLoading]          = useState(false);

  const canLoad = !!(course && regulation && examMY);

  // Load semesters on mount
  useEffect(() => {
    if (!canLoad) { setSemesters([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await getApplySchemaSemesters(course, regulation, examMY);
        if (res?.success && Array.isArray(res?.data)) {
          const list = [...new Set((res.data || []).map(r => String(r.SEM ?? r.sem ?? r.Sem ?? '')).filter(Boolean))].sort((a,b) => Number(a)-Number(b));
          setSemesters(list);
        } else { setSemesters([]); }
      } catch { setSemesters([]); }
      finally { setLoading(false); }
    })();
  }, [course, regulation, examMY, canLoad]);

  // Load schemas + papers when semester changes
  useEffect(() => {
    if (!canLoad || !semester) { setSchemas([]); setPapers([]); setSelectedPapCodes([]); return; }
    (async () => {
      try {
        setLoading(true);
        const [schemaRes, papersRes] = await Promise.all([
          getSchemaStructureSchemas(course, regulation, ''),
          getApplySchemaPapers(course, regulation, semester, examMY),
        ]);

        if (schemaRes?.success && Array.isArray(schemaRes?.data)) {
          const list = [...new Set((schemaRes.data || []).map(r => String(r.SCHEMANAME ?? r.schemaName ?? '')).filter(Boolean))];
          setSchemas(list);
        } else { setSchemas([]); }

        if (papersRes?.success && Array.isArray(papersRes?.data)) {
          const list = (papersRes.data || []).map(p => {
            const composite = String(p.pCode ?? p.PCODE ?? p.pcode ?? '');
            const name      = String(p.PNAME ?? p.pname ?? composite);
            const tempCode  = getTempCode(composite);
            return composite ? { code: composite, name, tempCode } : null;
          }).filter(Boolean);
          // deduplicate by tempCode
          const seen = new Set();
          setPapers(list.filter(p => { if (seen.has(p.tempCode)) return false; seen.add(p.tempCode); return true; }));
        } else { setPapers([]); }

        setSavedSchema('');
        setSelectedPapCodes([]);
        setGrandTotal('');
        setMaxMarksLabel('');
        setMessage(null);
        setError('');
      } catch (err) {
        setSchemas([]); setPapers([]);
        setError(err?.message || 'Failed to load data');
      } finally { setLoading(false); }
    })();
  }, [course, regulation, examMY, semester, canLoad]);

  // When schema selected: load assigned papers + schema marks info
  const handleSavedSchemaChange = async (value) => {
    setSavedSchema(value);
    setMessage(null); setError('');
    setSelectedPapCodes([]);
    setGrandTotal(''); setMaxMarksLabel('');
    if (!value || !semester || !canLoad) return;
    try {
      setLoading(true);
      const assignedRes = await getApplySchemaAssigned(value, course, regulation, semester);
      if (assignedRes?.success && Array.isArray(assignedRes?.data)) {
        // assignedRes returns TempCodes (pcode col). Match against papers list by tempCode.
        const assignedTempCodes = new Set(
          (assignedRes.data || []).map(r => String(r.pcode ?? r.PCODE ?? r.PCode ?? '')).filter(Boolean)
        );
        // Pre-select papers whose tempCode is in assigned set
        const preSelected = papers.filter(p => assignedTempCodes.has(p.tempCode)).map(p => p.code);
        setSelectedPapCodes(preSelected);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load assigned papers');
    } finally { setLoading(false); }
  };

  const handlePapersChange = (e) => {
    const values = Array.from(e.target.selectedOptions || []).map(o => o.value).filter(Boolean);
    setSelectedPapCodes(values);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!savedSchema)              { setError('Please select Saved Schema');         return; }
    if (!semester)                 { setError('Please select Semester');             return; }
    if (!selectedPapCodes.length)  { setError('Please select at least one paper.');  return; }
    if (!canLoad)                  { setError('Please select Course, Regulation and Exam M/Y in header.'); return; }
    setError(''); setMessage(null);
    const payload = { schemaName: savedSchema, course, regulation, sem: semester, examMY, papCodes: selectedPapCodes };
    try {
      setLoading(true);
      const res = await saveApplySchema(payload);
      setMessage(res?.message || 'Schema applied to selected papers.');
    } catch (err) {
      setError(err?.message || 'Failed to apply schema');
    } finally { setLoading(false); }
  };

  const handleClear = () => {
    setSavedSchema(''); setSemester('');
    setSelectedPapCodes([]); setGrandTotal(''); setMaxMarksLabel('');
    setMessage(null); setError('');
  };

  const handleDelete = async () => {
    if (!savedSchema)             { setError('Please select Saved Schema');                   return; }
    if (!selectedPapCodes.length) { setError('Please select at least one paper to remove.'); return; }
    setError(''); setMessage(null);
    try {
      setLoading(true);
      for (const composite of selectedPapCodes) {
        // eslint-disable-next-line no-await-in-loop
        await deleteApplySchema(regulation, course, examMY, composite, semester);
      }
      setMessage('Schema removed from selected papers.');
      setSelectedPapCodes([]);
    } catch (err) {
      setError(err?.message || 'Failed to remove schema');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaTasks className={styles.headerIcon} /> Apply Schema</h2>
        </div>

        <div className={styles.boxContent}>

          {/* ── Top controls ── */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Saved Schema</label>
              <select className={styles.select} value={savedSchema} onChange={e => handleSavedSchemaChange(e.target.value)}>
                <option value="">Select Schema Name</option>
                {schemas.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Semester</label>
              <select className={styles.select} value={semester} onChange={e => setSemester(e.target.value)}>
                <option value="">Select</option>
                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className={as.topActions}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}  onClick={handleSave}   disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnWarning}`}  onClick={handleClear}  disabled={loading}>Clear</button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`}   onClick={handleDelete} disabled={loading}>Delete</button>
            </div>
          </div>

          <hr className={styles.hr} />

          {/* ── Main layout ── */}
          <div className={as.mainLayout}>

            {/* Left: schema info / placeholder */}
            <div className={as.leftPanel}>
              <div className={as.sectionLabel}>Schema Structure Preview</div>
              <div className={as.infoBox}>
                {savedSchema
                  ? <>
                      <p><strong>Schema:</strong> {savedSchema}</p>
                      <p><strong>Course:</strong> {course} &nbsp;|&nbsp; <strong>Regulation:</strong> {regulation}</p>
                      <p><strong>Semester:</strong> {semester} &nbsp;|&nbsp; <strong>Exam:</strong> {examMY}</p>
                      <p style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
                        Select papers on the right and click <strong>Save</strong> to apply this schema.
                      </p>
                    </>
                  : <p className={as.placeholder}>Select a Saved Schema and Semester, then choose papers to apply the schema.</p>
                }
              </div>

              {/* Grand Total / Max Marks */}
              {(grandTotal || maxMarksLabel) && (
                <div className={as.totalsRow}>
                  <span className={as.totalLabel}>Grand Total</span>
                  <input type="text" readOnly value={grandTotal} className={as.totalInput} />
                  <span className={as.totalLabel}>Max. Marks</span>
                  <input type="text" readOnly value={maxMarksLabel} className={as.totalInput} />
                </div>
              )}
            </div>

            {/* Right: papers listbox */}
            <div className={as.rightPanel}>
              <div className={as.sectionLabel}>
                Papers
                {papers.length > 0 && <span className={as.badge}>{papers.length}</span>}
              </div>
              <select
                multiple
                className={as.listBox}
                value={selectedPapCodes}
                onChange={handlePapersChange}
              >
                {papers.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <p className={as.listHint}>Hold Ctrl / Cmd to select multiple papers</p>
            </div>

          </div>

          {/* ── Messages ── */}
          {error   && <div className={as.msgError}>{error}</div>}
          {message && !error && <div className={as.msgSuccess}>{message}</div>}

        </div>
      </div>
    </div>
  );
};

export default ApplySchema;
