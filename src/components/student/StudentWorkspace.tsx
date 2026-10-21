import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Save,
  HelpCircle,
  Award,
  Info,
  BookOpen,
  Plus,
  Layers,
  ExternalLink,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { Exam, Question, Attempt, Answer, StudentResultResponse, CautionNotice } from '../../types';
import { api } from '../../api';
import { AirflowAnimation } from '../AirflowAnimation';

interface StudentWorkspaceProps {
  studentName: string;
  initialExamId?: string;
}

export const StudentWorkspace: React.FC<StudentWorkspaceProps> = ({
  studentName,
  initialExamId = '',
}) => {
  // Lobby / Joining State
  const [examIdInput, setExamIdInput] = useState(initialExamId);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (initialExamId && !examIdInput) {
      setExamIdInput(initialExamId.trim().toUpperCase());
    }
  }, [initialExamId]);

  // Active Exam State
  const [examData, setExamData] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> response
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-Save on timeout option
  const [autoSaveOnTimeout, setAutoSaveOnTimeout] = useState(true);
  const [timeoutAutoSavedNotice, setTimeoutAutoSavedNotice] = useState(false);

  // Multiple Exams & Student Portal State
  const [showExamsHub, setShowExamsHub] = useState(false);
  const [showSwitchExamModal, setShowSwitchExamModal] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);

  // Post Submission / Result View / Paper Review
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isViewingPaper, setIsViewingPaper] = useState(false);
  const [studentResult, setStudentResult] = useState<StudentResultResponse | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // JEV Caution System State
  const [activeCaution, setActiveCaution] = useState<CautionNotice | null>(null);
  const [cautionHistory, setCautionHistory] = useState<CautionNotice[]>([]);
  const [acknowledgingCaution, setAcknowledgingCaution] = useState(false);

  // Action restriction notice state (neutral, brief notification)
  const [restrictionNotice, setRestrictionNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerRestrictionNotice = (actionType: 'copy' | 'cut' | 'paste' | 'context_menu') => {
    let msg = 'Action restricted within the active exam interface.';
    if (actionType === 'copy') {
      msg = 'Action restricted: Copying text is disabled within the exam interface.';
    } else if (actionType === 'cut') {
      msg = 'Action restricted: Cutting text is disabled within the exam interface.';
    } else if (actionType === 'paste') {
      msg = 'Action restricted: Pasting is disabled within the exam interface. Please type your response directly.';
    } else if (actionType === 'context_menu') {
      msg = 'Action restricted: The context menu is disabled within the exam interface.';
    }

    setRestrictionNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setRestrictionNotice(null);
    }, 2800);
  };

  // Exam area restricted event handlers
  const handleExamContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerRestrictionNotice('context_menu');
    if (attempt) {
      api.recordActivity(attempt.id, 'context_menu').catch(() => {});
    }
  };

  const handleExamCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    triggerRestrictionNotice('copy');
    if (attempt) {
      api.recordActivity(attempt.id, 'copy_attempt').catch(() => {});
    }
  };

  const handleExamCut = (e: React.ClipboardEvent) => {
    e.preventDefault();
    triggerRestrictionNotice('cut');
    if (attempt) {
      api.recordActivity(attempt.id, 'cut_attempt').catch(() => {});
    }
  };

  const handleExamPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    triggerRestrictionNotice('paste');
    if (attempt) {
      api.recordActivity(attempt.id, 'paste_attempt').catch(() => {});
    }
  };

  const handleExamKeyDown = (e: React.KeyboardEvent) => {
    const isModifier = e.ctrlKey || e.metaKey;
    if (!isModifier) return;

    const key = e.key.toLowerCase();
    if (key === 'c') {
      e.preventDefault();
      triggerRestrictionNotice('copy');
      if (attempt) api.recordActivity(attempt.id, 'copy_attempt').catch(() => {});
    } else if (key === 'v') {
      e.preventDefault();
      triggerRestrictionNotice('paste');
      if (attempt) api.recordActivity(attempt.id, 'paste_attempt').catch(() => {});
    } else if (key === 'x') {
      e.preventDefault();
      triggerRestrictionNotice('cut');
      if (attempt) api.recordActivity(attempt.id, 'cut_attempt').catch(() => {});
    }
  };

  // Debounced auto-save timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch student overview of all my past attempts and examinations
  const fetchStudentOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await api.getStudentExamsOverview(studentName);
      setMyAttempts(res.myAttempts || []);
    } catch (err) {
      console.error('Failed to load student exams overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchStudentOverview();
  }, [studentName]);

  // Listen for global event to return to student portal (e.g. from universal navbar)
  useEffect(() => {
    const handlePortalEvent = () => {
      handleReturnToPortal();
    };
    window.addEventListener('eid_open_student_portal', handlePortalEvent);
    return () => {
      window.removeEventListener('eid_open_student_portal', handlePortalEvent);
    };
  }, [studentName]);

  // Execute joining or switching to an exam
  const executeJoinExam = async (targetExamId: string, retake: boolean = false) => {
    const cleanId = targetExamId.trim().toUpperCase();
    if (!cleanId) return;

    setLoadingJoin(true);
    setJoinError(null);

    try {
      const res = await api.joinExam(cleanId, studentName, retake);
      setExamData(res.exam);
      setAttempt(res.attempt);
      setQuestions(res.questions);
      setExamIdInput(cleanId);
      setCurrentQIndex(0);

      const answerMap: Record<string, string> = {};
      res.savedAnswers.forEach((a) => {
        answerMap[a.questionId] = a.response;
      });
      setAnswers(answerMap);

      sessionStorage.setItem(`eid_active_exam_${studentName.trim().toLowerCase()}`, cleanId);

      if (res.attempt.status === 'Submitted' || res.attempt.status === 'Graded') {
        setIsViewingPaper(true);
        setIsSubmitted(false);
        fetchResult(res.attempt.id);
      } else {
        setIsViewingPaper(false);
        setIsSubmitted(false);
        setStudentResult(null);
      }
      setShowExamsHub(false);
      setShowSwitchExamModal(false);
      fetchStudentOverview();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join exam. Please verify the Exam ID.');
    } finally {
      setLoadingJoin(false);
    }
  };

  // View a specific past attempt and its submitted responses / results
  const executeViewAttempt = async (targetAttemptId: string) => {
    setLoadingJoin(true);
    setJoinError(null);

    try {
      const res = await api.getAttempt(targetAttemptId);
      setExamData(res.exam);
      setAttempt(res.attempt);
      setQuestions(res.questions);
      setExamIdInput(res.exam.id);
      setCurrentQIndex(0);

      const answerMap: Record<string, string> = {};
      res.savedAnswers.forEach((a) => {
        answerMap[a.questionId] = a.response;
      });
      setAnswers(answerMap);

      setIsViewingPaper(true);
      setIsSubmitted(false);
      setShowExamsHub(false);
      setShowSwitchExamModal(false);
      fetchResult(res.attempt.id);
      fetchStudentOverview();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to load past examination paper.');
    } finally {
      setLoadingJoin(false);
    }
  };

  // On mount check if there is an active exam or direct initialExamId
  useEffect(() => {
    if (initialExamId) {
      executeJoinExam(initialExamId.trim().toUpperCase());
      return;
    }
    const savedActiveExam = sessionStorage.getItem(`eid_active_exam_${studentName.trim().toLowerCase()}`);
    if (savedActiveExam && !attempt) {
      executeJoinExam(savedActiveExam);
    }
  }, [initialExamId, studentName]);

  // Handle manual join submission
  const handleJoinExam = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!examIdInput.trim()) {
      setJoinError('Please enter a valid Exam ID.');
      return;
    }
    executeJoinExam(examIdInput);
  };

  // Return to student examination portal (where all exams can be viewed and taken)
  const handleReturnToPortal = () => {
    setExamData(null);
    setAttempt(null);
    setQuestions([]);
    setAnswers({});
    setIsSubmitted(false);
    setIsViewingPaper(false);
    setStudentResult(null);
    setShowSwitchExamModal(false);
    sessionStorage.removeItem(`eid_active_exam_${studentName.trim().toLowerCase()}`);
    fetchStudentOverview();
  };

  // Timer Calculation
  useEffect(() => {
    if (!attempt || isSubmitted || !examData) return;

    const startTime = new Date(attempt.startTime).getTime();
    const durationMs = examData.duration * 60 * 1000;
    const endTime = startTime + durationMs;

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((endTime - now) / 1000));
      setSecondsRemaining(diffSecs);

      // Auto-save and auto-submit if time expires
      if (diffSecs <= 0 && !isSubmitted && !submitting) {
        if (autoSaveOnTimeout) {
          setTimeoutAutoSavedNotice(true);
          handleSubmitExam(true);
        } else {
          // If auto-save on timeout disabled, prompt student to save and submit immediately
          setShowSubmitModal(true);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attempt, isSubmitted, examData, autoSaveOnTimeout]);

  // Activity Tracking for JEV Invigilation
  useEffect(() => {
    if (!attempt || isSubmitted) return;

    const logActivity = (type: string, meta?: any) => {
      api
        .recordActivity(attempt.id, type, meta)
        .then((res: any) => {
          if (res?.activeCaution) {
            setActiveCaution(res.activeCaution);
          }
        })
        .catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logActivity('tab_hidden');
      } else {
        logActivity('tab_visible');
      }
    };

    const handleWindowBlur = () => {
      logActivity('window_blur');
    };

    const handleWindowFocus = () => {
      logActivity('window_focus');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        logActivity('fullscreen_exit');
      } else {
        setIsFullscreen(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Alert before tab unload during active exam
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active examination in progress.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [attempt, isSubmitted]);

  // Periodic caution checking (every 2.5s) while exam is actively ongoing
  useEffect(() => {
    if (!attempt || isSubmitted || attempt.status !== 'Active') return;

    const checkCautions = async () => {
      try {
        const res = await api.getCautions(attempt.id);
        if (res.activeCaution) {
          setActiveCaution(res.activeCaution);
        }
        if (res.cautions) {
          setCautionHistory(res.cautions);
        }
      } catch (err) {
        // Silent background check
      }
    };

    checkCautions();
    const interval = setInterval(checkCautions, 2500);
    return () => clearInterval(interval);
  }, [attempt, isSubmitted]);

  const handleAcknowledgeCaution = async () => {
    if (!attempt || !activeCaution) return;
    setAcknowledgingCaution(true);
    try {
      await api.acknowledgeCaution(attempt.id, activeCaution.id);
      setActiveCaution(null);
      const res = await api.getCautions(attempt.id);
      setCautionHistory(res.cautions || []);
    } catch (err) {
      console.error('Failed to acknowledge caution:', err);
      setActiveCaution(null);
    } finally {
      setAcknowledgingCaution(false);
    }
  };

  // Response Update & Auto-Save
  const handleAnswerChange = (questionId: string, value: string) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    setSaveStatus('saving');

    // Debounce save to backend
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!attempt) return;
      try {
        const payload = Object.entries(updated).map(([qId, resp]) => ({
          questionId: qId,
          response: resp,
        }));
        await api.saveAnswers(attempt.id, payload);
        setSaveStatus('saved');
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err) {
        setSaveStatus('error');
      }
    }, 600);
  };

  // Submit Exam
  const handleSubmitExam = async (forced = false) => {
    if (!attempt) return;
    setSubmitting(true);

    try {
      const payload = Object.entries(answers).map(([qId, resp]) => ({
        questionId: qId,
        response: resp,
      }));
      // Ensure latest answers are persisted
      await api.saveAnswers(attempt.id, payload).catch(() => {});
      const res = await api.submitExam(attempt.id, payload);
      setAttempt(res.attempt);
      setIsSubmitted(true);
      setShowSubmitModal(false);
      fetchResult(attempt.id);
    } catch (err: any) {
      setRestrictionNotice(err.message || 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Result (if released)
  const fetchResult = async (attemptId: string) => {
    setLoadingResult(true);
    try {
      const res = await api.getStudentResult(attemptId);
      setStudentResult(res);
    } catch (err: any) {
      console.log('Results not released or fetch error:', err);
    } finally {
      setLoadingResult(false);
    }
  };

  // Toggle Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 1. Student Examination Portal & Lobby (if no exam is actively selected)
  if (!attempt || !examData) {
    return (
      <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden py-10 px-4">
        {/* Soft background airflow */}
        <AirflowAnimation variant="exam" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
          {/* Welcome Header */}
          <div className="bg-white rounded-3xl border border-[#E8DCC6] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                Student Examination Portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#30231F]">
                Welcome, {studentName}
              </h1>
              <p className="text-xs sm:text-sm text-[#30231F]/70 mt-1 font-light">
                Enter your Exam ID code below to start testing, or view your previous exam papers and results anytime.
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={fetchStudentOverview}
                disabled={loadingOverview}
                className="px-3.5 py-2 bg-[#F8F4EC] hover:bg-[#E8DCC6]/60 border border-[#B7A89A]/60 text-[#30231F] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh your examinations and attempts"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-[#722F37] ${loadingOverview ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Direct Exam ID Entry Card */}
          <div className="bg-white rounded-3xl border border-[#E8DCC6] p-6 sm:p-7 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#722F37]/10 flex items-center justify-center text-[#722F37]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#30231F]">
                  Enter Exam Access ID
                </h2>
                <p className="text-xs text-[#30231F]/60">
                  Enter the Exam ID provided by your instructor to begin or resume your test.
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinExam} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <input
                type="text"
                placeholder="Enter Exam ID (e.g. EID-8090)"
                value={examIdInput}
                onChange={(e) => {
                  setExamIdInput(e.target.value);
                  if (joinError) setJoinError(null);
                }}
                className="flex-1 px-4 py-3 bg-[#F8F4EC]/60 border border-[#B7A89A] rounded-xl text-sm font-mono uppercase tracking-wider text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
              />
              <button
                type="submit"
                disabled={loadingJoin || !examIdInput.trim()}
                className="px-6 py-3 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingJoin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening Exam...</span>
                  </>
                ) : (
                  <>
                    <span>Begin Examination</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {joinError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}
          </div>

          {/* My Examinations & Submissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC6]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#722F37]" />
                <h2 className="text-lg font-serif font-bold text-[#30231F]">
                  My Examinations & Submissions
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8DCC6] text-[#722F37]">
                  {myAttempts.length}
                </span>
              </div>
              <span className="text-xs text-[#30231F]/60 hidden sm:inline">
                All submitted responses are preserved with timestamps
              </span>
            </div>

            {myAttempts.length > 0 ? (
              <div className="space-y-3">
                {myAttempts.map((att) => {
                  const hasMultiple = (att.totalForExam || 1) > 1;
                  return (
                    <div
                      key={att.attemptId}
                      className="bg-white rounded-2xl border border-[#E8DCC6] hover:border-[#722F37]/50 p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#722F37] bg-[#722F37]/10 px-2 py-0.5 rounded">
                            {att.examId}
                          </span>
                          <span className="text-sm font-bold text-[#30231F]">
                            {att.examTitle}
                          </span>
                          <span className="text-xs text-[#30231F]/60">
                            ({att.examSubject})
                          </span>
                          {hasMultiple && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                att.isLatest
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                              }`}
                            >
                              Response #{att.attemptNumber} of {att.totalForExam} {att.isLatest ? '· Latest' : '· Earlier'}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#30231F]/70 flex flex-wrap items-center gap-3">
                          <span>Instructor: <strong className="font-medium text-[#30231F]">{att.teacherName}</strong></span>
                          <span>•</span>
                          <span>Access Code: <code className="font-mono font-bold text-[#722F37]">{att.accessCode}</code></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-[#30231F]">
                            <Clock className="w-3.5 h-3.5 text-[#722F37]" />
                            {att.submittedAt ? (
                              <>
                                Submitted on {new Date(att.submittedAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })} at {new Date(att.submittedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            ) : (
                              <>Attempt in progress (Started {new Date(att.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col lg:flex-row items-start sm:items-end lg:items-center gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                              att.status === 'Submitted' || att.status === 'Graded'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {att.status}
                          </span>
                          {att.resultsPublished && att.scoreAwarded !== null && (
                            <div className="text-xs font-bold text-[#722F37] mt-1">
                              Score: {att.scoreAwarded} / {att.totalMarks}
                            </div>
                          )}
                          {!att.resultsPublished && (att.status === 'Submitted' || att.status === 'Graded') && (
                            <div className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mt-1 flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Teacher Approval</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => executeViewAttempt(att.attemptId)}
                            className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            title="Open and view this examination paper, responses, and results"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{att.status === 'Submitted' || att.status === 'Graded' ? 'View Exam' : 'Continue Exam'}</span>
                          </button>
                          {(att.status === 'Submitted' || att.status === 'Graded') && att.examStatus !== 'Closed' && (
                            <button
                              type="button"
                              onClick={() => executeJoinExam(att.examId, true)}
                              className="px-3 py-2 bg-white hover:bg-[#F8F4EC] border border-[#B7A89A] text-xs font-semibold text-[#30231F] rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                              title="Submit a new response for this exam (your previous response remains saved)"
                            >
                              <RotateCcw className="w-3 h-3 text-[#722F37]" />
                              <span>Submit New Response</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 bg-white border border-dashed border-[#B7A89A] rounded-2xl text-center space-y-2">
                <p className="text-sm font-semibold text-[#30231F]">You have not taken any examinations yet.</p>
                <p className="text-xs text-[#30231F]/60">Enter an Exam Access ID above to begin your first test.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Read-Only Examination Paper Review Mode (Always accessible for ANY submitted exam)
  if (isViewingPaper && examData && attempt) {
    const formattedSubmittedAt = attempt.submittedAt
      ? `${new Date(attempt.submittedAt).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })} at ${new Date(attempt.submittedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
      : 'Submitted';

    const examAttempts = myAttempts.filter((a) => a.examId === examData.id);
    const totalForExam = examAttempts.length || attempt.attemptNumber || 1;
    const currentAttemptNumber = attempt.attemptNumber || 1;

    return (
      <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden py-8 px-4 sm:px-6">
        <AirflowAnimation variant="exam" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
          {/* Top Bar with Navigation and Paper Details */}
          <div className="bg-white rounded-3xl border border-[#E8DCC6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleReturnToPortal}
                  className="px-3.5 py-1.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs mr-1"
                  title="Return to Examinations Portal"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Portal</span>
                </button>
                <span className="font-mono font-bold text-xs text-[#722F37] bg-[#722F37]/10 px-2.5 py-0.5 rounded">
                  {examData.id}
                </span>
                <span className="text-xs font-semibold text-[#722F37] uppercase tracking-wider">
                  {examData.subject}
                </span>
                {totalForExam > 1 && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    Response #{currentAttemptNumber} of {totalForExam}
                  </span>
                )}
                {attempt.decisionStatus === 'Failed' || attempt.status === 'Failed' ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-700 text-white shadow-xs">
                    Failed by Instructor
                  </span>
                ) : attempt.decisionStatus === 'Discarded' || attempt.status === 'Discarded' ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-700 text-white shadow-xs">
                    Discarded / Cancelled
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {attempt.status}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#30231F]">
                {examData.title}
              </h1>

              <div className="text-xs text-[#30231F]/70 flex flex-wrap items-center gap-3 pt-0.5">
                <span>Student: <strong className="text-[#30231F] font-semibold">{studentName}</strong></span>
                <span>•</span>
                <span>Access Code: <code className="font-mono font-bold text-[#722F37]">{attempt.accessCode}</code></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>Submitted on {formattedSubmittedAt}</span>
                </span>
              </div>
            </div>

            {/* Score / Evaluation summary badge */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <div className="p-3.5 bg-[#F8F4EC] border border-[#E8DCC6] rounded-2xl text-right min-w-[150px]">
                <div className="text-[10px] uppercase font-bold text-[#30231F]/60">
                  {studentResult?.released ? 'Official Score' : 'Evaluation Status'}
                </div>
                {studentResult?.released ? (
                  <div className="text-xl font-serif font-bold text-[#722F37]">
                    {studentResult.scoreAwarded ?? attempt.totalScoreAwarded ?? 0} / {examData.totalMarks} M
                  </div>
                ) : attempt.decisionStatus === 'Failed' || attempt.status === 'Failed' ? (
                  <div className="text-xs font-bold text-red-700 flex items-center justify-end gap-1 mt-0.5">
                    <span>Marked Failed (0 M)</span>
                  </div>
                ) : attempt.decisionStatus === 'Discarded' || attempt.status === 'Discarded' ? (
                  <div className="text-xs font-bold text-amber-800 flex items-center justify-end gap-1 mt-0.5">
                    <span>Discarded</span>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-amber-800 flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Awaiting Teacher Approval</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Official Disciplinary Decision Banner if Failed or Discarded */}
          {attempt.decisionStatus && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                attempt.decisionStatus === 'Failed'
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm">
                  Official Instructor Decision: Submission Marked as {attempt.decisionStatus.toUpperCase()}
                </div>
                {attempt.decisionNote && (
                  <div className="italic text-xs font-serif leading-relaxed">
                    "{attempt.decisionNote}"
                  </div>
                )}
                {attempt.decisionBy && (
                  <div className="text-[10px] opacity-75">
                    Decided by {attempt.decisionBy} on {attempt.decisionAt ? new Date(attempt.decisionAt).toLocaleString() : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Multiple response bar with direct response switching */}
          {totalForExam > 1 && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-950 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <strong>All Recorded Responses ({totalForExam}):</strong> You submitted {totalForExam} separate responses. Click any response below to inspect:
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {examAttempts.map((otherAtt) => {
                  const isCurrent = otherAtt.attemptId === attempt.id;
                  return (
                    <button
                      key={otherAtt.attemptId}
                      type="button"
                      onClick={() => executeViewAttempt(otherAtt.attemptId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-[#722F37] text-white shadow-2xs ring-2 ring-[#722F37]/30'
                          : 'bg-white hover:bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      <span>Response #{otherAtt.attemptNumber}</span>
                      {otherAtt.scoreAwarded !== null && otherAtt.scoreAwarded !== undefined && otherAtt.resultsPublished && (
                        <span className="opacity-80">({otherAtt.scoreAwarded} M)</span>
                      )}
                      {isCurrent && <span className="text-[10px]">• Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Questions and Submitted Responses List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#722F37] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Submitted Paper & Your Recorded Responses ({questions.length} Questions)</span>
              </h2>
              <span className="text-xs text-[#30231F]/60">Read-Only Paper View</span>
            </div>

            {questions.map((q, idx) => {
              const studentAnswer = answers[q.id] || '';
              const resultItem = studentResult?.results?.find((r) => r.questionId === q.id);

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-3xl border border-[#E8DCC6] p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E8DCC6]/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-[#722F37]/10 text-[#722F37] font-serif font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#30231F]/60">
                        Question {idx + 1} · {q.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#F8F4EC] border border-[#B7A89A]/50 rounded-lg text-xs font-semibold text-[#30231F]">
                        {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                      {studentResult?.released && resultItem?.marksAwarded !== null && resultItem?.marksAwarded !== undefined && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">
                          Awarded: {resultItem.marksAwarded} M
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm sm:text-base font-medium text-[#30231F] leading-relaxed">
                    {q.text}
                  </p>

                  {/* Options for MCQ */}
                  {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                    <div className="grid gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = studentAnswer.trim().toLowerCase() === opt.trim().toLowerCase();
                        return (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-3 transition-colors ${
                              isSelected
                                ? 'bg-[#722F37]/10 border-[#722F37] font-semibold text-[#30231F]'
                                : 'bg-[#F8F4EC]/40 border-[#E8DCC6] text-[#30231F]/80'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isSelected ? 'bg-[#722F37] text-white' : 'bg-[#E8DCC6] text-[#30231F]'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                            {isSelected && (
                              <span className="ml-auto text-[11px] font-bold text-[#722F37] uppercase tracking-wider">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Student Answer Box */}
                  <div className="p-4 bg-[#F8F4EC]/60 rounded-2xl border border-[#B7A89A]/60 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#722F37] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#722F37]" />
                      <span>Your Submitted Answer:</span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#30231F] font-serif whitespace-pre-wrap leading-relaxed">
                      {studentAnswer.trim() ? studentAnswer : <span className="italic text-[#30231F]/40">(Left blank by student)</span>}
                    </div>
                  </div>

                  {/* Teacher Feedback / Notes if published */}
                  {resultItem?.feedback && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-950 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-blue-900">Instructor Feedback:</div>
                      <div>{resultItem.feedback}</div>
                    </div>
                  )}

                  {resultItem?.correctAnswer && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs space-y-0.5">
                      <div className="font-bold text-emerald-900">Model Answer:</div>
                      <div>{resultItem.correctAnswer}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Actions Bar */}
          <div className="bg-white rounded-3xl border border-[#E8DCC6] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleReturnToPortal}
              className="px-6 py-3 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Examinations Portal</span>
            </button>

            <div className="flex items-center gap-3 flex-wrap">
              {examData.status !== 'Closed' && (
                <button
                  type="button"
                  onClick={() => executeJoinExam(examData.id, true)}
                  className="px-5 py-3 bg-white hover:bg-[#F8F4EC] border border-[#B7A89A] text-[#30231F] rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                  title="Submit a new response for this exam"
                >
                  <RotateCcw className="w-4 h-4 text-[#722F37]" />
                  <span>Submit Another Response</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReturnToPortal}
                className="px-5 py-3 bg-[#F8F4EC] hover:bg-[#E8DCC6]/60 border border-[#B7A89A] text-[#30231F] rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#722F37]" />
                <span>Enter Another Exam ID</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Post-Submission View (Acknowledgement right after submitting)
  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl border border-[#E8DCC6] p-8 sm:p-10 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#30231F]">
            Examination Submitted Successfully
          </h1>

          <p className="text-xs sm:text-sm text-[#30231F]/70 max-w-lg mx-auto font-light">
            Your paper for <strong className="text-[#30231F] font-semibold">{examData.title}</strong> has been sealed and received.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F4EC] border border-[#B7A89A]/50 rounded-xl text-xs text-[#30231F]">
            <span>Student: <strong>{studentName}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Access Code: <code className="font-mono font-bold text-[#722F37]">{attempt.accessCode}</code></span>
            {attempt.submittedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Submitted at {new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            )}
          </div>

          {/* Post Submission Navigation Actions */}
          <div className="pt-5 border-t border-[#E8DCC6] space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] text-[11px] font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Examination Options</span>
            </div>
            <p className="text-xs text-[#30231F]/80 max-w-md mx-auto">
              You can review the exam paper and your submitted answers, or return to the portal to take another test.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsViewingPaper(true);
                  setIsSubmitted(false);
                }}
                className="px-6 py-2.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>View Exam & Submitted Paper</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReturnToPortal}
                className="px-5 py-2.5 bg-white hover:bg-[#F8F4EC] border border-[#B7A89A] text-xs sm:text-sm font-semibold text-[#30231F] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#722F37]" />
                <span>All My Examinations ({myAttempts.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {studentResult?.released ? (
          <div className="bg-white rounded-3xl border border-[#E8DCC6] p-8 shadow-sm space-y-6">
            {/* Multiple responses selector in Results view */}
            {studentResult.allResponses && studentResult.allResponses.length > 1 && (
              <div className="p-4 bg-blue-50 border border-blue-200 text-blue-950 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    <strong>All Exam Responses ({studentResult.allResponses.length}):</strong> You submitted multiple responses for this exam. Click any response to view its official evaluation:
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {studentResult.allResponses.map((r) => {
                    const isCur = r.isCurrent || (attempt && r.attemptId === attempt.id);
                    return (
                      <button
                        key={r.attemptId}
                        type="button"
                        onClick={async () => {
                          const res = await api.getAttempt(r.attemptId);
                          setAttempt(res.attempt);
                          setAnswers(
                            res.savedAnswers.reduce(
                              (acc: any, a: any) => ({ ...acc, [a.questionId]: a.response }),
                              {}
                            )
                          );
                          fetchResult(r.attemptId);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isCur
                            ? 'bg-[#722F37] text-white shadow-2xs ring-2 ring-[#722F37]/30'
                            : 'bg-white hover:bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        <span>Response #{r.attemptNumber}</span>
                        {r.scoreAwarded !== null && r.scoreAwarded !== undefined && (
                          <span className="opacity-80">({r.scoreAwarded} M)</span>
                        )}
                        {isCur && <span className="text-[10px]">• Current</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8DCC6]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                  Official Published Results
                </div>
                <h2 className="text-xl font-serif font-bold text-[#30231F]">
                  Score Summary & Feedback
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-[#30231F]/60">Total Score</div>
                  <div className="text-2xl font-serif font-bold text-[#722F37]">
                    {studentResult.scoreAwarded} / {studentResult.totalMarks}
                  </div>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    studentResult.decisionStatus === 'Failed' || studentResult.status === 'Failed'
                      ? 'bg-red-700 text-white'
                      : studentResult.decisionStatus === 'Discarded' || studentResult.status === 'Discarded'
                      ? 'bg-amber-700 text-white'
                      : studentResult.isPassed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {studentResult.decisionStatus === 'Failed' || studentResult.status === 'Failed'
                    ? 'Failed by Instructor'
                    : studentResult.decisionStatus === 'Discarded' || studentResult.status === 'Discarded'
                    ? 'Discarded / Cancelled'
                    : studentResult.isPassed
                    ? 'Passed'
                    : 'Below Passing'}
                </div>
              </div>
            </div>

            {/* Official Instructor Note if Failed or Discarded */}
            {studentResult.decisionNote && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                  studentResult.decisionStatus === 'Failed'
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    Official Instructor Note ({studentResult.decisionStatus || 'Notice'}):
                  </div>
                  <div className="italic text-xs font-serif leading-relaxed">
                    "{studentResult.decisionNote}"
                  </div>
                  {studentResult.decisionBy && (
                    <div className="text-[10px] opacity-75">
                      Issued by {studentResult.decisionBy} on {studentResult.decisionAt ? new Date(studentResult.decisionAt).toLocaleString() : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Question Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#30231F]">
                Question Details & Evaluator Feedback
              </h3>

              {(studentResult.results || []).map((item, idx) => (
                <div
                  key={item.questionId || idx}
                  className="p-4 bg-[#F8F4EC]/40 rounded-xl border border-[#E8DCC6] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#722F37]">
                      Question {idx + 1} ({item.maxMarks} Marks)
                    </span>
                    <span className="text-xs font-bold text-[#30231F]">
                      Awarded: {item.marksAwarded ?? 0} / {item.maxMarks}
                    </span>
                  </div>

                  <p className="text-xs text-[#30231F] font-medium">{item.text}</p>

                  <div className="text-xs bg-white p-2.5 rounded-lg border border-[#E8DCC6]">
                    <div className="text-[10px] font-semibold text-[#30231F]/50 uppercase mb-0.5">
                      Your Answer:
                    </div>
                    <div className="text-[#30231F] font-serif">
                      {item.studentResponse || <span className="italic text-[#30231F]/40">(Blank)</span>}
                    </div>
                  </div>

                  {item.correctAnswer && (
                    <div className="text-xs text-[#722F37] bg-[#E8DCC6]/40 p-2.5 rounded-lg">
                      <strong>Model Answer:</strong> {item.correctAnswer}
                    </div>
                  )}

                  {item.feedback && (
                    <div className="text-xs text-blue-900 bg-blue-50 border border-blue-200 p-2.5 rounded-lg">
                      <strong>Instructor Feedback:</strong> {item.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E8DCC6] p-8 text-center space-y-3">
            <Clock className="w-8 h-8 mx-auto text-[#B7A89A]" />
            <h2 className="text-lg font-serif font-bold text-[#30231F]">
              Awaiting Instructor Evaluation
            </h2>
            <p className="text-xs sm:text-sm text-[#30231F]/70 max-w-md mx-auto font-light">
              Your instructor is reviewing submissions. When the evaluation is completed and published, your marks and individual feedback will appear here.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => fetchResult(attempt.id)}
                disabled={loadingResult}
                className="px-4 py-2 border border-[#B7A89A] hover:border-[#722F37] text-xs font-semibold text-[#30231F] rounded-lg transition-colors cursor-pointer"
              >
                {loadingResult ? 'Checking for updates...' : 'Check for Published Results'}
              </button>
              <button
                onClick={() => {
                  setIsViewingPaper(true);
                  setIsSubmitted(false);
                }}
                className="px-4 py-2 bg-[#F8F4EC] hover:bg-[#E8DCC6]/60 border border-[#B7A89A] text-xs font-semibold text-[#30231F] rounded-lg transition-colors cursor-pointer"
              >
                Review My Answers
              </button>
            </div>
          </div>
        )}

        {/* Bottom Banner to Give More Exams */}
        <div className="bg-white rounded-3xl border border-[#E8DCC6] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-serif font-bold text-[#30231F]">
              Ready to take another examination?
            </h3>
            <p className="text-xs text-[#30231F]/70">
              Students can take multiple examinations. Enter another Exam ID anytime in the portal.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReturnToPortal}
            className="px-5 py-2.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <span>Back to Portal (Enter Exam ID)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. Active Calm Exam Interface
  const currentQ = questions[currentQIndex];
  const answeredCount = Object.values(answers).filter((a) => a && a.trim() !== '').length;

  const formatTimer = (totalSeconds: number | null) => {
    if (totalSeconds === null) return '--:--';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Ultra-soft, extra slow background airflow - calming, non-intrusive */}
      <AirflowAnimation variant="exam" />

      {/* JEV Official Caution Notice Modal Alert */}
      {activeCaution && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl border-2 border-red-600 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-300 text-red-600 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span>Invigilator Caution Notice</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#30231F]">
                Caution: Unusual Activity Detected
              </h2>
              <div className="text-xs text-[#30231F]/70 font-medium">
                Examination: {examData.title} ({examData.id})
              </div>
            </div>

            {/* Official Caution Message */}
            <div className="p-4 sm:p-5 bg-red-50/95 rounded-2xl border border-red-200 text-[#30231F] text-sm sm:text-base font-semibold leading-relaxed text-left">
              “{activeCaution.message || 'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.'}”
            </div>

            {/* Non-punitive Reassurance */}
            <div className="text-xs text-[#30231F]/75 text-left bg-[#F8F4EC] p-3.5 rounded-xl border border-[#E8DCC6] space-y-1">
              <div className="font-bold text-[#722F37] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#722F37] shrink-0" />
                <span>Important Information for Examinee:</span>
              </div>
              <p className="leading-relaxed">
                Your examination has <strong>not</strong> been cancelled and you have <strong>not</strong> been declared as cheating. This formal caution has been sent directly from your supervising teacher. Please keep your browser on this tab in full screen and strictly observe examination rules.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAcknowledgeCaution}
                disabled={acknowledgingCaution}
                className="w-full py-3.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {acknowledgingCaution ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming Acknowledgment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I Acknowledge & Understand — Return to Exam Paper</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brief, clear restriction notification banner (neutral wording, no security/cheating claims) */}
      {restrictionNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto px-4 py-3 bg-[#30231F] text-[#F8F4EC] rounded-xl border border-[#B7A89A]/80 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <Info className="w-4 h-4 text-[#E8DCC6] shrink-0" />
          <span className="text-xs font-medium leading-tight">
            {restrictionNotice}
          </span>
        </div>
      )}

      {/* Active exam taking interface with disabled text selection, clipboard, and context menu */}
      <div
        onContextMenu={handleExamContextMenu}
        onCopy={handleExamCopy}
        onCut={handleExamCut}
        onPaste={handleExamPaste}
        onKeyDown={handleExamKeyDown}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-150 select-none"
      >
        {/* Official Disciplinary Action Ribbon if Failed or Discarded */}
        {attempt?.decisionStatus && (
          <div
            className={`border rounded-2xl p-3.5 flex items-start gap-3 text-xs shadow-xs ${
              attempt.decisionStatus === 'Failed'
                ? 'bg-red-50 border-red-300 text-red-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-sm">
                Official Instructor Decision: Submission Marked as {attempt.decisionStatus.toUpperCase()}
              </div>
              {attempt.decisionNote && (
                <div className="italic text-xs font-serif leading-relaxed">
                  "{attempt.decisionNote}"
                </div>
              )}
              {attempt.decisionBy && (
                <div className="text-[10px] opacity-75">
                  Decided by {attempt.decisionBy} on {attempt.decisionAt ? new Date(attempt.decisionAt).toLocaleString() : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Caution History Warning Ribbon if cautions were ever issued */}
        {cautionHistory.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-red-950 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>
                <strong>Caution Notice on File:</strong> Unusual activity was flagged during this session. Please stay on the exam page and follow exam rules to avoid penalties.
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-200 text-red-900 uppercase shrink-0">
              {cautionHistory.length} Caution{cautionHistory.length > 1 ? 's' : ''} Issued
            </span>
          </div>
        )}
        {/* Top Invigilation & Exam Control Bar */}
      <div className="bg-white rounded-2xl border border-[#E8DCC6] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs sticky top-20 z-30">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#722F37]">
              {examData.subject} · {examData.id}
            </div>
            <h1 className="text-base font-serif font-bold text-[#30231F] truncate max-w-sm">
              {examData.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowSwitchExamModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F4EC] hover:bg-[#E8DCC6]/60 border border-[#B7A89A]/60 text-[#30231F] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Switch or give another examination (answers are automatically saved)"
          >
            <Layers className="w-3.5 h-3.5 text-[#722F37]" />
            <span className="hidden sm:inline">Exams Hub / Give More</span>
            <span className="sm:hidden">Exams Hub</span>
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live Auto-save indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#30231F]/70">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#722F37]" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
              </>
            ) : (
              <span className="text-red-600">Save error</span>
            )}
          </div>

          {/* Option: Auto-save on timeout toggle */}
          <label
            className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-[#30231F] bg-[#F8F4EC] border border-[#B7A89A]/60 px-2.5 py-1.5 rounded-lg hover:border-[#722F37] transition-colors shadow-2xs"
            title="Automatically save answers and submit examination when timer reaches 0"
          >
            <input
              type="checkbox"
              checked={autoSaveOnTimeout}
              onChange={(e) => setAutoSaveOnTimeout(e.target.checked)}
              className="rounded text-[#722F37] focus:ring-[#722F37] cursor-pointer"
            />
            <span className="font-medium hidden md:inline">Auto-save on timeout</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                autoSaveOnTimeout ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              {autoSaveOnTimeout ? 'ON' : 'OFF'}
            </span>
          </label>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
              (secondsRemaining ?? 300) < 300
                ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                : 'bg-[#F8F4EC] text-[#30231F] border border-[#E8DCC6]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#722F37]" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Distraction-Free Fullscreen'}
            className="p-2 border border-[#B7A89A]/60 hover:border-[#722F37] text-[#30231F] rounded-lg transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </div>

      {/* Time Expired Auto-Save Notification */}
      {timeoutAutoSavedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900">Auto-Save & Submission Complete: </span>
              Your examination timer has expired. All answers were automatically saved and submitted safely to your instructor.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTimeoutAutoSavedNotice(false)}
            className="text-emerald-800 hover:text-emerald-950 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Examination Layout */}
      <div className="grid md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Navigator */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-[#E8DCC6] p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC6]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
              Questions
            </span>
            <span className="text-xs text-[#30231F]/60">
              {answeredCount} / {questions.length} done
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]?.trim());
              const isCurrent = idx === currentQIndex;

              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'bg-[#722F37] text-[#F8F4EC] ring-2 ring-[#722F37]/30'
                      : isAnswered
                      ? 'bg-[#E8DCC6] text-[#30231F] hover:bg-[#d6c4a8]'
                      : 'bg-[#F8F4EC] text-[#30231F]/70 border border-[#E8DCC6] hover:border-[#B7A89A]'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E8DCC6] text-[11px] text-[#30231F]/60 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-[#722F37]" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-[#E8DCC6]" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-[#F8F4EC] border border-[#E8DCC6]" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>

        {/* Right Column: Question Content & Input */}
        <div className="md:col-span-9 bg-white rounded-2xl border border-[#E8DCC6] p-6 sm:p-8 shadow-xs space-y-6">
          {currentQ ? (
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC6]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif font-bold text-[#722F37] text-base">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-[#30231F]/60">
                    · {currentQ.type.replace('_', ' ')}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-[#E8DCC6]/40 rounded text-xs font-semibold text-[#722F37]">
                  {currentQ.marks} Marks
                </span>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-serif text-[#30231F] leading-relaxed">
                {currentQ.text}
              </div>

              {/* Response Field by Type */}
              <div className="pt-2">
                {/* Multiple Choice */}
                {currentQ.type === 'multiple_choice' && (
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQ.id] === opt;
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#722F37]/5 border-[#722F37] ring-1 ring-[#722F37]'
                              : 'bg-white border-[#E8DCC6] hover:border-[#B7A89A]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${currentQ.id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(currentQ.id, opt)}
                            className="text-[#722F37] focus:ring-[#722F37]"
                          />
                          <span className="text-sm text-[#30231F]">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* True / False */}
                {currentQ.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['True', 'False'].map((opt) => {
                      const isSelected = answers[currentQ.id] === opt;
                      return (
                        <label
                          key={opt}
                          className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#722F37]/5 border-[#722F37] text-[#722F37] ring-1 ring-[#722F37]'
                              : 'bg-white border-[#E8DCC6] text-[#30231F] hover:border-[#B7A89A]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${currentQ.id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(currentQ.id, opt)}
                            className="text-[#722F37] focus:ring-[#722F37]"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {currentQ.type === 'short_answer' && (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      placeholder="Type your concise response here..."
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="w-full p-4 bg-[#F8F4EC]/30 border border-[#B7A89A] rounded-xl text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37] select-text"
                    />
                    <div className="text-[11px] text-[#30231F]/50 text-right">
                      {(answers[currentQ.id] || '').length} characters
                    </div>
                  </div>
                )}

                {/* Long Essay Answer */}
                {currentQ.type === 'long_answer' && (
                  <div className="space-y-2">
                    <textarea
                      rows={8}
                      placeholder="Provide your complete analytical answer, working, and justification..."
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="w-full p-4 bg-[#F8F4EC]/30 border border-[#B7A89A] rounded-xl text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37] leading-relaxed select-text"
                    />
                    <div className="text-[11px] text-[#30231F]/50 text-right">
                      {(answers[currentQ.id] || '').length} characters
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center justify-between pt-6 border-t border-[#E8DCC6]">
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex((prev) => prev - 1)}
                  className="px-4 py-2 bg-white border border-[#B7A89A] hover:border-[#722F37] disabled:opacity-40 text-xs font-semibold text-[#30231F] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex((prev) => prev + 1)}
                    className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Review & Submit</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-[#30231F]/60">
              No questions found for this exam.
            </div>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#30231F]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8DCC6] p-6 shadow-xl space-y-5">
            <h3 className="text-xl font-serif font-bold text-[#30231F]">
              Confirm Examination Submission
            </h3>

            <p className="text-xs sm:text-sm text-[#30231F]/70 leading-relaxed font-light">
              You have answered <strong className="text-[#30231F] font-semibold">{answeredCount}</strong> of{' '}
              <strong className="text-[#30231F] font-semibold">{questions.length}</strong> questions.
              Please verify your answers below before final submission.
            </p>

            {/* Question status matrix before submission */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#30231F] flex items-center justify-between">
                <span>Verify Question Status:</span>
                <span className="text-[#722F37]">{questions.length - answeredCount} unanswered</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#F8F4EC]/60 rounded-xl border border-[#E8DCC6]">
                {questions.map((q, idx) => {
                  const isDone = Boolean(answers[q.id]?.trim());
                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => {
                        setCurrentQIndex(idx);
                        setShowSubmitModal(false);
                      }}
                      title={`Go to Question ${idx + 1}`}
                      className={`py-1 rounded text-[11px] font-semibold text-center transition-colors cursor-pointer ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      Q{idx + 1} {isDone ? '✓' : '—'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-[#F8F4EC] rounded-xl text-xs text-[#30231F]/80 space-y-1">
              <div>Exam: <strong>{examData.title}</strong></div>
              <div>Candidate: <strong>{studentName}</strong></div>
              <div>Access Code: <code>{attempt.accessCode}</code></div>
            </div>

            {/* Auto-save on timeout preference in modal */}
            <label className="flex items-start gap-2.5 p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-[#30231F] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSaveOnTimeout}
                onChange={(e) => setAutoSaveOnTimeout(e.target.checked)}
                className="mt-0.5 rounded text-[#722F37] focus:ring-[#722F37] cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-semibold text-emerald-900">Auto-save examination on timeout</span>
                <p className="text-[#30231F]/70 text-[11px] mt-0.5">
                  If the exam timer runs out, your responses will be automatically saved and submitted safely without loss of answers.
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border border-[#B7A89A] text-xs font-semibold text-[#30231F] rounded-lg hover:bg-[#E8DCC6]/30 transition-colors cursor-pointer"
              >
                Return to Paper
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitExam(false)}
                className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Exam / Multi-Exam Hub Modal */}
      {showSwitchExamModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#30231F]/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E8DCC6] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC6]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#722F37]" />
                <h3 className="text-lg font-serif font-bold text-[#30231F]">
                  Student Examinations Hub
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchExamModal(false)}
                className="text-[#30231F]/60 hover:text-[#30231F] p-1.5 rounded-lg hover:bg-[#E8DCC6]/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your Current Progress is Automatically Saved</span>
              </div>
              <p className="text-emerald-900/80 leading-relaxed">
                You are currently taking <strong>{examData.title}</strong> ({examData.id}). All responses you typed are saved. Your timer will continue running until submitted.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                Examination Navigation
              </div>

              <div className="grid gap-2.5">
                <button
                  type="button"
                  onClick={handleReturnToPortal}
                  className="w-full p-3.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs font-semibold text-left flex items-center justify-between shadow-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold">Enter Exam ID / Take Another Exam</div>
                      <div className="text-[11px] text-[#F8F4EC]/80 font-normal">
                        Return to portal to enter an Exam ID code
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleReturnToPortal}
                  className="w-full p-3.5 bg-[#F8F4EC] hover:bg-[#E8DCC6]/60 border border-[#B7A89A] rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-[#722F37] shrink-0" />
                    <div>
                      <div className="font-bold text-[#30231F]">View All My Examinations ({myAttempts.length})</div>
                      <div className="text-[11px] text-[#30231F]/60 font-normal">
                        Review your past papers, submitted tests, and published marks
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#30231F]/50 shrink-0" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSwitchExamModal(false)}
                className="px-4 py-2 border border-[#B7A89A] text-xs font-semibold text-[#30231F] rounded-lg hover:bg-[#F8F4EC] transition-colors cursor-pointer"
              >
                Continue Current Exam
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
