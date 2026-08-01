import React, { useState } from 'react';
import styles from './ScIssue.module.css';
import { getScIssueStudentInfo, postScIssue } from '../utils/api';

const GENDER_OPTIONS  = ['', 'Male', 'Female', 'Other'];
const CASTE_OPTIONS   = ['', 'OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST'];
const CONDUCT_OPTIONS = ['', 'Good', 'Satisfactory'];

const Field = ({ label, children }) => (
  <div className={styles.controlGroup}>
    <span className={styles.controlLabel}>{label}</span>
    <div className={styles.controls}>{children}</div>
  </div>
);

const ScIssue = () => {
  const [regNo,       setRegNo]       = useState('');
  const [regulation,  setRegulation]  = useState('');
  const [section,     setSection]     = useState('');
  const [studentName, setStudentName] = useState('');
  const [fatherName,  setFatherName]  = useState('');
  const [motherName,  setMotherName]  = useState('');
  const [dob,         setDob]         = useState('');
  const [gender,      setGender]      = useState('');
  const [caste,       setCaste]       = useState('');
  const [email,       setEmail]       = useState('');
  const [mobile,      setMobile]      = useState('');
  const [aadhaar,     setAadhaar]     = useState('');
  const [religion,    setReligion]    = useState('');
  const [conduct,     setConduct]     = useState('');

  const [isLoading,  setIsLoading]  = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message,    setMessage]    = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleRegNoFetch = async () => {
    const val = regNo.trim().toUpperCase();
    if (!val || val.length < 8) return;
    setIsFetching(true);
    try {
      const res = await getScIssueStudentInfo(val);
      if (res.success && res.data) {
        const raw = Array.isArray(res.data) ? res.data[0] : res.data;
        const ci = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
        const get = (...keys) => {
          for (const k of keys) {
            const v = ci[k.toLowerCase()];
            if (v != null && v !== '') return String(v);
          }
          return '';
        };
        const toDateVal = (s) => (!s ? '' : String(s).slice(0, 10));

        setRegulation( get('regulation'));
        setSection(    get('section'));
        setStudentName(get('sname'));
        setFatherName( get('fname'));
        setMotherName( get('mname'));
        setDob(        toDateVal(get('dob')));
        setGender(     get('gender'));
        setCaste(      get('caste'));
        setEmail(      get('email'));
        setMobile(     get('mobile'));
        setAadhaar(    get('aadharno', 'aadhaarno', 'aadhaar'));
        setReligion(   get('religion'));
      } else {
        showMsg(res.message || 'Student not found.');
      }
    } catch (err) {
      showMsg(err.message || 'Failed to fetch student info.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRegNoKeyDown = (e) => {
    if (e.key === 'Enter') handleRegNoFetch();
  };

  const handleSubmit = async () => {
    if (!regNo.trim()) { showMsg('Please enter Register No.'); return; }
    if (!conduct)      { showMsg('Please select Conduct.'); return; }
    setIsLoading(true);
    try {
      const req = {
        regNo:     regNo.trim().toUpperCase(),
        regulation,
        section,
        sName:     studentName,
        fName:     fatherName,
        mName:     motherName,
        conduct,
        dob,
        gender,
        caste,
        email,
        mobile,
        aadhaarNo: aadhaar,
        religion,
      };
      const res = await postScIssue(req);
      if (res.success) {
        showMsg(res.message || 'Study Certificate issued successfully.', 'success');
      } else {
        showMsg(res.message || 'Issue failed.');
      }
    } catch (err) {
      showMsg(err.message || 'Issue failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>Study Certificate Issuing</h2>
        </div>
        <div className={styles.boxContent}>
          <div className={styles.formCols}>
            {/* LEFT COLUMN */}
            <div className={styles.formCol}>
              <Field label="Register No">
                <input
                  type="text"
                  className={styles.inputField}
                  value={regNo}
                  onChange={e => setRegNo(e.target.value.toUpperCase())}
                  onBlur={handleRegNoFetch}
                  onKeyDown={handleRegNoKeyDown}
                  placeholder={isFetching ? 'Fetching...' : ''}
                  disabled={isFetching}
                />
              </Field>
              <Field label="Regulation">
                <input type="text" className={styles.inputField} value={regulation}
                  onChange={e => setRegulation(e.target.value)} />
              </Field>
              <Field label="Section">
                <input type="text" className={styles.inputField} value={section}
                  onChange={e => setSection(e.target.value)} />
              </Field>
              <Field label="Student's Name">
                <input type="text" className={styles.inputField} value={studentName}
                  onChange={e => setStudentName(e.target.value)} />
              </Field>
              <Field label="Father's Name">
                <input type="text" className={styles.inputField} value={fatherName}
                  onChange={e => setFatherName(e.target.value)} />
              </Field>
              <Field label="Mother's Name">
                <input type="text" className={styles.inputField} value={motherName}
                  onChange={e => setMotherName(e.target.value)} />
              </Field>
              <Field label="Conduct">
                <select className={styles.selectField} value={conduct}
                  onChange={e => setConduct(e.target.value)}>
                  {CONDUCT_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
                </select>
              </Field>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.formCol}>
              <Field label="Date of Birth">
                <input type="date" className={styles.inputField} value={dob}
                  onChange={e => setDob(e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className={styles.selectField} value={gender}
                  onChange={e => setGender(e.target.value)}>
                  {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
                </select>
              </Field>
              <Field label="Caste">
                <select className={styles.selectField} value={caste}
                  onChange={e => setCaste(e.target.value)}>
                  {CASTE_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
                </select>
              </Field>
              <Field label="Email">
                <input type="email" className={styles.inputField} value={email}
                  onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Mobile">
                <input type="text" className={styles.inputField} value={mobile}
                  onChange={e => setMobile(e.target.value)} />
              </Field>
              <Field label="Aadhaar No">
                <input type="text" className={styles.inputField} value={aadhaar}
                  onChange={e => setAadhaar(e.target.value)} />
              </Field>
              <Field label="Religion">
                <input type="text" className={styles.inputField} value={religion}
                  onChange={e => setReligion(e.target.value)} />
              </Field>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className={styles.issueBtn}
              onClick={handleSubmit}
              disabled={isLoading || isFetching}
            >
              {isLoading ? 'Issuing...' : 'Study Certificate Issue'}
            </button>
          </div>

          {message.text && (
            <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScIssue;
