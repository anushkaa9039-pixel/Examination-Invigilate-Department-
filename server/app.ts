import 'dotenv/config';
import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { db, Exam, Question, Attempt, Answer, ActivityEvent, CautionNotice } from './db.js';
import { analyzeAttemptActivity } from './jev.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Durable storage for serverless deployments (e.g. Vercel): load fresh state before each API call
// and make sure any changes are saved before the response is sent.
app.use('/api', async (req: Request, res: Response, next) => {
  await db.load();
  const originalEnd = res.end.bind(res) as any;
  (res as any).end = (...args: any[]) => {
    db.flush().finally(() => originalEnd(...args));
    return res;
  };
  next();
});

// Helper to generate IDs
function generateExamId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `EID-${num}`;
}

function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

import { synthesizeQuestions } from './questionSynthesizer.js';

// Check AI status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    aiAvailable: true,
    timestamp: new Date().toISOString(),
  });
});

// AI Question Generation Endpoint
app.post('/api/ai/generate-questions', async (req: Request, res: Response) => {
  const {
    subject,
    topics = '',
    questionCount,
    questionTypes,
    paperStyle = 'Standard',
    marksPerQuestion = 2,
    mcqCount: reqMcqCount,
    tfCount: reqTfCount,
    marksPerMcq: reqMarksPerMcq,
    marksPerTf: reqMarksPerTf,
  } = req.body;

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'Subject is required for question generation.' });
  }

  // Determine target counts for MCQ and True/False questions
  let mcqCount = typeof reqMcqCount === 'number' ? Math.max(0, reqMcqCount) : 0;
  let tfCount = typeof reqTfCount === 'number' ? Math.max(0, reqTfCount) : 0;

  if (mcqCount === 0 && tfCount === 0) {
    // If not specified via mcqCount/tfCount, derive from questionCount or questionTypes
    const total = Number(questionCount) || 5;
    const types = Array.isArray(questionTypes) ? questionTypes : ['multiple_choice'];
    if (types.includes('true_false') && types.includes('multiple_choice')) {
      mcqCount = Math.max(1, Math.ceil(total * 0.6));
      tfCount = Math.max(1, total - mcqCount);
    } else if (types.includes('true_false')) {
      tfCount = total;
    } else {
      mcqCount = total;
    }
  }

  const marksPerMcq = Number(reqMarksPerMcq) || Number(marksPerQuestion) || 2;
  const marksPerTf = Number(reqMarksPerTf) || 1;
  const totalTargetQuestions = mcqCount + tfCount;

  // Determine API Key from environment (supports GEMINI_API_KEY, GOOGLE_API_KEY, VITE_GEMINI_API_KEY, API_KEY)
  const resolvedApiKey =
    (process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.VITE_GOOGLE_API_KEY ||
      process.env.API_KEY ||
      '').trim();

  const hasKey = Boolean(
    resolvedApiKey &&
      resolvedApiKey !== '' &&
      resolvedApiKey !== 'MY_GEMINI_API_KEY' &&
      resolvedApiKey !== 'your_gemini_api_key_here'
  );

  if (hasKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: resolvedApiKey,
      });

      const prompt = `You are an academic exam creator for EID (Examination Invigilation Department).
Generate high-quality, academically rigorous exam questions for:
Subject: ${subject}
Topics: ${topics || 'General academic curriculum in this subject'}
Paper Style: ${paperStyle}

Requirements:
1. Generate EXACTLY ${mcqCount} Multiple Choice Questions. Each MCQ must have 4 options and assigned ${marksPerMcq} marks.
2. Generate EXACTLY ${tfCount} True/False Questions. Each True/False must have options ["True", "False"], correctAnswer of "True" or "False", and assigned ${marksPerTf} marks.
Total questions to produce: ${totalTargetQuestions}.

Ensure the questions are rigorous, factually accurate, and unambiguous.`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let apiResponse: any = null;

      const callWithTimeout = (promise: Promise<any>, ms = 25000) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Model timeout')), ms)),
        ]);

      for (const modelName of candidateModels) {
        try {
          const res: any = await callWithTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  description: 'List of generated exam questions',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: 'Either multiple_choice or true_false',
                      },
                      text: {
                        type: Type.STRING,
                        description: 'The question text',
                      },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Options array',
                      },
                      correctAnswer: {
                        type: Type.STRING,
                        description: 'The exact answer text',
                      },
                      marks: {
                        type: Type.NUMBER,
                        description: 'Marks assigned',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: 'Brief explanation',
                      },
                      rubric: {
                        type: Type.STRING,
                        description: 'Grading rubric',
                      },
                    },
                    required: ['type', 'text', 'correctAnswer', 'marks'],
                  },
                },
              },
            }),
            25000
          );
          if (res?.text) {
            apiResponse = res;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Model ${modelName} returned error:`, modelErr?.message || modelErr);
        }
      }

      if (apiResponse && apiResponse.text) {
        const parsed = JSON.parse(apiResponse.text.trim() || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formattedQuestions = parsed.map((q: any, idx: number) => {
            let qType: 'multiple_choice' | 'true_false' = q.type === 'true_false' ? 'true_false' : 'multiple_choice';
            const assignedMarks =
              qType === 'multiple_choice'
                ? marksPerMcq
                : marksPerTf;

            return {
              id: `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              order: idx + 1,
              type: qType,
              text: q.text || `Question ${idx + 1}`,
              options:
                qType === 'true_false'
                  ? ['True', 'False']
                  : Array.isArray(q.options) && q.options.length >= 2
                  ? q.options
                  : ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: q.correctAnswer || (qType === 'true_false' ? 'True' : ''),
              marks: Number(q.marks) || assignedMarks,
              explanation: q.explanation || '',
              rubric: q.rubric || '',
              source: 'ai_draft' as const,
            };
          });

          return res.json({
            questions: formattedQuestions,
            source: 'gemini',
          });
        }
      }
    } catch (err: any) {
      console.warn('Gemini generation caught error, falling back to synthesizer:', err?.message || err);
    }
  }

  // Graceful fallback to verified curriculum synthesizer so AI generation NEVER fails
  const synthesized = synthesizeQuestions({
    subject: subject.trim(),
    topics: topics.trim(),
    mcqCount,
    tfCount,
    marksPerMcq,
    marksPerTf,
  });

  const formattedQuestions = synthesized.map((q, idx) => ({
    id: `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
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

  return res.json({
    questions: formattedQuestions,
    source: 'synthesizer',
  });
});

// Teacher: Get exams created by teacher (or all exams if teacherName is empty or __all__)
app.get('/api/exams/teacher', (req: Request, res: Response) => {
  const teacherName = (req.query.teacherName as string) || '';
  const isAll = !teacherName || teacherName === '__all__' || teacherName.toLowerCase() === 'all';
  const exams = isAll ? db.getExams() : db.getExams(teacherName);
  // Augment with count of questions and submissions
  const enriched = exams.map((exam) => {
    const questions = db.getQuestionsByExamId(exam.id);
    const attempts = db.getAttemptsByExamId(exam.id);
    return {
      ...exam,
      questionCount: questions.length,
      submissionCount: attempts.filter((a) => a.status === 'Submitted' || a.status === 'Graded').length,
      activeCount: attempts.filter((a) => a.status === 'Active').length,
    };
  });
  res.json({ exams: enriched });
});

// Teacher Dashboard: Integrated overview of student results, attempts & JEV invigilation telemetry
app.get('/api/teachers/:teacherName/dashboard', (req: Request, res: Response) => {
  const { teacherName } = req.params;
  const decoded = decodeURIComponent(teacherName || '').trim();
  const isAll = !decoded || decoded === '__all__' || decoded.toLowerCase() === 'all';
  const exams = isAll ? db.getExams() : db.getExams(decoded);

  const allSubmissions: any[] = [];
  let totalActive = 0;
  let totalSubmitted = 0;
  let totalFailed = 0;
  let totalDiscarded = 0;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;

  for (const exam of exams) {
    const questions = db.getQuestionsByExamId(exam.id);
    const attempts = db.getAttemptsByExamId(exam.id);

    for (const attempt of attempts) {
      if (attempt.status === 'Active') {
        totalActive++;
      } else if (attempt.status === 'Failed' || attempt.decisionStatus === 'Failed') {
        totalFailed++;
      } else if (attempt.status === 'Discarded' || attempt.decisionStatus === 'Discarded') {
        totalDiscarded++;
      } else {
        totalSubmitted++;
      }

      const answers = db.getAnswersByAttemptId(attempt.id);
      const review = analyzeAttemptActivity(attempt.id);
      const events = db.getActivityEventsByAttemptId(attempt.id);

      let normalizedRisk: 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';
      if (review.riskLevel === 'High Risk') {
        normalizedRisk = 'High Risk';
        highRiskCount++;
      } else if (review.riskLevel === 'Medium Risk' || review.riskLevel === 'Review Required') {
        normalizedRisk = 'Medium Risk';
        mediumRiskCount++;
      } else {
        normalizedRisk = 'Low Risk';
        lowRiskCount++;
      }
      review.riskLevel = normalizedRisk;

      const cautions = db.getCautionsByAttemptId(attempt.id);
      const latestCaution = cautions[cautions.length - 1] || null;

      const autoScore = answers.reduce((sum, a) => sum + (a.autoMarksAwarded || 0), 0);
      let totalScore = 0;
      let gradedCount = 0;
      answers.forEach((ans) => {
        if (ans.marksAwarded !== null) {
          totalScore += ans.marksAwarded;
          gradedCount++;
        } else if (ans.autoMarksAwarded !== null && ans.autoMarksAwarded !== undefined) {
          totalScore += ans.autoMarksAwarded;
        }
      });

      let tabSwitches = 0;
      let copyAttempts = 0;
      let fullscreenExits = 0;
      let contextMenuAttempts = 0;
      let totalAwaySeconds = 0;
      let lastBlur: number | null = null;

      for (const ev of events) {
        if (ev.eventType === 'window_blur' || ev.eventType === 'tab_hidden') {
          tabSwitches++;
          lastBlur = new Date(ev.timestamp).getTime();
        } else if (ev.eventType === 'window_focus' || ev.eventType === 'tab_visible') {
          if (lastBlur) {
            const diff = new Date(ev.timestamp).getTime() - lastBlur;
            if (diff > 0 && diff < 3600000) totalAwaySeconds += Math.round(diff / 1000);
            lastBlur = null;
          }
        } else if (ev.eventType === 'copy_attempt' || ev.eventType === 'paste_attempt') {
          copyAttempts++;
        } else if (ev.eventType === 'fullscreen_exit') {
          fullscreenExits++;
        } else if (ev.eventType === 'context_menu') {
          contextMenuAttempts++;
        }
      }

      const isFailedOrDiscarded =
        attempt.status === 'Failed' ||
        attempt.status === 'Discarded' ||
        attempt.decisionStatus === 'Failed' ||
        attempt.decisionStatus === 'Discarded';
      const isPassed = !isFailedOrDiscarded && totalScore >= exam.passingMarks;

      allSubmissions.push({
        attempt,
        examId: exam.id,
        examTitle: exam.title,
        examSubject: exam.subject,
        examTotalMarks: exam.totalMarks,
        examPassingMarks: exam.passingMarks,
        resultsPublished: exam.resultsPublished,
        answersCount: answers.filter((a) => a.response && a.response.trim() !== '').length,
        totalQuestions: questions.length,
        totalScore,
        autoScore,
        isPassed,
        isVerified: attempt.verificationStatus === 'Teacher-Verified',
        allGraded: questions.length > 0 && gradedCount === questions.length,
        review,
        cautions,
        latestCaution,
        activityMetrics: {
          eventsCount: events.length,
          tabSwitches,
          copyAttempts,
          fullscreenExits,
          contextMenuAttempts,
          totalAwaySeconds,
          latestEvent: events[events.length - 1] || null,
        },
      });
    }
  }

  // Calculate attempt numbers and total responses per student per exam
  const groupedByStudentExam: Record<string, any[]> = {};
  for (const sub of allSubmissions) {
    const key = `${sub.examId.toLowerCase()}___${sub.attempt.studentName.trim().toLowerCase()}`;
    if (!groupedByStudentExam[key]) {
      groupedByStudentExam[key] = [];
    }
    groupedByStudentExam[key].push(sub);
  }

  for (const key of Object.keys(groupedByStudentExam)) {
    const list = groupedByStudentExam[key];
    list.sort((a, b) => new Date(a.attempt.startTime).getTime() - new Date(b.attempt.startTime).getTime());
    const total = list.length;
    list.forEach((sub, idx) => {
      sub.attemptNumber = sub.attempt.attemptNumber || idx + 1;
      sub.totalAttemptsForStudent = total;
      sub.isLatestForStudent = idx === total - 1;
    });
  }

  // Sort submissions: newest activity or start time first
  allSubmissions.sort(
    (a, b) => new Date(b.attempt.lastActivity).getTime() - new Date(a.attempt.lastActivity).getTime()
  );

  res.json({
    teacherName: isAll ? 'All Teachers' : decoded,
    examsCount: exams.length,
    stats: {
      totalExams: exams.length,
      totalStudents: allSubmissions.length,
      activeNow: totalActive,
      submitted: totalSubmitted,
      failedCount: totalFailed,
      discardedCount: totalDiscarded,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      reviewRequiredCount: mediumRiskCount,
      normalCount: lowRiskCount,
    },
    submissions: allSubmissions,
  });
});

// Get single exam details
app.get('/api/exams/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const role = req.query.role as string; // 'teacher' or 'student'
  const exam = db.getExamById(id);

  if (!exam) {
    return res.status(404).json({ error: `Exam with ID "${id}" was not found.` });
  }

  const rawQuestions = db.getQuestionsByExamId(exam.id);

  // If student requests, strictly do not expose server-held answer key or rubric
  if (role === 'student') {
    const sanitizedQuestions = rawQuestions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      options: q.options,
      marks: q.marks,
      source: q.source,
    }));
    return res.json({ exam, questions: sanitizedQuestions });
  }

  // Teacher gets full question details including answer key
  res.json({ exam, questions: rawQuestions });
});

// Teacher: Create exam with questions
app.post('/api/exams', (req: Request, res: Response) => {
  const {
    teacherName,
    title,
    subject,
    topics = '',
    instructions = '',
    duration = 60,
    passingMarks = 40,
    paperStyle = 'Standard',
    status = 'Draft',
    questions = [],
  } = req.body;

  if (!teacherName || !title || !subject) {
    return res.status(400).json({ error: 'Teacher name, title, and subject are required.' });
  }

  const examId = generateExamId();
  const calculatedTotalMarks = (questions as any[]).reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  );

  const exam: Exam = {
    id: examId,
    teacherName: teacherName.trim(),
    title: title.trim(),
    subject: subject.trim(),
    topics: topics.trim(),
    instructions: instructions.trim(),
    duration: Number(duration) || 60,
    totalMarks: calculatedTotalMarks || Number(req.body.totalMarks) || 100,
    passingMarks: Number(passingMarks) || 40,
    paperStyle,
    status: status === 'Published' || status === 'Open' ? status : 'Draft',
    createdAt: new Date().toISOString(),
    publishedAt: status === 'Published' || status === 'Open' ? new Date().toISOString() : null,
    resultsPublished: false,
    resultsPublishedAt: null,
  };

  const formattedQuestions: Question[] = (questions as any[]).map((q, idx) => ({
    id: q.id || `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    examId,
    order: idx + 1,
    type: q.type || 'multiple_choice',
    text: q.text || '',
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer || '',
    marks: Number(q.marks) || 1,
    explanation: q.explanation || '',
    rubric: q.rubric || '',
    source: q.source === 'ai_draft' ? 'ai_draft' : 'manual',
  }));

  const created = db.createExam(exam, formattedQuestions);
  res.status(201).json(created);
});

