import React from 'react';
import { ArrowRight, School, GraduationCap } from 'lucide-react';

interface GetStartedSectionProps {
  onOpenGetStarted: (role?: 'teacher' | 'student') => void;
}

export const GetStartedSection: React.FC<GetStartedSectionProps> = ({ onOpenGetStarted }) => {
  return (
    <section className="py-20 sm:py-28 bg-grid-eid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-[#E8DCC6] rounded-3xl bg-[#30231F] text-[#F8F4EC] overflow-hidden shadow-xl p-8 sm:p-14 lg:p-16 space-y-6">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-[#F8F4EC] leading-[1.05]">
            Get Started
          </h2>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onOpenGetStarted()}
              className="group px-8 py-4 bg-[#722F37] hover:bg-[#8b3943] active:scale-[0.99] text-[#F8F4EC] rounded-xl text-sm sm:text-base font-semibold tracking-wide transition-all shadow-md flex items-center gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E8DCC6]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            <div className="flex items-center gap-3 text-xs text-[#B7A89A] pl-2">
              <button
                type="button"
                onClick={() => onOpenGetStarted('teacher')}
                className="flex items-center gap-1.5 hover:text-[#F8F4EC] transition-colors cursor-pointer"
              >
                <School className="w-3.5 h-3.5 text-[#E8DCC6]" /> Teacher
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => onOpenGetStarted('student')}
                className="flex items-center gap-1.5 hover:text-[#F8F4EC] transition-colors cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#E8DCC6]" /> Student
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
