import React, { useState, useEffect } from 'react';
import { FaFileSignature } from 'react-icons/fa';
import styles from './Evaluation.module.css';
import sa from './ScriptsAssign.module.css';
import { getAppData } from '../utils/api';
import {
  getEvaluatorRegistrationDropdown,
  getScriptsAssignPendingCount,
  getScriptsAssignSubjects,
  getScriptsAssignSemesters,
  getScriptsAssignBundles,
  getScriptsAssignScripts,
  saveScriptsAssign,
} from '../utils/api';

const ScriptsAssign = () => {
  const appData = getAppData() || {};

  const [evaluators,      setEvaluators]      = useState([]);
  const [evaluator,       setEvaluator]       = useState('');
  const [subjects,        setSubjects]        = useState([]);
  const [subject,         setSubject]         = useState('');
  const [semesters,       setSemesters]       = useState([]);
  const [sem,             setSem]             = useState('');
  const [evalDate,        setEvalDate]        = useState('');
  const [bundles,         setBundles]         = useState([]);
  const [selectedBundles, setSelectedBundles] = useState([]);
  const [scripts,         setScripts]         = useState([]);
  const [selectedScripts, setSelectedScripts] = useState([]);
  const [selectAll,       setSelectAll]       = useState(false);
  const [qpFile,          setQpFile]          = useState(null);
  const [keyFile,         setKeyFile]         = useState(null);
  const [scriptsPending,  setScriptsPending]  = useState(0);
  const [message,         setMessage]         = useState(null);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  // Load evaluators + pending count on mount
  useEffect(() => {
    (async () => {
      try {
        const [evalRes, pendingRes] = await Promise.all([
          getEvaluatorRegistrationDropdown(),
          getScriptsAssignPendingCount(),
        ]);
        if (evalRes?.success && Array.isArray(evalRes?.data)) {
          setEvaluators(
            (evalRes.data || [])
              .map(e => ({
                value: String(e.USERID ?? e.userId ?? '').trim(),
                text:  String(e.NAME   ?? e.name   ?? e.USERID ?? '').trim(),
              }))
              .filter(x => x.value)
            );
        }
        const row = Array.isArray(pendingRes?.data) ? pendingRes.data[0] : pendingRes?.data;
        setScriptsPending(Number(row?.PendingScripts ?? row?.pendingScripts ?? 0) || 0);
      } catch { /* ignore */ }
    })();
  }, []);

  // Load subjects when evaluator changes
  useEffect(() => {
    if (!evaluator) { setSubjects([]); setSubject(''); resetBelowSubject(); return; }
    (async () => {
      try {
        const res = await getScriptsAssignSubjects(evaluator);
        if (res?.success && Array.isArray(res?.data)) {
          setSubjects(
            (res.data || [])
              .map(p => ({
                code:       String(p.PCode      ?? p.PCODE      ?? p.pcode      ?? ''),
                name:       String(p.PNAME      ?? p.PName      ?? p.pname      ?? ''),
                regulation: String(p.Regulation ?? p.REGULATION ?? p.regulation ?? ''),
              }))
              .filter(x => x.code)
          );
        } else { setSubjects([]); }
      } catch { setSubjects([]); }
      setSubject(''); resetBelowSubject();
    })();
  }, [evaluator]);

  // Load semesters when subject changes — use the subject's own regulation from tbl_Eval_UserPapers
  useEffect(() => {
    if (!evaluator || !subject) { setSemesters([]); setSem(''); resetBelowSem(); return; }
    const subjectRegulation = subjects.find(s => s.code === subject)?.regulation || '';
    (async () => {
      try {
        const res = await getScriptsAssignSemesters(subjectRegulation, subject);
        if (res?.success && Array.isArray(res?.data)) {
          const list = [...new Set(
            (res.data || []).map(r => String(r.SEM ?? r.sem ?? '')).filter(Boolean)
          )].sort((a, b) => Number(a) - Number(b));
          setSemesters(list);
        } else { setSemesters([]); }
      } catch { setSemesters([]); }
      setSem(''); resetBelowSem();
    })();
  }, [evaluator, subject, subjects]);

  // Load bundles when sem changes
  useEffect(() => {
    if (!subject || !sem) { setBundles([]); setSelectedBundles([]); setScripts([]); setSelectedScripts([]); return; }
    (async () => {
      try {
        const res = await getScriptsAssignBundles(subject, sem);
        if (res?.success && Array.isArray(res?.data)) {
          setBundles(
            (res.data || [])
              .map(r => String(r.BundleNo ?? r.BUNDLENO ?? r.Ctrbar ?? r.CTRBAR ?? ''))
              .filter(Boolean)
          );
        } else { setBundles([]); }
      } catch { setBundles([]); }
      setSelectedBundles([]); setScripts([]); setSelectedScripts([]);
    })();
  }, [subject, sem]);

  const resetBelowSubject = () => { setSemesters([]); setSem(''); resetBelowSem(); };
  const resetBelowSem     = () => { setBundles([]); setSelectedBundles([]); setScripts([]); setSelectedScripts([]); setSelectAll(false); };

  const handleBundlesChange = async (e) => {
    const values = Array.from(e.target.selectedOptions).map(o => o.value).filter(Boolean);
    setSelectedBundles(values);
    setSelectAll(false); setSelectedScripts([]);
    if (!values.length) { setScripts([]); return; }
    try {
      setLoading(true);
      const res = await getScriptsAssignScripts(subject, sem, values[0]);
      if (res?.success && Array.isArray(res?.data)) {
        setScripts(
          (res.data || [])
            .map((r, i) => ({
              id:      String(r.Barcode ?? r.BARCODE ?? r.ScriptId ?? r.SCRIPTID ?? i),
              display: String(r.Barcode ?? r.BARCODE ?? r.ScriptNo  ?? r.SCRIPTNO  ?? i),
            }))
            .filter(x => x.id)
        );
      } else { setScripts([]); }
    } catch { setScripts([]); }
    finally { setLoading(false); }
  };

  const handleScriptsChange = (e) => {
    const values = Array.from(e.target.selectedOptions).map(o => o.value).filter(Boolean);
    setSelectedScripts(values);
    setSelectAll(values.length > 0 && values.length === scripts.length);
    setMessage(null);
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setSelectedScripts(checked ? scripts.map(s => s.id) : []);
  };

  const handleSave = async () => {
    if (!evaluator)               { setError('Please select Evaluator');                      return; }
    if (!subject)                 { setError('Please select Subject');                        return; }
    if (!sem)                     { setError('Please select Semester');                       return; }
    if (!evalDate)                { setError('Please enter Evaluation Date');                 return; }
    if (!selectedBundles.length)  { setError('Please select at least one Bundle Number');     return; }
    if (!selectedScripts.length)  { setError('Please select at least one Script');            return; }
    if (!qpFile)                  { setError('Please upload Question Paper file');            return; }
    if (!keyFile)                 { setError('Please upload Key file');                       return; }
    setError(''); setMessage(null);
    try {
      setLoading(true);
      const res = await saveScriptsAssign({
        evaluatorId: evaluator,
        papCode:     subject,
        sem,
        evalDate,
        bundleNos:   selectedBundles,
        scriptIds:   selectedScripts,
        qpFile,
        keyFile,
      });
      setMessage(res?.message || 'Scripts assigned successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to save scripts assignment');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    setEvaluator(''); setSubject(''); setSem(''); setEvalDate('');
    setSelectedBundles([]); setScripts([]); setSelectedScripts([]);
    setSelectAll(false); setQpFile(null); setKeyFile(null);
    setMessage(null); setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaFileSignature className={styles.headerIcon} /> Scripts Assign</h2>
          <span className={sa.pendingBadge}>{scriptsPending} Scripts Pending</span>
        </div>

        <div className={styles.boxContent}>
          <div className={sa.layout}>

            {/* ── Left: Form ── */}
            <div className={sa.formPanel}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Evaluator <span className={sa.required}>*</span></label>
                <select className={styles.select} value={evaluator} onChange={e => { setEvaluator(e.target.value); setMessage(null); setError(''); }}>
                  <option value="">Select Evaluator</option>
                  {evaluators.map(ev => <option key={ev.value} value={ev.value}>{ev.text}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Subject <span className={sa.required}>*</span></label>
                <select className={styles.select} value={subject} onChange={e => { setSubject(e.target.value); setMessage(null); setError(''); }}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.code} value={s.code}>{s.name || s.code}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Semester <span className={sa.required}>*</span></label>
                <select className={styles.select} value={sem} onChange={e => { setSem(e.target.value); setMessage(null); setError(''); }}>
                  <option value="">Select Sem</option>
                  {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Evaluation Date <span className={sa.required}>*</span></label>
                <input type="date" className={styles.input} value={evalDate} onChange={e => setEvalDate(e.target.value)} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Question Paper <span className={sa.required}>*</span></label>
                <input type="file" accept=".pdf" className={sa.fileInput} onChange={e => setQpFile(e.target.files?.[0] || null)} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Key <span className={sa.required}>*</span></label>
                <input type="file" accept=".pdf" className={sa.fileInput} onChange={e => setKeyFile(e.target.files?.[0] || null)} />
              </div>

              <div className={sa.actions}>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnWarning}`} onClick={handleCancel} disabled={loading}>Cancel</button>
              </div>
            </div>

            {/* ── Middle: Bundle Numbers ── */}
            <div className={sa.bundlePanel}>
              <div className={sa.sectionLabel}>
                Bundle No.
                {bundles.length > 0 && <span className={sa.badge}>{bundles.length}</span>}
              </div>
              <select
                multiple
                className={sa.listBox}
                value={selectedBundles}
                onChange={handleBundlesChange}
              >
                {bundles.length === 0
                  ? <option disabled value="">No bundles available</option>
                  : bundles.map(b => <option key={b} value={b}>{b}</option>)
                }
              </select>
              <p className={sa.listHint}>Click to load scripts</p>
            </div>

            {/* ── Right: Scripts ── */}
            <div className={sa.scriptsPanel}>
              <div className={sa.sectionLabel}>
                Scripts
                {scripts.length > 0 && <span className={sa.badge}>{scripts.length}</span>}
                {selectedScripts.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#1d4ed8' }}>
                    {selectedScripts.length} selected
                  </span>
                )}
              </div>
              <label className={sa.selectAllRow}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={e => handleSelectAll(e.target.checked)}
                  disabled={!scripts.length}
                />
                Select All Scripts
              </label>
              <select
                multiple
                className={sa.listBox}
                style={{ borderRadius: 0 }}
                value={selectedScripts}
                onChange={handleScriptsChange}
              >
                {scripts.length === 0
                  ? <option disabled value="">Select a Bundle Number first</option>
                  : scripts.map(s => <option key={s.id} value={s.id}>{s.display}</option>)
                }
              </select>
              <p className={sa.listHint}>Hold Ctrl / Cmd to select multiple</p>
            </div>

          </div>

          {error   && <div className={sa.msgError}>{error}</div>}
          {message && !error && <div className={sa.msgSuccess}>{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default ScriptsAssign;
