import React, { useEffect, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './SemesterGradesReport.module.css';
import {
  getAppData,
  getSemesterGradeReport,
  getSemesterGradeReportBatches,
} from '../utils/api';

const SemesterGradesReport = () => {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [batchOptions, setBatchOptions] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [meta, setMeta] = useState({ course: '', regulation: '' });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const handleBatchChange = (event) => {
    setSelectedBatch(event.target.value);
    setHasReport(false);
    setRows([]);
    setError('');
    setPage(1);
  };

  const handleViewReport = async () => {
    if (!selectedBatch) {
      alert('Please choose a batch to view the semester grade master.');
      return;
    }
    setIsLoading(true);
    setRows([]);
    setError('');
    setPage(1);
    try {
      const response = await getSemesterGradeReport({
        batch: selectedBatch,
        course: meta.course,
        regulation: meta.regulation,
      });
      if (response.success && Array.isArray(response.data)) {
        setRows(response.data);
        setHasReport(response.data.length > 0);
        if (!response.data.length) {
          setError('No records found for the selected batch.');
        }
      } else {
        setHasReport(false);
        setError(response.message || 'Failed to load semester grade report.');
      }
    } catch (apiError) {
      console.error('Failed to load semester grade report:', apiError);
      setHasReport(false);
      setError(apiError.message || 'Failed to load semester grade report.');
    } finally {
      setIsLoading(false);
    }
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const handleDownloadPdf = async () => {
    if (!hasReport || rows.length === 0) {
      alert('Please load the report before attempting to download.');
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

      const pageWidth = doc.internal.pageSize.getWidth();

      try {
        const img = await loadImage('/assets/Screenshot%202026-06-18%20143601.png');
        doc.addImage(img, 'PNG', 14, 10, 40, 15);
      } catch (e) {
        console.warn('Could not load logo for PDF', e);
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      doc.text('D. B. S. Institute', pageWidth / 2, 16, { align: 'center' });
      
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text('(PVT.LTD)', pageWidth / 2, 21, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 255);
      doc.text(`Semester Grades Report ${selectedBatch ? `For Batch ${selectedBatch}` : ''}`, pageWidth / 2, 29, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('BATCH :', 14, 40);
      doc.setTextColor(255, 0, 255);
      doc.text(` ${selectedBatch || 'ALL'}`, 14 + doc.getTextWidth('BATCH :'), 40);

      const tableBody = rows.map((row, index) => [
        index + 1,
        row.PCODE,
        row.PNAME,
        row.SEM,
        row.PTYPE ?? '-',
        row.TMAX ?? '-',
        row.TPASS ?? '-',
        row.SMAX ?? '-',
        row.SPASS ?? '-'
      ]);

      autoTable(doc, {
        startY: 44,
        head: [['S.No', 'Course Code', 'Course Name', 'Semester', 'Type', 'T.Max', 'T.Pass', 'S.Max', 'S.Pass']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineColor: 0, lineWidth: 0.1 },
        bodyStyles: { lineColor: 0, lineWidth: 0.1, textColor: 0 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 15 },
          6: { halign: 'center', cellWidth: 15 },
          7: { halign: 'center', cellWidth: 15 },
          8: { halign: 'center', cellWidth: 15 }
        }
      });

      doc.save(`Semester_Grades_Report_${selectedBatch || 'ALL'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const appData = getAppData();
    setMeta({
      course: appData?.course || '',
      regulation: appData?.regulation || '',
    });
  }, []);

  useEffect(() => {
    const loadBatches = async () => {
      if (!meta.course || !meta.regulation) {
        setBatchOptions([]);
        return;
      }

      setDropdownLoading(true);
      try {
        const response = await getSemesterGradeReportBatches(meta.course, meta.regulation);
        const list = response?.success && Array.isArray(response.data) ? response.data : [];
        const normalized = list
          .map((item) => item?.batch || item?.BATCH || item?.Batch || '')
          .filter(Boolean);
        setBatchOptions(normalized);
        if (normalized.length) {
          setSelectedBatch((prev) => (normalized.includes(prev) ? prev : normalized[0]));
        } else {
          setSelectedBatch('');
        }
      } catch (batchError) {
        console.error('Error loading semester grade batches:', batchError);
        setBatchOptions([]);
        setSelectedBatch('');
      } finally {
        setDropdownLoading(false);
      }
    };

    loadBatches();
  }, [meta.course, meta.regulation]);

  return (
    <div className={styles.container}>
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select
              value={selectedBatch}
              onChange={handleBatchChange}
              className={styles.select}
              disabled={dropdownLoading || !batchOptions.length}
            >
              <option value="">
                {dropdownLoading ? 'Loading batches...' : 'Select Batch'}
              </option>
              {batchOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.actionsGroup}>
            <button className={styles.viewBtn} onClick={handleViewReport} disabled={isLoading || isGeneratingPdf}>
              {isLoading ? 'Loading…' : 'View'}
            </button>
            <button className={styles.downloadPdfBtn} onClick={handleDownloadPdf} disabled={!hasReport || isLoading || isGeneratingPdf}>
              {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.reportArea}>
        {!hasReport && !isLoading && (
          <div className={styles.placeholder}>
            {error || 'Select a batch and click View to load the semester grade master report.'}
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Generating report…</div>}
        {hasReport && !isLoading && (
          <div className={styles.reportWrapper}>
            <div className={styles.reportHeader}>
              <div className={styles.logoContainer}>
                <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Institute Logo" className={styles.logo} />
              </div>
              <div className={styles.titleContainer}>
                <h1 className={styles.instituteName}>D. B. S. Institute</h1>
                <p className={styles.instituteSub}>(PVT.LTD)</p>
                <h2 className={styles.reportTitle}>Semester Grades Report {selectedBatch ? `For Batch ${selectedBatch}` : ''}</h2>
              </div>
            </div>
            
            <div className={styles.infoBar}>
              <span>BATCH : <strong>{selectedBatch || 'ALL'}</strong></span>
            </div>

            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Semester</th>
                  <th>Type</th>
                  <th>T.Max</th>
                  <th>T.Pass</th>
                  <th>S.Max</th>
                  <th>S.Pass</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyRow}>No data available.</td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr key={`${row.PCODE}-${index}`}>
                      <td className={styles.alignCenter}>{(page - 1) * pageSize + index + 1}</td>
                      <td>{row.PCODE}</td>
                      <td>{row.PNAME}</td>
                      <td className={styles.alignCenter}>{row.SEM}</td>
                      <td className={styles.alignCenter}>{row.PTYPE ?? '-'}</td>
                      <td className={styles.alignCenter}>{row.TMAX ?? '-'}</td>
                      <td className={styles.alignCenter}>{row.TPASS ?? '-'}</td>
                      <td className={styles.alignCenter}>{row.SMAX ?? '-'}</td>
                      <td className={styles.alignCenter}>{row.SPASS ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className={styles.paginationBar}>
              <div className={styles.paginationControls}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
              <div className={styles.pageSizeGroup}>
                <label htmlFor="semPageSize" className={styles.pageSizeLabel}>
                  Rows per page
                </label>
                <select
                  id="semPageSize"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className={styles.pageSizeSelect}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemesterGradesReport;