// Teacher: Update exam details and questions
app.put('/api/exams/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.getExamById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const {
    title,
    subject,
    topics,
    instructions,
    duration,
    passingMarks,
    paperStyle,
    status,
    questions,
  } = req.body;

  let calculatedTotalMarks = existing.totalMarks;
  if (Array.isArray(questions)) {
    calculatedTotalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  }

  const updates: Partial<Exam> = {};
  if (title !== undefined) updates.title = title.trim();
  if (subject !== undefined) updates.subject = subject.trim();
  if (topics !== undefined) updates.topics = topics.trim();
  if (instructions !== undefined) updates.instructions = instructions.trim();
  if (duration !== undefined) updates.duration = Number(duration);
  if (passingMarks !== undefined) updates.passingMarks = Number(passingMarks);
  if (paperStyle !== undefined) updates.paperStyle = paperStyle;
  if (status !== undefined) {
    updates.status = status;
    if ((status === 'Published' || status === 'Open') && !existing.publishedAt) {
      updates.publishedAt = new Date().toISOString();
    }
  }
  updates.totalMarks = calculatedTotalMarks;

  const updatedExam = db.updateExam(id, updates);

  if (Array.isArray(questions)) {
    const formattedQuestions: Question[] = questions.map((q, idx) => ({
      id: q.id || `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      examId: id,
      order: idx + 1,
      type: q.type || 'multiple_choice',
      text: q.text || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer || '',
      marks: Number(q.marks) || 1,
      explanation: q.explanation || '',
      rubric: q.rubric || '',
      source: q.source === 'ai_draft' ? 'ai_draft' : 'manual',
    }));
    db.replaceExamQuestions(id, formattedQuestions);
  }

  const updatedQuestions = db.getQuestionsByExamId(id);
  res.json({ exam: updatedExam, questions: updatedQuestions });
});

// Teacher: Toggle status ('Open', 'Closed', 'Published', 'Draft')
app.patch('/api/exams/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Draft', 'Published', 'Open', 'Closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid exam status.' });
  }

  const existing = db.getExamById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const updates: Partial<Exam> = { status };
  if ((status === 'Published' || status === 'Open') && !existing.publishedAt) {
    updates.publishedAt = new Date().toISOString();
  }

  const updated = db.updateExam(id, updates);
  res.json({ exam: updated });
});

// Teacher: Publish results for an exam
app.post('/api/exams/:id/publish-results', (req: Request, res: Response) => {
  const { id } = req.params;
  const exam = db.getExamById(id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const attempts = db.getAttemptsByExamId(id);
  for (const att of attempts) {
    const answers = db.getAnswersByAttemptId(att.id);
    let totalScore = 0;
    answers.forEach((ans) => {
      const awarded = (ans.marksAwarded !== null && ans.marksAwarded !== undefined)
        ? ans.marksAwarded
        : (ans.autoMarksAwarded !== null && ans.autoMarksAwarded !== undefined)
        ? ans.autoMarksAwarded
        : 0;
      totalScore += awarded;
    });

    db.updateAttempt(att.id, {
      totalScoreAwarded: totalScore,
    });
  }

  const updated = db.updateExam(id, {
    resultsPublished: true,
    resultsPublishedAt: new Date().toISOString(),
  });

  res.json({ exam: updated });
});

// Teacher: Get all student submissions, grading, and JEV for an exam
app.get('/api/exams/:id/submissions', (req: Request, res: Response) => {
  const { id } = req.params;
  const exam = db.getExamById(id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const questions = db.getQuestionsByExamId(id);
  const attempts = db.getAttemptsByExamId(id);

  const enrichedSubmissions = attempts.map((attempt) => {
    const answers = db.getAnswersByAttemptId(attempt.id);
    const review = analyzeAttemptActivity(attempt.id);
    const events = db.getActivityEventsByAttemptId(attempt.id);

    // Calculate score awarded
    const autoScore = answers.reduce((sum, a) => sum + (a.autoMarksAwarded || 0), 0);
    let totalScore = 0;
    let gradedCount = 0;
    answers.forEach((ans) => {
      if (ans.marksAwarded !== null) {
        totalScore += ans.marksAwarded;
        gradedCount++;
      } else if (ans.autoMarksAwarded !== null && ans.autoMarksAwarded !== undefined) {
        totalScore += ans.autoMarksAwarded;
      }
    });

    const cautions = db.getCautionsByAttemptId(attempt.id);
    const latestCaution = cautions[cautions.length - 1] || null;

    let normalizedRisk: 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';
    if (review.riskLevel === 'High Risk') {
      normalizedRisk = 'High Risk';
    } else if (review.riskLevel === 'Medium Risk' || review.riskLevel === 'Review Required') {
      normalizedRisk = 'Medium Risk';
    } else {
      normalizedRisk = 'Low Risk';
    }
    review.riskLevel = normalizedRisk;

    const isFailedOrDiscarded =
      attempt.status === 'Failed' ||
      attempt.status === 'Discarded' ||
      attempt.decisionStatus === 'Failed' ||
      attempt.decisionStatus === 'Discarded';
    const isPassed = !isFailedOrDiscarded && totalScore >= exam.passingMarks;

    return {
      attempt,
      answers,
      review,
      cautions,
      latestCaution,
      eventsCount: events.length,
      totalScore,
      autoTotalScore: autoScore,
      isPassed,
      isVerified: attempt.verificationStatus === 'Teacher-Verified',
      allGraded: answers.length > 0 && gradedCount === questions.length,
    };
  });

  // Group submissions by student name to compute attemptNumber, totalAttemptsForStudent, isLatestForStudent
  const groupedByStudent: Record<string, any[]> = {};
  for (const sub of enrichedSubmissions) {
    const sName = (sub.attempt.studentName || '').trim().toLowerCase();
    if (!groupedByStudent[sName]) {
      groupedByStudent[sName] = [];
    }
    groupedByStudent[sName].push(sub);
  }

  for (const sName of Object.keys(groupedByStudent)) {
    const list = groupedByStudent[sName];
    list.sort((a, b) => new Date(a.attempt.startTime).getTime() - new Date(b.attempt.startTime).getTime());
    const total = list.length;
    list.forEach((sub, idx) => {
      sub.attemptNumber = sub.attempt.attemptNumber || idx + 1;
      sub.totalAttemptsForStudent = total;
      sub.isLatestForStudent = idx === total - 1;
    });
  }

  // Sort submissions: newest activity or start time first
  enrichedSubmissions.sort(
    (a, b) => new Date(b.attempt.lastActivity || b.attempt.startTime).getTime() - new Date(a.attempt.lastActivity || a.attempt.startTime).getTime()
  );

  res.json({
    exam,
    questions,
    submissions: enrichedSubmissions,
  });
});

// Teacher / Student: Get all responses submitted by a student for a specific exam
app.get('/api/exams/:examId/students/:studentName/responses', (req: Request, res: Response) => {
  const { examId, studentName } = req.params;
  const cleanExamId = (examId || '').trim().toUpperCase();
  const cleanStudentName = decodeURIComponent(studentName || '').trim();

  const exam = db.getExamById(cleanExamId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const attempts = db.getAttemptsByStudentAndExam(cleanExamId, cleanStudentName);
  attempts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const questions = db.getQuestionsByExamId(cleanExamId);

  const total = attempts.length;
  const submissions = attempts.map((attempt, idx) => {
    const answers = db.getAnswersByAttemptId(attempt.id);
    const review = analyzeAttemptActivity(attempt.id);
    const cautions = db.getCautionsByAttemptId(attempt.id);

    let totalScore = 0;
    answers.forEach((ans) => {
      if (ans.marksAwarded !== null) {
        totalScore += ans.marksAwarded;
      } else if (ans.autoMarksAwarded !== null && ans.autoMarksAwarded !== undefined) {
        totalScore += ans.autoMarksAwarded;
      }
    });

    const isFailedOrDiscarded =
      attempt.status === 'Failed' ||
      attempt.status === 'Discarded' ||
      attempt.decisionStatus === 'Failed' ||
      attempt.decisionStatus === 'Discarded';
    const isPassed = !isFailedOrDiscarded && totalScore >= exam.passingMarks;

    return {
      attempt,
      answers,
      review,
      cautions,
      totalScore: isFailedOrDiscarded ? 0 : totalScore,
      isPassed,
      attemptNumber: attempt.attemptNumber || idx + 1,
      totalAttemptsForStudent: total,
      isLatestForStudent: idx === total - 1,
      examId: exam.id,
      examTitle: exam.title,
      examSubject: exam.subject,
      examTotalMarks: exam.totalMarks,
      examPassingMarks: exam.passingMarks,
    };
  });

  res.json({
    exam,
    questions,
    studentName: cleanStudentName,
    totalResponses: total,
    submissions,
  });
});

// Student: Get overview of all exams (my enrolled/submitted attempts + available exams to give)
app.get('/api/student/:studentName/exams-overview', (req: Request, res: Response) => {
  const { studentName } = req.params;
  const cleanStudentName = decodeURIComponent(studentName || '').trim();

  // All open or published exams that can be taken
  const allExams = db.getExams();
  const availableExams = allExams
    .filter((e) => e.status === 'Open' || e.status === 'Published')
    .map((e) => {
      const qCount = db.getQuestionsByExamId(e.id).length;
      return {
        id: e.id,
        teacherName: e.teacherName,
        title: e.title,
        subject: e.subject,
        topics: e.topics,
        duration: e.duration,
        totalMarks: e.totalMarks,
        passingMarks: e.passingMarks,
        paperStyle: e.paperStyle,
        status: e.status,
        questionCount: qCount,
      };
    });

  // Student's existing attempts across all exams
  const studentAttempts = db.getAttemptsByStudentName(cleanStudentName);

  // Group by exam to calculate total attempts and chronological attempt numbers
  const attemptsByExam: Record<string, Attempt[]> = {};
  studentAttempts.forEach((att) => {
    if (!attemptsByExam[att.examId]) {
      attemptsByExam[att.examId] = [];
    }
    attemptsByExam[att.examId].push(att);
  });

  // Sort each exam's attempts chronologically (oldest first) to assign attemptNumber 1, 2, ...
  Object.keys(attemptsByExam).forEach((eid) => {
    attemptsByExam[eid].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  const latestSeenPerExam = new Set<string>();

  const myAttempts = studentAttempts.map((att) => {
    const exam = db.getExamById(att.examId);
    const answers = db.getAnswersByAttemptId(att.id);
    const answeredCount = answers.filter((a) => a.response && a.response.trim() !== '').length;
    const totalQCount = exam ? db.getQuestionsByExamId(exam.id).length : 0;

    const examAttempts = attemptsByExam[att.examId] || [att];
    const totalForExam = examAttempts.length;
    const chronIndex = examAttempts.findIndex((a) => a.id === att.id);
    const attemptNumber = att.attemptNumber || (chronIndex !== -1 ? chronIndex + 1 : 1);
    const isLatest = !latestSeenPerExam.has(att.examId);
    latestSeenPerExam.add(att.examId);

    return {
      attemptId: att.id,
      examId: att.examId,
      examTitle: exam?.title || att.examId,
      examSubject: exam?.subject || 'Assessment',
      teacherName: exam?.teacherName || 'Instructor',
      status: att.status,
      startTime: att.startTime,
      submittedAt: att.submittedAt,
      duration: exam?.duration || 60,
      totalMarks: exam?.totalMarks || 0,
      passingMarks: exam?.passingMarks || 0,
      resultsPublished: Boolean(exam?.resultsPublished),
      scoreAwarded: exam?.resultsPublished ? att.totalScoreAwarded : null,
      answeredCount,
      totalQCount,
      accessCode: att.accessCode,
      attemptNumber,
      totalForExam,
      isLatest,
      examStatus: exam?.status || 'Open',
    };
  });

  res.json({
    studentName: cleanStudentName,
    myAttempts,
    availableExams,
  });
});

// Student: Join, reconnect, or view exam
app.post('/api/attempts/join', (req: Request, res: Response) => {
  const { examId, studentName, retake, attemptId } = req.body;

  if (!examId || !studentName) {
    return res.status(400).json({ error: 'Both Exam ID and Student Name are required.' });
  }

  const cleanExamId = examId.trim().toUpperCase();
  const exam = db.getExamById(cleanExamId);

  if (!exam) {
    return res.status(404).json({ error: `Exam "${cleanExamId}" does not exist. Please check the Exam ID.` });
  }

  const cleanStudentName = studentName.trim();
  const existingAttempts = db.getAttemptsByStudentAndExam(cleanExamId, cleanStudentName);

  // If exam is closed, allow viewing already submitted/existing attempts, but block starting brand new attempts
  if (exam.status !== 'Open' && exam.status !== 'Published') {
    if (existingAttempts.length === 0 || retake) {
      return res.status(400).json({
        error: exam.status === 'Closed'
          ? `Exam "${cleanExamId}" is currently closed. Please ask your teacher to open the exam.`
          : `Exam "${cleanExamId}" has not been opened yet (Status: ${exam.status}). Contact your teacher.`,
        examStatus: exam.status,
      });
    }
  }

  let attempt: Attempt | undefined;

  // 1. Direct attemptId specified (viewing a specific response)
  if (attemptId) {
    attempt = db.getAttemptById(attemptId);
  }

  // 2. Retake requested: create a fresh, separate attempt (PRESERVE all previous responses)
  if (retake) {
    const nextAttemptNumber = existingAttempts.length + 1;
    attempt = db.createAttempt({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      examId: exam.id,
      studentName: cleanStudentName,
      accessCode: generateAccessCode(),
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'Active',
      submittedAt: null,
      totalScoreAwarded: null,
      attemptNumber: nextAttemptNumber,
    });

    db.addActivityEvent({
      id: `ev_${Date.now()}_retake`,
      attemptId: attempt.id,
      eventType: 'exam_retake_started',
      timestamp: new Date().toISOString(),
      metadata: { studentName: cleanStudentName, attemptNumber: nextAttemptNumber },
    });
  } else if (!attempt) {
    // 3. Normal join: reconnect to active attempt if one exists
    attempt = db.findActiveAttemptByStudent(cleanExamId, cleanStudentName);

    // 4. If no active attempt, but has past submitted attempts, view the latest submitted attempt
    if (!attempt && existingAttempts.length > 0) {
      attempt = existingAttempts[existingAttempts.length - 1];
    }

    // 5. If no attempt exists at all, create Attempt #1
    if (!attempt) {
      attempt = db.createAttempt({
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        examId: exam.id,
        studentName: cleanStudentName,
        accessCode: generateAccessCode(),
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        status: 'Active',
        submittedAt: null,
        totalScoreAwarded: null,
        attemptNumber: 1,
      });

      // Record initial start event
      db.addActivityEvent({
        id: `ev_${Date.now()}_start`,
        attemptId: attempt.id,
        eventType: 'exam_started',
        timestamp: new Date().toISOString(),
        metadata: { studentName: cleanStudentName },
      });
    }
  }

  const rawQuestions = db.getQuestionsByExamId(exam.id);
  // Sanitize questions for student
  const sanitizedQuestions = rawQuestions.map((q) => ({
    id: q.id,
    order: q.order,
    type: q.type,
    text: q.text,
    options: q.options,
    marks: q.marks,
    source: q.source,
  }));

  const savedAnswers = db.getAnswersByAttemptId(attempt.id);

  res.json({
    attempt,
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      instructions: exam.instructions,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      paperStyle: exam.paperStyle,
      status: exam.status,
      resultsPublished: exam.resultsPublished,
    },
    questions: sanitizedQuestions,
    savedAnswers,
  });
});

// Student: Get attempt state (refresh support)
app.get('/api/attempts/:attemptId', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const attempt = db.getAttemptById(attemptId);

  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const exam = db.getExamById(attempt.examId);
  if (!exam) {
    return res.status(404).json({ error: 'Associated exam not found.' });
  }

  const rawQuestions = db.getQuestionsByExamId(exam.id);
  const sanitizedQuestions = rawQuestions.map((q) => ({
    id: q.id,
    order: q.order,
    type: q.type,
    text: q.text,
    options: q.options,
    marks: q.marks,
    source: q.source,
  }));

  const savedAnswers = db.getAnswersByAttemptId(attempt.id);
  const cautions = db.getCautionsByAttemptId(attempt.id);
  const activeCaution = db.getActiveCautionByAttemptId(attempt.id) || null;
  const review = analyzeAttemptActivity(attempt.id);

  const isApproved = Boolean(exam.resultsPublished);

  // Fetch all responses for this student and exam to show all responses
  const studentAttempts = db.getAttemptsByStudentAndExam(exam.id, attempt.studentName);
  studentAttempts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const allResponses = studentAttempts.map((att, idx) => ({
    attemptId: att.id,
    attemptNumber: att.attemptNumber || idx + 1,
    totalAttempts: studentAttempts.length,
    status: att.status,
    decisionStatus: att.decisionStatus || null,
    startTime: att.startTime,
    submittedAt: att.submittedAt,
    scoreAwarded: isApproved ? att.totalScoreAwarded : null,
    isCurrent: att.id === attempt.id,
  }));

  const sanitizedAttempt = {
    ...attempt,
    totalScoreAwarded: isApproved ? attempt.totalScoreAwarded : null,
  };

  const sanitizedSavedAnswers = isApproved
    ? savedAnswers
    : savedAnswers.map((ans) => ({
        ...ans,
        marksAwarded: null,
        feedback: null,
        autoMarksAwarded: undefined,
        autoFeedback: undefined,
      }));

  res.json({
    attempt: sanitizedAttempt,
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      instructions: exam.instructions,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      paperStyle: exam.paperStyle,
      status: exam.status,
      resultsPublished: exam.resultsPublished,
    },
    questions: sanitizedQuestions,
    savedAnswers: sanitizedSavedAnswers,
    cautions,
    activeCaution,
    review,
    allResponses,
  });
});

// --- Auto Result Calculation Engine ---
export function autoCalculateMarksForAnswer(
  q: any,
  studentResponse: string
): { autoMarks: number; autoFeedback: string } {
  const resp = (studentResponse || '').trim();
  if (!resp) {
    return { autoMarks: 0, autoFeedback: 'No response submitted (0 marks)' };
  }

  const qType = q.type;
  const correct = (q.correctAnswer || '').trim();

  if (qType === 'multiple_choice' || qType === 'true_false') {
    if (correct && resp.toLowerCase() === correct.toLowerCase()) {
      return { autoMarks: q.marks, autoFeedback: 'Correct (Objective key matched)' };
    } else {
      return { autoMarks: 0, autoFeedback: `Incorrect choice (Model key: ${correct || 'N/A'})` };
    }
  }

  if (qType === 'short_answer') {
    if (correct && resp.toLowerCase() === correct.toLowerCase()) {
      return { autoMarks: q.marks, autoFeedback: 'Exact model match (Full credit)' };
    }
    if (correct) {
      const keywords = correct
        .toLowerCase()
        .split(/[\s,;.]+/)
        .filter((w: string) => w.length > 3);
      if (keywords.length > 0) {
        const matched = keywords.filter((kw: string) => resp.toLowerCase().includes(kw));
        const matchRatio = matched.length / keywords.length;
        if (matchRatio >= 0.7) {
          return {
            autoMarks: q.marks,
            autoFeedback: `Strong keyword alignment (${Math.round(matchRatio * 100)}% match)`,
          };
        } else if (matchRatio >= 0.3) {
          const partial = Math.round((q.marks * 0.5) * 2) / 2;
          return {
            autoMarks: partial,
            autoFeedback: `Partial keyword alignment (${Math.round(matchRatio * 100)}% match) - Review recommended`,
          };
        }
      }
    }
    return {
      autoMarks: 0,
      autoFeedback: 'Automated evaluation: Differs from model key. Teacher verification needed.',
    };
  }

  if (qType === 'long_answer') {
    const charCount = resp.length;
    let score = 0;
    let feedback = '';

    const rubricWords = (q.rubric || correct || '')
      .toLowerCase()
      .split(/[\s,;.]+/)
      .filter((w: string) => w.length > 3);

    let matchedKeywords = 0;
    if (rubricWords.length > 0) {
      matchedKeywords = rubricWords.filter((w: string) => resp.toLowerCase().includes(w)).length;
    }

    if (charCount > 100 && (rubricWords.length === 0 || matchedKeywords >= 2)) {
      score = Math.round((q.marks * 0.75) * 2) / 2;
      feedback = 'Substantive response with relevant subject terminology (Preliminary auto-score). Teacher review recommended.';
    } else if (charCount > 40) {
      score = Math.round((q.marks * 0.5) * 2) / 2;
      feedback = 'Concise response provided. Teacher verification recommended.';
    } else {
      score = 0;
      feedback = 'Brief response below rubric depth. Teacher evaluation needed.';
    }

    return { autoMarks: score, autoFeedback: feedback };
  }

  return { autoMarks: 0, autoFeedback: 'Awaiting teacher evaluation' };
}

export function calculateAutoResult(attemptId: string, applyToUnmarked: boolean = false) {
  const attempt = db.getAttemptById(attemptId);
  if (!attempt) return null;

  const exam = db.getExamById(attempt.examId);
  if (!exam) return null;

  const questions = db.getQuestionsByExamId(exam.id);
  const answers = db.getAnswersByAttemptId(attemptId);

  let totalAutoScore = 0;

  for (const q of questions) {
    let ans = answers.find((a) => a.questionId === q.id);
    if (!ans) {
      db.saveAnswers(attemptId, [{ questionId: q.id, response: '' }]);
      ans = db.getAnswersByAttemptId(attemptId).find((a) => a.questionId === q.id);
    }
    if (!ans) continue;

    const { autoMarks, autoFeedback } = autoCalculateMarksForAnswer(q, ans.response);
    totalAutoScore += autoMarks;

    const updates: any = {
      autoMarksAwarded: autoMarks,
      autoFeedback: autoFeedback,
    };

    // Only apply auto marks to marksAwarded if not already explicitly marked/verified by teacher
    if (applyToUnmarked && !ans.isTeacherMarked) {
      updates.marksAwarded = autoMarks;
      updates.feedback = autoFeedback;
    }

    db.updateAnswer(ans.id, updates);
  }

  const updatedAnswers = db.getAnswersByAttemptId(attemptId);
  const totalScoreAwarded = updatedAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? a.autoMarksAwarded ?? 0), 0);

  const attemptUpdates: any = {
    autoScore: totalAutoScore,
  };

  if (attempt.verificationStatus !== 'Teacher-Verified') {
    attemptUpdates.verificationStatus = 'Auto-Calculated';
    attemptUpdates.totalScoreAwarded = totalScoreAwarded;
  } else {
    // If teacher already verified, retain teacher total
    const teacherTotal = updatedAnswers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
    attemptUpdates.totalScoreAwarded = teacherTotal;
  }

  db.updateAttempt(attemptId, attemptUpdates);

  return {
    attempt: db.getAttemptById(attemptId),
    answers: db.getAnswersByAttemptId(attemptId),
    autoScore: totalAutoScore,
  };
}

// Student: Auto-save answers (also updates auto result in background)
app.post('/api/attempts/:attemptId/save-answers', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { answers } = req.body;

  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.status === 'Submitted' || attempt.status === 'Graded') {
    return res.status(400).json({ error: 'Exam has already been submitted and answers cannot be modified.' });
  }

  if (Array.isArray(answers)) {
    db.saveAnswers(attemptId, answers);
  }

  // Update auto calculation without overwriting any teacher verified marks
  calculateAutoResult(attemptId, false);

  res.json({ success: true, savedAt: new Date().toISOString() });
});

// Teacher / Student: On-demand auto calculate results
app.post('/api/attempts/:attemptId/auto-calculate', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const result = calculateAutoResult(attemptId, false);
  if (!result) {
    return res.status(500).json({ error: 'Failed to calculate auto result.' });
  }

  res.json({
    success: true,
    attempt: result.attempt,
    answers: result.answers,
    autoScore: result.autoScore,
    message: 'Auto result calculation completed successfully.',
  });
});

// Teacher: Verify attempt result and mark according to teacher (works before and after submission)
app.post('/api/attempts/:attemptId/verify-result', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { teacherName = 'Teacher', marksOverrides, teacherNotes } = req.body;

  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  // Apply teacher marks overrides
  if (Array.isArray(marksOverrides)) {
    for (const item of marksOverrides) {
      if (item.answerId && item.marksAwarded !== undefined) {
        db.gradeAnswer(item.answerId, Number(item.marksAwarded), item.feedback || null, true);
      }
    }
  }

  const allAnswers = db.getAnswersByAttemptId(attemptId);
  const totalScore = allAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? a.autoMarksAwarded ?? 0), 0);

  const updatedAttempt = db.updateAttempt(attemptId, {
    totalScoreAwarded: totalScore,
    verificationStatus: 'Teacher-Verified',
    verifiedBy: teacherName,
    verifiedAt: new Date().toISOString(),
  });

  if (teacherNotes) {
    const existingReview = db.getJEVReview(attemptId);
    if (existingReview) {
      db.upsertJEVReview({
        ...existingReview,
        teacherNotes,
      });
    }
  }

  res.json({
    success: true,
    attempt: updatedAttempt,
    answers: allAnswers,
    totalScoreAwarded: totalScore,
  });
});

// Student: Record activity event for JEV
app.post('/api/attempts/:attemptId/activity', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { eventType, metadata } = req.body;

  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const event: ActivityEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    attemptId,
    eventType: eventType || 'unknown_event',
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
  };

  db.addActivityEvent(event);
  const review = analyzeAttemptActivity(attemptId);
  const activeCaution = db.getActiveCautionByAttemptId(attemptId) || null;

  res.json({ success: true, event, reviewRiskLevel: review.riskLevel, activeCaution });
});

// Student: Submit exam
app.post('/api/attempts/:attemptId/submit', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { answers } = req.body;

  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.status === 'Submitted' || attempt.status === 'Graded') {
    return res.json({ success: true, attempt });
  }

  // Save final answers if provided
  if (Array.isArray(answers)) {
    db.saveAnswers(attemptId, answers);
  }

  // Calculate auto results for any unmarked questions.
  // CRITICAL: Any questions previously marked by the teacher (before submission) remain intact!
  calculateAutoResult(attemptId, true);

  const currentAnswers = db.getAnswersByAttemptId(attemptId);
  const totalScore = currentAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? a.autoMarksAwarded ?? 0), 0);

  // Mark attempt submitted
  const updatedAttempt = db.updateAttempt(attemptId, {
    status: 'Submitted',
    submittedAt: new Date().toISOString(),
    totalScoreAwarded: totalScore,
  });

  // Record submission event
  db.addActivityEvent({
    id: `ev_${Date.now()}_submit`,
    attemptId,
    eventType: 'exam_submitted',
    timestamp: new Date().toISOString(),
  });

  // Run final JEV review
  analyzeAttemptActivity(attemptId);

  res.json({ success: true, attempt: updatedAttempt });
});

// Teacher: Grade an individual answer
app.post('/api/grading/grade-answer', (req: Request, res: Response) => {
  const { answerId, marksAwarded, feedback } = req.body;

  if (!answerId || marksAwarded === undefined) {
    return res.status(400).json({ error: 'Answer ID and marks are required.' });
  }

  const updatedAnswer = db.gradeAnswer(answerId, Number(marksAwarded), feedback || null, true);
  if (!updatedAnswer) {
    return res.status(404).json({ error: 'Answer record not found.' });
  }

  // Recalculate attempt score
  const allAnswers = db.getAnswersByAttemptId(updatedAnswer.attemptId);
  const total = allAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? a.autoMarksAwarded ?? 0), 0);
  db.updateAttempt(updatedAnswer.attemptId, {
    totalScoreAwarded: total,
    verificationStatus: 'Teacher-Verified',
  });

  res.json({ success: true, answer: updatedAnswer, newAttemptTotal: total });
});

// Teacher: Update JEV Review status and notes
app.post('/api/jev/review', (req: Request, res: Response) => {
  const { attemptId, status, teacherNotes } = req.body;

  if (!attemptId || !status) {
    return res.status(400).json({ error: 'Attempt ID and review status are required.' });
  }

  if (!['Pending', 'Resolved', 'Further Investigation'].includes(status)) {
    return res.status(400).json({ error: 'Invalid JEV status.' });
  }

  const current = analyzeAttemptActivity(attemptId);
  current.status = status;
  if (teacherNotes !== undefined) current.teacherNotes = teacherNotes;
  current.reviewedAt = new Date().toISOString();

  const saved = db.upsertJEVReview(current);
  res.json({ success: true, review: saved });
});

// Teacher: Get JEV activity timeline for an attempt
app.get('/api/attempts/:attemptId/jev', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const review = analyzeAttemptActivity(attemptId);
  const events = db.getActivityEventsByAttemptId(attemptId);
  const cautions = db.getCautionsByAttemptId(attemptId);

  res.json({
    attempt,
    review,
    events,
    cautions,
  });
});

// Teacher: Send immediate caution/warning to student directly from dashboard
app.post('/api/attempts/:attemptId/caution', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { message, teacherName } = req.body;

  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const defaultCautionMessage =
    'Caution: Unusual activity has been detected during your exam. Please stay on the exam page and follow the exam rules. If unusual activity continues, negative marks may be given or your exam may be cancelled.';

  const cautionMessage =
    typeof message === 'string' && message.trim().length > 0 ? message.trim() : defaultCautionMessage;

  const caution: CautionNotice = {
    id: `caut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    attemptId: attempt.id,
    examId: attempt.examId,
    studentName: attempt.studentName,
    message: cautionMessage,
    sentAt: new Date().toISOString(),
    sentBy: teacherName || 'Course Invigilator',
    acknowledged: false,
    acknowledgedAt: null,
  };

  db.addCaution(caution);

  // Record an activity event so it is logged in the student's activity timeline
  db.addActivityEvent({
    id: `ev_${Date.now()}_caution`,
    attemptId: attempt.id,
    eventType: 'teacher_caution',
    timestamp: new Date().toISOString(),
    metadata: {
      cautionId: caution.id,
      message: caution.message,
      sentBy: caution.sentBy,
    },
  });

  res.json({
    success: true,
    caution,
    message: 'Caution notice successfully sent to student.',
  });
});

// Student & Teacher: Get all cautions for an attempt
app.get('/api/attempts/:attemptId/cautions', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const cautions = db.getCautionsByAttemptId(attemptId);
  const activeCaution = db.getActiveCautionByAttemptId(attemptId) || null;

  res.json({
    cautions,
    activeCaution,
  });
});

