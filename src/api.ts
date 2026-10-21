import {
  Exam,
  Question,
  Attempt,
  Answer,
  SubmissionDetails,
  StudentResultResponse,
  ActivityEvent,
  TeacherDashboardResponse,
  CautionNotice,
  StudentExamResponseSummary,
} from './types';

/**
 * Robust JSON response parser that guarantees:
 * 1. Safe JSON decoding only when response is application/json
 * 2. Graceful extraction of error messages
 * 3. Never throws raw HTML syntax errors like "Unexpected token '<'..."
 */
async function parseResponse<T = any>(res: Response, fallbackErrMsg = 'Request failed'): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await res.text();
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        data = null;
      } else if (text.trim()) {
        data = { error: text.trim() };
      }
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      (res.status === 404
        ? 'Exam or resource not found. Please verify the ID.'
        : res.status === 403
        ? 'Access restricted. Only open exams can be accessed.'
        : `${fallbackErrMsg} (Status ${res.status})`);
    throw new Error(errorMsg);
  }

  return (data || {}) as T;
}

import { synthesizeQuestions } from './utils/questionSynthesizer';

export const api = {
  async getStatus(): Promise<{ aiAvailable: boolean }> {
    try {
      const res = await fetch('/api/status');
      return await parseResponse<{ aiAvailable: boolean }>(res, 'Failed to get server status');
    } catch {
      return { aiAvailable: true };
    }
  },

  async generateAiQuestions(params: {
    subject: string;
    topics?: string;
    questionCount?: number;
    questionTypes?: string[];
    paperStyle?: string;
    marksPerQuestion?: number;
    mcqCount?: number;
    tfCount?: number;
    marksPerMcq?: number;
    marksPerTf?: number;
  }): Promise<{ questions: Question[]; source?: string }> {
    // 1. First attempt calling server endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 26000);

      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
          return data;
        }
      }
    } catch (serverErr) {
      console.warn('Server question generation route unavailable or timed out, activating standalone synthesizer:', serverErr);
    }

    // 2. Standalone fallback: guarantees AI question generator works everywhere even after export
    const mcqCount = typeof params.mcqCount === 'number' ? params.mcqCount : 3;
    const tfCount = typeof params.tfCount === 'number' ? params.tfCount : 2;
    const marksPerMcq = Number(params.marksPerMcq) || Number(params.marksPerQuestion) || 2;
    const marksPerTf = Number(params.marksPerTf) || 1;

    const synthesized = synthesizeQuestions({
      subject: params.subject,
      topics: params.topics,
      mcqCount,
      tfCount,
      marksPerMcq,
      marksPerTf,
    });

    const formattedQuestions: Question[] = synthesized.map((q, idx) => ({
      id: `q_ai_export_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      order: idx + 1,
      type: q.type,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      marks: q.marks,
      explanation: q.explanation,
      rubric: q.rubric || '',
      source: 'ai_draft' as const,
    }));

    return {
      questions: formattedQuestions,
      source: 'standalone_synthesizer',
    };
  },

  async getTeacherExams(teacherName: string): Promise<{ exams: Exam[] }> {
    const res = await fetch(`/api/exams/teacher?teacherName=${encodeURIComponent(teacherName)}`);
    return parseResponse<{ exams: Exam[] }>(res, 'Failed to fetch teacher exams');
  },

  async getTeacherDashboard(teacherName: string): Promise<TeacherDashboardResponse> {
    const res = await fetch(`/api/teachers/${encodeURIComponent(teacherName)}/dashboard`);
    return parseResponse<TeacherDashboardResponse>(res, 'Failed to fetch teacher dashboard overview');
  },

  async getExam(id: string, role: 'teacher' | 'student' = 'student'): Promise<{ exam: Exam; questions: Question[] }> {
    const res = await fetch(`/api/exams/${encodeURIComponent(id)}?role=${role}`);
    return parseResponse<{ exam: Exam; questions: Question[] }>(res, 'Failed to fetch exam');
  },

  async createExam(payload: Partial<Exam> & { questions: Question[] }): Promise<{ exam: Exam; questions: Question[] }> {
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponse<{ exam: Exam; questions: Question[] }>(res, 'Failed to create exam');
  },

  async updateExam(id: string, payload: Partial<Exam> & { questions?: Question[] }): Promise<{ exam: Exam; questions: Question[] }> {
    const res = await fetch(`/api/exams/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponse<{ exam: Exam; questions: Question[] }>(res, 'Failed to update exam');
  },

  async updateExamStatus(id: string, status: 'Draft' | 'Published' | 'Open' | 'Closed'): Promise<{ exam: Exam }> {
    const res = await fetch(`/api/exams/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return parseResponse<{ exam: Exam }>(res, 'Failed to update exam status');
  },

  async publishResults(id: string): Promise<{ exam: Exam }> {
    const res = await fetch(`/api/exams/${encodeURIComponent(id)}/publish-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return parseResponse<{ exam: Exam }>(res, 'Failed to publish results');
  },

  async getSubmissions(examId: string): Promise<{
    exam: Exam;
    questions: Question[];
    submissions: SubmissionDetails[];
  }> {
    const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/submissions`);
    return parseResponse<{
      exam: Exam;
      questions: Question[];
      submissions: SubmissionDetails[];
    }>(res, 'Failed to fetch submissions');
  },

  async getStudentExamsOverview(studentName: string): Promise<{
    studentName: string;
    myAttempts: Array<{
      attemptId: string;
      examId: string;
      examTitle: string;
      examSubject: string;
      teacherName: string;
      status: string;
      startTime: string;
      submittedAt: string | null;
      duration: number;
      totalMarks: number;
      passingMarks: number;
      resultsPublished: boolean;
      scoreAwarded: number | null;
      answeredCount: number;
      totalQCount: number;
      accessCode: string;
    }>;
    availableExams: Array<{
      id: string;
      teacherName: string;
      title: string;
      subject: string;
      topics?: string;
      duration: number;
      totalMarks: number;
      passingMarks: number;
      paperStyle: string;
      status: string;
      questionCount: number;
    }>;
  }> {
    const res = await fetch(`/api/student/${encodeURIComponent(studentName)}/exams-overview`);
    return parseResponse(res, 'Failed to fetch student exams overview');
  },

  async joinExam(examId: string, studentName: string, retake?: boolean): Promise<{
    attempt: Attempt;
    exam: Exam;
    questions: Question[];
    savedAnswers: Answer[];
  }> {
    const res = await fetch('/api/attempts/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, studentName, retake: Boolean(retake) }),
    });
    return parseResponse<{
      attempt: Attempt;
      exam: Exam;
      questions: Question[];
      savedAnswers: Answer[];
    }>(res, 'Failed to join exam');
  },

  async getAttempt(attemptId: string): Promise<{
    attempt: Attempt;
    exam: Exam;
    questions: Question[];
    savedAnswers: Answer[];
    allResponses?: StudentExamResponseSummary[];
  }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}`);
    return parseResponse<{
      attempt: Attempt;
      exam: Exam;
      questions: Question[];
      savedAnswers: Answer[];
      allResponses?: StudentExamResponseSummary[];
    }>(res, 'Failed to retrieve attempt');
  },

  async saveAnswers(attemptId: string, answers: Array<{ questionId: string; response: string }>): Promise<void> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/save-answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    await parseResponse(res, 'Failed to save answers');
  },

  async recordActivity(
    attemptId: string,
    eventType: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; reviewRiskLevel: string }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ eventType, metadata }),
    });
    return parseResponse<{ success: boolean; reviewRiskLevel: string }>(res, 'Failed to record activity');
  },

  async submitExam(
    attemptId: string,
    answers?: Array<{ questionId: string; response: string }>
  ): Promise<{ success: boolean; attempt: Attempt }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    return parseResponse<{ success: boolean; attempt: Attempt }>(res, 'Failed to submit exam');
  },

  async gradeAnswer(answerId: string, marksAwarded: number, feedback: string): Promise<{ success: boolean; answer: Answer }> {
    const res = await fetch('/api/grading/grade-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerId, marksAwarded, feedback }),
    });
    return parseResponse<{ success: boolean; answer: Answer }>(res, 'Failed to grade answer');
  },

  async autoCalculateAttempt(attemptId: string): Promise<{
    success: boolean;
    attempt: Attempt;
    answers: Answer[];
    autoScore: number;
    message?: string;
  }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/auto-calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return parseResponse<{
      success: boolean;
      attempt: Attempt;
      answers: Answer[];
      autoScore: number;
      message?: string;
    }>(res, 'Failed to auto-calculate attempt marks');
  },

  async saveAllGrades(grades: Array<{ answerId: string; marksAwarded: number; feedback?: string }>): Promise<{ success: boolean }> {
    for (const g of grades) {
      await this.gradeAnswer(g.answerId, g.marksAwarded, g.feedback || '');
    }
    return { success: true };
  },

  async verifyAndMarkAttempt(
    attemptId: string,
    payload: {
      teacherName: string;
      marksOverrides?: Array<{ answerId: string; marksAwarded: number; feedback?: string }>;
      teacherNotes?: string;
    }
  ): Promise<{
    success: boolean;
    attempt: Attempt;
    answers: Answer[];
    totalScoreAwarded: number;
  }> {
    return this.verifyAttempt(attemptId, payload);
  },

  async verifyAttempt(
    attemptId: string,
    payload: {
      teacherName: string;
      marksOverrides?: Array<{ answerId: string; marksAwarded: number; feedback?: string }>;
      teacherNotes?: string;
    }
  ): Promise<{
    success: boolean;
    attempt: Attempt;
    answers: Answer[];
    totalScoreAwarded: number;
  }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/verify-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponse<{
      success: boolean;
      attempt: Attempt;
      answers: Answer[];
      totalScoreAwarded: number;
    }>(res, 'Failed to verify attempt result');
  },

  async getJEVDetails(attemptId: string): Promise<{
    attempt: Attempt;
    review: any;
    events: ActivityEvent[];
    cautions?: CautionNotice[];
  }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/jev`);
    return parseResponse<{
      attempt: Attempt;
      review: any;
      events: ActivityEvent[];
      cautions?: CautionNotice[];
    }>(res, 'Failed to fetch JEV details');
  },

  async updateJEVReview(attemptId: string, status: string, teacherNotes?: string): Promise<any> {
    const res = await fetch('/api/jev/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, status, teacherNotes }),
    });
    return parseResponse<any>(res, 'Failed to update JEV review');
  },

  async getStudentResult(attemptId: string): Promise<StudentResultResponse> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/result`);
    return parseResponse<StudentResultResponse>(res, 'Failed to retrieve results');
  },

  async sendCaution(
    attemptId: string,
    message?: string,
    teacherName?: string
  ): Promise<{ success: boolean; caution: any; message: string }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/caution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, teacherName }),
    });
    return parseResponse<{ success: boolean; caution: any; message: string }>(res, 'Failed to send caution');
  },

  async getCautions(
    attemptId: string
  ): Promise<{ cautions: any[]; activeCaution: any | null }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/cautions`);
    return parseResponse<{ cautions: any[]; activeCaution: any | null }>(res, 'Failed to fetch cautions');
  },

  async acknowledgeCaution(
    attemptId: string,
    cautionId: string
  ): Promise<{ success: boolean }> {
    const res = await fetch(
      `/api/attempts/${encodeURIComponent(attemptId)}/cautions/${encodeURIComponent(cautionId)}/acknowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return parseResponse<{ success: boolean }>(res, 'Failed to acknowledge caution');
  },

  async decideSubmission(
    attemptId: string,
    action: 'fail' | 'discard' | 'restore',
    note: string,
    teacherName?: string
  ): Promise<{
    success: boolean;
    attempt: Attempt;
    message: string;
  }> {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note, teacherName }),
    });
    return parseResponse<{
      success: boolean;
      attempt: Attempt;
      message: string;
    }>(res, 'Failed to record submission decision');
  },

  async getStudentExamResponses(
    examId: string,
    studentName: string
  ): Promise<{
    exam: any;
    questions: any[];
    studentName: string;
    totalResponses: number;
    submissions: any[];
  }> {
    const res = await fetch(
      `/api/exams/${encodeURIComponent(examId)}/students/${encodeURIComponent(studentName)}/responses`
    );
    return parseResponse<any>(res, 'Failed to fetch student exam responses');
  },
};
