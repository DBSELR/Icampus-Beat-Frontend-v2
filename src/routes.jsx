import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import ProgrammeBranches from './components/ProgrammeBranches.jsx';
import Courses from './components/Courses.jsx';
import EmployeeData from './components/EmployeeData.jsx';
import ExamNotifications from './components/ExamNotifications.jsx';
import FeeStructure from './components/FeeStructure.jsx';
import SemesterGrades from './components/SemesterGrades.jsx';
import RoomMaster from './components/RoomMaster.jsx';
import ImportData from './components/ImportData.jsx';
import FeeHeads from './components/FeeHeads.jsx';
import ClassGrade from './components/ClassGrade.jsx';
import CourseGrades from './components/CourseGrades.jsx';
import MasterCreation from './components/MasterCreation.jsx';
import StudentwiseMasterCreation from './components/StudentwiseMasterCreation.jsx';
import BranchPriority from './components/BranchPriority.jsx';
import CoursesListReport from './components/CoursesListReport.jsx';
import CourseGradesReport from './components/CourseGradesReport.jsx';
import SemesterGradesReport from './components/SemesterGradesReport.jsx';
import RoomMasterReport from './components/RoomMasterReport.jsx';
import TimeTableSeating from './components/TimeTableSeating.jsx';
import ExamRegistrations from './components/ExamRegistrations.jsx';
import RevaluationRegistration from './components/RevaluationRegistration.jsx';
import StudentScreen from './components/StudentScreen.jsx';
import DupCertificateIssue from './components/DupCertificateIssue.jsx';
import ExamFeeConcession from './components/ExamFeeConcession.jsx';
import RoomAllotment from './components/RoomAllotment.jsx';
import CondonationFee from './components/CondonationFee.jsx';
import ReceiptCancel from './components/ReceiptCancel.jsx';
import ConsolidatedFeeReport from './components/ConsolidatedFeeReport.jsx';
import MiscellaneousFeePay from './components/MiscellaneousFeePay.jsx';
import ReceiptList from './components/ReceiptList.jsx';
import SupplyLabRegisteredData from './components/SupplyLabRegisteredData.jsx';
import CreditsMismatch from './components/CreditsMismatch.jsx';
import ExamUnregistration from './components/ExamUnregistration.jsx';
import UnblockRegistrations from './components/UnblockRegistrations.jsx';
import TimeTable from './components/TimeTable.jsx';
import HallTickets from './components/HallTickets.jsx';
import QuestionPaperStatement from './components/QuestionPaperStatement.jsx';
import OmrSheet from './components/OmrSheet.jsx';
import NominalRolls from './components/NominalRolls.jsx';
import ExamFeeCollection from './components/ExamFeeCollection.jsx';
import CancelReceiptList from './components/CancelReceiptList.jsx';
import RoomAbstruct from './components/RoomAbstruct.jsx';
import MidHallTickets from './components/MidHallTickets.jsx';
import SeatingArrangement from './components/SeatingArrangement.jsx';
import RoomwiseNominalRolls from './components/RoomwiseNominalRolls.jsx';
import InternalMarksEntry from './components/InternalMarksEntry.jsx';
import PracticalMarksEntry from './components/PracticalMarksEntry.jsx';
import AbsenteesEntry from './components/AbsenteesEntry.jsx';
import RegNoWiseMarksEntry from './components/RegNoWiseMarksEntry.jsx';
import MarksEntryOMR from './components/MarksEntryOMR.jsx';
import ExamMyUpdate from './components/ExamMyUpdate.jsx';
import RegnoExammywiseSubjects from './components/RegnoExammywiseSubjects.jsx';
import MidAbsenteesEntry from './components/MidAbsenteesEntry.jsx';
import PendingList from './components/PendingList.jsx';
import ModerationResultFlotation from './components/ModerationResultFlotation.jsx';
import StudentHistory from './components/StudentHistory.jsx';
import ReAdmission from './components/ReAdmission.jsx';
import BackLogsList from './components/BackLogsList.jsx';
import ToppersList from './components/ToppersList.jsx';
import StudentResult from './components/StudentResult.jsx';
import SubjectwiseFailedList from './components/SubjectwiseFailedList.jsx';
import SgpaCgpaData from './components/SgpaCgpaData.jsx';
import MarksData from './components/MarksData.jsx';
import CreditSecured from './components/CreditSecured.jsx';
import TotalSecuredCredits from './components/TotalSecuredCredits.jsx';
import ODData from './components/ODData.jsx';
import BacklogsRegnoWise from './components/BacklogsRegnoWise.jsx';
import OmrNumberUpdate from './components/OmrNumberUpdate.jsx';
import ResultSheetExcelExport from './components/ResultSheetExcelExport.jsx';
import StudentHistoryWithoutMarks from './components/StudentHistoryWithoutMarks.jsx';
import ResultProcessRegnoWise from './components/ResultProcessRegnoWise.jsx';
import GroftingProcess from './components/GroftingProcess.jsx';
import StudentEntry from './components/StudentEntry.jsx';
import InternalCheckList from './components/InternalCheckList.jsx';
import PracticalCheckList from './components/PracticalCheckList.jsx';
import DForm from './components/DForm.jsx';
import AbsenteesList from './components/AbsenteesList.jsx';
import SubjectWisePresentList from './components/SubjectWisePresentList.jsx';
import DFormMid from './components/DFormMid.jsx';
import RvClosingDates from './components/RvClosingDates.jsx';
import PreModeration from './components/PreModeration.jsx';
import CoursePercentage from './components/CoursePercentage.jsx';
import BranchWiseCoursePercent from './components/BranchWiseCoursePercent.jsx';
import BranchWisePercent from './components/BranchWisePercent.jsx';
import PassedResult from './components/PassedResult.jsx';
import FailedInSemResultPassed from './components/FailedInSemResultPassed.jsx';
import GradeCard from './components/GradeCard.jsx';
import MtechCmm from './components/MtechCmm.jsx';
import PcAllCourses from './components/PcAllCourses.jsx';
import MbaCmm from './components/MbaCmm.jsx';
import CgcAllProgrammes from './components/CgcAllProgrammes.jsx';
import UserForms from './components/UserForms.jsx';
import BackUpDatabase from './components/BackUpDatabase.jsx';
import BioMetricEntry from './components/BioMetricEntry.jsx';
import ExportToStdPortal from './components/ExportToStdPortal.jsx';
import ExportToStdportalRegnoWise from './components/ExportToStdportalRegnoWise.jsx';
import SchemaStructure from './components/SchemaStructure.jsx';
import ApplySchema from './components/ApplySchema.jsx';
import EvaluatorRegistration from './components/EvaluatorRegistration.jsx';
import ScriptsAssign from './components/ScriptsAssign.jsx';
import OdSubjectData from './components/OdSubjectData.jsx';
import UniversityData from './components/UniversityData.jsx';
import TrainingPlacementData from './components/TrainingPlacementData.jsx';
import GraceData from './components/GraceData.jsx';
import Rv2MarksEntry from './components/Rv2MarksEntry.jsx';
import CgpaYearWise from './components/CgpaYearWise.jsx';
import ResultCheckList from './components/ResultCheckList.jsx';
import ResultSheetV1Marks from './components/ResultSheetV1Marks.jsx';
import ResultSheetV1RvGrades from './components/ResultSheetV1RvGrades.jsx';
import SubjectWiseGradesCount from './components/SubjectWiseGradesCount.jsx';
import Transcript from './components/Transcript.jsx';
import ResultSheetSubjectModeration from './components/ResultSheetSubjectModeration.jsx';
import ResultSheetGrafting from './components/ResultSheetGrafting.jsx';
import WebResult from './components/WebResult.jsx';
import IndividualMarksMemo from './components/IndividualMarksMemo.jsx';
import TabulationRegister from './components/TabulationRegister.jsx';
import RvReports from './components/RvReports.jsx';
import SgpaCgpaHtnoWise from './components/SgpaCgpaHtnoWise.jsx';
import CreditsSecuredHtnoWise from './components/CreditsSecuredHtnoWise.jsx';
import AwardOfClassBranchwise from './components/AwardOfClassBranchwise.jsx';
import BranchWiseCourseSectionPercent from './components/BranchWiseCourseSectionPercent.jsx';
import BranchWiseSectionPercent from './components/BranchWiseSectionPercent.jsx';
import ExamFeeCollectionReport from './components/ExamFeeCollectionReport.jsx';
import AwardDegree from './components/AwardDegree.jsx';
import TcIssue from './components/TcIssue.jsx';
import ScIssue from './components/ScIssue.jsx';
import Pc from './components/Pc.jsx';
import JntuhUniversityPcData from './components/JntuhUniversityPcData.jsx';
import RvSummeryReport from './components/RvSummeryReport.jsx';
import UniversitySubjectData from './components/UniversitySubjectData.jsx';
import UniversityCdData from './components/UniversityCdData.jsx';
import AuditCourse from './components/AuditCourse.jsx';

