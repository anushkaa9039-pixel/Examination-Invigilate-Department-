import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Copy,
  Check,
  Share2,
  Lock,
  Unlock,
  Edit3,
  FileCheck2,
  Clock,
  BookOpen,
  Users,
  Award,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  School,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Activity,
  ChevronRight,
  Sparkles,
  Send,
  MessageSquare,
  Bell,
  X,
  History,
  Info,
  Ban,
  XCircle,
} from 'lucide-react';
import {
  Exam,
  Question,
  DashboardStudentSubmission,
  TeacherDashboardStats,
  ActivityEvent,
  CautionNotice,
} from '../../types';
import { api } from '../../api';
import { ExamAuthoringModal } from './ExamAuthoringModal';
import { TeacherSubmissionsView } from './TeacherSubmissionsView';
import { StudentMarksVerificationModal } from './StudentMarksVerificationModal';
import { SubmissionDecisionModal } from './SubmissionDecisionModal';
import { AirflowAnimation } from '../AirflowAnimation';

interface TeacherWorkspaceProps {
  teacherName: string;
}

export const TeacherWorkspace: React.FC<TeacherWorkspaceProps> = ({ teacherName }) => {
  // Navigation Tabs: 'jev-radar' (Results & JEV Activity) vs 'exams' (Exam Authoring & Cards)
  const [activeTab, setActiveTab] = useState<'jev-radar' | 'exams'>('jev-radar');

  // Scope filter: current teacher or all institution examinations
  const [viewScope, setViewScope] = useState<'my' | 'all'>('my');

  // Exams State
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  // Dashboard Overview & JEV State
  const [submissions, setSubmissions] = useState<DashboardStudentSubmission[]>([]);
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters for Students & Activity Radar
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'Low Risk' | 'Medium Risk' | 'High Risk'>('all');
  const [examFilter, setExamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Submitted' | 'Failed' | 'Discarded'>('all');

  // Academic Authority Decision State (Fail or Discard with note)
  const [decisionStudent, setDecisionStudent] = useState<DashboardStudentSubmission | null>(null);

  // JEV Risk-Based Caution System State
  const [cautioningStudent, setCautioningStudent] = useState<DashboardStudentSubmission | null>(null);
  const [customCautionMessage, setCustomCautionMessage] = useState(
    'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.'
  );
  const [sendingCaution, setSendingCaution] = useState(false);
  const [cautionSuccessMsg, setCautionSuccessMsg] = useState<string | null>(null);

  // JEV Timeline Viewer State
  const [timelineStudent, setTimelineStudent] = useState<DashboardStudentSubmission | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<ActivityEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Authoring Modal State
  const [isAuthoringOpen, setIsAuthoringOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);

  // Submissions View State (when drilling down to grade a specific exam/student)
  const [selectedExamForSubmissions, setSelectedExamForSubmissions] = useState<Exam | null>(null);
  const [selectedAttemptIdForSubmissions, setSelectedAttemptIdForSubmissions] = useState<string | null>(null);

  // Dedicated single-student verification modal state
  const [verifyingStudent, setVerifyingStudent] = useState<DashboardStudentSubmission | null>(null);

  // Results Publishing State
  const [publishingExamId, setPublishingExamId] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  const effectiveTeacher = viewScope === 'all' ? '__all__' : teacherName;

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingDashboard(true);
      else setRefreshing(true);

      const res = await api.getTeacherDashboard(effectiveTeacher);
      setSubmissions(res.submissions || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Failed to load teacher dashboard overview:', err);
    } finally {
      setLoadingDashboard(false);
      setRefreshing(false);
    }
  }, [effectiveTeacher]);

  const fetchExams = useCallback(async () => {
    try {
      setLoadingExams(true);
      const res = await api.getTeacherExams(effectiveTeacher);
      setExams(res.exams || []);
    } catch (err) {
      console.error('Failed to fetch teacher exams:', err);
    } finally {
      setLoadingExams(false);
    }
  }, [effectiveTeacher]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    fetchExams();
  }, [fetchDashboardData, fetchExams]);

  // Periodic subtle auto-refresh every 12 seconds for live telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/?examId=${id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleToggleStatus = async (exam: Exam) => {
    let newStatus: 'Open' | 'Closed' = 'Open';
    if (exam.status === 'Open' || exam.status === 'Published') {
      newStatus = 'Closed';
    } else {
      newStatus = 'Open';
    }

    try {
      const res = await api.updateExamStatus(exam.id, newStatus);
      setExams((prev) => prev.map((e) => (e.id === exam.id ? res.exam : e)));
      fetchDashboardData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update exam status');
    }
  };

  const handleEditExam = async (exam: Exam) => {
    try {
      const res = await api.getExam(exam.id, 'teacher');
      setEditingExam(res.exam);
      setEditingQuestions(res.questions);
      setIsAuthoringOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load exam details for editing');
    }
  };

  const handleCreateNew = () => {
    setEditingExam(null);
    setEditingQuestions([]);
    setIsAuthoringOpen(true);
  };

  const handleOpenStudentSubmission = async (sub: DashboardStudentSubmission) => {
    // Find or fetch the exam object
    let targetExam = exams.find((e) => e.id === sub.examId);
    if (!targetExam) {
      try {
        const res = await api.getExam(sub.examId, 'teacher');
        targetExam = res.exam;
      } catch (err) {
        console.error('Failed to get exam:', err);
      }
    }

    if (targetExam) {
      setSelectedAttemptIdForSubmissions(sub.attempt.id);
      setSelectedExamForSubmissions(targetExam);
    }
  };

  const handlePublishResults = async (targetExamId: string) => {
    setPublishingExamId(targetExamId);
    setPublishSuccessMsg(null);
    try {
      const res = await api.publishResults(targetExamId);
      setExams((prev) => prev.map((e) => (e.id === targetExamId ? res.exam : e)));
      setSubmissions((prev) =>
        prev.map((s) => (s.examId === targetExamId ? { ...s, resultsPublished: true } : s))
      );
      setPublishSuccessMsg(
        'Results have been officially published! Candidates can now view their scores and question feedback.'
      );
      fetchDashboardData(true);
    } catch (err: any) {
      console.error('Failed to publish results:', err);
    } finally {
      setPublishingExamId(null);
    }
  };

  const handleOpenCautionModal = (sub: DashboardStudentSubmission) => {
    setCautioningStudent(sub);
    setCustomCautionMessage(
      'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.'
    );
  };

  const handleSendCaution = async (sub: DashboardStudentSubmission, customMsg?: string) => {
    setSendingCaution(true);
    setCautionSuccessMsg(null);
    try {
      const msg = customMsg || customCautionMessage;
      await api.sendCaution(sub.attempt.id, msg, teacherName);
      setCautionSuccessMsg(`Immediate caution notice delivered to ${sub.attempt.studentName}.`);
      setCautioningStudent(null);
      await fetchDashboardData(true);
      setTimeout(() => setCautionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to send caution notice');
    } finally {
      setSendingCaution(false);
    }
  };

  const handleOpenTimeline = async (sub: DashboardStudentSubmission) => {
    setTimelineStudent(sub);
    setLoadingTimeline(true);
    try {
      const res = await api.getJEVDetails(sub.attempt.id);
      setTimelineEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load JEV timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Filtered submissions list
  const filteredSubmissions = submissions.filter((sub) => {
    // Search query matches student name or exam ID or access code
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const matchName = sub.attempt.studentName.toLowerCase().includes(query);
      const matchExam = sub.examId.toLowerCase().includes(query) || sub.examTitle.toLowerCase().includes(query);
      const matchCode = sub.attempt.accessCode.toLowerCase().includes(query);
      if (!matchName && !matchExam && !matchCode) return false;
    }

    // JEV Risk filter
    if (riskFilter !== 'all' && sub.review.riskLevel !== riskFilter) {
      return false;
    }

    // Exam ID filter
    if (examFilter !== 'all' && sub.examId !== examFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'Active' && sub.attempt.status !== 'Active') {
      return false;
    }
    if (statusFilter === 'Submitted' && (sub.attempt.status !== 'Submitted' && sub.attempt.status !== 'Graded' || sub.attempt.decisionStatus === 'Failed' || sub.attempt.decisionStatus === 'Discarded')) {
      return false;
    }
    if (statusFilter === 'Failed' && sub.attempt.status !== 'Failed' && sub.attempt.decisionStatus !== 'Failed') {
      return false;
    }
    if (statusFilter === 'Discarded' && sub.attempt.status !== 'Discarded' && sub.attempt.decisionStatus !== 'Discarded') {
      return false;
    }

    return true;
  });

  // If viewing detailed submission evaluation
  if (selectedExamForSubmissions) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeacherSubmissionsView
          exam={selectedExamForSubmissions}
          initialAttemptId={selectedAttemptIdForSubmissions || undefined}
          onBack={() => {
            setSelectedExamForSubmissions(null);
            setSelectedAttemptIdForSubmissions(null);
            fetchDashboardData(true);
            fetchExams();
          }}
          onExamUpdated={(updated) => {
            setSelectedExamForSubmissions(updated);
            setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Subtle airflow animation across workspace background */}
      <AirflowAnimation variant="workspace" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-150">
        {/* Top Control Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#E8DCC6]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#722F37]">
              <School className="w-3.5 h-3.5" />
              <span>Teacher Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#30231F] mt-1">
              Academic Assessment Control Center
            </h1>
            <p className="text-xs sm:text-sm text-[#30231F]/70 mt-1">
              Supervising educator: <strong className="text-[#30231F]">{teacherName}</strong> · Monitor live examinee activity, evaluate student marks, and manage examinations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Scope Toggle (My Exams vs All Exams) */}
            <div className="bg-[#E8DCC6]/60 border border-[#B7A89A]/50 rounded-xl p-1 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewScope('my')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  viewScope === 'my'
                    ? 'bg-white text-[#30231F] font-semibold shadow-xs'
                    : 'text-[#30231F]/70 hover:text-[#30231F]'
                }`}
              >
                My Exams
              </button>
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white text-[#30231F] font-semibold shadow-xs'
                    : 'text-[#30231F]/70 hover:text-[#30231F]'
                }`}
              >
                All Institution Exams
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                fetchDashboardData(true);
                fetchExams();
              }}
              disabled={refreshing}
              title="Refresh submissions and examinations"
              className="px-3 py-2 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#722F37] ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Create Exam Button */}
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Exam</span>
            </button>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Students */}
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#30231F]/60">
                  Total Examinees
                </span>
                <Users className="w-4 h-4 text-[#722F37]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#30231F]">
                  {stats.totalStudents}
                </span>
                <span className="text-xs text-[#30231F]/60">records</span>
              </div>
              <div className="mt-1 text-[11px] text-[#30231F]/60">
                Across {stats.totalExams} examination{stats.totalExams !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Active Sessions Taking Now */}
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Active In Session
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700">
                  {stats.activeNow}
                </span>
                <span className="text-xs text-emerald-800 font-medium">live candidates</span>
              </div>
              <div className="mt-1 text-[11px] text-[#30231F]/60">
                Continuous auto-save syncing
              </div>
            </div>

            {/* Completed Submissions */}
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#30231F]/60">
                  Papers Submitted
                </span>
                <FileCheck2 className="w-4 h-4 text-[#722F37]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#30231F]">
                  {stats.submitted}
                </span>
                <span className="text-xs text-[#30231F]/60">ready for review</span>
              </div>
              <div className="mt-1 text-[11px] text-[#30231F]/60">
                Sealed & waiting for evaluation
              </div>
            </div>
          </div>
        )}

        {/* Primary Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E8DCC6] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('jev-radar')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'jev-radar'
                ? 'bg-white text-[#722F37] border-t-2 border-t-[#722F37] border-x border-[#E8DCC6] -mb-[5px] pb-3 shadow-xs'
                : 'text-[#30231F]/70 hover:text-[#30231F] hover:bg-white/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-[#722F37]" />
            <span>Student Results & Activity</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#E8DCC6] text-[#722F37] font-bold">
              {submissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-white text-[#722F37] border-t-2 border-t-[#722F37] border-x border-[#E8DCC6] -mb-[5px] pb-3 shadow-xs'
                : 'text-[#30231F]/70 hover:text-[#30231F] hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#722F37]" />
            <span>My Examinations</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#E8DCC6] text-[#722F37] font-bold">
              {exams.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Student Results & JEV Activity Radar */}
        {activeTab === 'jev-radar' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Bar */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#30231F]/50" />
                  <input
                    type="text"
                    placeholder="Search candidate name, access code, or exam ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#F8F4EC]/60 border border-[#B7A89A]/80 rounded-xl text-xs sm:text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                  />
                </div>

                {/* Exam Filter Dropdown */}
                <div className="sm:col-span-4">
                  <select
                    value={examFilter}
                    onChange={(e) => setExamFilter(e.target.value)}
                    aria-label="Filter by examination"
                    className="w-full px-3 py-2 bg-[#F8F4EC]/60 border border-[#B7A89A]/80 rounded-xl text-xs text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                  >
                    <option value="all">All Examinations ({exams.length})</option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.id} — {ex.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Status Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    aria-label="Filter by session status"
                    className="w-full px-3 py-2 bg-[#F8F4EC]/60 border border-[#B7A89A]/80 rounded-xl text-xs text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                  >
                    <option value="all">All Examinees ({submissions.length})</option>
                    <option value="Submitted">Submitted Results ({submissions.filter((s) => (s.attempt.status === 'Submitted' || s.attempt.status === 'Graded') && s.attempt.decisionStatus !== 'Failed' && s.attempt.decisionStatus !== 'Discarded').length})</option>
                    <option value="Active">Active ({submissions.filter((s) => s.attempt.status === 'Active').length})</option>
                    <option value="Failed">Failed Submissions ({submissions.filter((s) => s.attempt.status === 'Failed' || s.attempt.decisionStatus === 'Failed').length})</option>
                    <option value="Discarded">Discarded / Cancelled ({submissions.filter((s) => s.attempt.status === 'Discarded' || s.attempt.decisionStatus === 'Discarded').length})</option>
                  </select>
                </div>
              </div>

              {/* JEV Activity Risk Level Filter Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8DCC6]/60 text-xs">
                <span className="text-[#30231F]/60 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>Risk Level:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRiskFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    riskFilter === 'all'
                      ? 'bg-[#30231F] text-[#F8F4EC]'
                      : 'bg-[#F8F4EC] text-[#30231F] border border-[#B7A89A]/50'
                  }`}
                >
                  All ({filteredSubmissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter('Low Risk')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    riskFilter === 'Low Risk'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                  title="Low Risk: Normal exam activity"
                >
                  🟢 Low Risk ({submissions.filter((s) => s.review.riskLevel === 'Low Risk').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter('Medium Risk')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    riskFilter === 'Medium Risk'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                  title="Medium Risk: A few unusual activities, such as one tab change or copy-paste attempt"
                >
                  🟡 Medium Risk ({submissions.filter((s) => s.review.riskLevel === 'Medium Risk').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter('High Risk')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    riskFilter === 'High Risk'
                      ? 'bg-red-700 text-white'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                  title="High Risk: Repeated or serious unusual activity, such as multiple tab changes, fullscreen exits, or copy-paste attempts"
                >
                  🔴 High Risk ({submissions.filter((s) => s.review.riskLevel === 'High Risk').length})
                </button>
              </div>
            </div>

            {/* Caution Success Feedback Toast */}
            {cautionSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold">{cautionSuccessMsg}</span>
              </div>
            )}

            {/* JEV High-Risk Alert Banner */}
            {submissions.some((s) => s.review.riskLevel === 'High Risk') && (
              <div className="bg-red-50/95 border-2 border-red-300 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 border border-red-300">
                    <AlertTriangle className="w-5 h-5 text-red-700 animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-red-950 flex items-center gap-2">
                      <span>JEV Vigilance Alert: High-Risk Students Detected</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-900">
                        {submissions.filter((s) => s.review.riskLevel === 'High Risk').length} High Risk Examinee{submissions.filter((s) => s.review.riskLevel === 'High Risk').length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed font-medium">
                      Repeated or serious unusual activity (multiple tab changes, fullscreen exits, or copy-paste attempts) has been detected. In large-scale exams, you can dispatch immediate cautions directly to examinees below.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRiskFilter('High Risk')}
                    className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>View High-Risk Students</span>
                  </button>
                </div>
              </div>
            )}

            {/* Results Publishing Action Banner */}
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37] flex items-center gap-2">
                  <span>Results Publishing</span>
                  {filteredSubmissions.some((s) => s.resultsPublished) ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Live to Students
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                      Not Yet Published
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#30231F]/70 mt-1">
                  {filteredSubmissions.some((s) => s.resultsPublished)
                    ? 'Exam results are published and active. Candidates can view their marks and question feedback.'
                    : 'Candidates cannot view marks until published. Verify each student by clicking their name, then launch results.'}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={filteredSubmissions.length === 0 || publishingExamId !== null}
                  onClick={() => {
                    const examIdToPublish =
                      examFilter !== 'all' ? examFilter : filteredSubmissions[0]?.examId || exams[0]?.id;
                    if (examIdToPublish) handlePublishResults(examIdToPublish);
                  }}
                  className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {publishingExamId !== null ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {filteredSubmissions.some((s) => s.resultsPublished)
                      ? 'Re-Publish / Sync Results'
                      : 'Launch & Publish Results to Students'}
                  </span>
                </button>
              </div>
            </div>

            {publishSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{publishSuccessMsg}</span>
              </div>
            )}

            {/* Submissions & Activity List */}
            {loadingDashboard ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#722F37]" />
                <p className="text-sm text-[#30231F]/70 mt-3 font-medium">
                  Loading student submissions and telemetry...
                </p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8DCC6] p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#E8DCC6] text-[#722F37] flex items-center justify-center mx-auto font-serif text-2xl font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[#30231F]">
                  No examinees match current filters.
                </h2>
                <p className="text-xs sm:text-sm text-[#30231F]/70 leading-relaxed font-light">
                  {submissions.length === 0
                    ? 'No students have started or submitted an exam yet. Share your Exam ID or link with candidates to view their live activity here.'
                    : 'Try clearing your search query or adjusting the filters above.'}
                </p>
                {submissions.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setRiskFilter('all');
                      setExamFilter('all');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-2 bg-[#722F37] text-[#F8F4EC] rounded-xl text-xs font-semibold"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((sub) => {
                  const risk = sub.review.riskLevel;
                  const isActive = sub.attempt.status === 'Active';
                  const metrics = sub.activityMetrics;

                  return (
                    <div
                      key={sub.attempt.id}
                      className="bg-white rounded-2xl border border-[#E8DCC6] hover:border-[#722F37] p-5 shadow-xs transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Student and Exam Title */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setVerifyingStudent(sub)}
                              className="text-base font-serif font-bold text-[#30231F] hover:text-[#722F37] hover:underline text-left cursor-pointer transition-colors"
                              title="Click to open marks verification for this student"
                            >
                              {sub.attempt.studentName}
                            </button>
                            <code className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#F8F4EC] border border-[#B7A89A]/50 rounded text-[#722F37]">
                              {sub.attempt.accessCode}
                            </code>
                            {sub.attempt.decisionStatus === 'Failed' || sub.attempt.status === 'Failed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-700 text-white shadow-xs">
                                <XCircle className="w-3 h-3" />
                                <span>Failed by Teacher</span>
                              </span>
                            ) : sub.attempt.decisionStatus === 'Discarded' || sub.attempt.status === 'Discarded' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-700 text-white shadow-xs">
                                <Ban className="w-3 h-3" />
                                <span>Discarded</span>
                              </span>
                            ) : isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E8DCC6] text-[#30231F]">
                                <span>{sub.attempt.status}</span>
                              </span>
                            )}
                            {(sub.totalAttemptsForStudent || 1) > 1 && (
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  sub.isLatestForStudent
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                }`}
                              >
                                Response #{sub.attemptNumber} of {sub.totalAttemptsForStudent} {sub.isLatestForStudent ? '· Latest' : '· Earlier'}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#30231F]/70 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#722F37]">{sub.examId}</span>
                            <span aria-hidden="true">·</span>
                            <span>{sub.examTitle}</span>
                            <span aria-hidden="true">·</span>
                            <span>{sub.examSubject}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-medium text-[#30231F]">
                              <Clock className="w-3 h-3 text-[#722F37]" />
                              {sub.attempt.submittedAt ? (
                                <>
                                  Submitted on {new Date(sub.attempt.submittedAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })} at {new Date(sub.attempt.submittedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </>
                              ) : (
                                <>In Session (Started {new Date(sub.attempt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</>
                              )}
                            </span>
                          </div>

                          {(sub.totalAttemptsForStudent || 1) > 1 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[11px] font-semibold text-[#722F37] bg-[#722F37]/10 px-2.5 py-1 rounded-md">
                                Multiple Responses: Student submitted {sub.totalAttemptsForStudent} separate responses for this exam.
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-[#30231F]/60">All responses:</span>
                                {submissions
                                  .filter(
                                    (other: DashboardStudentSubmission) =>
                                      other.examId === sub.examId &&
                                      other.attempt.studentName.trim().toLowerCase() === sub.attempt.studentName.trim().toLowerCase()
                                  )
                                  .sort((a: DashboardStudentSubmission, b: DashboardStudentSubmission) => (a.attemptNumber || 1) - (b.attemptNumber || 1))
                                  .map((otherSub: DashboardStudentSubmission) => {
                                    const isThisOne = otherSub.attempt.id === sub.attempt.id;
                                    return (
                                      <button
                                        key={otherSub.attempt.id}
                                        type="button"
                                        onClick={() => setVerifyingStudent(otherSub)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                          isThisOne
                                            ? 'bg-[#722F37] text-white shadow-2xs ring-1 ring-[#722F37]'
                                            : 'bg-[#E8DCC6]/60 text-[#30231F] hover:bg-[#722F37]/20 border border-[#B7A89A]/50'
                                        }`}
                                        title={`Switch to evaluate Response #${otherSub.attemptNumber}`}
                                      >
                                        Response #{otherSub.attemptNumber} ({otherSub.totalScore} M)
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Current Score & Pass Status */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          <div className="text-left sm:text-right space-y-0.5">
                            {sub.attempt.verificationStatus === 'Teacher-Verified' && (
                              <div className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                Teacher Verified
                              </div>
                            )}
                            <div className="text-base font-serif font-bold text-[#30231F]">
                              <span className="text-[#722F37]">{sub.totalScore}</span> / {sub.examTotalMarks} M
                            </div>
                            <div className="text-[10px] font-semibold">
                              {sub.attempt.decisionStatus === 'Failed' || sub.attempt.status === 'Failed' ? (
                                <span className="text-red-700 font-bold">Failed by Instructor</span>
                              ) : sub.attempt.decisionStatus === 'Discarded' || sub.attempt.status === 'Discarded' ? (
                                <span className="text-amber-800 font-bold">Discarded / Cancelled</span>
                              ) : sub.isPassed ? (
                                <span className="text-emerald-700">Passed ({sub.examPassingMarks} M req.)</span>
                              ) : (
                                <span className="text-[#722F37]">Below Passing ({sub.examPassingMarks} M req.)</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: Timeline, Caution, Fail/Discard, Verify Marks */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenTimeline(sub)}
                              className="px-3 py-2 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              title="Review candidate JEV activity timeline"
                            >
                              <History className="w-3.5 h-3.5 text-[#722F37]" />
                              <span className="hidden sm:inline">Timeline</span>
                            </button>

                            {risk === 'High Risk' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCautionModal(sub)}
                                className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-pulse"
                                title="Send an immediate caution warning to this student"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>Send Caution</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenCautionModal(sub)}
                                className="px-3 py-2 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                title="Send cautionary advisory to candidate"
                              >
                                <Bell className="w-3.5 h-3.5 text-amber-700" />
                                <span className="hidden sm:inline">Caution</span>
                              </button>
                            )}

                            {/* Fail or Discard Option with Note */}
                            <button
                              type="button"
                              onClick={() => setDecisionStudent(sub)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                sub.attempt.decisionStatus === 'Failed'
                                  ? 'bg-red-100 border border-red-300 text-red-900 hover:bg-red-200'
                                  : sub.attempt.decisionStatus === 'Discarded'
                                  ? 'bg-amber-100 border border-amber-300 text-amber-950 hover:bg-amber-200'
                                  : 'bg-white border border-[#B7A89A] hover:border-red-600 text-[#30231F]'
                              }`}
                              title="Fail or Discard this submission with an official note"
                            >
                              {sub.attempt.decisionStatus === 'Failed' ? (
                                <XCircle className="w-3.5 h-3.5 text-red-700" />
                              ) : sub.attempt.decisionStatus === 'Discarded' ? (
                                <Ban className="w-3.5 h-3.5 text-amber-700" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                              )}
                              <span className="hidden sm:inline">
                                {sub.attempt.decisionStatus ? sub.attempt.decisionStatus : 'Fail / Discard'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setVerifyingStudent(sub)}
                              className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              title="Verify candidate marks"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isActive ? 'Verify & Mark' : 'Verify Marks'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Official Teacher Decision Banner (Failed or Discarded with Note) */}
                      {sub.attempt.decisionStatus && (
                        <div
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs ${
                            sub.attempt.decisionStatus === 'Failed'
                              ? 'bg-red-50 border-red-300 text-red-950'
                              : 'bg-amber-50 border-amber-300 text-amber-950'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {sub.attempt.decisionStatus === 'Failed' ? (
                              <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                            ) : (
                              <Ban className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>Official Instructor Action: Submission Marked as {sub.attempt.decisionStatus.toUpperCase()}</span>
                                {sub.attempt.decisionBy && (
                                  <span className="text-[10px] font-normal opacity-75">by {sub.attempt.decisionBy}</span>
                                )}
                              </div>
                              {sub.attempt.decisionNote && (
                                <div className="italic text-[11px] mt-0.5">
                                  "{sub.attempt.decisionNote}"
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDecisionStudent(sub)}
                            className="px-3 py-1 bg-white border border-current rounded-lg text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-auto hover:bg-white/80"
                          >
                            Modify Decision
                          </button>
                        </div>
                      )}

                      {/* High Risk Action Banner on Student Card */}
                      {risk === 'High Risk' && (
                        <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start gap-2.5 text-xs text-red-950">
                            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-red-900">
                                High Risk Activity Detected
                              </div>
                              <div className="text-red-800 text-[11px] leading-relaxed">
                                JEV detected multiple tab changes, fullscreen exits, or restricted clipboard activity. As an invigilator, you can issue an immediate caution alert to their screen.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCautionModal(sub)}
                            className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Dispatch Immediate Caution</span>
                          </button>
                        </div>
                      )}

                      {/* Caution History & Acknowledgment Status Bar */}
                      {sub.cautions && sub.cautions.length > 0 && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="font-semibold text-amber-900">
                              Caution Notice ({sub.cautions.length} sent):
                            </span>
                            <span className="italic text-amber-900 truncate max-w-xs sm:max-w-md">
                              "{sub.latestCaution?.message}"
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sub.latestCaution?.acknowledged
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {sub.latestCaution?.acknowledged
                                ? '✓ Acknowledged by Student'
                                : '⏳ Pending Student Acknowledgment'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCautionModal(sub)}
                            className="text-xs text-[#722F37] hover:underline font-semibold cursor-pointer ml-auto"
                          >
                            Send Another Caution
                          </button>
                        </div>
                      )}

                      {/* Student Activity Assessment Card */}
                      <div className="bg-[#F8F4EC]/60 rounded-xl border border-[#E8DCC6] p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#722F37]" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                              Risk Level:
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                                risk === 'High Risk'
                                  ? 'bg-red-100 text-red-900 border border-red-300 font-extrabold'
                                  : risk === 'Medium Risk'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'
                              }`}
                            >
                              <span>{risk === 'High Risk' ? '🔴' : risk === 'Medium Risk' ? '🟡' : '🟢'}</span>
                              <span>{risk}</span>
                            </span>
                          </div>

                          {/* Activity quick badges - only non-zero or clean Normal Activity */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#30231F]/80">
                            {metrics.tabSwitches > 0 && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-medium">
                                🔄 {metrics.tabSwitches} tab switch{metrics.tabSwitches > 1 ? 'es' : ''}
                              </span>
                            )}
                            {metrics.copyAttempts > 0 && (
                              <span className="px-2 py-0.5 bg-red-50 text-red-900 border border-red-200 rounded font-medium">
                                📋 {metrics.copyAttempts} copy attempt{metrics.copyAttempts > 1 ? 's' : ''}
                              </span>
                            )}
                            {metrics.fullscreenExits > 0 && (
                              <span className="px-2 py-0.5 bg-red-50 text-red-900 border border-red-200 rounded font-medium">
                                ⛶ {metrics.fullscreenExits} fullscreen exit{metrics.fullscreenExits > 1 ? 's' : ''}
                              </span>
                            )}
                            {metrics.totalAwaySeconds > 0 && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-medium">
                                ⏱️ {metrics.totalAwaySeconds}s away
                              </span>
                            )}
                            {metrics.tabSwitches === 0 && metrics.copyAttempts === 0 && metrics.fullscreenExits === 0 && metrics.totalAwaySeconds === 0 && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium">
                                ✓ Normal Exam Activity
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-white border border-[#B7A89A]/50 rounded">
                              📝 <strong>{sub.answersCount}</strong> / {sub.totalQuestions} answered
                            </span>
                          </div>
                        </div>

                        {/* Plain Language Reasons */}
                        {(sub.review.reasons || []).length > 0 && (
                          <div className="text-xs text-[#30231F]/80 space-y-1 bg-white/70 p-2.5 rounded-lg border border-[#E8DCC6]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#722F37]">
                              Assessment Findings:
                            </div>
                            {sub.review.reasons.map((reason, rIdx) => (
                              <div key={rIdx} className="flex items-start gap-1.5 text-[11px]">
                                <span className="text-[#722F37] font-bold">•</span>
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="flex flex-wrap items-center justify-between text-[10px] text-[#30231F]/60 pt-1 border-t border-[#E8DCC6]/60 gap-2">
                          <div>
                            Started: {new Date(sub.attempt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {sub.attempt.submittedAt && (
                              <span> · Submitted: {new Date(sub.attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                            <span> · Last Activity: {new Date(sub.attempt.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: My Examinations & Authoring */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            {loadingExams ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#722F37]" />
                <p className="text-sm text-[#30231F]/70 mt-3 font-medium">
                  Loading examination papers...
                </p>
              </div>
            ) : exams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8DCC6] p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#E8DCC6] text-[#722F37] flex items-center justify-center mx-auto font-serif text-2xl font-bold">
                  E
                </div>
                <h2 className="text-xl font-serif font-bold text-[#30231F]">
                  No exams created yet.
                </h2>
                <p className="text-xs sm:text-sm text-[#30231F]/70 leading-relaxed font-light">
                  You have not configured any examinations under your name. Create an exam to generate your first test code and shareable candidate link.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleCreateNew}
                    className="px-6 py-2.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Exam</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => {
                  const isOpen = exam.status === 'Open' || exam.status === 'Published';
                  const isClosed = exam.status === 'Closed';
                  const isDraft = exam.status === 'Draft';

                  return (
                    <div
                      key={exam.id}
                      className="bg-white rounded-2xl border border-[#E8DCC6] p-6 flex flex-col justify-between hover:border-[#B7A89A] transition-all shadow-xs space-y-5"
                    >
                      {/* Header row */}
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC6]/60">
                          <span className="font-mono text-xs font-bold text-[#722F37] tracking-wider">
                            {exam.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isOpen
                                ? 'bg-emerald-100 text-emerald-800'
                                : isClosed
                                ? 'bg-[#30231F]/10 text-[#30231F]'
                                : isDraft
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#E8DCC6] text-[#722F37]'
                            }`}
                          >
                            {exam.status}
                          </span>
                        </div>

                        <h3 className="text-base font-serif font-bold text-[#30231F] mt-3 line-clamp-1">
                          {exam.title}
                        </h3>
                        <div className="text-xs text-[#722F37] font-medium mt-0.5">
                          {exam.subject}
                        </div>

                        {exam.topics && (
                          <div className="text-xs text-[#30231F]/60 mt-1 line-clamp-1">
                            {exam.topics}
                          </div>
                        )}

                        {/* Metadata line */}
                        <div className="mt-4 pt-3 border-t border-[#E8DCC6]/40 grid grid-cols-3 gap-2 text-center text-xs text-[#30231F]/70">
                          <div>
                            <div className="text-[10px] uppercase font-semibold text-[#B7A89A]">
                              Duration
                            </div>
                            <div className="font-semibold text-[#30231F] mt-0.5">
                              {exam.duration}m
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-semibold text-[#B7A89A]">
                              Total
                            </div>
                            <div className="font-semibold text-[#30231F] mt-0.5">
                              {exam.totalMarks} M
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-semibold text-[#B7A89A]">
                              Passing
                            </div>
                            <div className="font-semibold text-[#30231F] mt-0.5">
                              {exam.passingMarks} M
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Sharing */}
                      <div className="space-y-3 pt-2">
                        {/* Copy ID & Link buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyId(exam.id)}
                            className="px-2.5 py-1.5 bg-[#F8F4EC] hover:bg-[#E8DCC6] border border-[#B7A89A]/60 rounded-lg text-xs font-medium text-[#30231F] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedId === exam.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#722F37]" />
                                <span>Copy ID</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(exam.id)}
                            className="px-2.5 py-1.5 bg-[#F8F4EC] hover:bg-[#E8DCC6] border border-[#B7A89A]/60 rounded-lg text-xs font-medium text-[#30231F] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedLink === exam.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-[#722F37]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Open/Close toggle and Edit */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(exam)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isOpen
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isOpen ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Close Exam</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Open Exam</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditExam(exam)}
                            className="p-1.5 text-[#30231F]/60 hover:text-[#722F37] rounded-lg transition-colors cursor-pointer"
                            title="Edit examination details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Review Submissions Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAttemptIdForSubmissions(null);
                            setSelectedExamForSubmissions(exam);
                          }}
                          className="w-full py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>
                            Submissions ({exam.submissionCount || 0})
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Authoring / Editor Modal */}
        <ExamAuthoringModal
          isOpen={isAuthoringOpen}
          onClose={() => {
            setIsAuthoringOpen(false);
            setEditingExam(null);
            setEditingQuestions([]);
          }}
          teacherName={teacherName}
          initialExam={editingExam}
          initialQuestions={editingQuestions}
          onSaved={() => {
            fetchExams();
            fetchDashboardData(true);
          }}
        />

        {/* Send Immediate Caution Modal */}
        {cautioningStudent && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-3xl border border-[#E8DCC6] max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8DCC6]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center border border-red-300 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#30231F]">
                      Send Immediate Caution Notice
                    </h3>
                    <div className="text-xs text-[#30231F]/70">
                      Examinee: <strong>{cautioningStudent.attempt.studentName}</strong> · Exam: {cautioningStudent.examId} (Code: {cautioningStudent.attempt.accessCode})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCautioningStudent(null)}
                  className="p-1.5 rounded-lg text-[#30231F]/50 hover:text-[#30231F] hover:bg-[#E8DCC6]/40 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* JEV Status Info */}
              <div className="p-3 bg-red-50/90 rounded-xl border border-red-200 text-xs text-red-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-900">
                  <span>Current Assigned Risk:</span>
                  <span className="px-2 py-0.5 rounded font-extrabold uppercase text-[10px] bg-red-200 text-red-900">
                    {cautioningStudent.review.riskLevel}
                  </span>
                </div>
                <div className="text-[11px] text-red-800">
                  {(cautioningStudent.review.reasons || []).join(' ')}
                </div>
              </div>

              {/* Message field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#30231F] block">
                  Caution Advisory Message (Delivered to candidate's screen immediately):
                </label>
                <textarea
                  rows={4}
                  value={customCautionMessage}
                  onChange={(e) => setCustomCautionMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F4EC]/60 border border-[#B7A89A] rounded-xl text-xs sm:text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-red-600 font-medium leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-[#30231F]/60">
                  <span>Standard official caution text for active examinations.</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomCautionMessage(
                        'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.'
                      )
                    }
                    className="text-[#722F37] hover:underline font-semibold cursor-pointer"
                  >
                    Reset to Standard Text
                  </button>
                </div>
              </div>

              {/* Non-punitive authority assurance */}
              <div className="text-xs text-[#30231F]/70 bg-[#F8F4EC] p-3 rounded-xl border border-[#E8DCC6] space-y-1">
                <div className="font-semibold text-[#30231F] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>System Guarantee:</span>
                </div>
                <p className="text-[11px]">
                  The system does not automatically fail the student or declare cheating. It alerts the student on their exam screen and requests strict adherence. You can review the full activity timeline anytime.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCautioningStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#30231F] hover:bg-[#E8DCC6]/40 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sendingCaution || !customCautionMessage.trim()}
                  onClick={() => handleSendCaution(cautioningStudent)}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {sendingCaution ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Delivering Caution...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Immediate Caution</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JEV Activity Timeline Modal */}
        {timelineStudent && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-3xl border border-[#E8DCC6] max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-[#E8DCC6]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8DCC6] text-[#722F37] flex items-center justify-center shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#30231F]">
                      Examinee Activity Timeline & Invigilation Log
                    </h3>
                    <div className="text-xs text-[#30231F]/70">
                      Candidate: <strong>{timelineStudent.attempt.studentName}</strong> · Exam: {timelineStudent.examId} ({timelineStudent.examTitle})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTimelineStudent(null)}
                  className="p-1.5 rounded-lg text-[#30231F]/50 hover:text-[#30231F] hover:bg-[#E8DCC6]/40 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Risk Summary Header */}
              <div className="p-3 bg-[#F8F4EC] rounded-xl border border-[#E8DCC6] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#30231F]">Risk Level:</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                      timelineStudent.review.riskLevel === 'High Risk'
                        ? 'bg-red-100 text-red-900 border border-red-300 font-extrabold'
                        : timelineStudent.review.riskLevel === 'Medium Risk'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'
                    }`}
                  >
                    {timelineStudent.review.riskLevel}
                  </span>
                </div>
                <div className="text-xs text-[#30231F]/70">
                  Total Telemetry Events: <strong>{timelineEvents.length}</strong>
                </div>
              </div>

              {/* Timeline Events Scroll Area */}
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {loadingTimeline ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#722F37]" />
                    <p className="text-xs text-[#30231F]/70 mt-2 font-medium">Loading telemetry timeline...</p>
                  </div>
                ) : timelineEvents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#30231F]/60">
                    No activity events recorded yet for this session.
                  </div>
                ) : (
                  timelineEvents.map((ev, idx) => {
                    const isCaution = ev.eventType === 'teacher_caution';
                    const isAck = ev.eventType === 'caution_acknowledged';
                    const isBlur = ev.eventType === 'window_blur' || ev.eventType === 'tab_hidden';
                    const isFocus = ev.eventType === 'window_focus' || ev.eventType === 'tab_visible';
                    const isCopyPaste = ev.eventType === 'copy_attempt' || ev.eventType === 'paste_attempt';
                    const isFullscreenExit = ev.eventType === 'fullscreen_exit';

                    return (
                      <div
                        key={ev.id || idx}
                        className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                          isCaution
                            ? 'bg-red-50 border-red-300 text-red-950 font-medium'
                            : isAck
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : isFullscreenExit
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                            : isCopyPaste
                            ? 'bg-red-50/70 border-red-200 text-red-950'
                            : isBlur
                            ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                            : 'bg-white border-[#E8DCC6] text-[#30231F]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>
                              {isCaution
                                ? '⚠️ Teacher Caution Dispatched'
                                : isAck
                                ? '✓ Caution Acknowledged by Student'
                                : isFullscreenExit
                                ? '⛶ Fullscreen Mode Exited'
                                : isCopyPaste
                                ? `📋 Restricted Clipboard (${ev.eventType.replace('_', ' ')})`
                                : isBlur
                                ? '🔄 Tab Change / Focus Shifted Away'
                                : isFocus
                                ? '👁️ Focus Returned to Exam Window'
                                : ev.eventType.replace('_', ' ')}
                            </span>
                          </div>
                          {ev.metadata?.message && (
                            <div className="text-[11px] font-sans mt-1 bg-white/80 p-2 rounded-lg border border-current/20 leading-relaxed">
                              "{ev.metadata.message}"
                            </div>
                          )}
                          {ev.metadata?.sentBy && (
                            <div className="text-[10px] text-[#30231F]/60">
                              Issued by: {ev.metadata.sentBy}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-mono font-semibold text-[#30231F]/60 shrink-0">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Timeline Modal Footer */}
              <div className="pt-3 border-t border-[#E8DCC6] flex flex-wrap items-center justify-end gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenCautionModal(timelineStudent);
                    }}
                    className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Send Caution to Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineStudent(null)}
                    className="px-4 py-1.5 bg-[#30231F] text-[#F8F4EC] rounded-xl text-xs font-semibold hover:bg-[#523d37] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Student Marks Verification Modal */}
        {verifyingStudent && (
          <StudentMarksVerificationModal
            submission={verifyingStudent}
            allSubmissions={submissions}
            onSelectSubmission={(sub) => setVerifyingStudent(sub)}
            isOpen={!!verifyingStudent}
            onClose={() => setVerifyingStudent(null)}
            onUpdated={() => {
              fetchDashboardData(true);
            }}
          />
        )}

        {/* Academic Authority Decision Modal (Fail or Discard with Note) */}
        {decisionStudent && (
          <SubmissionDecisionModal
            isOpen={!!decisionStudent}
            submission={decisionStudent}
            currentTeacherName={teacherName}
            onClose={() => setDecisionStudent(null)}
            onDecisionSuccess={() => {
              fetchDashboardData(true);
            }}
          />
        )}
      </div>
    </div>
  );
};
