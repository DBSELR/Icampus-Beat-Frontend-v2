import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './RoomMasterReport.module.css';
import { getRoomMasterReport } from '../utils/api';

const RoomMasterReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const handleViewReport = () => {
    setIsLoading(true);
    setError('');
    setRows([]);
    setPage(1);
    setTimeout(() => {
      getRoomMasterReport()
        .then((response) => {
          if (response.success && Array.isArray(response.data)) {
            setRows(response.data);
            setHasReport(response.data.length > 0);
            if (!response.data.length) {
              setError('No rooms found.');
            }
          } else {
            setRows([]);
            setHasReport(false);
            setError(response.message || 'Failed to load room master report.');
          }
        })
        .catch((apiError) => {
          console.error('Room master report error:', apiError);
          setRows([]);
          setHasReport(false);
          setError(apiError.message || 'Failed to load room master report.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 700);
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
      const doc = new jsPDF('p', 'mm', 'a4');

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
      doc.text('Room Master Report', pageWidth / 2, 29, { align: 'center' });

      const tableBody = rows.map((row, index) => [
        index + 1,
        row.PCODE,
        row.GRP,
        row.SEM,
        row.CREDITS ?? '-',
        row.PTYPE ?? '-'
      ]);

      autoTable(doc, {
        startY: 36,
        head: [['S.No', 'Room No', 'Block', 'Floor', 'Capacity', 'Status']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineColor: 0, lineWidth: 0.1 },
        bodyStyles: { lineColor: 0, lineWidth: 0.1, textColor: 0 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 20 }
        }
      });

      doc.save('Room_Master_Report.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.actionsGroup}>
          <button
            className={styles.viewBtn}
            onClick={handleViewReport}
            disabled={isLoading || isGeneratingPdf}
          >
            {isLoading ? 'Loading…' : 'View'}
          </button>
          <button
            className={styles.downloadPdfBtn}
            onClick={handleDownloadPdf}
            disabled={!hasReport || isLoading || isGeneratingPdf}
          >
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className={styles.reportArea}>
        {!hasReport && !isLoading && (
          <div className={styles.placeholder}>{error || 'Click “View” to load the room master report.'}</div>
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
                <h2 className={styles.reportTitle}>Room Master Report</h2>
              </div>
            </div>

            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Room No</th>
                  <th>Block</th>
                  <th>Floor</th>
                  <th>Capacity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>No data available.</td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr key={`${row.PCODE || index}-${index}`}>
                      <td className={styles.alignCenter}>{(page - 1) * pageSize + index + 1}</td>
                      <td>{row.PCODE}</td>
                      <td>{row.GRP}</td>
                      <td className={styles.alignCenter}>{row.SEM}</td>
                      <td className={styles.alignCenter}>{row.CREDITS ?? '-'}</td>
                      <td className={styles.alignCenter}>{row.PTYPE ?? '-'}</td>
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
                <label htmlFor="roomPageSize" className={styles.pageSizeLabel}>
                  Rows per page
                </label>
                <select
                  id="roomPageSize"
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

export default RoomMasterReport;