// Student: Acknowledge caution notice
app.post('/api/attempts/:attemptId/cautions/:cautionId/acknowledge', (req: Request, res: Response) => {
  const { attemptId, cautionId } = req.params;
  const acknowledged = db.acknowledgeCaution(cautionId);

  if (acknowledged) {
    db.addActivityEvent({
      id: `ev_${Date.now()}_ack`,
      attemptId,
      eventType: 'caution_acknowledged',
      timestamp: new Date().toISOString(),
      metadata: { cautionId },
    });
  }

  res.json({ success: acknowledged });
});

// Teacher: Fail or Discard a submission with a note (or restore to normal)
app.post('/api/attempts/:attemptId/decision', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { action, note = '', teacherName = 'Teacher' } = req.body;

  const attempt = db.getAttemptById(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const now = new Date().toISOString();

  if (action === 'fail') {
    const updated = db.updateAttempt(attemptId, {
      status: 'Failed',
      decisionStatus: 'Failed',
      decisionNote: note || 'Submission marked as Failed by instructor.',
      decisionBy: teacherName,
      decisionAt: now,
      totalScoreAwarded: 0,
      verificationStatus: 'Teacher-Failed',
    });

    db.addActivityEvent({
      id: `ev_dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attemptId,
      eventType: 'submission_failed',
      timestamp: now,
      metadata: { note, by: teacherName, action: 'fail' },
    });

    const rev = db.getJEVReview(attemptId);
    if (rev) {
      db.upsertJEVReview({
        ...rev,
        teacherNotes: note ? `Submission Failed: ${note}` : rev.teacherNotes,
        status: 'Resolved',
      });
    }

    return res.json({
      success: true,
      attempt: updated,
      message: 'Submission successfully marked as Failed with official note.',
    });
  }

  if (action === 'discard') {
    const updated = db.updateAttempt(attemptId, {
      status: 'Discarded',
      decisionStatus: 'Discarded',
      decisionNote: note || 'Submission discarded and cancelled by instructor.',
      decisionBy: teacherName,
      decisionAt: now,
      totalScoreAwarded: 0,
      verificationStatus: 'Teacher-Discarded',
    });

    db.addActivityEvent({
      id: `ev_dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attemptId,
      eventType: 'submission_discarded',
      timestamp: now,
      metadata: { note, by: teacherName, action: 'discard' },
    });

    const rev = db.getJEVReview(attemptId);
    if (rev) {
      db.upsertJEVReview({
        ...rev,
        teacherNotes: note ? `Submission Discarded: ${note}` : rev.teacherNotes,
        status: 'Resolved',
      });
    }

    return res.json({
      success: true,
      attempt: updated,
      message: 'Submission successfully discarded and cancelled with official note.',
    });
  }

  if (action === 'restore') {
    const answers = db.getAnswersByAttemptId(attemptId);
    const score = answers.reduce((s, a) => s + (a.marksAwarded ?? a.autoMarksAwarded ?? 0), 0);

    const updated = db.updateAttempt(attemptId, {
      status: attempt.submittedAt ? 'Submitted' : 'Active',
      decisionStatus: null,
      decisionNote: null,
      decisionBy: null,
      decisionAt: null,
      totalScoreAwarded: score,
      verificationStatus: 'Unverified',
    });

    db.addActivityEvent({
      id: `ev_dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attemptId,
      eventType: 'submission_restored',
      timestamp: now,
      metadata: { by: teacherName, action: 'restore' },
    });

    return res.json({
      success: true,
      attempt: updated,
      message: 'Submission restored to normal state.',
    });
  }

  return res.status(400).json({ error: 'Invalid action. Supported: fail, discard, restore' });
});

// Student: View only their own released result
app.get('/api/attempts/:attemptId/result', (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const attempt = db.getAttemptById(attemptId);

  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const exam = db.getExamById(attempt.examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  // If results have not been published by teacher yet, inform student gracefully
  if (!exam.resultsPublished) {
    return res.json({
      released: false,
      message: 'Exam results have not been published by the teacher yet. Please check back later.',
      examTitle: exam.title,
      studentName: attempt.studentName,
      submittedAt: attempt.submittedAt,
    });
  }

  const questions = db.getQuestionsByExamId(exam.id);
  const answers = db.getAnswersByAttemptId(attempt.id);

  let totalScoreAwarded = 0;
  const detailedResults = questions.map((q) => {
    const studentAns = answers.find((a) => a.questionId === q.id);
    const awarded = (studentAns?.marksAwarded !== null && studentAns?.marksAwarded !== undefined)
      ? studentAns.marksAwarded
      : (studentAns?.autoMarksAwarded !== null && studentAns?.autoMarksAwarded !== undefined)
      ? studentAns.autoMarksAwarded
      : 0;
    totalScoreAwarded += awarded;

    return {
      questionId: q.id,
      order: q.order,
      text: q.text,
      type: q.type,
      options: q.options,
      maxMarks: q.marks,
      studentResponse: studentAns?.response || '',
      marksAwarded: awarded,
      feedback: studentAns?.feedback || studentAns?.autoFeedback || null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    };
  });

  const isFailedOrDiscarded =
    attempt.status === 'Failed' ||
    attempt.status === 'Discarded' ||
    attempt.decisionStatus === 'Failed' ||
    attempt.decisionStatus === 'Discarded';

  const finalScore = isFailedOrDiscarded
    ? 0
    : (attempt.totalScoreAwarded !== null && attempt.totalScoreAwarded !== undefined
      ? attempt.totalScoreAwarded
      : totalScoreAwarded);
  const isPassed = !isFailedOrDiscarded && finalScore >= exam.passingMarks;

  // Fetch all responses for this student and exam to show all responses
  const studentAttempts = db.getAttemptsByStudentAndExam(exam.id, attempt.studentName);
  studentAttempts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const allResponses = studentAttempts.map((att, idx) => ({
    attemptId: att.id,
    attemptNumber: att.attemptNumber || idx + 1,
    totalAttempts: studentAttempts.length,
    status: att.status,
    decisionStatus: att.decisionStatus || null,
    startTime: att.startTime,
    submittedAt: att.submittedAt,
    scoreAwarded: att.totalScoreAwarded,
    isCurrent: att.id === attempt.id,
  }));

  res.json({
    released: true,
    studentName: attempt.studentName,
    accessCode: attempt.accessCode,
    submittedAt: attempt.submittedAt,
    examTitle: exam.title,
    subject: exam.subject,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    scoreAwarded: finalScore,
    isPassed,
    status: attempt.status,
    decisionStatus: attempt.decisionStatus || null,
    decisionNote: attempt.decisionNote || null,
    decisionBy: attempt.decisionBy || null,
    decisionAt: attempt.decisionAt || null,
    results: detailedResults,
    allResponses,
  });
});


export default app;
