import React, { useState, useEffect } from 'react';
import { FaUserTie } from 'react-icons/fa';
import styles from './Evaluation.module.css';
import er from './EvaluatorRegistration.module.css';
import { getAppData, getApplySchemaPapers } from '../utils/api';
import {
  getEvaluatorRegistrationList,
  getEvaluatorNextUserId,
  getEvaluatorUserDetails,
  getEvaluatorUserPapers,
  getEvaluatorDepartments,
  saveEvaluatorRegistration,
} from '../utils/api';

const USER_TYPES = [
  { value: '-1', text: 'Select User Type', api: '' },
  { value: '1',  text: 'Evaluator',        api: 'Evaluator' },
  { value: '2',  text: 'Scrutinizer',      api: 'Scrutinizer' },
];

const SEMS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const getTempCode = (composite) => {
  const parts = String(composite || '').split('@');
  return parts.length > 1 ? parts[1] : parts[0];
};

const EvaluatorRegistration = () => {
  const appData    = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course     = (appData.course     || '').trim();
  const examMY     = (appData.examMY     || '').trim();

  const [userType,         setUserType]         = useState('-1');
  const [userId,           setUserId]           = useState('');
  const [name,             setName]             = useState('');
  const [designation,      setDesignation]      = useState('');
  const [department,       setDepartment]       = useState('');
  const [sem,              setSem]              = useState('');
  const [mobile,           setMobile]           = useState('');
  const [mail,             setMail]             = useState('');
  const [college,          setCollege]          = useState('');
  const [isActive,         setIsActive]         = useState(true);
  const [users,            setUsers]            = useState([]);
  const [departments,      setDepartments]      = useState([]);
  const [papers,           setPapers]           = useState([]);
  const [selectedPapCodes, setSelectedPapCodes] = useState([]);
  const [message,          setMessage]          = useState(null);
  const [error,            setError]            = useState('');
  const [loading,          setLoading]          = useState(false);

  const currentUserGroup = USER_TYPES.find(u => u.value === userType)?.api || '';

  // Load departments
  useEffect(() => {
    if (!regulation || !course || !examMY) { setDepartments([]); return; }
    (async () => {
      try {
        const res = await getEvaluatorDepartments(regulation, course, examMY);
        if (res?.success && Array.isArray(res?.data)) {
          setDepartments((res.data || []).map(r => r.GRP ?? r.grp ?? '').filter(Boolean));
        } else { setDepartments([]); }
      } catch { setDepartments([]); }
    })();
  }, [regulation, course, examMY]);

  // Load users list when userType changes
  useEffect(() => {
    if (!currentUserGroup) { setUsers([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await getEvaluatorRegistrationList(currentUserGroup);
        if (res?.success && Array.isArray(res?.data)) {
          setUsers((res.data || []).map(r => ({
            eid:         r.EID         ?? r.eid         ?? '',
            userId:      r.USERID      ?? r.userId      ?? '',
            name:        r.NAME        ?? r.name        ?? '',
            designation: r.DESIGNATION ?? r.designation ?? '',
            department:  r.DEPTARTMENT ?? r.DEPARTMENT  ?? r.department ?? '',
            userGroup:   r.USERGROUP   ?? r.userGroup   ?? currentUserGroup,
            mobile:      r.MOBILE      ?? r.mobile      ?? '',
            email:       r.EMAIL       ?? r.email       ?? '',
            college:     r.COLLEGE     ?? r.college     ?? '',
            isActive:    r.ISACTIVE    ?? r.isActive    ?? '',
          })));
        } else { setUsers([]); }
      } catch { setUsers([]); }
      finally { setLoading(false); }
    })();
  }, [currentUserGroup]);

  // Load papers when semester changes
  useEffect(() => {
    if (!sem || !course || !regulation || !examMY) { setPapers([]); setSelectedPapCodes([]); return; }
    (async () => {
      try {
        const res = await getApplySchemaPapers(course, regulation, sem, examMY);
        if (res?.success && Array.isArray(res?.data)) {
          const seen = new Set();
          const list = (res.data || []).map(p => {
            const composite = String(p.pCode ?? p.PCODE ?? p.pcode ?? '');
            const pName     = String(p.PNAME ?? p.pname ?? composite);
            const tempCode  = getTempCode(composite);
            return composite ? { code: composite, name: pName, tempCode } : null;
          }).filter(Boolean).filter(p => {
            if (seen.has(p.tempCode)) return false;
            seen.add(p.tempCode);
            return true;
          });
          setPapers(list);
        } else { setPapers([]); }
      } catch { setPapers([]); }
    })();
  }, [sem, course, regulation, examMY]);

  const handleUserTypeChange = async (value) => {
    setUserType(value);
    setMessage(null); setError('');
    setSelectedPapCodes([]);
    const group = USER_TYPES.find(u => u.value === value)?.api || '';
    if (!group) { setUserId(''); return; }
    try {
      const res = await getEvaluatorNextUserId(group);
      const row  = Array.isArray(res?.data) ? res.data[0] : res?.data;
      const next = row?.NextUserID ?? row?.nextUserId ?? '';
      if (next) {
        const prefix = group === 'Scrutinizer' ? 'SCR' : 'EVL';
        setUserId(`${prefix}${String(next).padStart(3, '0')}`);
      }
    } catch { /* ignore */ }
  };

  const handleRowClick = async (u) => {
    setMessage(null); setError('');
    try {
      setLoading(true);
      const [detailsRes, papersRes] = await Promise.all([
        getEvaluatorUserDetails(u.userId),
        getEvaluatorUserPapers(u.userId),
      ]);
      const d = Array.isArray(detailsRes?.data) ? detailsRes.data[0] : detailsRes?.data || {};
      setUserId(d.USERID ?? d.userId ?? u.userId ?? '');
      setName(d.NAME ?? d.name ?? '');
      setDesignation(d.DESIGNATION ?? d.designation ?? '');
      setDepartment(d.DEPTARTMENT ?? d.DEPARTMENT ?? d.department ?? u.department ?? '');
      setMobile(d.MOBILE ?? d.mobile ?? '');
      setMail(d.EMAIL ?? d.email ?? '');
      setCollege(d.COLLEGE ?? d.college ?? '');
      const semVal = String(d.SEM ?? d.sem ?? '');
      setSem(semVal);
      const isAct = String(d.ISACTIVE ?? d.isActive ?? '1');
      setIsActive(isAct === '1' || isAct.toLowerCase() === 'true');
      const group = d.USERGROUP ?? d.userGroup ?? currentUserGroup;
      const typeEntry = USER_TYPES.find(t => t.api === group) || USER_TYPES.find(t => t.api === currentUserGroup);
      if (typeEntry) setUserType(typeEntry.value);

      // Pre-select papers
      const assignedCodes = new Set(
        (Array.isArray(papersRes?.data) ? papersRes.data : [])
          .map(p => String(p.PCode ?? p.PCODE ?? p.pcode ?? ''))
          .filter(Boolean)
      );
      const preSelected = papers
        .filter(p => assignedCodes.has(p.code) || assignedCodes.has(p.tempCode))
        .map(p => p.code);
      setSelectedPapCodes(preSelected);
    } catch (err) {
      setError(err?.message || 'Failed to load user details');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (userType === '-1')                                 { setError('Please select User Type');    return; }
    if (!userId.trim())                                    { setError('Please enter User ID');       return; }
    if (!name.trim())                                      { setError('Please enter Name');          return; }
    if (!designation.trim())                               { setError('Please enter Designation');   return; }
    if (!department)                                       { setError('Please select Department');   return; }
    if (!sem)                                              { setError('Please select Semester');     return; }
    if (!mail.trim())                                      { setError('Please enter Mail Address');  return; }
    if (!currentUserGroup)                                 { setError('Invalid User Type');          return; }
    setError(''); setMessage(null);

    const payload = {
      userID:      userId.trim(),
      name:        name.trim(),
      designation: designation.trim(),
      department,
      userGroup:   currentUserGroup,
      mobile:      mobile.trim(),
      email:       mail.trim(),
      college:     college.trim(),
      isActive:    isActive ? '1' : '0',
      sem:         String(sem),
      regulation,
      course,
      examMY,
      papCodes:    selectedPapCodes,
    };
    try {
      setLoading(true);
      const res = await saveEvaluatorRegistration(payload);
      setMessage(res?.message || 'Details Saved Successfully');
      const listRes = await getEvaluatorRegistrationList(currentUserGroup);
      if (listRes?.success && Array.isArray(listRes?.data)) {
        setUsers((listRes.data || []).map(r => ({
          eid:         r.EID         ?? r.eid         ?? '',
          userId:      r.USERID      ?? r.userId      ?? '',
          name:        r.NAME        ?? r.name        ?? '',
          designation: r.DESIGNATION ?? r.designation ?? '',
          department:  r.DEPTARTMENT ?? r.DEPARTMENT  ?? r.department ?? '',
          userGroup:   r.USERGROUP   ?? r.userGroup   ?? currentUserGroup,
          mobile:      r.MOBILE      ?? r.mobile      ?? '',
          email:       r.EMAIL       ?? r.email       ?? '',
          college:     r.COLLEGE     ?? r.college     ?? '',
          isActive:    r.ISACTIVE    ?? r.isActive    ?? '',
        })));
      }
    } catch (err) {
      setError(err?.message || 'Failed to save details');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    setUserType('-1'); setUserId(''); setName(''); setDesignation('');
    setDepartment(''); setSem(''); setMobile(''); setMail(''); setCollege('');
    setIsActive(true); setSelectedPapCodes([]); setPapers([]);
    setMessage(null); setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaUserTie className={styles.headerIcon} /> User Registration</h2>
        </div>

        <div className={styles.boxContent}>
          <div className={er.layout}>

            {/* ── Left: Form ── */}
            <div className={er.formPanel}>
              <div className={styles.formGroup}>
                <label className={styles.label}>User Type <span className={er.required}>*</span></label>
                <select className={styles.select} value={userType} onChange={e => handleUserTypeChange(e.target.value)}>
                  {USER_TYPES.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>User ID <span className={er.required}>*</span></label>
                <input className={styles.input} value={userId} onChange={e => setUserId(e.target.value)} maxLength={32} placeholder="Auto-generated" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Name <span className={er.required}>*</span></label>
                <input className={styles.input} value={name} onChange={e => setName(e.target.value)} maxLength={32} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Designation <span className={er.required}>*</span></label>
                <input className={styles.input} value={designation} onChange={e => setDesignation(e.target.value)} maxLength={32} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Department <span className={er.required}>*</span></label>
                <select className={styles.select} value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Semester <span className={er.required}>*</span></label>
                <select className={styles.select} value={sem} onChange={e => setSem(e.target.value)}>
                  <option value="">Select Sem</option>
                  {SEMS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mobile Number</label>
                <input className={styles.input} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} maxLength={10} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mail Address <span className={er.required}>*</span></label>
                <input className={styles.input} value={mail} onChange={e => setMail(e.target.value)} maxLength={100} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>College</label>
                <input className={styles.input} value={college} onChange={e => setCollege(e.target.value)} maxLength={100} />
              </div>

              <label className={er.checkRow}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Is Active
              </label>

              <div className={er.actions}>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnWarning}`} onClick={handleCancel} disabled={loading}>Cancel</button>
              </div>
            </div>

            {/* ── Middle: Papers ── */}
            <div className={er.papersPanel}>
              <div className={er.sectionLabel}>
                Papers
                {papers.length > 0 && <span className={er.badge}>{papers.length}</span>}
              </div>
              <select
                multiple
                className={er.listBox}
                value={selectedPapCodes}
                onChange={e => { setSelectedPapCodes(Array.from(e.target.selectedOptions).map(o => o.value)); setMessage(null); }}
              >
                {papers.length === 0
                  ? <option disabled value="">Select Semester to load papers</option>
                  : papers.map(p => <option key={p.code} value={p.code}>{p.name}</option>)
                }
              </select>
              <p className={er.listHint}>Hold Ctrl / Cmd to select multiple</p>
            </div>

            {/* ── Right: Users grid ── */}
            <div className={er.gridPanel}>
              <div className={er.sectionLabel}>
                Registered Users
                {users.length > 0 && <span className={er.badge}>{users.length}</span>}
              </div>
              <div className={er.tableWrapper}>
                <table className={er.gridTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User ID</th>
                      <th>Name</th>
                      <th>Dept</th>
                      <th>Group</th>
                      <th>Mobile</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                          {currentUserGroup ? 'No users found' : 'Select a User Type'}
                        </td>
                      </tr>
                    )}
                    {users.map((u, i) => (
                      <tr key={u.eid || u.userId || i} onClick={() => handleRowClick(u)}>
                        <td>{i + 1}</td>
                        <td>{u.userId}</td>
                        <td>{u.name}</td>
                        <td>{u.department}</td>
                        <td>{u.userGroup}</td>
                        <td>{u.mobile}</td>
                        <td>
                          <span className={`${er.activeTag} ${String(u.isActive) === '1' ? er.activeYes : er.activeNo}`}>
                            {String(u.isActive) === '1' ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {error   && <div className={er.msgError}>{error}</div>}
          {message && !error && <div className={er.msgSuccess}>{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default EvaluatorRegistration;
