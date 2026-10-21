import fs from 'fs';
import path from 'path';

export interface Exam {
  id: string;
  teacherName: string;
  title: string;
  subject: string;
  topics: string;
  instructions: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  paperStyle: string; // 'Standard' | 'Formal Academic' | 'Minimalist' | 'Timed Assessment'
  status: 'Draft' | 'Published' | 'Open' | 'Closed';
  createdAt: string;
  publishedAt: string | null;
  resultsPublished: boolean;
  resultsPublishedAt: string | null;
}

export interface Question {
  id: string;
  examId: string;
  order: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'long_answer';
  text: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  explanation: string;
  rubric: string;
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
  eventType: string; // 'window_blur' | 'window_focus' | 'tab_hidden' | 'tab_visible' | 'fullscreen_exit' | 'copy_attempt' | 'paste_attempt' | 'context_menu'
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

export interface JEVReview {
  id: string;
  attemptId: string;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Normal' | 'Review Required';
  reasons: string[];
  status: 'Pending' | 'Resolved' | 'Further Investigation';
  teacherNotes: string;
  reviewedAt: string;
}

interface DatabaseSchema {
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  answers: Answer[];
  activityEvents: ActivityEvent[];
  jevReviews: JEVReview[];
  cautions?: CautionNotice[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'eid_database.json');

class Database {
  private data: DatabaseSchema = {
    exams: [],
    questions: [],
    attempts: [],
    answers: [],
    activityEvents: [],
    jevReviews: [],
    cautions: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.exams = this.data.exams || [];
        this.data.questions = this.data.questions || [];
        this.data.attempts = this.data.attempts || [];
        this.data.answers = this.data.answers || [];
        this.data.activityEvents = this.data.activityEvents || [];
        this.data.jevReviews = this.data.jevReviews || [];
        this.data.cautions = this.data.cautions || [];

        // Purge legacy fake seed/demo data & abandoned test placeholders
        const fakeNames = new Set(['arthur dent', 'alice walker', 'student', 'student test', 'test student verification']);
        const fakeExamIds = new Set(['eid-8764']);
        const removedAttemptIds = new Set<string>();

        this.data.attempts = this.data.attempts.filter((a) => {
          if (fakeNames.has(a.studentName.trim().toLowerCase()) || fakeExamIds.has(a.examId.toLowerCase())) {
            removedAttemptIds.add(a.id);
            return false;
          }
          return true;
        });

        this.data.exams = this.data.exams.filter((e) => !fakeExamIds.has(e.id.toLowerCase()));
        this.data.questions = this.data.questions.filter((q) => !fakeExamIds.has(q.examId.toLowerCase()));
        this.data.answers = this.data.answers.filter((ans) => !removedAttemptIds.has(ans.attemptId));
        this.data.activityEvents = this.data.activityEvents.filter((ev) => !removedAttemptIds.has(ev.attemptId));
        this.data.jevReviews = this.data.jevReviews.filter((r) => !removedAttemptIds.has(r.attemptId));
        this.data.cautions = this.data.cautions.filter((c) => !removedAttemptIds.has(c.attemptId));

        this.persist();
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('Error initializing database file:', err);
    }
  }

  private persist() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // --- Exams ---
  getExams(teacherName?: string): Exam[] {
    if (teacherName) {
      return this.data.exams.filter(
        (e) => e.teacherName.trim().toLowerCase() === teacherName.trim().toLowerCase()
      );
    }
    return this.data.exams;
  }

  getExamById(id: string): Exam | undefined {
    return this.data.exams.find((e) => e.id.toLowerCase() === id.trim().toLowerCase());
  }

  createExam(exam: Exam, questions: Question[]): { exam: Exam; questions: Question[] } {
    this.data.exams.push(exam);
    this.data.questions.push(...questions);
    this.persist();
    return { exam, questions };
  }

  updateExam(id: string, updates: Partial<Exam>): Exam | null {
    const index = this.data.exams.findIndex((e) => e.id.toLowerCase() === id.trim().toLowerCase());
    if (index === -1) return null;
    this.data.exams[index] = { ...this.data.exams[index], ...updates };
    this.persist();
    return this.data.exams[index];
  }

  // --- Questions ---
  getQuestionsByExamId(examId: string): Question[] {
    return this.data.questions
      .filter((q) => q.examId.toLowerCase() === examId.trim().toLowerCase())
      .sort((a, b) => a.order - b.order);
  }

  replaceExamQuestions(examId: string, questions: Question[]) {
    this.data.questions = this.data.questions.filter(
      (q) => q.examId.toLowerCase() !== examId.trim().toLowerCase()
    );
    this.data.questions.push(...questions);
    this.persist();
  }

  // --- Attempts ---
  getAttemptById(id: string): Attempt | undefined {
    return this.data.attempts.find((a) => a.id === id);
  }

  getAttemptsByExamId(examId: string): Attempt[] {
    return this.data.attempts.filter(
      (a) => a.examId.toLowerCase() === examId.trim().toLowerCase()
    );
  }