const AppRoutes = () => (
  <Routes>
    {/* Public route for login */}
    <Route path="/login" element={<Login />} />
    
    {/* Protected routes */}
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/source/programme-branches" element={<ProgrammeBranches />} />
                  <Route path="/source/courses" element={<Courses />} />
                  <Route path="/source/employee-data" element={<EmployeeData />} />
                  <Route path="/source/exam-notifications" element={<ExamNotifications />} />
                  <Route path="/source/fee-structure" element={<FeeStructure />} />
                  <Route path="/source/semester-grades" element={<SemesterGrades />} />
                  <Route path="/source/room-master" element={<RoomMaster />} />
                  <Route path="/source/import-data" element={<ImportData />} />
                  <Route path="/source/fee-heads" element={<FeeHeads />} />
                  <Route path="/source/class-grade" element={<ClassGrade />} />
      <Route path="/source/course-grades" element={<CourseGrades />} />
      <Route path="/source-reports/courses-list" element={<CoursesListReport />} />
      <Route path="/source-reports/course-grades-list" element={<CourseGradesReport />} />
      <Route path="/source-reports/semester-grades-list" element={<SemesterGradesReport />} />
      <Route path="/source-reports/room-master" element={<RoomMasterReport />} />
      <Route path="/source/master-creation" element={<MasterCreation />} />
      <Route path="/source/student-data" element={<StudentEntry />} />
                  <Route path="/source/studentwise-master" element={<StudentwiseMasterCreation />} />
                  <Route path="/source/branch-priority" element={<BranchPriority />} />
      <Route path="/pre-exams/time-table-seating" element={<TimeTableSeating />} />
      <Route path="/pre-exams/exam-registrations" element={<ExamRegistrations />} />
      <Route path="/pre-exams/rv-rc-rvc-registration" element={<RevaluationRegistration />} />
      <Route path="/pre-exams/student-screen" element={<StudentScreen />} />
      <Route path="/pre-exams/dup-certificate-issue" element={<DupCertificateIssue />} />
      <Route path="/pre-exams/exam-fee-concession" element={<ExamFeeConcession />} />
      <Route path="/pre-exams/room-allotment" element={<RoomAllotment />} />
      <Route path="/pre-exams/condonation-fee" element={<CondonationFee />} />
      <Route path="/pre-exams/cancel-receipt" element={<ReceiptCancel />} />
      <Route path="/pre-exams/consolidated-fee-report" element={<ConsolidatedFeeReport />} />
      <Route path="/pre-exams/miscellaneous-fee-pay" element={<MiscellaneousFeePay />} />
                  <Route path="/pre-exams/receipt-list" element={<ReceiptList />} />
      <Route path="/pre-exams/supply-lab-registered-data" element={<SupplyLabRegisteredData />} />
      <Route path="/pre-exams/credits-mismatch" element={<CreditsMismatch />} />
      <Route path="/pre-exams/exam-unregistration" element={<ExamUnregistration />} />
      <Route path="/pre-exams/unblock-registrations" element={<UnblockRegistrations />} />
      <Route path="/pre-exam-reports/time-table" element={<TimeTable />} />
      <Route path="/pre-exam-reports/hall-tickets" element={<HallTickets />} />
      <Route path="/pre-exam-reports/question-paper-statement" element={<QuestionPaperStatement />} />
      <Route path="/pre-exam-reports/omr-sheet" element={<OmrSheet />} />
      <Route path="/pre-exam-reports/nominal-rolls" element={<NominalRolls />} />
      <Route path="/pre-exam-reports/exam-fee-collection" element={<ExamFeeCollection />} />
      <Route path="/pre-exam-reports/cancel-receipt-list" element={<CancelReceiptList />} />
      <Route path="/pre-exam-reports/consolidated-fee-report" element={<ConsolidatedFeeReport />} />
      <Route path="/pre-exam-reports/room-abstruct" element={<RoomAbstruct />} />
      <Route path="/pre-exam-reports/mid-hall-tickets" element={<MidHallTickets />} />
      <Route path="/pre-exam-reports/seating-arrangement" element={<SeatingArrangement />} />
      <Route path="/pre-exam-reports/roomwise-nominal-rolls" element={<RoomwiseNominalRolls />} />
                  <Route path="/post-exams/internal-marks-entry" element={<InternalMarksEntry />} />
              <Route path="/post-exams/practical-marks-entry" element={<PracticalMarksEntry />} />
              <Route path="/post-exams/absentees-entry" element={<AbsenteesEntry />} />
              <Route path="/post-exams/reg-no-wise-marks-entry" element={<RegNoWiseMarksEntry />} />
              <Route path="/post-exams/marks-entry-omr" element={<MarksEntryOMR />} />
              <Route path="/post-exams/exammy-update" element={<ExamMyUpdate />} />
              <Route path="/post-exams/regno-exammywise-subjects" element={<RegnoExammywiseSubjects />} />
              <Route path="/post-exams/mid-absentees-entry" element={<MidAbsenteesEntry />} />
              <Route path="/post-exam-reports/internal-check-list" element={<InternalCheckList />} />
              <Route path="/post-exam-reports/practical-check-list" element={<PracticalCheckList />} />
              <Route path="/post-exam-reports/d-form" element={<DForm />} />
              <Route path="/post-exam-reports/absentees-list" element={<AbsenteesList />} />
              <Route path="/post-exam-reports/subject-wise-present-list" element={<SubjectWisePresentList />} />
              <Route path="/post-exam-reports/d-form-mid" element={<DFormMid />} />
              <Route path="/results/pending-list" element={<PendingList />} />
              <Route path="/results/moderation-result" element={<ModerationResultFlotation />} />
              <Route path="/results/student-history" element={<StudentHistory />} />
              <Route path="/results/readmission" element={<ReAdmission />} />
              <Route path="/results/backlogs-list" element={<BackLogsList />} />
              <Route path="/results/toppers-list" element={<ToppersList />} />
              <Route path="/results/student-result" element={<StudentResult />} />
              <Route path="/results/subjectwise-failed" element={<SubjectwiseFailedList />} />
              <Route path="/results/rv-closing-dates" element={<RvClosingDates />} />
              <Route path="/results/nba-sgpa-cgpa" element={<SgpaCgpaData />} />
              <Route path="/results/marks-data" element={<MarksData />} />
              <Route path="/results/credit-secured" element={<CreditSecured />} />
              <Route path="/results/total-secured-credits" element={<TotalSecuredCredits />} />
              <Route path="/results/od-data" element={<ODData />} />
              <Route path="/results/od-subject-data" element={<OdSubjectData />} />
              <Route path="/results/university-data" element={<UniversityData />} />
              <Route path="/results/training-placement-data" element={<TrainingPlacementData />} />
              <Route path="/results/grace-data" element={<GraceData />} />
              <Route path="/results/rv2-marks-entry" element={<Rv2MarksEntry />} />
              <Route path="/results/cgpa-yearwise" element={<CgpaYearWise />} />
              <Route path="/results/backlogs-regno-wise" element={<BacklogsRegnoWise />} />
              <Route path="/results/omr-number-update" element={<OmrNumberUpdate />} />
              <Route path="/results/result-sheet-excel-export" element={<ResultSheetExcelExport />} />
              <Route path="/results/student-history-without-marks" element={<StudentHistoryWithoutMarks />} />
              <Route path="/results/result-process-regno" element={<ResultProcessRegnoWise />} />
              <Route path="/results/grofting-process" element={<GroftingProcess />} />
              <Route path="/result-reports/pre-moderation" element={<PreModeration />} />
              <Route path="/result-reports/course-percentage" element={<CoursePercentage />} />
              <Route path="/result-reports/branch-wise-course-percent" element={<BranchWiseCoursePercent />} />
              <Route path="/result-reports/branch-wise-course-section-percent" element={<BranchWiseCourseSectionPercent />} />
              <Route path="/result-reports/branch-wise-section-percent" element={<BranchWiseSectionPercent />} />
              <Route path="/result-reports/branch-wise-percent" element={<BranchWisePercent />} />
              <Route path="/result-reports/passed-result" element={<PassedResult />} />
              <Route path="/result-reports/failed-in-sem-result-passed" element={<FailedInSemResultPassed />} />
              <Route path="/result-reports/grade-card" element={<GradeCard />} />
              <Route path="/result-reports/mtech-cmm" element={<MtechCmm />} />
              <Route path="/result-reports/pc-all-courses" element={<PcAllCourses />} />
              <Route path="/result-reports/mba-cmm" element={<MbaCmm />} />
              <Route path="/result-reports/cgc-all-programmes" element={<CgcAllProgrammes />} />
              <Route path="/result-reports/result-check-list" element={<ResultCheckList />} />
              <Route path="/result-reports/result-sheet-v1-marks" element={<ResultSheetV1Marks />} />
              <Route path="/result-reports/result-sheet-v1-rv-grades" element={<ResultSheetV1RvGrades />} />
              <Route path="/result-reports/subject-wise-failed-list" element={<SubjectwiseFailedList />} />
              <Route path="/result-reports/subject-wise-grades-count" element={<SubjectWiseGradesCount />} />
              <Route path="/result-reports/transcript" element={<Transcript />} />
              <Route path="/result-reports/result-sheet-subject-moderation" element={<ResultSheetSubjectModeration />} />
              <Route path="/result-reports/result-sheet-grafting" element={<ResultSheetGrafting />} />
              <Route path="/result-reports/web-result" element={<WebResult />} />
              <Route path="/result-reports/individual-marks-memo" element={<IndividualMarksMemo />} />
              <Route path="/result-reports/tabulation-register" element={<TabulationRegister />} />
              <Route path="/result-reports/rv-reports-check-lists" element={<RvReports />} />
              <Route path="/result-reports/sgpa-cgpa-ht-no-wise" element={<SgpaCgpaHtnoWise />} />
              <Route path="/result-reports/credits-secured-ht-no-wise" element={<CreditsSecuredHtnoWise />} />
              <Route path="/result-reports/awardofclass-branchwise" element={<AwardOfClassBranchwise />} />
              <Route path="/result-reports/exam-fee-collection" element={<ExamFeeCollectionReport />} />
              <Route path="/result-reports/nba-award-degree-list" element={<AwardDegree />} />
              <Route path="/result-reports/tc-issue" element={<TcIssue />} />
              <Route path="/result-reports/sc-issue" element={<ScIssue />} />
              <Route path="/result-reports/pc" element={<Pc />} />
              <Route path="/result-reports/jntuh-university-pc-data" element={<JntuhUniversityPcData />} />
              <Route path="/result-reports/rv-summery-report" element={<RvSummeryReport />} />
              <Route path="/result-reports/university-subject-data" element={<UniversitySubjectData />} />
              <Route path="/result-reports/university-cd-data" element={<UniversityCdData />} />
              <Route path="/result-reports/audit-course" element={<AuditCourse />} />
              <Route path="/settings/user-forms" element={<UserForms />} />
              <Route path="/settings/backup-database" element={<BackUpDatabase />} />
              <Route path="/settings/biometric-entry" element={<BioMetricEntry />} />
              <Route path="/settings/export-to-stdportal" element={<ExportToStdPortal />} />
              <Route path="/settings/export-to-stdportal-regno-wise" element={<ExportToStdportalRegnoWise />} />
              <Route path="/evaluation/schema-structure" element={<SchemaStructure />} />
              <Route path="/evaluation/apply-schema" element={<ApplySchema />} />
              <Route path="/evaluation/evaluator-registration" element={<EvaluatorRegistration />} />
              <Route path="/evaluation/scripts-assign" element={<ScriptsAssign />} />
    </Route>
  </Routes>
);

export default AppRoutes; 