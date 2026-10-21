export interface Exam {
  id: string;
  teacherName: string;
  title: string;
  subject: string;
  topics: string;
  instructions: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  paperStyle: string;
  status: 'Draft' | 'Published' | 'Open' | 'Closed';
  createdAt: string;
  publishedAt: string | null;
  resultsPublished: boolean;
  resultsPublishedAt: string | null;
  questionCount?: number;
  submissionCount?: number;
  activeCount?: number;
}

export interface Question {
  id: string;
  examId?: string;
  order: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'long_answer';
  text: string;
  options: string[];
  correctAnswer?: string;
  marks: number;
  explanation?: string;
  rubric?: string;
  source: 'manual' | 'ai_draft';
}

export interface Attempt {
  id: string;
  examId: string;
  studentName: string;
  accessCode: string;
  startTime: string;
  lastActivity: string;
  status: 'Active' | 'Submitted' | 'Graded' | 'Failed' | 'Discarded';
  submittedAt: string | null;
  totalScoreAwarded?: number | null;
  autoScore?: number | null;
  verificationStatus?: 'Unverified' | 'Auto-Calculated' | 'Teacher-Verified' | 'Teacher-Failed' | 'Teacher-Discarded';
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  attemptNumber?: number;
  decisionStatus?: 'Failed' | 'Discarded' | null;
  decisionNote?: string | null;
  decisionBy?: string | null;
  decisionAt?: string | null;
}

export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  response: string;
  autoMarksAwarded?: number | null;
  autoFeedback?: string | null;
  marksAwarded: number | null;
  feedback: string | null;
  isTeacherMarked?: boolean;
}

export interface ActivityEvent {
  id: string;
  attemptId: string;
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CautionNotice {
  id: string;
  attemptId: string;
  examId: string;
  studentName: string;
  message: string;
  sentAt: string;
  sentBy: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
}

export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Normal' | 'Review Required';

export interface JEVReview {
  id: string;
  attemptId: string;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Normal' | 'Review Required';
  reasons: string[];
  status: 'Pending' | 'Resolved' | 'Further Investigation';
  teacherNotes: string;
  reviewedAt: string;
}

export interface SubmissionDetails {
  attempt: Attempt;
  answers: Answer[];
  review: JEVReview;
  eventsCount: number;
  totalScore: number;
  autoTotalScore?: number;
  isPassed: boolean;
  allGraded: boolean;
  isVerified?: boolean;
  attemptNumber?: number;
  totalAttemptsForStudent?: number;
  isLatestForStudent?: boolean;
  cautions?: CautionNotice[];
  latestCaution?: CautionNotice | null;
}

export interface StudentResultItem {
  questionId: string;
  order: number;
  text: string;
  type: string;
  options: string[];
  maxMarks: number;
  studentResponse: string;
  marksAwarded: number | null;
  feedback: string | null;
  correctAnswer?: string;
  explanation?: string;
}

export interface StudentExamResponseSummary {
  attemptId: string;
  attemptNumber: number;
  totalAttempts: number;
  status: 'Active' | 'Submitted' | 'Graded' | 'Failed' | 'Discarded';
  decisionStatus?: 'Failed' | 'Discarded' | null;
  startTime: string;
  submittedAt: string | null;
  scoreAwarded?: number | null;
  isCurrent?: boolean;
}

export interface StudentResultResponse {
  released: boolean;
  studentName?: string;
  accessCode?: string;
  submittedAt?: string;
  examTitle?: string;
  subject?: string;
  totalMarks?: number;
  passingMarks?: number;
  scoreAwarded?: number;
  isPassed?: boolean;
  status?: string;
  decisionStatus?: 'Failed' | 'Discarded' | null;
  decisionNote?: string | null;
  decisionBy?: string | null;
  decisionAt?: string | null;
  results?: StudentResultItem[];
  message?: string;
  allResponses?: StudentExamResponseSummary[];
}

export interface JEVActivityMetrics {
  eventsCount: number;
  tabSwitches: number;
  copyAttempts: number;
  fullscreenExits: number;
  contextMenuAttempts: number;
  totalAwaySeconds: number;
  latestEvent?: ActivityEvent | null;
}

export interface DashboardStudentSubmission {
  attempt: Attempt;
  examId: string;
  examTitle: string;
  examSubject: string;
  examTotalMarks: number;
  examPassingMarks: number;
  resultsPublished: boolean;
  answersCount: number;
  totalQuestions: number;
  totalScore: number;
  autoScore?: number;
  isPassed: boolean;
  allGraded: boolean;
  isVerified?: boolean;
  review: JEVReview;
  activityMetrics: JEVActivityMetrics;
  attemptNumber?: number;
  totalAttemptsForStudent?: number;
  isLatestForStudent?: boolean;
  cautions?: CautionNotice[];
  latestCaution?: CautionNotice | null;
}

export interface TeacherDashboardStats {
  totalExams: number;
  totalStudents: number;
  activeNow: number;
  submitted: number;
  failedCount?: number;
  discardedCount?: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  reviewRequiredCount?: number;
  normalCount?: number;
}

export interface TeacherDashboardResponse {
  teacherName: string;
  examsCount: number;
  stats: TeacherDashboardStats;
  submissions: DashboardStudentSubmission[];
}
