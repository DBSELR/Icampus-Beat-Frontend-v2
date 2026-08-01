import React, { useState, useEffect } from 'react';
import { FaUser, FaChevronUp } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import styles from './ModerationResultFlotation.module.css';
import {
  getModerationBatch,
  getModerationBranch,
  getModerationPapers,
  getModerationData,
  saveModerationData,
  getAppData,
} from '../utils/api';

const ModerationResultFlotation = () => {
  const [activeTab, setActiveTab] = useState('moderation');
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Global app data
  const appData = getAppData() || {};
  const course = appData.course || '';
  const examMy = appData.examMY || '';
  const regu = appData.regulation || '';

  // Moderation form state
  const [moderationForm, setModerationForm] = useState({
    batch: '',
    sem: '',
    grp: '',
    papCode: '',
    modMarks: '',
  });

  // Dropdown options from API
  const [batchOptions, setBatchOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [paperOptions, setPaperOptions] = useState([]);

  // Loading states
  const [batchLoading, setBatchLoading] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [papersLoading, setPapersLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Moderation data table
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);

  const semOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Result Processing form state
  const [resultForm, setResultForm] = useState({
    isReadmitResult: false,
    sem: '',
    resultType: 'Select Type',
    isRvResultDates: false,
    resultAnnouncingDate: '',
  });

  // Flotation form state
  const [flotationForm, setFlotationForm] = useState({
    processingType: 'regular',
    maxSubject: '2',
    graftingMarks: '5',
    graceMarks: '0',
  });

  const resultTypeOptions = ['Select Type', 'Regular Result', 'Subject Moderation', 'Grafting', 'Revaluation Result'];

  // Fetch batch on mount
  useEffect(() => {
    if (!course) return;
    setBatchLoading(true);
    getModerationBatch(course)
      .then((res) => {
        const data = res?.data ?? res;
        setBatchOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => setBatchOptions([]))
      .finally(() => setBatchLoading(false));
  }, [course]);

  // Fetch branch and papers when sem changes
  useEffect(() => {
    if (!moderationForm.sem) {
      setBranchOptions([]);
      setPaperOptions([]);
      return;
    }

    setBranchLoading(true);
    getModerationBranch(course, examMy, moderationForm.sem)
      .then((res) => {
        const data = res?.data ?? res;
        setBranchOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => setBranchOptions([]))
      .finally(() => setBranchLoading(false));

    setPapersLoading(true);
    getModerationPapers(course, moderationForm.sem)
      .then((res) => {
        const data = res?.data ?? res;
        setPaperOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => setPaperOptions([]))
      .finally(() => setPapersLoading(false));
  }, [moderationForm.sem]);

  const handleModerationChange = (e) => {
    const { name, value } = e.target;
    setModerationForm((prev) => ({ ...prev, [name]: value }));

    // Reset dependent fields
    if (name === 'sem') {
      setModerationForm((prev) => ({ ...prev, sem: value, grp: '', papCode: '' }));
      setTableData([]);
      setTableColumns([]);
    }
  };

  const handleGetData = async () => {
    if (!moderationForm.sem) { alert('Please Select Sem'); return; }
    if (!moderationForm.grp) { alert('Please Select Branch'); return; }
    if (!moderationForm.papCode) { alert('Please Select Paper'); return; }

    setDataLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      const res = await getModerationData(course, examMy, moderationForm.batch, moderationForm.sem, moderationForm.grp, moderationForm.papCode);
      const data = res?.data ?? res;
      if (Array.isArray(data) && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data);
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleModerationSubmit = async () => {
    if (!moderationForm.sem) { alert('Please Select Sem'); return; }
    if (!moderationForm.grp) { alert('Please Select Branch'); return; }
    if (!moderationForm.papCode) { alert('Please Select Paper'); return; }
    if (!moderationForm.modMarks.trim()) { alert('Please Enter Moderation Marks'); return; }

    setSaving(true);
    try {
      const payload = {
        course,
        examMy,
        regu: moderationForm.batch,
        sem: moderationForm.sem,
        grp: moderationForm.grp,
        papCode: moderationForm.papCode,
        modMarks: moderationForm.modMarks,
      };
      const res = await saveModerationData(payload);
      if (res?.success === false) {
        alert(res.message || 'Save failed');
      } else {
        alert('Moderation Marks saved successfully!');
        setModerationForm({ batch: '', sem: '', grp: '', papCode: '', modMarks: '' });
        setTableData([]);
        setTableColumns([]);
      }
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleModerationReset = () => {
    setModerationForm({ batch: '', sem: '', grp: '', papCode: '', modMarks: '' });
    setTableData([]);
    setTableColumns([]);
  };

  // Result Processing handlers
  const handleResultChange = (e) => {
    const { name, value, type, checked } = e.target;
    setResultForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFlotationChange = (e) => {
    const { name, value } = e.target;
    setFlotationForm((prev) => ({ ...prev, [name]: value }));
  };

  // Helper: get display value from option (string or object)
  const getOptionValue = (opt) => (typeof opt === 'object' && opt !== null ? opt.value ?? opt.id ?? opt.code ?? opt.REGU ?? opt.GRP ?? opt.PCODE ?? opt.TEMPCODE ?? Object.values(opt)[0] ?? '' : opt);
  const getOptionLabel = (opt) => {
    if (typeof opt !== 'object' || opt === null) return opt;
    if (opt.PCODE && opt.PNAME) return `${opt.PCODE} - ${opt.PNAME}`;
    return opt.label ?? opt.name ?? opt.PNAME ?? opt.REGU ?? opt.GRP ?? opt.PCODE ?? opt.TEMPCODE ?? Object.values(opt)[0] ?? '';
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaUser className={globalStyles.headerIcon} />
            Result Processing
          </h2>
          <button
            className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>
          {/* Tab Navigation */}
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tabButton} ${activeTab === 'moderation' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('moderation')}
            >
              Moderation
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'result' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('result')}
            >
              Result Processing
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'flotation' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('flotation')}
            >
              Flotation
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>

            {/* Moderation Tab */}
            {activeTab === 'moderation' && (
              <div className={styles.moderationTab}>
                <div className={globalStyles.formSection}>
                  {/* Info row */}
                  <div className={globalStyles.formRow}>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Course</label>
                      <input className={globalStyles.input} value={course} readOnly />
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Exam M/Y</label>
                      <input className={globalStyles.input} value={examMy} readOnly />
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Regulation</label>
                      <input className={globalStyles.input} value={regu} readOnly />
                    </div>
                  </div>

                  <div className={globalStyles.formRow}>
                    {/* Batch */}
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Batch</label>
                      <select
                        name="batch"
                        value={moderationForm.batch}
                        onChange={handleModerationChange}
                        className={globalStyles.dropdown}
                        disabled={batchLoading}
                      >
                        <option value="">{batchLoading ? 'Loading...' : 'Select Batch'}</option>
                        {batchOptions.map((opt, i) => (
                          <option key={i} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sem */}
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Sem</label>
                      <select
                        name="sem"
                        value={moderationForm.sem}
                        onChange={handleModerationChange}
                        className={globalStyles.dropdown}
                      >
                        <option value="">Select Sem</option>
                        {semOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Branch/Grp */}
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Branch</label>
                      <select
                        name="grp"
                        value={moderationForm.grp}
                        onChange={handleModerationChange}
                        className={globalStyles.dropdown}
                        disabled={branchLoading || !moderationForm.sem}
                      >
                        <option value="">{branchLoading ? 'Loading...' : 'Select Branch'}</option>
                        {branchOptions.map((opt, i) => (
                          <option key={i} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Paper */}
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Paper</label>
                      <select
                        name="papCode"
                        value={moderationForm.papCode}
                        onChange={handleModerationChange}
                        className={globalStyles.dropdown}
                        disabled={papersLoading || !moderationForm.sem}
                      >
                        <option value="">{papersLoading ? 'Loading...' : 'Select Paper'}</option>
                        {paperOptions.map((opt, i) => (
                          <option key={i} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={globalStyles.formRow}>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Moderation Marks</label>
                      <input
                        type="text"
                        name="modMarks"
                        value={moderationForm.modMarks}
                        onChange={handleModerationChange}
                        className={globalStyles.input}
                        placeholder="Enter Marks"
                        style={{ fontWeight: 'bold', color: 'indianred' }}
                      />
                    </div>
                    <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleGetData}
                        className={`${globalStyles.btn} ${globalStyles.getDataBtn}`}
                        disabled={dataLoading}
                      >
                        {dataLoading ? 'Loading...' : 'Get Data'}
                      </button>
                    </div>
                  </div>

                  {/* Data Table */}
                  {tableData.length > 0 && (
                    <div className={globalStyles.tableWrapper}>
                      <table className={globalStyles.dataTable}>
                        <thead>
                          <tr>
                            {tableColumns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, ri) => (
                            <tr key={ri}>
                              {tableColumns.map((col) => (
                                <td key={col}>{row[col] ?? ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className={styles.actionButtons}>
                    <button
                      onClick={handleModerationSubmit}
                      className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Submit'}
                    </button>
                    <button onClick={handleModerationReset} className={`${globalStyles.btn} ${globalStyles.btnWarning}`}>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Result Processing Tab */}
            {activeTab === 'result' && (
              <div className={styles.resultTab}>
                <div className={styles.formSection}>
                  <div className={styles.actionButtonsRow}>
                    <button className={styles.actionBtn}>Pre Result Process Checking</button>
                    <button className={styles.actionBtn}>Post Result Process Checking</button>
                    <button className={styles.actionBtn}>Theory & Practical 0 Marks List</button>
                  </div>

                  <div className={globalStyles.formRow} style={{ alignItems: 'center' }}>
                    <div className={globalStyles.formGroup} style={{ flex: '0 0 auto' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="checkbox"
                          name="isReadmitResult"
                          checked={resultForm.isReadmitResult}
                          onChange={handleResultChange}
                        />
                        Is Readmit Result
                      </label>
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Sem</label>
                      <select name="sem" value={resultForm.sem} onChange={handleResultChange} className={globalStyles.dropdown}>
                        <option value="">Select an Option</option>
                        {semOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Result Type</label>
                      <select name="resultType" value={resultForm.resultType} onChange={handleResultChange} className={globalStyles.dropdown}>
                        {resultTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <button className={`${globalStyles.btn} ${globalStyles.updateBtn}`}>Result Process</button>
                    <button className={`${globalStyles.btn} ${globalStyles.exportBtn}`}>Export Result Data</button>
                  </div>

                  <div className={styles.resultDatesSection}>
                    <h3 className={styles.sectionTitle}>Result announcing and Revaluation closing dates entry</h3>
                    <div className={globalStyles.formRow} style={{ alignItems: 'center' }}>
                      <div className={globalStyles.formGroup} style={{ flex: '0 0 auto' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                          <input
                            type="checkbox"
                            name="isRvResultDates"
                            checked={resultForm.isRvResultDates}
                            onChange={handleResultChange}
                          />
                          Is RvResult Dates
                        </label>
                      </div>
                      <div className={globalStyles.formGroup}>
                        <label className={globalStyles.label}>Sem</label>
                        <select name="sem" value={resultForm.sem} onChange={handleResultChange} className={globalStyles.dropdown}>
                          <option value="">Select an Option</option>
                          {semOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className={globalStyles.formGroup}>
                        <label className={globalStyles.label}>Result Announcing Date</label>
                        <input type="date" name="resultAnnouncingDate" value={resultForm.resultAnnouncingDate} onChange={handleResultChange} className={globalStyles.input} />
                      </div>
                      <button className={`${globalStyles.btn} ${globalStyles.saveBtn}`}>Submit</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flotation Tab */}
            {activeTab === 'flotation' && (
              <div className={styles.flotationTab}>
                <div className={styles.formSection}>
                  <div className={globalStyles.formRow} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                      <input type="radio" name="processingType" value="regular" checked={flotationForm.processingType === 'regular'} onChange={handleFlotationChange} />
                      Regular
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                      <input type="radio" name="processingType" value="revaluation" checked={flotationForm.processingType === 'revaluation'} onChange={handleFlotationChange} />
                      Revaluation
                    </label>
                  </div>
                  <div className={globalStyles.formRow}>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Max Subject to be applied:</label>
                      <input type="text" name="maxSubject" value={flotationForm.maxSubject} onChange={handleFlotationChange} className={globalStyles.input} />
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Grafting Marks:</label>
                      <input type="text" name="graftingMarks" value={flotationForm.graftingMarks} onChange={handleFlotationChange} className={globalStyles.input} />
                    </div>
                    <div className={globalStyles.formGroup}>
                      <label className={globalStyles.label}>Grace Marks:</label>
                      <input type="text" name="graceMarks" value={flotationForm.graceMarks} onChange={handleFlotationChange} className={globalStyles.input} />
                    </div>
                  </div>
                  <div className={styles.actionButtons} style={{ marginTop: '16px' }}>
                    <button className={`${globalStyles.btn} ${globalStyles.getDataBtn}`}>Get Data</button>
                  </div>
                  <div className={styles.dataTablePlaceholder}>
                    <p>Data table will be displayed here after clicking "Get Data"</p>
                  </div>
                  <div className={styles.actionButtons}>
                    <button className={`${globalStyles.btn} ${globalStyles.saveBtn}`}>Submit</button>
                    <button className={`${globalStyles.btn} ${globalStyles.exportBtn}`}>Export</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationResultFlotation;
