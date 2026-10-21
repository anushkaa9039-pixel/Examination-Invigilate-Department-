import React from 'react';
import {
  Focus,
  Activity,
  FileText,
  Sparkles,
  Share2,
  Lock,
  Database,
  CheckCheck,
} from 'lucide-react';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 sm:py-28 border-b border-[#E8DCC6] scroll-mt-20 bg-grid-eid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="border-b border-[#E8DCC6] pb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#30231F] leading-tight">
            Features
          </h2>
        </div>

        {/* Modular Architectural Grid Matrix */}
        <div className="border border-[#E8DCC6] rounded-3xl overflow-hidden bg-[#F8F4EC]/80 backdrop-blur-xs shadow-xs">
          {/* Row 1: Featured 8-col Lead + 4-col Auxiliary */}
          <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E8DCC6] border-b border-[#E8DCC6]">
            {/* Feature 1 (8 cols) */}
            <div className="lg:col-span-8 p-8 sm:p-10 flex flex-col justify-between space-y-6 bg-white/60 hover:bg-white/90 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#722F37] text-[#F8F4EC] flex items-center justify-center">
                  <Focus className="w-5 h-5" />
                </div>
                <p className="text-xl sm:text-2xl font-serif text-[#30231F] leading-relaxed">
                  A focused exam experience designed to discourage looking up answers online during a test.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light pt-4 border-t border-[#E8DCC6]/60">
                Calm, distraction-free environment without predatory tracking extensions.
              </div>
            </div>

            {/* Feature 2 (4 cols) */}
            <div className="lg:col-span-4 p-8 sm:p-10 flex flex-col justify-between space-y-6 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#E8DCC6] text-[#722F37] flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <p className="text-base sm:text-lg font-serif text-[#30231F] leading-relaxed">
                  Teacher review of unusual exam activity to help identify sessions that may need follow-up.
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: 3 Equal Modular Grid Cells (4 cols each) */}
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E8DCC6] border-b border-[#E8DCC6]">
            {/* Feature 3 */}
            <div className="p-7 sm:p-8 flex flex-col justify-between space-y-4 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                  Test creation with questions, instructions, duration, and teacher-selected marks.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light">
                Multiple paper styles & criteria
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-7 sm:p-8 flex flex-col justify-between space-y-4 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                  Optional AI assistance to draft questions for teachers to review and edit.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light">
                Curriculum-tailored drafts
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-7 sm:p-8 flex flex-col justify-between space-y-4 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                  Shareable test links or IDs for student access.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light">
                Direct candidate links
              </div>
            </div>
          </div>

          {/* Row 3: 3 Equal Modular Grid Cells (4 cols each) */}
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E8DCC6]">
            {/* Feature 6 */}
            <div className="p-7 sm:p-8 flex flex-col justify-between space-y-4 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                  Teacher control over when a test opens and closes.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light">
                One-click access toggle
              </div>
            </div>

            {/* Feature 7 */}
            <div className="p-7 sm:p-8 flex flex-col justify-between space-y-4 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                  Saved student attempts and submissions for teacher review.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light">
                Persistent database records
              </div>
            </div>

            {/* Feature 8 */}
            <div className="p-7 sm:p-8 flex flex-col justify-between space-y-4 bg-white/40 hover:bg-white/80 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC6]/60 text-[#722F37] flex items-center justify-center">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                  Support for grading objective questions, reviewing written answers, and releasing results.
                </p>
              </div>
              <div className="text-xs text-[#30231F]/60 font-light">
                Comprehensive evaluation ledger
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
