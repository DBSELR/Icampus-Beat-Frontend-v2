import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import styles from './PcAllCourses.module.css';
import { getAppData, getPcAllCoursesBatches, getPcAllCoursesBranches, getPcAllCoursesData } from '../utils/api';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getVal = (obj, keys) => {
  if (!obj) return '';
  const objKeys = Object.keys(obj);
  for (const key of keys) {
    const match = objKeys.find(k => k.toLowerCase() === key.toLowerCase());
    if (match && obj[match] != null && String(obj[match]).trim() !== '')
      return String(obj[match]).trim();
  }
  return '';
};

// ─── Component ─────────────────────────────────────────────────────────────────
const PcAllCourses = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [isGracing, setIsGracing]         = useState(false);
  const [batch, setBatch]                 = useState('');
  const [branch, setBranch]               = useState('');
  const [htNo, setHtNo]                   = useState('');
  const [batchOptions, setBatchOptions]   = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [rawData, setRawData]             = useState([]);
  const [certificates, setCertificates]   = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [message, setMessage]             = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Load batches
  useEffect(() => {
    if (!course) return;
    getPcAllCoursesBatches(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({
            regu: String(r.REGU || r.regu || ''),
            label: String(r.BATCH || r.batch || r.REGU || r.regu || r)
          })));
      }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (val) => {
    setBatch(val);
    setBranch('');
    setBranchOptions([]);
    setRawData([]);
    setCertificates([]);
    if (!val || !course) return;
    try {
      const res = await getPcAllCoursesBranches(course, val);
      if (res.success && res.data)
        setBranchOptions(res.data.map(r => ({
          grp: String(r.GRP || r.grp || ''),
          label: String(r.GRP || r.grp || r)
        })));
    } catch {}
  };

  // ── Process raw API rows into per-student certificate objects ──────────────
  const processData = useCallback((data) => {
    return data.map(row => {
      const htno         = getVal(row, ['HTNO','REGNO','ROLLNO','HT_NO','HallTicketNo','HALL_TICKET_NO','HT','REG_NO']);
      const pcNo         = getVal(row, ['PCNO','PC_NO','CMM_NO','CMMNO','CMM','SERIALNO','SERIAL_NO','PC']);
      const studentName  = getVal(row, ['NAME','STUDENTNAME','SNAME','STUDENT_NAME','STU_NAME','StName']);
      const fatherName   = getVal(row, ['FNAME','FATHERNAME','FATHER_NAME','FATHER','FName','PARENTNAME']);
      const degreeName   = getVal(row, ['DEGREE','DEGREENAME','DEGREE_NAME','PROGRAMME','PROGRAM','COURSE_NAME','CourseName']);
      const branchName   = getVal(row, ['BRANCH','BRANCHNAME','BRANCH_NAME','DEPT','DEPARTMENT','GRP','GSUB','SPECIALIZATION']);
      const examMonth    = getVal(row, ['EXAMMY','EXAMMONTH','MONTH_YEAR','MONTHYEAR','MY','EXAM_MY']) || examMY;
      const className    = getVal(row, ['CLASS','DIVISION','AWARD_CLASS','AWARDCLASS','RESULT_CLASS','RESULTCLASS','GRADE_CLASS']);
      const gender       = getVal(row, ['GENDER','SEX','G']);
      const photoUrl     = getVal(row, ['PHOTO','PHOTOURL','PHOTO_URL','IMAGE','IMG']);

      // QR specific fields
      const qrPcno = getVal(row, ['PCNO','PC_NO','CMM_NO','CMMNO','CMM','SERIALNO','SERIAL_NO','PC']);
      const qrRegno = getVal(row, ['REGNO','HTNO','HT_NO','REG_NO','ROLLNO','HALLTICKETNO','HALL_TICKET_NO']);
      const qrSname = getVal(row, ['SNAME','NAME','STUDENTNAME','STUDENT_NAME','STU_NAME','StName']);
      const qrGender = getVal(row, ['GENDER','SEX','G']);
      const qrFname = getVal(row, ['FNAME','FATHERNAME','FATHER_NAME','FATHER','FName','PARENTNAME']);
      const qrBranch = getVal(row, ['BRANCH','BRANCHNAME','BRANCH_NAME','DEPT','DEPARTMENT','GRP','GSUB','SPECIALIZATION']) || branch;
      const qrRepExammy = getVal(row, ['REP_EXAMMY','REp_exammy','EXAMMY','MONTHYEAR','MY','EXAM_MY']) || examMY;
      const qrCtotmrk = getVal(row, ['CTOTMRK','CTOT_MRK','TOTAL_MARKS','TOTALMARKS','SMARKS']);
      const qrCtotmax = getVal(row, ['CTOTMAX','CTOT_MAX','MAX_MARKS','MAXMARKS','MAX']);
      const qrCtcr = getVal(row, ['CTCR','CREDITS','TOTAL_CREDITS','TOTALCREDITS']);
      const qrPercentage = getVal(row, ['PERCENTAGE','PERCENT','PASS_PERCENTAGE']);
      const qrN0cgpa = getVal(row, ['N0CGPA','n0cgpa','CGPA']);

      // Format QR text with specific fields requested by the user
      const qrText = [
        `pcno: ${qrPcno}`,
        `regno: ${qrRegno}`,
        `sname: ${qrSname}`,
        `gender: ${qrGender}`,
        `fname: ${qrFname}`,
        `Branch: ${qrBranch}`,
        `REp_exammy: ${qrRepExammy}`,
        `CTOTMRK/CTOTMAX: ${qrCtotmrk}/${qrCtotmax}`,
        `CTCR: ${qrCtcr}`,
        `percentage: ${qrPercentage}`,
        `n0cgpa: ${qrN0cgpa}`
      ].join('\n');

      // Determine pronoun
      const isFemale = gender && (gender.toLowerCase() === 'f' || gender.toLowerCase() === 'female');
      const pronoun  = isFemale ? 'Daughter' : 'Son';
      const heshe    = isFemale ? 'she'      : 'he';
      const hisher   = isFemale ? 'her'      : 'his';

      const barcodeVal = pcNo || htno || `${Math.floor(10000000000 + Math.random() * 90000000000)}`;

      return {
        htno, pcNo, studentName, fatherName, degreeName: degreeName || course,
        branchName: branchName || branch, examMonth, className,
        pronoun, heshe, hisher, barcodeVal, photoUrl, qrText,
        rawRow: row
      };
    });
  }, [course, branch, examMY]);

  // ── Generate QR + barcode for each cert (async) ─────────────────────────────
  const enrichCertificates = useCallback(async (certs) => {
    const enriched = [];
    for (const cert of certs) {
      let qrDataURL = '';
      let barcodeDataURL = '';
      try { qrDataURL = await QRCode.toDataURL(cert.qrText || cert.htno || 'PC', { margin: 1, width: 80 }); } catch {}
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, cert.barcodeVal, { format: 'CODE128', displayValue: false, margin: 0, width: 1.5, height: 22 });
        barcodeDataURL = canvas.toDataURL('image/png');
      } catch {}
      enriched.push({ ...cert, qrDataURL, barcodeDataURL });
    }
    return enriched;
  }, []);

  // ── View button ──────────────────────────────────────────────────────────────
  const handleView = async () => {
    if (!batch)  { showMsg('Please select Batch.');  return; }
    if (!branch) { showMsg('Please select Branch.'); return; }
    setIsLoading(true);
    setRawData([]);
    setCertificates([]);
    try {
      const res = await getPcAllCoursesData(course, examMY, regu, batch, branch, htNo.trim(), isGracing);
      if (res.success && res.data && res.data.length > 0) {
        setRawData(res.data);
        showMsg(`${res.data.length} records loaded. Generating previews…`, 'success');
        setIsGenerating(true);
        const processed = processData(res.data);
        const enriched  = await enrichCertificates(processed);
        setCertificates(enriched);
        setIsGenerating(false);
        showMsg(`${enriched.length} certificate${enriched.length !== 1 ? 's' : ''} ready.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'View failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Download PDF ─────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (certificates.length === 0) { showMsg('Please click View first to load data.'); return; }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pW  = doc.internal.pageSize.getWidth();   // 210
      const pH  = doc.internal.pageSize.getHeight();  // 297
      const M   = 15; // margin

      certificates.forEach((cert, idx) => {
        if (idx > 0) doc.addPage();

        /* ── Hall Ticket No ── */
        doc.setFontSize(13);
        doc.setFont('times', 'italic');
        doc.setTextColor(0, 0, 0);
        doc.text(`Hall Ticket No.: `, M + 6, M + 15);
        doc.setFont('times', 'normal');
        doc.setTextColor(192, 0, 0);
        doc.text(cert.htno || '—', M + 40, M + 15);

        /* ── PC No ── */
        doc.setFont('times', 'italic');
        doc.setTextColor(0, 0, 0);
        doc.text(`PC No. : `, pW - M - 62, M + 15);
        doc.setFont('times', 'normal');
        doc.text(cert.pcNo || '—', pW - M - 40, M + 15);

        /* ── Photo box ── */
        const photoX = M + 6;
        const photoY = M + 24;
        const photoW = 36;
        const photoH = 44;
        doc.setDrawColor(0);
        doc.setLineWidth(0.4);
        doc.rect(photoX, photoY, photoW, photoH, 'S');
        if (cert.photoUrl) {
          try { doc.addImage(cert.photoUrl, 'JPEG', photoX+1, photoY+1, photoW-2, photoH-2); } catch {}
        }
        doc.setFontSize(9);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('NO PHOTO', photoX + photoW/2, photoY + photoH/2 + 2, { align: 'center' });

        /* ── Certificate Body ── */
        const bodyX  = M + 6;
        let   bodyY  = M + 84;
        const lineH  = 11;
        const textW  = pW - 2*M - 12;

        // Line 1: This is to Certify that Ms. STUDENT NAME
        doc.setFontSize(14);
        doc.setFont('times', 'italic');
        doc.text('This is to Certify that Ms. ', bodyX, bodyY);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 51, 153);
        doc.text(cert.studentName ? cert.studentName.toUpperCase() : '—', bodyX + doc.getTextWidth('This is to Certify that Ms. '), bodyY);
        doc.setTextColor(0, 0, 0);

        // Line 2: Daughter of Mr. FATHER NAME
        bodyY += lineH;
        doc.setFont('times', 'italic');
        doc.text(`${cert.pronoun} of Mr. `, bodyX, bodyY);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 51, 153);
        doc.text(cert.fatherName ? cert.fatherName.toUpperCase() : '—', bodyX + doc.getTextWidth(`${cert.pronoun} of Mr. `), bodyY);
        doc.setTextColor(0, 0, 0);

        // Line 3: passed B.TECH BRANCH degree
        bodyY += lineH;
        doc.setFont('times', 'italic');
        doc.text('passed ', bodyX, bodyY);
        doc.setFont('times', 'normal');
        doc.setTextColor(192, 0, 0);
        const degBranch = `${cert.degreeName ? cert.degreeName.toUpperCase() : ''} ${cert.branchName ? cert.branchName.toUpperCase() : ''}`.trim();
        doc.text(degBranch, bodyX + doc.getTextWidth('passed '), bodyY);
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'italic');
        doc.text('degree', pW - M - 20, bodyY);

        // Line 4: examination of this Institute, held in May, 2024 and that she was
        bodyY += lineH;
        doc.setFont('times', 'italic');
        doc.text('examination of this Institute, held in ', bodyX, bodyY);
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 112, 0);
        const myStr = cert.examMonth || '—';
        const myX   = bodyX + doc.getTextWidth('examination of this Institute, held in ');
        doc.text(myStr, myX, bodyY);
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'italic');
        doc.text(` and that ${cert.heshe} was`, myX + doc.getTextWidth(myStr) + 2, bodyY);

        // Line 5: placed in .
        bodyY += lineH;
        doc.setFont('times', 'italic');
        doc.text('placed in ', bodyX, bodyY);
        if (cert.className) {
          doc.setFont('times', 'normal');
          doc.setTextColor(0, 51, 153);
          doc.text(cert.className, bodyX + doc.getTextWidth('placed in '), bodyY);
          doc.setTextColor(0, 0, 0);
        }
        doc.setFont('times', 'italic');
        const dotX = bodyX + doc.getTextWidth('placed in ') + (cert.className ? doc.getTextWidth(cert.className) + 4 : 4);
        doc.text(' .', dotX, bodyY);

        // Line 6: She has satisfied all the requirements for the award of the degree.
        bodyY += lineH + 2;
        doc.text(`${cert.heshe.charAt(0).toUpperCase() + cert.heshe.slice(1)} has satisfied all the requirements for the award of the degree.`, bodyX, bodyY);

        /* ── QR Code ── */
        const qrY = bodyY + 12;
        if (cert.qrDataURL) {
          doc.addImage(cert.qrDataURL, 'PNG', bodyX, qrY, 26, 26);
        } else {
          doc.setDrawColor(0);
          doc.rect(bodyX, qrY, 26, 26, 'S');
          doc.setFontSize(8);
          doc.text('QR', bodyX + 9, qrY + 14);
        }

        /* ── Barcode ── */
        if (cert.barcodeDataURL) {
          doc.addImage(cert.barcodeDataURL, 'PNG', pW/2 + 10, qrY + 6, 60, 15);
        } else {
          doc.setDrawColor(0);
          doc.rect(pW/2 + 10, qrY + 6, 60, 15, 'S');
        }

        /* ── CMM No + Signatures ── */
        const sigY = qrY + 38;
        doc.setFontSize(13);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`CMM No.: `, bodyX, sigY);
        doc.text(cert.pcNo || '—', bodyX + 22, sigY);

        // Signature placeholders (blank images space, no labels or lines)
        if (cert.barcodeDataURL) {
          // Centered & right aligned signatures
          // We leave them blank as requested to allow dynamic printing or physical signatures
        }

        /* ── Date (August 07, 2026 format) ── */
        const dateY = sigY + 16;
        doc.setFontSize(13);
        doc.setFont('times', 'normal');
        doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }), bodyX, dateY);
      });

      const batchLabel = batchOptions.find(o => o.regu === batch)?.label || batch;
      doc.save(`PC_AllCourses_${batchLabel}_${branch}.pdf`);
      showMsg('PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showMsg(err.message || 'Failed to generate PDF.');
    }
  };

  const handlePrint = () => window.print();

  const isWorking = isLoading || isGenerating;

  return (
    <div className={styles.container}>
      {/* ── Filter Panel ── */}
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isGracing} onChange={e => setIsGracing(e.target.checked)} />
              Gracing
            </label>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>H.T.No</label>
            <input type='text' value={htNo}
              onChange={e => setHtNo(e.target.value.toUpperCase())}
              className={styles.input} placeholder='optional' />
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isWorking}>
              {isLoading ? 'Loading…' : isGenerating ? 'Generating…' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownload} disabled={isWorking || certificates.length === 0}>
              Download PDF
            </button>
            <button type='button' className={styles.printBtn} onClick={handlePrint} disabled={isWorking || certificates.length === 0}>
              Print
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* ── Report Area ── */}
      <div className={styles.reportArea}>
        {!isWorking && certificates.length === 0 && !message.text && (
          <div className={styles.placeholder}>Select Batch and Branch, then click <strong>View</strong> to load the report.</div>
        )}
        {isWorking && (
          <div className={styles.loadingState}>
            {isLoading ? 'Fetching data…' : 'Generating certificate previews…'}
          </div>
        )}

        {/* ── Certificate Previews ── */}
        {!isWorking && certificates.length > 0 && (
          <div className={styles.certGrid}>
            {certificates.map((cert, idx) => (
              <div key={idx} className={styles.certPage}>

                {/* Top row: HT No | PC No */}
                <div className={styles.certTopRow}>
                  <span className={styles.htNo}><em>Hall Ticket No.:</em>&nbsp;
                    <span className={styles.htNoVal}>{cert.htno || '—'}</span>
                  </span>
                  <span className={styles.pcNo}><em>PC No. :</em>&nbsp;
                    <span className={styles.pcNoVal}>{cert.pcNo || '—'}</span>
                  </span>
                </div>

                {/* Photo + Body row */}
                <div className={styles.certBodyRow}>
                  {/* Photo box */}
                  <div className={styles.photoBox}>
                    {cert.photoUrl
                      ? <img src={cert.photoUrl} alt='Student' className={styles.photoImg} />
                      : <span className={styles.noPhoto}>NO PHOTO</span>
                    }
                  </div>

                  {/* Certificate text */}
                  <div className={styles.certText}>
                    <p className={styles.certLine}>
                      <em>This is to Certify that Ms.&nbsp;</em>
                      <strong className={styles.nameBlue}>{cert.studentName ? cert.studentName.toUpperCase() : '—'}</strong>
                    </p>

                    <p className={styles.certLine}>
                      <em>{cert.pronoun} of Mr.&nbsp;</em>
                      <strong className={styles.nameBlue}>{cert.fatherName ? cert.fatherName.toUpperCase() : '—'}</strong>
                    </p>

                    <p className={styles.certLine}>
                      <em>passed&nbsp;</em>
                      <strong className={styles.degreeRed}>
                        {cert.degreeName ? cert.degreeName.toUpperCase() : ''}{cert.branchName ? ' ' + cert.branchName.toUpperCase() : ''}
                      </strong>
                      <span className={styles.degreeTextRight}><em>degree</em></span>
                    </p>

                    <p className={styles.certLine}>
                      <em>examination of this Institute, held in&nbsp;</em>
                      <strong className={styles.dateGreen}>{cert.examMonth || '—'}</strong>
                      <em>&nbsp;and that {cert.heshe} was</em>
                    </p>

                    <p className={styles.certLine}>
                      <em>placed in&nbsp;</em>
                      <strong className={styles.nameBlue}>{cert.className || ''}</strong>
                      <span className={styles.dotMargin}><em> .</em></span>
                    </p>

                    <p className={styles.certLine}>
                      <em>{cert.heshe.charAt(0).toUpperCase() + cert.heshe.slice(1)} has satisfied all the requirements for the award of the degree.</em>
                    </p>
                  </div>
                </div>

                {/* QR + Barcode row */}
                <div className={styles.certCodesRow}>
                  <div className={styles.qrWrap}>
                    {cert.qrDataURL
                      ? <img src={cert.qrDataURL} alt='QR' className={styles.qrImg} />
                      : <div className={styles.qrPlaceholder}>QR</div>
                    }
                  </div>
                  <div className={styles.barcodeWrap}>
                    {cert.barcodeDataURL
                      ? <img src={cert.barcodeDataURL} alt='Barcode' className={styles.barcodeImg} />
                      : <div className={styles.barcodePlaceholder}></div>
                    }
                  </div>
                </div>

                {/* Signatures row */}
                <div className={styles.certSigRow}>
                  <span className={styles.cmmNo}>
                    CMM No.:&nbsp;
                    <span className={styles.cmmVal}>{cert.pcNo || '—'}</span>
                  </span>
                  <span className={styles.sigPlaceholder}></span>
                  <span className={styles.sigPlaceholder}></span>
                </div>

                {/* Date */}
                <div className={styles.certDate}>
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PcAllCourses;
