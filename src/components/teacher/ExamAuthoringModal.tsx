import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Loader2,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { Exam, Question } from '../../types';
import { api } from '../../api';

interface ExamAuthoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (exam: Exam) => void;
  teacherName: string;
  initialExam?: Exam | null;
  initialQuestions?: Question[];
}

export const ExamAuthoringModal: React.FC<ExamAuthoringModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  teacherName,
  initialExam = null,
  initialQuestions = [],
}) => {
  const [title, setTitle] = useState(initialExam?.title || '');
  const [subject, setSubject] = useState(initialExam?.subject || '');
  const [topics, setTopics] = useState(initialExam?.topics || '');
  const [duration, setDuration] = useState(initialExam?.duration || 60);
  const [passingPercentage, setPassingPercentage] = useState<number>(() => {
    if (initialExam && initialExam.totalMarks > 0) {
      return Math.min(100, Math.max(1, Math.round((initialExam.passingMarks / initialExam.totalMarks) * 100)));
    }
    return 40; // Default 40%
  });
  const [paperStyle, setPaperStyle] = useState(initialExam?.paperStyle || 'Standard');
  const [instructions, setInstructions] = useState(
    initialExam?.instructions ||
      'Read each question carefully. Ensure you maintain focus on the exam window. Save your responses as you progress and submit before time expires.'
  );

  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions.length > 0 ? initialQuestions : []
  );

  // AI Generation State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [includeMcq, setIncludeMcq] = useState(true);
  const [includeTf, setIncludeTf] = useState(true);
  const [mcqCount, setMcqCount] = useState(3);
  const [tfCount, setTfCount] = useState(2);
  const [marksPerMcq, setMarksPerMcq] = useState(2);
  const [marksPerTf, setMarksPerTf] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Bulk marks tool
  const [bulkMarksValue, setBulkMarksValue] = useState<number>(2);

  // General Form State
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialExam) {
      setTitle(initialExam.title);
      setSubject(initialExam.subject);
      setTopics(initialExam.topics);
      setDuration(initialExam.duration);
      const pct = initialExam.totalMarks > 0
        ? Math.min(100, Math.max(1, Math.round((initialExam.passingMarks / initialExam.totalMarks) * 100)))
        : 40;
      setPassingPercentage(pct);
      setPaperStyle(initialExam.paperStyle);
      setInstructions(initialExam.instructions);
      setQuestions(initialQuestions);
    }
  }, [initialExam, initialQuestions]);

  if (!isOpen) return null;

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const effectivePassingMarks = totalCalculatedMarks > 0
    ? Math.max(1, Math.round((passingPercentage / 100) * totalCalculatedMarks))
    : 0;

  // Manual Question Addition
  const handleAddManualQuestion = (type: Question['type']) => {
    const newQ: Question = {
      id: `q_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: questions.length + 1,
      type,
      text: '',
      options:
        type === 'multiple_choice'
          ? ['Option A', 'Option B', 'Option C', 'Option D']
          : type === 'true_false'
          ? ['True', 'False']
          : [],
      correctAnswer: type === 'true_false' ? 'True' : '',
      marks: type === 'long_answer' ? 10 : type === 'short_answer' ? 5 : 2,
      explanation: '',
      rubric: '',
      source: 'manual',
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    const copy = [...questions];
    copy[index] = { ...copy[index], ...updates };
    setQuestions(copy);
  };

  const handleDeleteQuestion = (index: number) => {
    const filtered = questions.filter((_, idx) => idx !== index);
    const reordered = filtered.map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(reordered);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...questions];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    const reordered = copy.map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(reordered);
  };

  // AI Question Generation Handler
  const handleGenerateAi = async () => {
    if (!subject.trim()) {
      setAiError('Please provide a Subject first to guide AI generation.');
      return;
    }
    const effMcq = includeMcq ? mcqCount : 0;
    const effTf = includeTf ? tfCount : 0;
    if (effMcq === 0 && effTf === 0) {
      setAiError('Please select at least one question type (MCQ or True/False) with count greater than 0.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const res = await api.generateAiQuestions({
        subject: subject.trim(),
        topics: topics.trim(),
        mcqCount: effMcq,
        tfCount: effTf,
        marksPerMcq,
        marksPerTf,
        paperStyle,
      });

      if (res.questions && res.questions.length > 0) {
        // Append AI questions as drafts
        const existingCount = questions.length;
        const newFormatted = res.questions.map((q, i) => ({
          ...q,
          order: existingCount + i + 1,
          source: 'ai_draft' as const,
        }));
        setQuestions([...questions, ...newFormatted]);
        setShowAiPanel(false);
        setAiSuccessMsg(
          `Successfully drafted ${newFormatted.length} questions (${effMcq} Multiple Choice, ${effTf} True/False). You can customize marks per question below before publishing.`
        );
      } else {
        setAiError('No questions were returned. You can create questions manually.');
      }
    } catch (err: any) {
      setAiError(err.message || 'AI question generation encountered an error.');
    } finally {
      setAiLoading(false);
    }
  };

  // Bulk marks applicator
  const handleApplyBulkMarks = (targetType: 'all' | 'multiple_choice' | 'true_false') => {
    const val = Math.max(1, bulkMarksValue);
    setQuestions(
      questions.map((q) => {
        if (targetType === 'all' || q.type === targetType) {
          return { ...q, marks: val };
        }
        return q;
      })
    );
  };

  const handleSave = async (status: 'Draft' | 'Published') => {
    if (!title.trim() || !subject.trim()) {
      setFormError('Exam Title and Subject are required.');
      return;
    }
    if (questions.length === 0) {
      setFormError('Please add at least one question to the exam.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const examStatus = status === 'Published' ? 'Open' : status;

    try {
      if (initialExam?.id) {
        const res = await api.updateExam(initialExam.id, {
          title,
          subject,
          topics,
          duration,
          passingMarks: effectivePassingMarks,
          paperStyle,
          instructions,
          status: examStatus,
          totalMarks: totalCalculatedMarks,
          questions,
        });
        onSaved(res.exam);
      } else {
        const res = await api.createExam({
          teacherName,
          title,
          subject,
          topics,
          duration,
          passingMarks: effectivePassingMarks,
          paperStyle,
          instructions,
          status: examStatus,
          totalMarks: totalCalculatedMarks,
          questions,
        });
        onSaved(res.exam);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#30231F]/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#F8F4EC] rounded-2xl border border-[#E8DCC6] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-[#E8DCC6] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#30231F]">
              {initialExam ? 'Edit Examination' : 'Create New Examination'}
            </h2>
            <p className="text-xs text-[#30231F]/70">
              Instructor: <span className="font-semibold text-[#722F37]">{teacherName}</span> · All data saves to persistent records
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#30231F]/60 hover:text-[#30231F] p-1.5 rounded-lg hover:bg-[#E8DCC6]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {formError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Basic Exam Meta */}
          <div className="bg-white rounded-xl border border-[#E8DCC6] p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#722F37] pb-2 border-b border-[#E8DCC6]/60">
              Exam Details & Structure
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination: Organic Chemistry"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Subject / Course *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemistry 301"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Topics Covered
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alkenes, stereochemistry, electrophilic addition"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Passing Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passingPercentage}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, Number(e.target.value) || 0));
                      setPassingPercentage(val);
                    }}
                    placeholder="e.g. 40"
                    className="w-full pl-3 pr-8 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#722F37]">
                    %
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#30231F]/70">
                  <span>Auto-calculated:</span>
                  <span className="font-semibold text-[#722F37]">
                    {effectivePassingMarks} / {totalCalculatedMarks} Marks
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Paper Style
                </label>
                <select
                  value={paperStyle}
                  onChange={(e) => setPaperStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                >
                  <option value="Standard">Standard Assessment</option>
                  <option value="Formal Academic">Formal Academic Examination</option>
                  <option value="Minimalist">Minimalist Continuous Evaluation</option>
                  <option value="Timed Assessment">Rigorous Timed Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Total Marks (Auto-summed from questions)
                </label>
                <div className="px-3 py-2 bg-[#E8DCC6]/40 border border-[#B7A89A]/60 rounded-lg text-sm font-semibold text-[#722F37]">
                  {totalCalculatedMarks} Marks
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#30231F] mb-1">
                  Candidate Instructions
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-xs text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>
            </div>
          </div>

          {/* AI Question Generation Accordion / Panel */}
          <div className="bg-white rounded-xl border border-[#E8DCC6] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#722F37]" />
                <div>
                  <h3 className="text-sm font-semibold text-[#30231F]">
                    AI Question Generator
                  </h3>
                  <p className="text-[11px] text-[#30231F]/60">
                    Specify MCQ and True/False counts, choose marks, and generate curriculum drafts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAiPanel(!showAiPanel);
                  setAiError(null);
                }}
                className="text-xs font-semibold text-[#722F37] hover:underline cursor-pointer"
              >
                {showAiPanel ? 'Hide AI Generator' : 'Open AI Generator'}
              </button>
            </div>

            {showAiPanel && (
              <div className="pt-3 border-t border-[#E8DCC6] space-y-4 animate-in fade-in duration-150">
                <div className="p-3 bg-[#F8F4EC] rounded-xl border border-[#E8DCC6] text-xs text-[#30231F]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[#722F37]">Target Context: </span>
                    <span>{subject ? `${subject} ${topics ? `(${topics})` : ''}` : 'Please enter Subject above'}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#722F37] bg-white px-2.5 py-1 rounded-md border border-[#B7A89A]/50">
                    Total: {(includeMcq ? mcqCount : 0) + (includeTf ? tfCount : 0)} Questions •{' '}
                    {(includeMcq ? mcqCount * marksPerMcq : 0) + (includeTf ? tfCount * marksPerTf : 0)} Marks
                  </div>
                </div>

                {/* Question Types & Quantities Breakdown */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* MCQ Configuration */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    includeMcq ? 'bg-[#F8F4EC]/60 border-[#722F37]/40 ring-1 ring-[#722F37]/20' : 'bg-neutral-50 border-[#E8DCC6] opacity-75'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeMcq}
                          onChange={(e) => setIncludeMcq(e.target.checked)}
                          className="rounded text-[#722F37] focus:ring-[#722F37] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#30231F]">
                          Multiple Choice (MCQ)
                        </span>
                      </label>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#722F37]/10 text-[#722F37]">
                        4 Options
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#30231F] mb-1">
                          Number of MCQs
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={!includeMcq}
                          value={mcqCount}
                          onChange={(e) => setMcqCount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-3 py-1.5 bg-white border border-[#B7A89A] rounded-lg text-xs text-[#30231F] disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#30231F] mb-1">
                          Marks per MCQ
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          disabled={!includeMcq}
                          value={marksPerMcq}
                          onChange={(e) => setMarksPerMcq(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 bg-white border border-[#B7A89A] rounded-lg text-xs text-[#30231F] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* True/False Configuration */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    includeTf ? 'bg-[#F8F4EC]/60 border-[#722F37]/40 ring-1 ring-[#722F37]/20' : 'bg-neutral-50 border-[#E8DCC6] opacity-75'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeTf}
                          onChange={(e) => setIncludeTf(e.target.checked)}
                          className="rounded text-[#722F37] focus:ring-[#722F37] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#30231F]">
                          True / False (T/F)
                        </span>
                      </label>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Binary Key
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#30231F] mb-1">
                          Number of T/F
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={!includeTf}
                          value={tfCount}
                          onChange={(e) => setTfCount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-3 py-1.5 bg-white border border-[#B7A89A] rounded-lg text-xs text-[#30231F] disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#30231F] mb-1">
                          Marks per T/F
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          disabled={!includeTf}
                          value={marksPerTf}
                          onChange={(e) => setMarksPerTf(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 bg-white border border-[#B7A89A] rounded-lg text-xs text-[#30231F] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Notice if any */}
                {aiError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Notice</div>
                      <div>{aiError}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#30231F]/60">
                    Drafted questions will be editable and marks can still be changed.
                  </span>
                  <button
                    type="button"
                    disabled={aiLoading || !subject.trim() || ((includeMcq ? mcqCount : 0) + (includeTf ? tfCount : 0) <= 0)}
                    onClick={handleGenerateAi}
                    className="px-4 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Questions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          Generate {(includeMcq ? mcqCount : 0) + (includeTf ? tfCount : 0)} AI Questions
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Success Banner if AI Generated */}
          {aiSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-medium">{aiSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiSuccessMsg(null)}
                className="text-emerald-800 hover:text-emerald-950 font-bold px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Question List Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCC6]">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#722F37]">
                  Exam Questions ({questions.length})
                </h3>
                <p className="text-xs text-[#30231F]/60">
                  Review questions, set server-held answer keys, and adjust individual marks per question.
                </p>
              </div>

              {/* Add Question Button dropdown */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddManualQuestion('multiple_choice')}
                  className="px-2.5 py-1.5 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>+ MCQ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualQuestion('true_false')}
                  className="px-2.5 py-1.5 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>+ True/False</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualQuestion('short_answer')}
                  className="px-2.5 py-1.5 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>+ Short Answer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualQuestion('long_answer')}
                  className="px-2.5 py-1.5 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>+ Long Essay</span>
                </button>
              </div>
            </div>

            {/* Bulk Marks Assignment Toolbar */}
            {questions.length > 0 && (
              <div className="p-3 bg-[#F8F4EC] border border-[#E8DCC6] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#722F37]">Quick Marks Tool:</span>
                  <span>Set</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkMarksValue}
                    onChange={(e) => setBulkMarksValue(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 px-2 py-1 bg-white border border-[#B7A89A] rounded text-xs font-bold text-center text-[#722F37]"
                  />
                  <span>marks for:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleApplyBulkMarks('multiple_choice')}
                    className="px-2.5 py-1 bg-white hover:bg-[#722F37] hover:text-white border border-[#B7A89A] text-[#30231F] rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    All MCQs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyBulkMarks('true_false')}
                    className="px-2.5 py-1 bg-white hover:bg-[#722F37] hover:text-white border border-[#B7A89A] text-[#30231F] rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    All True/False
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyBulkMarks('all')}
                    className="px-2.5 py-1 bg-[#722F37] text-[#F8F4EC] hover:bg-[#5b242b] rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    All Questions
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {questions.length === 0 && (
              <div className="p-8 bg-white border border-dashed border-[#B7A89A] rounded-xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#E8DCC6] text-[#722F37] mx-auto flex items-center justify-center font-serif text-lg font-bold">
                  ?
                </div>
                <div className="text-sm font-semibold text-[#30231F]">
                  No questions added yet.
                </div>
                <p className="text-xs text-[#30231F]/60 max-w-sm mx-auto">
                  Use the buttons above to manually add multiple-choice, true/false, short answer, or essay questions, or generate drafts via AI.
                </p>
              </div>
            )}

            {/* Questions List */}
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white rounded-xl border border-[#E8DCC6] p-5 shadow-xs space-y-4 hover:border-[#B7A89A] transition-colors"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC6]/60">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#E8DCC6] text-[#722F37] flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#30231F]">
                      {q.type.replace('_', ' ')}
                    </span>
                    {q.source === 'ai_draft' && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#722F37] bg-[#722F37]/10 px-2 py-0.5 rounded">
                        AI Draft
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#722F37] bg-[#E8DCC6]/40 px-2 py-0.5 rounded">
                      {q.marks} Mark{q.marks !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      className="p-1 text-[#30231F]/60 hover:text-[#30231F] disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      className="p-1 text-[#30231F]/60 hover:text-[#30231F] disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(idx)}
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prompt Text & Marks Giving */}
                <div className="grid sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-semibold text-[#30231F] mb-1">
                      Question Text *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Enter question prompt..."
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(idx, { text: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded-lg text-xs text-[#30231F] focus:outline-none focus:ring-1 focus:ring-[#722F37]"
                    />
                  </div>

                  {/* Option to give marks per question with presets */}
                  <div className="sm:col-span-4 bg-[#F8F4EC]/50 p-2.5 rounded-lg border border-[#E8DCC6]">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-[#722F37]">
                        Marks for this Question *
                      </label>
                      <span className="text-[10px] text-[#30231F]/60 font-medium">
                        {q.marks} pt{q.marks !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(idx, { marks: Math.max(1, (q.marks || 1) - 1) })}
                        className="w-7 h-7 bg-white border border-[#B7A89A] text-[#30231F] font-bold rounded hover:bg-[#E8DCC6] text-xs flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.marks}
                        onChange={(e) =>
                          handleUpdateQuestion(idx, { marks: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="flex-1 px-2 py-1 bg-white border border-[#B7A89A] rounded text-center text-xs font-bold text-[#722F37] focus:outline-none focus:ring-1 focus:ring-[#722F37]"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(idx, { marks: (q.marks || 1) + 1 })}
                        className="w-7 h-7 bg-white border border-[#B7A89A] text-[#30231F] font-bold rounded hover:bg-[#E8DCC6] text-xs flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Marks Selection Pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-[#30231F]/60 mr-0.5">Quick:</span>
                      {[1, 2, 3, 5, 10].map((mVal) => (
                        <button
                          key={mVal}
                          type="button"
                          onClick={() => handleUpdateQuestion(idx, { marks: mVal })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            q.marks === mVal
                              ? 'bg-[#722F37] text-white'
                              : 'bg-white hover:bg-[#E8DCC6] text-[#30231F] border border-[#B7A89A]/60'
                          }`}
                        >
                          {mVal}M
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Options for MCQ */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-semibold text-[#722F37]">
                      Multiple Choice Options & Correct Answer
                    </label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id || idx}`}
                            checked={q.correctAnswer === opt && opt.trim() !== ''}
                            onChange={() => handleUpdateQuestion(idx, { correctAnswer: opt })}
                            className="text-[#722F37] focus:ring-[#722F37] cursor-pointer"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[optIdx] = e.target.value;
                              const updates: Partial<Question> = { options: newOpts };
                              if (q.correctAnswer === opt) {
                                updates.correctAnswer = e.target.value;
                              }
                              handleUpdateQuestion(idx, updates);
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded text-xs text-[#30231F]"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#30231F]/60">
                      Select radio button next to the correct choice to establish the server-held answer key.
                    </p>
                  </div>
                )}

                {/* Options for True/False */}
                {q.type === 'true_false' && (
                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-[11px] font-semibold text-[#722F37]">
                      Correct Answer:
                    </span>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name={`tf_${q.id || idx}`}
                        value="True"
                        checked={q.correctAnswer === 'True'}
                        onChange={() => handleUpdateQuestion(idx, { correctAnswer: 'True' })}
                        className="text-[#722F37] focus:ring-[#722F37]"
                      />
                      <span>True</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name={`tf_${q.id || idx}`}
                        value="False"
                        checked={q.correctAnswer === 'False'}
                        onChange={() => handleUpdateQuestion(idx, { correctAnswer: 'False' })}
                        className="text-[#722F37] focus:ring-[#722F37]"
                      />
                      <span>False</span>
                    </label>
                  </div>
                )}

                {/* Short / Long Answer Answer Key & Rubric */}
                {(q.type === 'short_answer' || q.type === 'long_answer') && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#722F37] mb-1">
                        Model Answer / Key (Server-Held)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Model response used for grading reference..."
                        value={q.correctAnswer || ''}
                        onChange={(e) =>
                          handleUpdateQuestion(idx, { correctAnswer: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded text-xs text-[#30231F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#722F37] mb-1">
                        Grading Rubric / Criteria
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Award 3 marks for core formula, 2 marks for final unit calculation..."
                        value={q.rubric || ''}
                        onChange={(e) => handleUpdateQuestion(idx, { rubric: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#F8F4EC]/40 border border-[#B7A89A] rounded text-xs text-[#30231F]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-[#E8DCC6] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#30231F]/70">
            Total marks: <strong className="text-[#722F37]">{totalCalculatedMarks}</strong> · Passing threshold:{' '}
            <strong className="text-[#722F37]">{effectivePassingMarks} M ({passingPercentage}%)</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#B7A89A]/60 text-xs font-medium text-[#30231F] rounded-lg hover:bg-[#E8DCC6]/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('Draft')}
              className="px-4 py-2 bg-white border border-[#722F37] text-[#722F37] rounded-lg text-xs font-semibold hover:bg-[#722F37]/5 transition-colors cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('Published')}
              className="px-6 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>Approve & Publish Exam</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
