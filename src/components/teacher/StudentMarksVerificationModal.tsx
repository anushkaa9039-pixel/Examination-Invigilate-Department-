import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Check,
  Edit3,
  Sparkles,
  CheckCheck,
  Loader2,
  ShieldAlert,
  Save,
  ArrowLeft,
  User,
  Clock,
  Bell,
  AlertTriangle,
  MessageSquare,
  Send,
  Ban,
  XCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../api';
import { Exam, Question, Answer, Attempt, DashboardStudentSubmission } from '../../types';
import { SubmissionDecisionModal } from './SubmissionDecisionModal';

interface StudentMarksVerificationModalProps {
  submission: DashboardStudentSubmission;
  allSubmissions?: DashboardStudentSubmission[];
  onSelectSubmission?: (sub: DashboardStudentSubmission) => void;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const StudentMarksVerificationModal: React.FC<StudentMarksVerificationModalProps> = ({
  submission,
  allSubmissions,
  onSelectSubmission,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [attempt, setAttempt] = useState<Attempt>(submission.attempt);
  const [studentResponses, setStudentResponses] = useState<any[]>([]);

  // Grade inputs by answerId: { [answerId]: { marks: number, feedback: string } }
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marks: number; feedback: string }>>({});

  // Loading states
  const [savingGrades, setSavingGrades] = useState(false);
  const [verifyingResult, setVerifyingResult] = useState(false);
  const [calculatingAuto, setCalculatingAuto] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Decision Modal State (Fail or Discard with note)
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Caution State
  const [showCautionBox, setShowCautionBox] = useState(false);
  const [cautionMsg, setCautionMsg] = useState(
    'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.'
  );
  const [sendingCaution, setSendingCaution] = useState(false);
  const [cautionNoticeHistory, setCautionNoticeHistory] = useState<any[]>(submission.cautions || []);

  const handleSendCautionDirect = async () => {
    if (!cautionMsg.trim()) return;
    setSendingCaution(true);
    try {
      const res = await api.sendCaution(submission.attempt.id, cautionMsg.trim());
      setSuccessMessage('Caution notice delivered to examinee.');
      setShowCautionBox(false);
      setCautionNoticeHistory((prev) => [...prev, res.caution]);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to send caution');
    } finally {
      setSendingCaution(false);
    }
  };

  const loadAttemptData = async (targetAttemptId?: string) => {
    const idToLoad = targetAttemptId || submission.attempt.id;
    setLoading(true);
    setSuccessMessage(null);
    try {
      const res = await api.getAttempt(idToLoad);
      setExam(res.exam);
      setAttempt(res.attempt);
      setQuestions(res.questions.sort((a, b) => a.order - b.order));
      setAnswers(res.savedAnswers);
      if (res.allResponses) {
        setStudentResponses(res.allResponses);
      }

      // Pre-fill teacher inputs
      const initialInputs: Record<string, { marks: number; feedback: string }> = {};
      res.savedAnswers.forEach((ans) => {
        const defaultMarks =
          ans.marksAwarded !== null && ans.marksAwarded !== undefined
            ? ans.marksAwarded
            : ans.autoMarksAwarded !== null && ans.autoMarksAwarded !== undefined
            ? ans.autoMarksAwarded
            : 0;

        initialInputs[ans.id] = {
          marks: defaultMarks,
          feedback: ans.feedback || ans.autoFeedback || '',
        };
      });
      setGradeInputs(initialInputs);
    } catch (err) {
      console.error('Failed to load candidate attempt data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load student's attempt details, questions, and answers
  useEffect(() => {
    if (!isOpen || !submission) return;
    loadAttemptData();
  }, [isOpen, submission]);

  if (!isOpen) return null;

  // Calculate live current total score from teacher inputs
  const currentCalculatedTotal = answers.reduce((sum, ans) => {
    const inp = gradeInputs[ans.id];
    return sum + (inp !== undefined ? inp.marks : (ans.marksAwarded ?? ans.autoMarksAwarded ?? 0));
  }, 0);

  const passingRequirement = exam?.passingMarks ?? submission.examPassingMarks;
  const isPassed = currentCalculatedTotal >= passingRequirement;

  // 1. Re-run Automated Scoring
  const handleAutoCalculate = async () => {
    setCalculatingAuto(true);
    setSuccessMessage(null);
    try {
      const res = await api.autoCalculateAttempt(attempt.id);
      setAttempt(res.attempt);
      setAnswers(res.answers);

      // Populate auto marks into inputs where teacher hasn't overridden
      const updatedInputs = { ...gradeInputs };
      res.answers.forEach((ans) => {
        updatedInputs[ans.id] = {
          marks: ans.autoMarksAwarded ?? 0,
          feedback: ans.autoFeedback || 'Auto evaluated',
        };
      });
      setGradeInputs(updatedInputs);
      setSuccessMessage('Auto-calculation completed based on question criteria.');
      onUpdated();
    } catch (err: any) {
      console.error('Failed to auto-calculate:', err);
    } finally {
      setCalculatingAuto(false);
    }
  };

  // 2. Accept All Auto Marks into Teacher Inputs
  const handleAcceptAllAutoMarks = () => {
    const updatedInputs = { ...gradeInputs };
    answers.forEach((ans) => {
      updatedInputs[ans.id] = {
        marks: ans.autoMarksAwarded ?? 0,
        feedback: ans.autoFeedback || 'Accepted auto mark',
      };
    });
    setGradeInputs(updatedInputs);
    setSuccessMessage('Auto-calculated marks populated into grading inputs.');
  };

  // 3. Save Draft Marks
  const handleSaveDraftMarks = async () => {
    setSavingGrades(true);
    setSuccessMessage(null);
    try {
      const gradesToSave = Object.entries(gradeInputs).map(([answerId, data]) => ({
        answerId,
        marksAwarded: data.marks,
        feedback: data.feedback,
      }));
      await api.saveAllGrades(gradesToSave);
      setSuccessMessage('Draft marks saved successfully.');
      onUpdated();
    } catch (err: any) {
      console.error('Failed to save draft marks:', err);
    } finally {
      setSavingGrades(false);
    }
  };

  // 4. Verify & Mark Result (Final teacher verification)
  const handleVerifyAndMarkResult = async () => {
    setVerifyingResult(true);
    setSuccessMessage(null);
    try {
      const marksOverrides = Object.entries(gradeInputs).map(([answerId, data]) => ({
        answerId,
        marksAwarded: data.marks,
        feedback: data.feedback,
      }));

      const res = await api.verifyAndMarkAttempt(attempt.id, {
        teacherName: exam?.teacherName || 'Instructor',
        marksOverrides,
        teacherNotes: 'Teacher verified marks and review',
      });

      setAttempt(res.attempt);
      setAnswers(res.answers);
      setSuccessMessage('Marks verified and saved! Verified marks will be preserved upon final result release.');
      onUpdated();
    } catch (err: any) {
      console.error('Failed to verify result:', err);
    } finally {
      setVerifyingResult(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#30231F]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8DCC6] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-6 py-5 bg-[#F8F4EC]/80 border-b border-[#E8DCC6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 bg-white border border-[#B7A89A]/80 hover:border-[#722F37] text-[#30231F] rounded-xl transition-colors cursor-pointer"
              title="Return to student list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                  Marks Verification System
                </span>
                <span className="text-[#30231F]/30">·</span>
                <span className="text-xs text-[#30231F]/70">{submission.examId} ({submission.examTitle})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <User className="w-4 h-4 text-[#722F37]" />
                <h2 className="text-xl font-serif font-bold text-[#30231F]">
                  {attempt.studentName}
                </h2>
                <code className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-[#B7A89A]/50 rounded text-[#722F37]">
                  {attempt.accessCode}
                </code>
                {attempt.decisionStatus === 'Failed' || attempt.status === 'Failed' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-700 text-white flex items-center gap-1 shadow-xs">
                    <XCircle className="w-3 h-3" />
                    <span>Failed by Teacher</span>
                  </span>
                ) : attempt.decisionStatus === 'Discarded' || attempt.status === 'Discarded' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-700 text-white flex items-center gap-1 shadow-xs">
                    <Ban className="w-3 h-3" />
                    <span>Discarded</span>
                  </span>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      attempt.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-[#E8DCC6] text-[#30231F]'
                    }`}
                  >
                    {attempt.status}
                  </span>
                )}
                {(submission.totalAttemptsForStudent || 1) > 1 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    Response #{submission.attemptNumber} of {submission.totalAttemptsForStudent}
                  </span>
                )}
                <span className="text-xs text-[#30231F]/70 inline-flex items-center gap-1 font-medium ml-1">
                  <Clock className="w-3.5 h-3.5 text-[#722F37]" />
                  {attempt.submittedAt ? (
                    <>
                      Submitted on {new Date(attempt.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </>
                  ) : (
                    <>Started {new Date(attempt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#30231F]/60 hover:text-[#30231F] hover:bg-[#E8DCC6]/40 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* All Responses Switcher if student submitted multiple times */}
        {(() => {
          const siblingSubs = (allSubmissions || []).filter(
            (s) =>
              s.examId === (exam?.id || submission.examId) &&
              s.attempt.studentName.trim().toLowerCase() === attempt.studentName.trim().toLowerCase()
          );
          const hasMultiple = siblingSubs.length > 1 || studentResponses.length > 1 || (submission.totalAttemptsForStudent || 1) > 1;
          if (!hasMultiple) return null;

          const responseItems = siblingSubs.length > 0 ? siblingSubs : studentResponses;

          return (
            <div className="px-6 py-2.5 bg-blue-50/90 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="font-semibold text-blue-950">
                  All Responses by {attempt.studentName} ({responseItems.length} submissions):
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {responseItems.map((resp: any, idx: number) => {
                  const targetAttempt = resp.attempt || resp;
                  const targetAttemptId = targetAttempt.id || resp.attemptId;
                  const isCur = targetAttemptId === attempt.id;
                  const attNum = resp.attemptNumber || targetAttempt.attemptNumber || idx + 1;
                  const score = resp.totalScore !== undefined ? resp.totalScore : (targetAttempt.totalScoreAwarded ?? '-');
                  const dec = targetAttempt.decisionStatus;

                  return (
                    <button
                      key={targetAttemptId}
                      type="button"
                      onClick={() => {
                        if (resp.attempt && onSelectSubmission) {
                          onSelectSubmission(resp);
                        } else {
                          loadAttemptData(targetAttemptId);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCur
                          ? 'bg-[#722F37] text-white shadow-2xs ring-2 ring-[#722F37]/30'
                          : 'bg-white hover:bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                      title={`Switch to evaluate Response #${attNum}`}
                    >
                      <span>Response #{attNum}</span>
                      <span className="opacity-80">({score} M)</span>
                      {dec === 'Failed' ? (
                        <span className="text-[9px] px-1 bg-red-700 text-white rounded">Failed</span>
                      ) : dec === 'Discarded' ? (
                        <span className="text-[9px] px-1 bg-amber-700 text-white rounded">Discarded</span>
                      ) : null}
                      {isCur && <span className="text-[9px] uppercase tracking-wider font-extrabold ml-0.5">• Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Official Disciplinary Decision Banner if Failed or Discarded */}
        {attempt.decisionStatus && (
          <div
            className={`px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
              attempt.decisionStatus === 'Failed'
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {attempt.decisionStatus === 'Failed' ? (
                <XCircle className="w-4 h-4 text-red-700 shrink-0" />
              ) : (
                <Ban className="w-4 h-4 text-amber-700 shrink-0" />
              )}
              <span className="font-bold">
                Submission Officially {attempt.decisionStatus.toUpperCase()} by Instructor
              </span>
              {attempt.decisionNote && (
                <span className="italic">"{attempt.decisionNote}"</span>
              )}
              {attempt.decisionBy && (
                <span className="text-[10px] opacity-75">({attempt.decisionBy})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowDecisionModal(true)}
              className="px-2.5 py-1 bg-white border border-current rounded-lg text-xs font-semibold hover:bg-white/80 cursor-pointer"
            >
              Modify Decision
            </button>
          </div>
        )}

        {/* Floating Quick Summary & Actions Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-[#E8DCC6] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[11px] text-[#30231F]/60">Evaluated Score</div>
              <div className="text-lg font-serif font-bold text-[#722F37]">
                {currentCalculatedTotal} / {exam?.totalMarks ?? submission.examTotalMarks} M
              </div>
            </div>

            <div className="border-l border-[#E8DCC6] pl-4">
              <div className="text-[11px] text-[#30231F]/60">Result Status</div>
              <span className={`text-xs font-semibold ${isPassed ? 'text-emerald-700' : 'text-[#722F37]'}`}>
                {attempt.decisionStatus === 'Failed' || attempt.status === 'Failed'
                  ? 'Failed by Instructor'
                  : attempt.decisionStatus === 'Discarded' || attempt.status === 'Discarded'
                  ? 'Discarded / Cancelled'
                  : isPassed
                  ? `Passed (${passingRequirement} M req.)`
                  : `Below Pass (${passingRequirement} M req.)`}
              </span>
            </div>

            <div className="border-l border-[#E8DCC6] pl-4 hidden sm:block">
              <div className="text-[11px] text-[#30231F]/60">Verification</div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                attempt.verificationStatus === 'Teacher-Verified'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {attempt.verificationStatus === 'Teacher-Verified' ? 'Teacher Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fail or Discard Option */}
            <button
              type="button"
              onClick={() => setShowDecisionModal(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
                attempt.decisionStatus === 'Failed'
                  ? 'bg-red-100 border border-red-300 text-red-900 hover:bg-red-200'
                  : attempt.decisionStatus === 'Discarded'
                  ? 'bg-amber-100 border border-amber-300 text-amber-950 hover:bg-amber-200'
                  : 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-900'
              }`}
              title="Fail or Discard this submission with a note"
            >
              {attempt.decisionStatus === 'Failed' ? (
                <XCircle className="w-3.5 h-3.5 text-red-700" />
              ) : attempt.decisionStatus === 'Discarded' ? (
                <Ban className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
              )}
              <span>{attempt.decisionStatus ? attempt.decisionStatus : 'Fail / Discard'}</span>
            </button>

            <button
              type="button"
              onClick={handleAutoCalculate}
              disabled={calculatingAuto}
              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Re-run auto evaluation"
            >
              {calculatingAuto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
              <span>Auto-Calculate</span>
            </button>

            <button
              type="button"
              onClick={handleAcceptAllAutoMarks}
              className="px-3 py-1.5 bg-[#F8F4EC] border border-[#B7A89A] hover:bg-[#E8DCC6]/60 text-[#30231F] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Populate auto-calculated marks"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#722F37]" />
              <span className="hidden sm:inline">Apply Auto Marks</span>
            </button>

            <button
              type="button"
              onClick={handleVerifyAndMarkResult}
              disabled={verifyingResult}
              className="px-4 py-1.5 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Save teacher verified marks"
            >
              {verifyingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Verify & Mark Result</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content: Questions & Answers */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#722F37]" />
              <p className="text-sm text-[#30231F]/70 mt-3 font-medium">
                Loading candidate answers and response telemetry...
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center text-[#30231F]/60 text-sm">
              No examination questions found for this attempt.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC6]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                  Question-by-Question Candidate Responses & Teacher Marks
                </h3>
                <span className="text-xs text-[#30231F]/60">
                  {questions.length} Questions · Total {exam?.totalMarks} Marks
                </span>
              </div>

              {questions.map((q, idx) => {
                const studentAns = answers.find((a) => a.questionId === q.id);
                const currentInput = studentAns ? gradeInputs[studentAns.id] : null;

                return (
                  <div
                    key={q.id || idx}
                    className="p-5 bg-[#F8F4EC]/30 rounded-2xl border border-[#E8DCC6] space-y-3.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#E8DCC6] text-[#722F37] flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-[#30231F] capitalize">
                          {q.type.replace('_', ' ')} · Allocated {q.marks} Marks
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#722F37]">
                        Teacher Awarded: {currentInput?.marks ?? 0} / {q.marks} M
                      </div>
                    </div>

                    <div className="text-sm text-[#30231F] font-medium leading-relaxed">
                      {q.text}
                    </div>

                    {/* Candidate Submitted Response */}
                    <div className="p-3 bg-white rounded-xl border border-[#E8DCC6]">
                      <div className="text-[10px] font-semibold text-[#30231F]/60 uppercase tracking-wider mb-1">
                        Candidate Answer:
                      </div>
                      <div className="text-xs sm:text-sm text-[#30231F] font-serif">
                        {studentAns?.response ? (
                          studentAns.response
                        ) : (
                          <span className="text-[#30231F]/40 italic">(Blank / No answer submitted)</span>
                        )}
                      </div>
                    </div>

                    {/* Model Answer / Key */}
                    <div className="text-xs text-[#30231F]/80 bg-[#E8DCC6]/30 p-3 rounded-xl space-y-1">
                      <div>
                        <strong className="text-[#722F37]">Model Answer / Key:</strong>{' '}
                        {q.correctAnswer || '(Not specified)'}
                      </div>
                      {q.rubric && (
                        <div>
                          <strong className="text-[#722F37]">Evaluation Rubric:</strong> {q.rubric}
                        </div>
                      )}
                    </div>

                    {/* Auto Calculation Result */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Auto Calculation:</span>
                        </span>
                        <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                          {studentAns?.autoMarksAwarded !== null && studentAns?.autoMarksAwarded !== undefined
                            ? `${studentAns.autoMarksAwarded} / ${q.marks} M`
                            : `0 / ${q.marks} M`}
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-800">
                        {studentAns?.autoFeedback || 'Auto match evaluation complete.'}
                      </div>
                      {studentAns && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setGradeInputs({
                                ...gradeInputs,
                                [studentAns.id]: {
                                  marks: studentAns.autoMarksAwarded ?? 0,
                                  feedback: studentAns.autoFeedback || 'Accepted auto mark',
                                },
                              });
                            }}
                            className="text-[10px] text-indigo-700 hover:text-indigo-900 font-semibold underline cursor-pointer"
                          >
                            Set to Auto Mark ({studentAns.autoMarksAwarded ?? 0} M)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Teacher Marking Input */}
                    {studentAns && (
                      <div className="p-4 bg-white rounded-xl border border-[#B7A89A]/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-[#30231F] flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-[#722F37]" />
                            <span>Teacher Marking & Feedback (Max {q.marks} M)</span>
                          </label>
                          <span className="text-[10px] text-[#30231F]/60">
                            Adjust according to your evaluation
                          </span>
                        </div>

                        <div className="grid sm:grid-cols-12 gap-3 pt-1">
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-[#30231F] mb-1">
                              Awarded Mark
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={q.marks}
                              step="0.5"
                              value={currentInput?.marks ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setGradeInputs({
                                  ...gradeInputs,
                                  [studentAns.id]: {
                                    marks: val,
                                    feedback: currentInput?.feedback || '',
                                  },
                                });
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-[#B7A89A] rounded-lg text-xs font-bold text-[#722F37] focus:ring-2 focus:ring-[#722F37]"
                            />
                          </div>

                          <div className="sm:col-span-9">
                            <label className="block text-[10px] font-semibold text-[#30231F] mb-1">
                              Teacher Feedback / Notes (Visible to candidate upon release)
                            </label>
                            <input
                              type="text"
                              placeholder="Provide feedback, guidance, or partial credit rationale..."
                              value={currentInput?.feedback ?? ''}
                              onChange={(e) => {
                                setGradeInputs({
                                  ...gradeInputs,
                                  [studentAns.id]: {
                                    marks: currentInput?.marks ?? 0,
                                    feedback: e.target.value,
                                  },
                                });
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-[#B7A89A] rounded-lg text-xs text-[#30231F] focus:ring-2 focus:ring-[#722F37]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Invigilation Analysis Card */}
              <div className="bg-[#F8F4EC] rounded-2xl border border-[#E8DCC6] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#722F37]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                      JEV Risk Assessment
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                      submission.review?.riskLevel === 'High Risk'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : submission.review?.riskLevel === 'Medium Risk' || submission.review?.riskLevel === 'Review Required'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {submission.review?.riskLevel === 'High Risk'
                      ? '🔴 High Risk'
                      : submission.review?.riskLevel === 'Medium Risk' || submission.review?.riskLevel === 'Review Required'
                      ? '🟡 Medium Risk'
                      : '🟢 Low Risk'}
                  </span>
                </div>

                <div className="text-xs text-[#30231F]/80 space-y-1 bg-white/70 p-2.5 rounded-xl border border-[#E8DCC6]">
                  {(submission.review?.reasons || []).map((reason, rIdx) => (
                    <div key={rIdx} className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-[#722F37] font-bold">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {/* Caution Notices on Record */}
                {cautionNoticeHistory.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-1.5">
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                        <span>Caution Notices Issued ({cautionNoticeHistory.length}):</span>
                      </span>
                    </div>
                    {cautionNoticeHistory.map((c, cIdx) => (
                      <div key={c.id || cIdx} className="bg-white/80 p-2 rounded-lg border border-amber-200/60 text-[11px]">
                        <div>"{c.message}"</div>
                        <div className="text-[10px] text-amber-900/70 mt-1 flex items-center justify-between">
                          <span>Sent at {new Date(c.sentAt).toLocaleTimeString()}</span>
                          <span className="font-semibold text-amber-900">
                            {c.acknowledged ? '✓ Acknowledged by student' : '⏳ Pending acknowledgment'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dispatch Caution or Disciplinary Decision Action */}
                <div className="pt-2 border-t border-[#E8DCC6]/60 flex flex-col gap-2">
                  {!showCautionBox ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCautionBox(true)}
                        className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Send Immediate Caution</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDecisionModal(true)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border ${
                          attempt.decisionStatus === 'Failed'
                            ? 'bg-red-100 border-red-300 text-red-900'
                            : attempt.decisionStatus === 'Discarded'
                            ? 'bg-amber-100 border-amber-300 text-amber-950'
                            : 'bg-white border-red-300 hover:bg-red-50 text-red-900'
                        }`}
                      >
                        {attempt.decisionStatus === 'Failed' ? (
                          <XCircle className="w-3.5 h-3.5 text-red-700" />
                        ) : attempt.decisionStatus === 'Discarded' ? (
                          <Ban className="w-3.5 h-3.5 text-amber-700" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                        )}
                        <span>{attempt.decisionStatus ? 'Modify Disciplinary Decision' : 'Fail or Discard Submission with Note'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-red-200">
                      <label className="text-[11px] font-bold text-red-900 block">
                        Caution Message (Will pop up on candidate screen):
                      </label>
                      <textarea
                        rows={3}
                        value={cautionMsg}
                        onChange={(e) => setCautionMsg(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-[#B7A89A] rounded-lg text-xs text-[#30231F] focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowCautionBox(false)}
                          className="text-xs text-[#30231F]/60 hover:text-[#30231F]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={sendingCaution || !cautionMsg.trim()}
                          onClick={handleSendCautionDirect}
                          className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          {sendingCaution ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>Deliver Caution</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-[#30231F]/60 flex flex-wrap items-center justify-between gap-1 pt-1">
                    <span>Started: {new Date(attempt.startTime).toLocaleTimeString()}</span>
                    {attempt.submittedAt && <span>Submitted: {new Date(attempt.submittedAt).toLocaleTimeString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#E8DCC6] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#30231F]/70">
            Total Evaluated:{' '}
            <strong className="text-[#722F37] font-bold text-sm">{currentCalculatedTotal}</strong> / {exam?.totalMarks ?? submission.examTotalMarks} M
          </div>

          <div className="flex items-center gap-2">
            {/* Fail or Discard Option in Footer */}
            <button
              type="button"
              onClick={() => setShowDecisionModal(true)}
              className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs ${
                attempt.decisionStatus === 'Failed'
                  ? 'border-red-300 bg-red-100 text-red-900'
                  : attempt.decisionStatus === 'Discarded'
                  ? 'border-amber-300 bg-amber-100 text-amber-950'
                  : 'border-red-300 bg-red-50 hover:bg-red-100 text-red-900'
              }`}
            >
              {attempt.decisionStatus === 'Failed' ? (
                <XCircle className="w-3.5 h-3.5 text-red-700" />
              ) : attempt.decisionStatus === 'Discarded' ? (
                <Ban className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
              )}
              <span>{attempt.decisionStatus ? attempt.decisionStatus : 'Fail / Discard'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraftMarks}
              disabled={savingGrades}
              className="px-4 py-2 border border-[#B7A89A] hover:bg-[#E8DCC6]/40 text-[#30231F] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {savingGrades ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handleVerifyAndMarkResult}
              disabled={verifyingResult}
              className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {verifyingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Verify & Save Marks</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#30231F] text-[#F8F4EC] rounded-xl text-xs font-semibold hover:bg-[#523d37] transition-colors cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>

        {/* Academic Authority Decision Modal (Fail or Discard with note) */}
        {showDecisionModal && (
          <SubmissionDecisionModal
            isOpen={showDecisionModal}
            submission={{
              ...submission,
              attempt,
            }}
            currentTeacherName={exam?.teacherName || 'Instructor'}
            onClose={() => setShowDecisionModal(false)}
            onDecisionSuccess={async () => {
              await loadAttemptData();
              onUpdated();
            }}
          />
        )}
      </div>
    </div>
  );
};
