import React from 'react';
import { ArrowRight, School, GraduationCap } from 'lucide-react';
import { AirflowAnimation } from './AirflowAnimation';

interface HeroProps {
  onOpenGetStarted: (role?: 'teacher' | 'student') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenGetStarted }) => {
  return (
    <section className="relative overflow-hidden py-10 sm:py-16 lg:py-20 border-b border-[#E8DCC6] bg-grid-eid">
      {/* Subtle airflow animation drifting behind the grid */}
      <AirflowAnimation variant="hero" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Architectural Grid Frame */}
        <div className="border border-[#E8DCC6] rounded-3xl bg-[#F8F4EC]/90 backdrop-blur-xs overflow-hidden shadow-xs">
          <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E8DCC6]">
            {/* Primary Grid Cell (7 Columns): Display & CTA */}
            <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 space-y-8 bg-white/70">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold text-[#30231F] tracking-tight leading-[1.05]">
                  Exams, with integrity.
                </h1>
                <p className="text-xl sm:text-2xl lg:text-3xl font-serif italic text-[#722F37] font-medium leading-relaxed">
                  Every answer deserves a fair chance.
                </p>
              </div>

              <p className="text-sm sm:text-base text-[#30231F]/80 font-light leading-relaxed max-w-xl">
                An online examination platform that helps teachers create, manage, and review tests in one place.
                Students join through a shared link or test ID, complete their exam, and submit their answers online.
              </p>

              {/* Get Started Primary Action */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenGetStarted()}
                  className="group relative px-8 py-4 bg-[#722F37] hover:bg-[#5b242b] active:scale-[0.99] text-[#F8F4EC] rounded-xl text-base font-semibold tracking-wide transition-all shadow-sm hover:shadow-md flex items-center gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#722F37]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* Secondary Grid Cell (5 Columns): Direct Portal Cards */}
            <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-center space-y-5 bg-[#E8DCC6]/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                Quick Entry
              </div>

              <button
                type="button"
                onClick={() => onOpenGetStarted('teacher')}
                className="w-full text-left p-5 rounded-2xl bg-white border border-[#E8DCC6] hover:border-[#722F37] transition-all group cursor-pointer shadow-xs"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#722F37]/10 text-[#722F37] flex items-center justify-center shrink-0 group-hover:bg-[#722F37] group-hover:text-[#F8F4EC] transition-colors">
                    <School className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-serif font-bold text-[#30231F]">
                        Enter as Teacher
                      </h2>
                      <ArrowRight className="w-4 h-4 text-[#722F37] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-[#30231F]/70 leading-relaxed font-light">
                      Teacher Dashboard: create & manage exams, monitor student results, live activity, and grade responses.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onOpenGetStarted('student')}
                className="w-full text-left p-5 rounded-2xl bg-white border border-[#E8DCC6] hover:border-[#722F37] transition-all group cursor-pointer shadow-xs"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E8DCC6] text-[#30231F] flex items-center justify-center shrink-0 group-hover:bg-[#722F37] group-hover:text-[#F8F4EC] transition-colors">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-serif font-bold text-[#30231F]">
                        Enter as Student
                      </h2>
                      <ArrowRight className="w-4 h-4 text-[#722F37] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-[#30231F]/70 leading-relaxed font-light">
                      Join active exams with a test ID or link, answer questions, and submit online.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
