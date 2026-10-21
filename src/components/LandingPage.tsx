import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Lock,
  Eye,
  FileCheck,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

interface LandingPageProps {
  onOpenGetStarted: (role?: 'teacher' | 'student') => void;
  onDirectJoinExam: (examId: string, studentName?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenGetStarted,
  onDirectJoinExam,
}) => {
  const [quickExamId, setQuickExamId] = useState('');
  const [quickStudentName, setQuickStudentName] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExamId.trim()) return;
    onDirectJoinExam(quickExamId.trim().toUpperCase(), quickStudentName.trim());
  };

  const faqs = [
    {
      q: 'Do teachers or students need to sign up or create passwords?',
      a: 'No. EID operates on an accountless, friction-free model. Users simply select their role (Teacher or Student) and provide their name for the session. No emails, phone numbers, or passwords are ever required.',
    },
    {
      q: 'What is JEV and will it automatically fail students?',
      a: 'JEV analyzes exam-window activity and assigns an objective risk level: Low Risk (normal exam activity), Medium Risk (a few unusual activities like one tab change or copy-paste attempt), and High Risk (repeated or serious unusual activity like multiple tab changes, fullscreen exits, or copy-paste attempts). When High Risk is flagged, teachers can dispatch an immediate caution warning directly to the student’s exam screen. Crucially, JEV never automatically fails a student or declares them as cheating — it alerts the teacher and empowers educators to manage exams with lakhs of students easily.',
    },
    {
      q: 'Can students access exam answers or results immediately after submitting?',
      a: 'No. Server-held answer keys, rubrics, and explanations are securely protected server-side and never sent to student browsers. Students can view their marks and feedback only after the teacher completes evaluation and clicks "Publish Final Results".',
    },
    {
      q: 'What happens if a student accidentally closes the browser tab or loses power?',
      a: 'EID automatically saves answers continuously to the persistent database. When the student returns and joins with their name and Exam ID, their active attempt and saved answers are restored seamlessly.',
    },
    {
      q: 'How does AI question generation work?',
      a: 'Teachers can optionally use server-side AI to draft questions based on subject, topics, and question styles. Generated questions are presented as editable drafts that teachers can inspect, modify, re-mark, or discard before publishing. If an AI key is not configured, teachers create questions manually without interruption.',
    },
  ];

  return (
    <div className="space-y-24 py-10 sm:py-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#722F37]">
              <span>Examination Invigilation Department</span>
              <span aria-hidden="true">·</span>
              <span>Account-Free Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#30231F] leading-tight">
              Calm, honest examinations without passwords.
            </h1>

            <p className="text-base sm:text-lg text-[#30231F]/80 leading-relaxed max-w-2xl font-light">
              Teachers build and publish rigorous exams with optional AI drafting.
              Students join instantly with a unique exam ID. Invigilated gently by
              JEV with zero automated disqualifications.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onOpenGetStarted()}
                className="px-6 py-3.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-sm font-semibold tracking-wide transition-all shadow-md flex items-center gap-2.5 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenGetStarted('teacher')}
                className="px-5 py-3.5 bg-white border border-[#B7A89A] hover:border-[#722F37] text-[#30231F] rounded-xl text-sm font-medium transition-all hover:bg-[#E8DCC6]/30 cursor-pointer"
              >
                Create an Exam
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs text-[#30231F]/70 border-t border-[#E8DCC6]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#722F37]" />
                <span>Zero login credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#722F37]" />
                <span>Persistent database</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#722F37]" />
                <span>Human-driven grading</span>
              </div>
            </div>
          </div>

          {/* Quick Join Card for Student with an Exam ID */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-[#E8DCC6] p-6 sm:p-8 shadow-lg">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8DCC6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E8DCC6] text-[#722F37] flex items-center justify-center font-serif font-bold">
                    ID
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#30231F]">Have an Exam Code?</h2>
                    <p className="text-xs text-[#30231F]/60">Join an active assessment immediately</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleQuickJoin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#722F37] mb-1">
                    Exam ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EID-4821"
                    value={quickExamId}
                    onChange={(e) => setQuickExamId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F4EC]/60 border border-[#B7A89A]/80 rounded-lg text-sm text-[#30231F] font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#722F37] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#722F37] mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your legal or enrolled name"
                    value={quickStudentName}
                    onChange={(e) => setQuickStudentName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F4EC]/60 border border-[#B7A89A]/80 rounded-lg text-sm text-[#30231F] focus:outline-none focus:ring-2 focus:ring-[#722F37] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!quickExamId.trim() || !quickStudentName.trim()}
                  className="w-full py-3 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-50 disabled:cursor-not-allowed text-[#F8F4EC] rounded-lg text-sm font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Verify & Join Exam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-center text-[#30231F]/60">
                  Exams must be marked Open by the teacher to accept submissions.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="max-w-3xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#30231F] mt-2">
            Engineered for academic integrity and zero setup friction.
          </h2>
          <p className="text-sm sm:text-base text-[#30231F]/70 mt-3 font-light">
            EID strips away the administrative complexity of online examination,
            replacing disposable accounts with streamlined sessions and transparent supervision.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl border border-[#E8DCC6] p-7 flex flex-col justify-between hover:border-[#B7A89A] transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center mb-5">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#30231F]">
                Manual & AI Question Authoring
              </h3>
              <p className="text-xs sm:text-sm text-[#30231F]/70 mt-3 leading-relaxed">
                Design diverse papers with multiple-choice, true/false, short essay, and long answer problems.
                Optionally generate curriculum drafts with AI, inspect every question as editable drafts, and adjust marks freely.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E8DCC6]/60 text-xs text-[#722F37] font-medium">
              Flexible scoring & server-held answer keys
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8DCC6] p-7 flex flex-col justify-between hover:border-[#B7A89A] transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center mb-5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#30231F]">
                JEV Invigilation Intelligence
              </h3>
              <p className="text-xs sm:text-sm text-[#30231F]/70 mt-3 leading-relaxed">
                Non-intrusive activity logging records window blur, tab transitions, and clipboard attempts.
                Categorizes attempts as Normal, Review Required, or High Risk with clear event timelines.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E8DCC6]/60 text-xs text-[#722F37] font-medium">
              Zero automatic failing — human teacher decides
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8DCC6] p-7 flex flex-col justify-between hover:border-[#B7A89A] transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#30231F]">
                Continuous State & Auto-Save
              </h3>
              <p className="text-xs sm:text-sm text-[#30231F]/70 mt-3 leading-relaxed">
                Every keystroke and selection is synced to the persistent relational database.
                Network blips, tab crashes, or page reloads do not destroy student answers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E8DCC6]/60 text-xs text-[#722F37] font-medium">
              Guaranteed answer recovery across reloads
            </div>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section id="how-to-use" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-[#E8DCC6]/40 border border-[#E8DCC6] rounded-3xl p-8 sm:p-12">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
              Workflow Guide
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#30231F] mt-2">
              How EID works for educators and students
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Teacher flow */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-[#B7A89A]/50">
                <span className="w-3 h-3 rounded-full bg-[#722F37]" />
                <h3 className="text-lg font-serif font-bold text-[#30231F]">For Teachers</h3>
              </div>
              <ol className="space-y-4 text-sm text-[#30231F]/80">
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">01</span>
                  <span>Enter name via <strong>Get Started</strong> and open the Teacher Workspace.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">02</span>
                  <span>Configure exam parameters, write questions manually or review AI drafts.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">03</span>
                  <span>Approve & publish the exam. Copy the generated Exam ID or shareable link.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">04</span>
                  <span>Toggle exam to <strong>Open</strong> to permit student participation.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">05</span>
                  <span>Review student submissions, inspect JEV invigilation logs, grade subjective answers, and publish final results.</span>
                </li>
              </ol>
            </div>

            {/* Student flow */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-[#B7A89A]/50">
                <span className="w-3 h-3 rounded-full bg-[#B7A89A]" />
                <h3 className="text-lg font-serif font-bold text-[#30231F]">For Students</h3>
              </div>
              <ol className="space-y-4 text-sm text-[#30231F]/80">
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">01</span>
                  <span>Enter name via <strong>Get Started</strong> and provide the shared Exam ID or link.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">02</span>
                  <span>Read exam instructions, syllabus overview, and duration in the lobby before starting.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">03</span>
                  <span>Complete questions in a calm, distraction-free interface with real-time auto-saving.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">04</span>
                  <span>Confirm and submit your attempt before timer expiration.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-[#722F37] pt-0.5">05</span>
                  <span>Access your verified score and question feedback once released by your teacher.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
              About EID
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#30231F]">
              Restoring human trust to digital assessment.
            </h2>
            <p className="text-sm sm:text-base text-[#30231F]/80 font-light leading-relaxed">
              The Examination Invigilation Department was founded to challenge the invasive,
              punitive norms of modern proctoring software. Traditional tools install predatory
              browser extensions, record webcams indiscriminately, and issue automated zero scores
              whenever a candidate looks away from their screen.
            </p>
            <p className="text-sm sm:text-base text-[#30231F]/80 font-light leading-relaxed">
              EID takes a radically respectful path. We eliminate password friction entirely,
              store test data in robust persistent schemas, and empower teachers with objective JEV
              activity facts rather than algorithm-driven judgment.
            </p>
          </div>

          <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E8DCC6] p-6 rounded-2xl">
              <div className="font-serif text-3xl font-bold text-[#722F37]">0</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#30231F] mt-2">
                Accounts Required
              </div>
              <div className="text-xs text-[#30231F]/60 mt-1">
                Zero signups, passwords, or emails collected.
              </div>
            </div>

            <div className="bg-white border border-[#E8DCC6] p-6 rounded-2xl">
              <div className="font-serif text-3xl font-bold text-[#722F37]">100%</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#30231F] mt-2">
                Human Final Authority
              </div>
              <div className="text-xs text-[#30231F]/60 mt-1">
                JEV provides data; teachers make all evaluations.
              </div>
            </div>

            <div className="bg-white border border-[#E8DCC6] p-6 rounded-2xl">
              <div className="font-serif text-3xl font-bold text-[#722F37]">Strict</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#30231F] mt-2">
                Key Isolation
              </div>
              <div className="text-xs text-[#30231F]/60 mt-1">
                Answer keys remain strictly on the backend.
              </div>
            </div>

            <div className="bg-white border border-[#E8DCC6] p-6 rounded-2xl">
              <div className="font-serif text-3xl font-bold text-[#722F37]">Live</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#30231F] mt-2">
                State Continuity
              </div>
              <div className="text-xs text-[#30231F]/60 mt-1">
                Automated continuous saving on every response.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
            Answers to Common Queries
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#30231F] mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-[#E8DCC6] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F8F4EC]/40 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#30231F]">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#722F37] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-[#30231F]/70 leading-relaxed border-t border-[#E8DCC6]/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#30231F] text-[#F8F4EC] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-[#722F37] flex items-center justify-center font-serif text-2xl font-bold">
            E
          </div>
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-serif font-bold">
              Ready to conduct your next examination?
            </h2>
            <p className="text-sm text-[#B7A89A] font-light">
              Enter only your name. Start creating or taking assessments in seconds.
            </p>
          </div>
          <button
            onClick={() => onOpenGetStarted()}
            className="px-8 py-3.5 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-xl text-sm font-semibold tracking-wide transition-all shadow-md cursor-pointer"
          >
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  );
};
