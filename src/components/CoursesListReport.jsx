import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './CoursesListReport.module.css';
import {
  getAppData,
  getCourseReport,
  getCourseReportBatches,
  getCourseReportBranches,
  getCourseReportSems,
} from '../utils/api';

const CoursesListReport = () => {
  const [filters, setFilters] = useState({
    batch: '',
    regu: '',
    semester: '',
    branch: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [courseRows, setCourseRows] = useState([]);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ course: '', regulation: '' });
  const [batchOptions, setBatchOptions] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState({
    batches: false,
    semesters: false,
    branches: false,
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => {
      if (name === 'batch') {
        const batchMeta = batchOptions.find((item) => item.label === value);
        return {
          ...prev,
          batch: value,
          regu: batchMeta?.regu || '',
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
    setPage(1);
  };

  const fetchBatches = useCallback(async () => {
    if (!meta.course || !meta.regulation) {
      setBatchOptions([]);
      return;
    }

    setDropdownLoading((prev) => ({ ...prev, batches: true }));
    try {
      const response = await getCourseReportBatches(meta.course, meta.regulation);
      const list = response?.success && Array.isArray(response.data) ? response.data : [];
      const normalized = list
        .map((item) => ({
          label: item?.batch || item?.BATCH || item?.Batch || '',
          regu: item?.REGU || item?.regu || item?.Regu || '',
        }))
        .filter((item) => item.label && item.regu);
      setBatchOptions(normalized);
      if (normalized.length) {
        setFilters((prev) => ({
          ...prev,
          batch: prev.batch && normalized.some((item) => item.label === prev.batch) ? prev.batch : '',
          regu: prev.regu && normalized.some((item) => item.regu === prev.regu) ? prev.regu : '',
        }));
      } else {
        setFilters((prev) => ({ ...prev, batch: '', regu: '' }));
      }
    } catch (fetchError) {
      console.error('Error loading course report batches:', fetchError);
      setBatchOptions([]);
    } finally {
      setDropdownLoading((prev) => ({ ...prev, batches: false }));
    }
  }, [meta.course, meta.regulation]);

  const fetchSemesters = useCallback(
    async (selectedBatchLabel) => {
      const batchMeta = batchOptions.find((item) => item.label === selectedBatchLabel);
      if (!meta.course || !meta.regulation || !batchMeta) {
        setSemesterOptions([]);
        return;
      }

      setDropdownLoading((prev) => ({ ...prev, semesters: true }));
      try {
        const response = await getCourseReportSems(meta.course, meta.regulation, batchMeta.regu);
        const list = response?.success && Array.isArray(response.data) ? response.data : [];
        const normalized = list
          .map((item) => item?.sem || item?.SEM || item?.Sem || '')
          .filter(Boolean);
        setSemesterOptions(normalized);
        setFilters((prev) => ({
          ...prev,
          semester: normalized.includes(prev.semester) ? prev.semester : '',
        }));
      } catch (fetchError) {
        console.error('Error loading course report semesters:', fetchError);
        setSemesterOptions([]);
        setFilters((prev) => ({ ...prev, semester: '' }));
      } finally {
        setDropdownLoading((prev) => ({ ...prev, semesters: false }));
      }
    },
    [meta.course, meta.regulation, batchOptions]
  );

  const fetchBranches = useCallback(
    async (selectedBatchLabel) => {
      const batchMeta = batchOptions.find((item) => item.label === selectedBatchLabel);
      if (!batchMeta) {
        setBranchOptions([]);
        setFilters((prev) => ({ ...prev, branch: '' }));
        return;
      }

      setDropdownLoading((prev) => ({ ...prev, branches: true }));
      try {
        const response = await getCourseReportBranches(meta.course, meta.regulation, batchMeta.regu);
        const list = response?.success && Array.isArray(response.data) ? response.data : [];
        const normalized = list
          .map((item) => item?.grp || item?.GRP || item?.Branch || item?.branch || '')
          .filter(Boolean);
        setBranchOptions(normalized);
        setFilters((prev) => ({
          ...prev,
          branch: normalized.includes(prev.branch) ? prev.branch : '',
        }));
      } catch (fetchError) {
        console.error('Error loading course report branches:', fetchError);
        setBranchOptions([]);
        setFilters((prev) => ({ ...prev, branch: '' }));
      } finally {
        setDropdownLoading((prev) => ({ ...prev, branches: false }));
      }
    },
    [meta.course, meta.regulation, batchOptions]
  );

  useEffect(() => {
    const appData = getAppData();
    setMeta({
      course: appData?.course || '',
      regulation: appData?.regulation || '',
    });
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    if (filters.batch) {
      fetchSemesters(filters.batch);
      fetchBranches(filters.batch);
    } else {
      setSemesterOptions([]);
      setBranchOptions([]);
      setFilters((prev) => ({ ...prev, semester: '', branch: '', regu: '' }));
    }
  }, [filters.batch, fetchSemesters, fetchBranches]);

  const handleViewReport = async () => {
    setIsLoading(true);
    setHasResult(false);
    setError('');
    setCourseRows([]);
    setPage(1);

    try {
      const response = await getCourseReport({
        batch: filters.batch,
        semester: filters.semester,
        branch: filters.branch,
        regu: filters.regu,
        course: meta.course,
        regulation: meta.regulation,
      });

      if (response.success && Array.isArray(response.data)) {
        setCourseRows(response.data);
        setHasResult(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No courses found for the selected criteria.');
        }
      } else {
        setHasResult(false);
        setError(response.message || 'Failed to load course report.');
      }
    } catch (apiError) {
      console.error('Course report fetch failed:', apiError);
      setError(apiError.message || 'Failed to load course report.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRows = courseRows.filter((row) => {
    let match = true;
    if (filters.semester && String(row.SEM) !== String(filters.semester)) {
      match = false;
    }
    if (filters.branch && String(row.GRP) !== String(filters.branch)) {
      match = false;
    }
    return match;
  });

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const groupedCourses = filteredRows.reduce((acc, row) => {
    const branch = row.GRP || 'Unknown Branch';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(row);
    return acc;
  }, {});

  const groupedPagedCourses = pagedRows.reduce((acc, row) => {
    const branch = row.GRP || 'Unknown Branch';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(row);
    return acc;
  }, {});

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const handleDownloadPdf = async () => {
    if (!hasResult || courseRows.length === 0) {
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
      doc.text(`Course List ${filters.batch ? `For Admitted Batch Of ${filters.batch}` : 'For All Batches'}`, pageWidth / 2, 29, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('BATCH :', 14, 40);
      doc.setTextColor(255, 0, 255);
      doc.text(` ${filters.batch || 'ALL'}`, 14 + doc.getTextWidth('BATCH :'), 40);

      const semValue = ` ${filters.semester ? `${filters.semester} SEM` : 'ALL'}`;
      const semLabelWidth = doc.getTextWidth('SEM :');
      const semValueWidth = doc.getTextWidth(semValue);
      doc.setTextColor(0, 0, 255);
      doc.text('SEM :', pageWidth - 14 - semValueWidth - semLabelWidth, 40);
      doc.setTextColor(0, 0, 0);
      doc.text(semValue, pageWidth - 14 - semValueWidth, 40);

      const tableBody = [];
      Object.entries(groupedCourses).forEach(([branch, courses]) => {
        tableBody.push([
          { 
            content: `B.Tech - ${branch}`, 
            colSpan: 7, 
            styles: { fillColor: [229, 231, 235], textColor: [255, 0, 255], fontStyle: 'bold', halign: 'center' } 
          }
        ]);
        courses.forEach((row, index) => {
          tableBody.push([
            index + 1,
            row.PCODE,
            row.PNAME,
            row.CREDITS ?? '-',
            row.PTYPE ?? '-',
            row.SEM,
            row.GRP
          ]);
        });
      });

      autoTable(doc, {
        startY: 44,
        head: [['S.No', 'Course Code', 'Course Name', 'Credits', 'Type', 'Semester', 'Branch']],
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

      doc.save(`Course_List_Report_${filters.batch || 'ALL'}.pdf`);
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
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select
              name="batch"
              value={filters.batch}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.batches || !batchOptions.length}
            >
              <option value="">
                {dropdownLoading.batches ? 'Loading batches...' : 'Select Batch'}
              </option>
              {batchOptions.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.semesters || !semesterOptions.length}
            >
              <option value="">
                {dropdownLoading.semesters ? 'Loading semesters...' : 'Select an Option'}
              </option>
              {semesterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={dropdownLoading.branches || !branchOptions.length}
            >
              <option value="">
                {dropdownLoading.branches ? 'Loading branches...' : 'Select an Option'}
              </option>
              {branchOptions.map((option) => (
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
            <button className={styles.downloadPdfBtn} onClick={handleDownloadPdf} disabled={isLoading || isGeneratingPdf || !hasResult}>
              {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.reportArea}>
        {!hasResult && !isLoading && (
          <div className={styles.placeholder}>
            {error || 'Select the required filters and click View to load the report.'}
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Generating report…</div>}
        
        {hasResult && !isLoading && (
          <div className={styles.reportWrapper}>
            <div className={styles.reportHeader}>
              <div className={styles.logoContainer}>
                <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Institute Logo" className={styles.logo} />
              </div>
              <div className={styles.titleContainer}>
                <h1 className={styles.instituteName}>D. B. S. Institute</h1>
                <p className={styles.instituteSub}>(PVT.LTD)</p>
                <h2 className={styles.reportTitle}>Course List {filters.batch ? `For Admitted Batch Of ${filters.batch}` : 'For All Batches'}</h2>
              </div>
            </div>
            
            <div className={styles.infoBar}>
              <span>BATCH : <strong>{filters.batch || 'ALL'}</strong></span>
              <span>SEM : <strong>{filters.semester ? `${filters.semester} SEM` : 'ALL'}</strong></span>
            </div>

            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Credits</th>
                  <th>Type</th>
                  <th>Semester</th>
                  <th>Branch</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPagedCourses).length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>No data available.</td>
                  </tr>
                ) : (
                  Object.entries(groupedPagedCourses).map(([branch, courses]) => (
                    <React.Fragment key={branch}>
                      <tr className={styles.branchHeaderRow}>
                        <td colSpan={7} className={styles.branchHeaderCell}>
                          B.Tech - {branch}
                        </td>
                      </tr>
                      {courses.map((row, index) => (
                        <tr key={`${row.PCODE}-${index}`}>
                          <td className={styles.alignCenter}>{(page - 1) * pageSize + index + 1}</td>
                          <td>{row.PCODE}</td>
                          <td>{row.PNAME}</td>
                          <td className={styles.alignCenter}>{row.CREDITS ?? '-'}</td>
                          <td className={styles.alignCenter}>{row.PTYPE ?? '-'}</td>
                          <td className={styles.alignCenter}>{row.SEM}</td>
                          <td className={styles.alignCenter}>{row.GRP}</td>
                        </tr>
                      ))}
                    </React.Fragment>
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
                <label htmlFor="coursePageSize" className={styles.pageSizeLabel}>
                  Rows per page
                </label>
                <select
                  id="coursePageSize"
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

export default CoursesListReport;