  getAttemptsByStudentName(studentName: string): Attempt[] {
    const clean = studentName.trim().toLowerCase();
    return this.data.attempts
      .filter((a) => a.studentName.trim().toLowerCase() === clean)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  getAttemptsByStudentAndExam(examId: string, studentName: string): Attempt[] {
    const cleanE = examId.trim().toLowerCase();
    const cleanS = studentName.trim().toLowerCase();
    return this.data.attempts
      .filter(
        (a) =>
          a.examId.toLowerCase() === cleanE &&
          a.studentName.trim().toLowerCase() === cleanS
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  findActiveAttemptByStudent(examId: string, studentName: string): Attempt | undefined {
    const cleanE = examId.trim().toLowerCase();
    const cleanS = studentName.trim().toLowerCase();
    return this.data.attempts.find(
      (a) =>
        a.examId.toLowerCase() === cleanE &&
        a.studentName.trim().toLowerCase() === cleanS &&
        a.status === 'Active'
    );
  }

  findAttemptByStudent(examId: string, studentName: string): Attempt | undefined {
    const cleanE = examId.trim().toLowerCase();
    const cleanS = studentName.trim().toLowerCase();
    const matches = this.data.attempts.filter(
      (a) =>
        a.examId.toLowerCase() === cleanE &&
        a.studentName.trim().toLowerCase() === cleanS
    );
    if (matches.length === 0) return undefined;
    // Return active if any, else return latest
    const active = matches.find((a) => a.status === 'Active');
    if (active) return active;
    matches.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return matches[0];
  }

  createAttempt(attempt: Attempt): Attempt {
    this.data.attempts.push(attempt);
    this.persist();
    return attempt;
  }

  updateAttempt(id: string, updates: Partial<Attempt>): Attempt | null {
    const index = this.data.attempts.findIndex((a) => a.id === id);
    if (index === -1) return null;
    this.data.attempts[index] = { ...this.data.attempts[index], ...updates };
    this.persist();
    return this.data.attempts[index];
  }

  // --- Answers ---
  getAnswersByAttemptId(attemptId: string): Answer[] {
    return this.data.answers.filter((ans) => ans.attemptId === attemptId);
  }

  clearAnswersByAttemptId(attemptId: string) {
    this.data.answers = this.data.answers.filter((ans) => ans.attemptId !== attemptId);
    this.persist();
  }

  saveAnswers(attemptId: string, answerPayloads: Array<{ questionId: string; response: string }>) {
    for (const item of answerPayloads) {
      const existingIdx = this.data.answers.findIndex(
        (a) => a.attemptId === attemptId && a.questionId === item.questionId
      );
      if (existingIdx !== -1) {
        this.data.answers[existingIdx].response = item.response;
      } else {
        this.data.answers.push({
          id: `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          attemptId,
          questionId: item.questionId,
          response: item.response,
          marksAwarded: null,
          feedback: null,
        });
      }
    }
    // Update last activity on attempt
    this.updateAttempt(attemptId, { lastActivity: new Date().toISOString() });
    this.persist();
  }

  gradeAnswer(
    answerId: string,
    marksAwarded: number,
    feedback: string | null,
    isTeacherMarked: boolean = true
  ): Answer | null {
    const idx = this.data.answers.findIndex((a) => a.id === answerId);
    if (idx === -1) return null;
    this.data.answers[idx].marksAwarded = marksAwarded;
    this.data.answers[idx].feedback = feedback;
    this.data.answers[idx].isTeacherMarked = isTeacherMarked;
    this.persist();
    return this.data.answers[idx];
  }

  updateAnswer(answerId: string, updates: Partial<Answer>): Answer | null {
    const idx = this.data.answers.findIndex((a) => a.id === answerId);
    if (idx === -1) return null;
    this.data.answers[idx] = { ...this.data.answers[idx], ...updates };
    this.persist();
    return this.data.answers[idx];
  }

  // --- Activity Events (JEV) ---
  addActivityEvent(event: ActivityEvent): ActivityEvent {
    this.data.activityEvents.push(event);
    this.persist();
    return event;
  }

  getActivityEventsByAttemptId(attemptId: string): ActivityEvent[] {
    return this.data.activityEvents
      .filter((ev) => ev.attemptId === attemptId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // --- JEV Reviews ---
  getJEVReview(attemptId: string): JEVReview | undefined {
    return this.data.jevReviews.find((r) => r.attemptId === attemptId);
  }

  upsertJEVReview(review: JEVReview): JEVReview {
    const idx = this.data.jevReviews.findIndex((r) => r.attemptId === review.attemptId);
    if (idx !== -1) {
      this.data.jevReviews[idx] = review;
    } else {
      this.data.jevReviews.push(review);
    }
    this.persist();
    return review;
  }

  // --- JEV Cautions ---
  addCaution(caution: CautionNotice): CautionNotice {
    if (!this.data.cautions) this.data.cautions = [];
    this.data.cautions.push(caution);
    this.persist();
    return caution;
  }

  getCautionsByAttemptId(attemptId: string): CautionNotice[] {
    if (!this.data.cautions) return [];
    return this.data.cautions
      .filter((c) => c.attemptId === attemptId)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  getActiveCautionByAttemptId(attemptId: string): CautionNotice | undefined {
    if (!this.data.cautions) return undefined;
    const pending = this.data.cautions.filter((c) => c.attemptId === attemptId && !c.acknowledged);
    return pending[pending.length - 1];
  }

  acknowledgeCaution(cautionId: string): boolean {
    if (!this.data.cautions) return false;
    const c = this.data.cautions.find((item) => item.id === cautionId);
    if (c) {
      c.acknowledged = true;
      c.acknowledgedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }
}

export const db = new Database();
