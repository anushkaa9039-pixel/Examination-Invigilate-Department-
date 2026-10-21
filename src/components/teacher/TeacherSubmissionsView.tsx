import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  User,
  Check,
  Save,
  Loader2,
  Send,
  Eye,
  Sparkles,
  CheckCheck,
  RefreshCw,
  Edit3,
  Bell,
  MessageSquare,
  Ban,
  XCircle,
  FileText,
} from 'lucide-react';
import { Exam, Question, SubmissionDetails, ActivityEvent, CautionNotice } from '../../types';
import { api } from '../../api';
import { SubmissionDecisionModal } from './SubmissionDecisionModal';

interface TeacherSubmissionsViewProps {
  exam: Exam;
  initialAttemptId?: string;
  onBack: () => void;
  onExamUpdated: (updated: Exam) => void;
}

export const TeacherSubmissionsView: React.FC<TeacherSubmissionsViewProps> = ({
  exam,
  initialAttemptId,
  onBack,
  onExamUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDetails[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetails | null>(null);

  // Decision Modal State (Fail or Discard with note)
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Grading State for selected submission
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marks: number; feedback: string }>>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState<string | null>(null);

  // Auto Calculation & Verification State
  const [calculatingAuto, setCalculatingAuto] = useState(false);
  const [verifyingResult, setVerifyingResult] = useState(false);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);

  // JEV Review State for selected submission
  const [jevStatus, setJevStatus] = useState<string>('Pending');
  const [jevNotes, setJevNotes] = useState<string>('');
  const [jevTimeline, setJevTimeline] = useState<ActivityEvent[]>([]);
  const [jevCautions, setJevCautions] = useState<CautionNotice[]>([]);
  const [savingJev, setSavingJev] = useState(false);
  const [showCautionBox, setShowCautionBox] = useState(false);
  const [cautionMsg, setCautionMsg] = useState(
    'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.'
  );
  const [sendingCaution, setSendingCaution] = useState(false);

  // Publishing Results
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const fetchSubmissions = async (retainAttemptId?: string) => {
    try {
      setLoading(true);
      const res = await api.getSubmissions(exam.id);
      setQuestions(res.questions);
      setSubmissions(res.submissions);

      const toSelectId = retainAttemptId || selectedSubmission?.attempt.id || initialAttemptId;
      if (toSelectId) {
        const target = res.submissions.find((s) => s.attempt.id === toSelectId);
        if (target) {
          handleSelectSubmission(target);
        }
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [exam.id]);

  // When a submission is selected, populate grading & JEV state
  const handleSelectSubmission = async (sub: SubmissionDetails) => {
    setSelectedSubmission(sub);
    setGradeSuccessMsg(null);
    setVerifySuccessMsg(null);

    // Populate grade inputs from existing answers or auto marks
    const inputs: Record<string, { marks: number; feedback: string }> = {};
    for (const ans of sub.answers) {
      inputs[ans.id] = {
        marks: ans.marksAwarded ?? ans.autoMarksAwarded ?? 0,
        feedback: ans.feedback || ans.autoFeedback || '',
      };
    }
    setGradeInputs(inputs);

    // Load JEV review state
    setJevStatus(sub.review?.status || 'Pending');
    setJevNotes(sub.review?.teacherNotes || '');

    // Fetch full activity timeline & cautions
    try {
      const jevData = await api.getJEVDetails(sub.attempt.id);
      setJevTimeline(jevData.events || []);
      setJevCautions(jevData.cautions || []);
    } catch (err) {
      console.error('Failed to load JEV timeline:', err);
    }
  };

  const handleSendCaution = async () => {
    if (!selectedSubmission || !cautionMsg.trim()) return;
    setSendingCaution(true);
    try {
      const res = await api.sendCaution(selectedSubmission.attempt.id, cautionMsg.trim());
      setShowCautionBox(false);
      setJevCautions((prev) => [...prev, res.caution]);
      alert('Caution notice dispatched to candidate.');
    } catch (err: any) {
      alert(err.message || 'Failed to send caution notice');
    } finally {
      setSendingCaution(false);
    }
  };

  // Auto-Calculate Result for selected candidate
  const handleAutoCalculate = async () => {
    if (!selectedSubmission) return;
    setCalculatingAuto(true);
    setGradeSuccessMsg(null);
    setVerifySuccessMsg(null);
    try {
      const res = await api.autoCalculateAttempt(selectedSubmission.attempt.id);
      const updatedInputs = { ...gradeInputs };
      for (const ans of res.answers) {
        if (!ans.isTeacherMarked || updatedInputs[ans.id]?.marks === undefined) {
          updatedInputs[ans.id] = {
            marks: ans.autoMarksAwarded ?? 0,
            feedback: ans.autoFeedback || '',
          };
        }
      }
      setGradeInputs(updatedInputs);
      setGradeSuccessMsg(
        `Auto result calculation complete: ${res.autoScore} / ${exam.totalMarks} Marks. You can review, adjust marks per question, and verify according to teacher evaluation.`
      );
      await fetchSubmissions(selectedSubmission.attempt.id);
    } catch (err: any) {
      alert(err.message || 'Failed to auto-calculate marks');
    } finally {
      setCalculatingAuto(false);
    }
  };

  // Apply all auto-calculated marks to teacher inputs
  const handleAcceptAllAutoMarks = () => {
    if (!selectedSubmission) return;
    const updated: Record<string, { marks: number; feedback: string }> = {};
    for (const ans of selectedSubmission.answers) {
      updated[ans.id] = {
        marks: ans.autoMarksAwarded ?? 0,
        feedback: ans.autoFeedback || 'Accepted auto mark',
      };
    }
    setGradeInputs(updated);
    setGradeSuccessMsg('All auto-calculated marks have been populated into teacher fields. Click "Verify & Mark Result" to finalize.');
  };

  // Verify and mark result according to teacher
  const handleVerifyAndMarkResult = async () => {
    if (!selectedSubmission) return;
    setVerifyingResult(true);
    setGradeSuccessMsg(null);
    setVerifySuccessMsg(null);

    try {
      const marksOverrides = selectedSubmission.answers.map((ans) => {
        const input = gradeInputs[ans.id];
        return {
          answerId: ans.id,
          marksAwarded: input ? input.marks : (ans.autoMarksAwarded ?? 0),
          feedback: input ? input.feedback : (ans.autoFeedback || ''),
        };
      });

      const res = await api.verifyAttempt(selectedSubmission.attempt.id, {
        teacherName: exam.teacherName,
        marksOverrides,
        teacherNotes: jevNotes,
      });

      const isLiveBeforeSubmission = selectedSubmission.attempt.status === 'Active';
      setVerifySuccessMsg(
        `Result verified by instructor! Evaluated total: ${res.totalScoreAwarded} / ${exam.totalMarks} Marks. ${
          isLiveBeforeSubmission
            ? 'Teacher marks are recorded live before candidate submission and will remain intact upon submit.'
            : 'Result is officially verified and ready for release.'
        }`
      );
      await fetchSubmissions(selectedSubmission.attempt.id);
    } catch (err: any) {
      alert(err.message || 'Failed to verify result');
    } finally {
      setVerifyingResult(false);
    }
  };

  const handleSaveAllGrades = async () => {
    if (!selectedSubmission) return;
    setSavingGrades(true);
    setGradeSuccessMsg(null);

    try {
      for (const ans of selectedSubmission.answers) {
        const input = gradeInputs[ans.id];
        if (input) {
          await api.gradeAnswer(ans.id, input.marks, input.feedback);
        }
      }
      setGradeSuccessMsg('Draft marks and instructor feedback have been securely saved.');
      await fetchSubmissions(selectedSubmission.attempt.id);
    } catch (err: any) {
      alert(err.message || 'Failed to save grades');
    } finally {
      setSavingGrades(false);
    }
  };

  const handleSaveJEVReview = async () => {
    if (!selectedSubmission) return;
    setSavingJev(true);
    try {
      await api.updateJEVReview(selectedSubmission.attempt.id, jevStatus, jevNotes);
      await fetchSubmissions(selectedSubmission.attempt.id);
      alert('JEV invigilation record updated.');
    } catch (err: any) {
      alert(err.message || 'Failed to update JEV status');
    } finally {
      setSavingJev(false);
    }
  };

  const handlePublishResults = async () => {
    if (
      !window.confirm(
        'Launch verified results to candidates? Make sure you have reviewed and adjusted any marks before launching.'
      )
    ) {
      return;
    }

    setPublishing(true);
    try {
      const res = await api.publishResults(exam.id);
      onExamUpdated(res.exam);
      setPublishSuccess('Results have been officially published to candidates!');
    } catch (err: any) {
      alert(err.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  const currentCalculatedTotal = selectedSubmission
    ? selectedSubmission.answers.reduce((sum, ans) => {
        const inp = gradeInputs[ans.id];
        return sum + (inp !== undefined ? inp.marks : (ans.marksAwarded ?? ans.autoMarksAwarded ?? 0));
      }, 0)
    : 0;

  const currentAutoTotal = selectedSubmission
    ? selectedSubmission.answers.reduce((sum, ans) => sum + (ans.autoMarksAwarded ?? 0), 0)
    : 0;

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#722F37]" />
        <p className="text-sm text-[#30231F]/70 mt-3 font-medium">
          Retrieving examination submissions & auto calculation...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8DCC6]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
              Submissions & Evaluation · {exam.id}
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#30231F]">{exam.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {exam.resultsPublished ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Results Published to Students</span>
            </div>
          ) : (
            <button
              onClick={handlePublishResults}
              disabled={publishing || submissions.length === 0}
              className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Launch & Publish Results</span>
            </button>
          )}
        </div>
      </div>

      {/* Info notice: Auto-calculation & Teacher verification explanation */}
      <div className="p-3.5 bg-white border border-[#E8DCC6] rounded-xl text-xs text-[#30231F]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Auto Result Calculation:</strong> Marks are auto-calculated question-by-question based on question marks. Teachers can verify results, adjust marks for any question, and verify scores before launching results to candidates.
          </span>
        </div>
        <span className="text-[11px] text-[#722F37] font-semibold shrink-0">
          Pass Mark: {exam.passingMarks} / {exam.totalMarks}
        </span>
      </div>

      {publishSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{publishSuccess}</span>
        </div>
      )}

      {/* Main Grid: Left Submissions List, Right Grading Detail */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Submissions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#30231F]">
              Student Attempts ({submissions.length})
            </h2>
            <span className="text-xs text-[#30231F]/60">
              Pass mark: {exam.passingMarks} / {exam.totalMarks}
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="p-8 bg-white border border-dashed border-[#B7A89A] rounded-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#E8DCC6] text-[#722F37] mx-auto flex items-center justify-center font-serif text-lg font-bold">
                0
              </div>
              <div className="text-sm font-semibold text-[#30231F]">No submissions yet.</div>
              <p className="text-xs text-[#30231F]/60 max-w-xs mx-auto">
                Share exam ID <code className="font-mono font-bold text-[#722F37]">{exam.id}</code> with students. When attempts start, live answers and auto-calculations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const isSelected = selectedSubmission?.attempt.id === sub.attempt.id;
                const risk = sub.review?.riskLevel || 'Normal';
                const isActive = sub.attempt.status === 'Active';
                const isVerified = sub.attempt.verificationStatus === 'Teacher-Verified';

                return (
                  <div
                    key={sub.attempt.id}
                    onClick={() => handleSelectSubmission(sub)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#722F37] ring-1 ring-[#722F37] shadow-sm'
                        : 'bg-white border-[#E8DCC6] hover:border-[#B7A89A]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-[#722F37]" />
                        <span className="text-sm font-semibold text-[#30231F]">
                          {sub.attempt.studentName}
                        </span>
                        {(sub.totalAttemptsForStudent || 1) > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            Response #{sub.attemptNumber} of {sub.totalAttemptsForStudent}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E8DCC6] text-[#30231F]">
                            Submitted
                          </span>
                        )}
                        {isVerified && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-[#30231F]/70">
                      <div>
                        Score:{' '}
                        <strong className="text-[#30231F]">
                          {sub.totalScore} / {exam.totalMarks}
                        </strong>
                        <span className="ml-2 font-medium text-[11px]">
                          {sub.isPassed ? (
                            <span className="text-emerald-700 font-semibold">Passed</span>
                          ) : (
                            <span className="text-[#722F37] font-semibold">Below Pass</span>
                          )}
                        </span>
                      </div>

                      {/* Risk Badge */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            risk === 'High Risk'
                              ? 'bg-red-100 text-red-800'
                              : risk === 'Review Required'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {risk}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-[#30231F]/70 flex flex-wrap items-center gap-2">
                      <Clock className="w-3 h-3 text-[#722F37]" />
                      {sub.attempt.submittedAt ? (
                        <span>
                          Submitted: {new Date(sub.attempt.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(sub.attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      ) : (
                        <span>
                          Started: {new Date(sub.attempt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (In Session)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Candidate Paper Evaluation & JEV Review */}
        <div className="lg:col-span-7">
          {selectedSubmission ? (
            <div className="bg-white rounded-2xl border border-[#E8DCC6] shadow-sm overflow-hidden space-y-6 p-6">
              {/* Candidate Info Header */}
              <div className="pb-4 border-b border-[#E8DCC6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-serif font-bold text-[#30231F]">
                      {selectedSubmission.attempt.studentName}
                    </h3>
                    {selectedSubmission.attempt.decisionStatus === 'Failed' || selectedSubmission.attempt.status === 'Failed' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-700 text-white flex items-center gap-1 shadow-xs">
                        <XCircle className="w-3 h-3" />
                        <span>Failed by Teacher</span>
                      </span>
                    ) : selectedSubmission.attempt.decisionStatus === 'Discarded' || selectedSubmission.attempt.status === 'Discarded' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-700 text-white flex items-center gap-1 shadow-xs">
                        <Ban className="w-3 h-3" />
                        <span>Discarded</span>
                      </span>
                    ) : selectedSubmission.attempt.status === 'Active' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Paper Submitted
                      </span>
                    )}
                    {(selectedSubmission.totalAttemptsForStudent || 1) > 1 && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        Response #{selectedSubmission.attemptNumber} of {selectedSubmission.totalAttemptsForStudent}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#30231F]/60 mt-1 flex flex-wrap items-center gap-2">
                    <span>Access Code: <code className="font-mono font-bold text-[#722F37]">{selectedSubmission.attempt.accessCode}</code></span>
                    <span>·</span>
                    <span>
                      Verification:{' '}
                      <strong className={selectedSubmission.attempt.verificationStatus === 'Teacher-Verified' ? 'text-emerald-700' : 'text-[#30231F]/70'}>
                        {selectedSubmission.attempt.verificationStatus === 'Teacher-Verified' ? 'Teacher Verified' : 'Pending Verification'}
                      </strong>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#30231F]">
                      <Clock className="w-3.5 h-3.5 text-[#722F37]" />
                      {selectedSubmission.attempt.submittedAt ? (
                        <>Submitted: {new Date(selectedSubmission.attempt.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selectedSubmission.attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                      ) : (
                        <>Started: {new Date(selectedSubmission.attempt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </span>
                  </div>

                  {/* All Responses Switcher Bar if student submitted multiple times */}
                  {(() => {
                    const studentAllSubmissions = submissions.filter(
                      (s) => s.attempt.studentName.trim().toLowerCase() === selectedSubmission.attempt.studentName.trim().toLowerCase()
                    );
                    if (studentAllSubmissions.length <= 1) return null;

                    return (
                      <div className="mt-3 p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                          <span>All Responses by {selectedSubmission.attempt.studentName} ({studentAllSubmissions.length}):</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {studentAllSubmissions.map((s) => {
                            const isCur = s.attempt.id === selectedSubmission.attempt.id;
                            return (
                              <button
                                key={s.attempt.id}
                                type="button"
                                onClick={() => handleSelectSubmission(s)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isCur
                                    ? 'bg-[#722F37] text-white shadow-2xs ring-2 ring-[#722F37]/30'
                                    : 'bg-white hover:bg-blue-100 text-blue-900 border border-blue-300'
                                }`}
                              >
                                <span>Response #{s.attemptNumber}</span>
                                <span className="opacity-80">({s.totalScore} M)</span>
                                {s.attempt.decisionStatus === 'Failed' ? (
                                  <span className="text-[9px] px-1 bg-red-700 text-white rounded">Failed</span>
                                ) : s.attempt.decisionStatus === 'Discarded' ? (
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

                  {/* Official Instructor Action Banner if Failed or Discarded */}
                  {selectedSubmission.attempt.decisionStatus && (
                    <div
                      className={`mt-3 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                        selectedSubmission.attempt.decisionStatus === 'Failed'
                          ? 'bg-red-50 border-red-300 text-red-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedSubmission.attempt.decisionStatus === 'Failed' ? (
                          <XCircle className="w-4 h-4 text-red-700 shrink-0" />
                        ) : (
                          <Ban className="w-4 h-4 text-amber-700 shrink-0" />
                        )}
                        <span className="font-bold">
                          Official Decision: Submission Marked as {selectedSubmission.attempt.decisionStatus.toUpperCase()}
                        </span>
                        {selectedSubmission.attempt.decisionNote && (
                          <span className="italic">"{selectedSubmission.attempt.decisionNote}"</span>
                        )}
                        {selectedSubmission.attempt.decisionBy && (
                          <span className="text-[10px] opacity-75">by {selectedSubmission.attempt.decisionBy}</span>
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
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-left sm:text-right">
                    <div className="text-base font-bold text-[#722F37]">
                      {currentCalculatedTotal} / {exam.totalMarks} M
                    </div>
                    <div className="text-[10px] text-[#30231F]/60">
                      {selectedSubmission.attempt.decisionStatus === 'Failed' || selectedSubmission.attempt.status === 'Failed' ? (
                        <span className="text-red-700 font-bold">Failed by Instructor</span>
                      ) : selectedSubmission.attempt.decisionStatus === 'Discarded' || selectedSubmission.attempt.status === 'Discarded' ? (
                        <span className="text-amber-800 font-bold">Discarded</span>
                      ) : (
                        <span>Required: {exam.passingMarks} M</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fail or Discard Option */}
                    <button
                      type="button"
                      onClick={() => setShowDecisionModal(true)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
                        selectedSubmission.attempt.decisionStatus === 'Failed'
                          ? 'bg-red-100 border border-red-300 text-red-900 hover:bg-red-200'
                          : selectedSubmission.attempt.decisionStatus === 'Discarded'
                          ? 'bg-amber-100 border border-amber-300 text-amber-950 hover:bg-amber-200'
                          : 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-900'
                      }`}
                      title="Fail or Discard this submission with an official note"
                    >
                      {selectedSubmission.attempt.decisionStatus === 'Failed' ? (
                        <XCircle className="w-3.5 h-3.5 text-red-700" />
                      ) : selectedSubmission.attempt.decisionStatus === 'Discarded' ? (
                        <Ban className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                      )}
                      <span>{selectedSubmission.attempt.decisionStatus ? selectedSubmission.attempt.decisionStatus : 'Fail / Discard'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoCalculate}
                      disabled={calculatingAuto}
                      title="Re-run automated answer evaluation"
                      className="px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      {calculatingAuto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>Auto-Calculate</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAcceptAllAutoMarks}
                      title="Accept all calculated marks into teacher inputs"
                      className="px-3 py-2 bg-[#F8F4EC] border border-[#B7A89A] hover:bg-[#E8DCC6]/60 text-[#30231F] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-[#722F37]" />
                      <span className="hidden sm:inline">Apply Auto Marks</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyAndMarkResult}
                      disabled={verifyingResult}
                      title="Verify result and mark according to teacher evaluation"
                      className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      {verifyingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Verify & Mark Result</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* In-Session Notice (if verifying while candidate is active) */}
              {selectedSubmission.attempt.status === 'Active' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
                  <span>
                    <strong>Candidate is currently taking the exam.</strong> Answers update live. You can evaluate, adjust marks, and click <strong>Verify & Mark Result</strong> now. Teacher verified marks will be saved and preserved upon final submission.
                  </span>
                </div>
              )}

              {verifySuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{verifySuccessMsg}</span>
                </div>
              )}

              {gradeSuccessMsg && !verifySuccessMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{gradeSuccessMsg}</span>
                </div>
              )}

              {/* JEV Invigilation Assessment Card */}
              <div className="bg-[#F8F4EC] rounded-xl border border-[#E8DCC6] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#722F37]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                      Invigilation Analysis
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                      selectedSubmission.review?.riskLevel === 'High Risk'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : selectedSubmission.review?.riskLevel === 'Medium Risk' || selectedSubmission.review?.riskLevel === 'Review Required'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {selectedSubmission.review?.riskLevel === 'High Risk'
                      ? '🔴 High Risk'
                      : selectedSubmission.review?.riskLevel === 'Medium Risk' || selectedSubmission.review?.riskLevel === 'Review Required'
                      ? '🟡 Medium Risk'
                      : '🟢 Low Risk'}
                  </span>
                </div>

                {/* Plain-Language Explanations */}
                <div className="space-y-1 text-xs text-[#30231F]/80">
                  <div className="font-semibold text-[#30231F]">Invigilation Assessment:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {(selectedSubmission.review?.reasons || []).map((reason, rIdx) => (
                      <li key={rIdx}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {/* Event Timeline */}
                <div className="pt-2 border-t border-[#E8DCC6]/60">
                  <div className="text-[11px] font-semibold text-[#30231F] mb-1.5">
                    Activity Event Timeline ({jevTimeline.length} events logged):
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 text-[11px] font-mono bg-white p-2.5 rounded-lg border border-[#E8DCC6]">
                    {jevTimeline.length === 0 ? (
                      <div className="text-[#30231F]/50">No activity events recorded yet.</div>
                    ) : (
                      jevTimeline.map((ev, eIdx) => (
                        <div key={eIdx} className="flex items-center justify-between text-[#30231F]/80">
                          <span>
                            {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="font-semibold text-[#722F37]">{ev.eventType}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Teacher JEV Status & Notes */}
                <div className="pt-2 border-t border-[#E8DCC6]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#30231F]">
                      Teacher Invigilation Status:
                    </label>
                    <select
                      value={jevStatus}
                      onChange={(e) => setJevStatus(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#B7A89A] rounded text-xs text-[#30231F]"
                    >
                      <option value="Pending">Pending Review</option>
                      <option value="Resolved">Resolved / Cleared</option>
                      <option value="Further Investigation">Further Investigation</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Instructor invigilation notes (e.g. Student reported browser hiccup at 10:14 AM)..."
                    value={jevNotes}
                    onChange={(e) => setJevNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#B7A89A] rounded text-xs text-[#30231F]"
                  />

                  {/* Cautions on Record */}
                  {jevCautions.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-950 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Caution Notices ({jevCautions.length}):</span>
                      </div>
                      {jevCautions.map((c, idx) => (
                        <div key={c.id || idx} className="bg-white/70 p-2 rounded border border-amber-200 text-[11px]">
                          <div>"{c.message}"</div>
                          <div className="text-[10px] text-amber-800/80 mt-1 flex items-center justify-between">
                            <span>Sent: {new Date(c.sentAt).toLocaleTimeString()}</span>
                            <span className="font-semibold">{c.acknowledged ? '✓ Acknowledged' : '⏳ Pending'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Send Caution or Disciplinary Decision Action */}
                  {!showCautionBox ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCautionBox(true)}
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Send Immediate Caution</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDecisionModal(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                          selectedSubmission.attempt.decisionStatus === 'Failed'
                            ? 'bg-red-100 border-red-300 text-red-900'
                            : selectedSubmission.attempt.decisionStatus === 'Discarded'
                            ? 'bg-amber-100 border-amber-300 text-amber-950'
                            : 'bg-white border-red-300 hover:bg-red-50 text-red-900'
                        }`}
                      >
                        {selectedSubmission.attempt.decisionStatus === 'Failed' ? (
                          <XCircle className="w-3.5 h-3.5 text-red-700" />
                        ) : selectedSubmission.attempt.decisionStatus === 'Discarded' ? (
                          <Ban className="w-3.5 h-3.5 text-amber-700" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                        )}
                        <span>{selectedSubmission.attempt.decisionStatus ? 'Modify Disciplinary Decision' : 'Fail or Discard Submission with Note'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-white p-2.5 rounded-lg border border-red-200">
                      <label className="text-[11px] font-bold text-red-900 block">
                        Caution Notice for Examinee Screen:
                      </label>
                      <textarea
                        rows={3}
                        value={cautionMsg}
                        onChange={(e) => setCautionMsg(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[#B7A89A] rounded text-[#30231F] font-medium"
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
                          onClick={handleSendCaution}
                          className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {sendingCaution ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          <span>Dispatch</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end text-[10px] text-[#30231F]/60">
                    <button
                      type="button"
                      onClick={handleSaveJEVReview}
                      disabled={savingJev}
                      className="px-2.5 py-1 bg-[#30231F] text-[#F8F4EC] rounded text-[11px] font-medium hover:bg-[#722F37] transition-colors cursor-pointer"
                    >
                      Update JEV
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions & Student Answers */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[#722F37]">
                    Responses, Auto Calculation & Teacher Marking
                  </h4>
                  <span className="text-xs text-[#30231F]/60">
                    {questions.length} Questions · Total {exam.totalMarks} Marks
                  </span>
                </div>

                {questions.map((q, idx) => {
                  const studentAns = selectedSubmission.answers.find((a) => a.questionId === q.id);
                  const currentInput = studentAns ? gradeInputs[studentAns.id] : null;

                  return (
                    <div
                      key={q.id || idx}
                      className="p-4 bg-[#F8F4EC]/30 rounded-xl border border-[#E8DCC6] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#E8DCC6] text-[#722F37] flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-[#30231F]">
                            {q.type.replace('_', ' ')} · Max {q.marks} Marks
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-[#30231F] font-medium">{q.text}</div>

                      {/* Student's answer */}
                      <div className="p-3 bg-white rounded-lg border border-[#E8DCC6]">
                        <div className="text-[10px] font-semibold text-[#30231F]/60 uppercase tracking-wider mb-1">
                          Candidate Response:
                        </div>
                        <div className="text-xs text-[#30231F] font-serif">
                          {studentAns?.response ? (
                            studentAns.response
                          ) : (
                            <span className="text-[#30231F]/40 italic">(No response submitted yet)</span>
                          )}
                        </div>
                      </div>

                      {/* Server answer key & rubric reference for teacher */}
                      <div className="text-[11px] text-[#30231F]/70 bg-[#E8DCC6]/30 p-2.5 rounded-lg space-y-1">
                        <div>
                          <strong className="text-[#722F37]">Model Answer / Key:</strong>{' '}
                          {q.correctAnswer || '(Not specified)'}
                        </div>
                        {q.rubric && (
                          <div>
                            <strong className="text-[#722F37]">Rubric:</strong> {q.rubric}
                          </div>
                        )}
                      </div>

                      {/* Auto Result Calculation Box */}
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-lg text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Auto-Calculated Result:</span>
                          </span>
                          <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                            {studentAns?.autoMarksAwarded !== null && studentAns?.autoMarksAwarded !== undefined
                              ? `${studentAns.autoMarksAwarded} / ${q.marks} M`
                              : `0 / ${q.marks} M`}
                          </span>
                        </div>
                        <div className="text-[11px] text-indigo-800">
                          {studentAns?.autoFeedback || 'Auto key comparison completed.'}
                        </div>
                        {studentAns && (
                          <div className="pt-1">
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
                              Use Auto Mark ({studentAns.autoMarksAwarded ?? 0} M)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Marks Awarded & Teacher Feedback */}
                      {studentAns && (
                        <div className="p-3.5 bg-white rounded-lg border border-[#B7A89A]/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[#30231F] flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-[#722F37]" />
                              <span>Teacher Evaluation & Marking (Max {q.marks} M)</span>
                              {studentAns.isTeacherMarked && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  Teacher Marked
                                </span>
                              )}
                            </label>
                            <span className="text-[11px] text-[#30231F]/60">
                              Adjust according to teacher evaluation
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
                                className="w-full px-2.5 py-1.5 bg-white border border-[#B7A89A] rounded text-xs font-bold text-[#722F37] focus:ring-1 focus:ring-[#722F37]"
                              />
                            </div>

                            <div className="sm:col-span-9">
                              <label className="block text-[10px] font-semibold text-[#30231F] mb-1">
                                Teacher Comment / Feedback (Visible to candidate upon release)
                              </label>
                              <input
                                type="text"
                                placeholder="Add specific feedback, reason for partial credit, or remarks..."
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
                                className="w-full px-2.5 py-1.5 bg-white border border-[#B7A89A] rounded text-xs text-[#30231F]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save / Verify Action */}
              <div className="pt-4 border-t border-[#E8DCC6] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#30231F]/70">
                  Total Teacher Evaluated Marks:{' '}
                  <strong className="text-[#722F37] font-bold text-sm">{currentCalculatedTotal}</strong> / {exam.totalMarks} M
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAllGrades}
                    disabled={savingGrades}
                    className="px-4 py-2 border border-[#B7A89A] hover:bg-[#E8DCC6]/40 text-[#30231F] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {savingGrades ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Draft Marks</span>
                  </button>

                  <button
                    onClick={handleVerifyAndMarkResult}
                    disabled={verifyingResult}
                    className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {verifyingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Verify & Mark Result</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-12 text-center text-[#30231F]/60 space-y-2">
              <Eye className="w-8 h-8 mx-auto text-[#B7A89A]" />
              <div className="text-sm font-semibold text-[#30231F]">
                Select a candidate from the left list
              </div>
              <p className="text-xs max-w-sm mx-auto">
                Review submitted or in-progress answers, auto-calculated marks, grade responses, and inspect the invigilation log.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Academic Authority Decision Modal (Fail or Discard with note) */}
      {showDecisionModal && selectedSubmission && (
        <SubmissionDecisionModal
          isOpen={showDecisionModal}
          submission={selectedSubmission}
          currentTeacherName={exam.teacherName}
          onClose={() => setShowDecisionModal(false)}
          onDecisionSuccess={async () => {
            await fetchSubmissions(selectedSubmission.attempt.id);
          }}
        />
      )}
    </div>
  );
};
