import React from 'react';
import { School, UserCheck, CheckCircle, Award } from 'lucide-react';

export const HowToUse: React.FC = () => {
  const steps = [
    {
      num: '01',
      actor: 'Teacher',
      icon: School,
      text: 'Teachers create a test, add or generate questions, set the marks and availability, then publish it.',
    },
    {
      num: '02',
      actor: 'Student',
      icon: UserCheck,
      text: 'Students enter their name and join using the test link or ID while it is open.',
    },
    {
      num: '03',
      actor: 'Student',
      icon: CheckCircle,
      text: 'Students answer the questions and submit their test before it closes.',
    },
    {
      num: '04',
      actor: 'Teacher',
      icon: Award,
      text: 'Teachers review submissions, grade written answers where needed, and release results.',
    },
  ];

  return (
    <section id="how-to-use" className="py-20 sm:py-28 border-b border-[#E8DCC6] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="border-b border-[#E8DCC6] pb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#30231F] leading-tight">
            How to Use
          </h2>
        </div>

        {/* 4-Cell Connected Architectural Grid */}
        <div className="border border-[#E8DCC6] rounded-3xl overflow-hidden bg-[#F8F4EC]/80 backdrop-blur-xs shadow-xs grid md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E8DCC6]">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isTeacher = step.actor === 'Teacher';
            return (
              <div
                key={idx}
                className="p-8 sm:p-9 flex flex-col justify-between space-y-8 bg-white/40 hover:bg-white/80 transition-colors"
              >
                <div className="space-y-6">
                  {/* Grid cell metadata */}
                  <div className="flex items-center justify-between border-b border-[#E8DCC6]/60 pb-3">
                    <span className="font-serif text-3xl font-bold text-[#722F37] leading-none">
                      {step.num}
                    </span>
                    <span
                      className={`text-xs uppercase font-semibold px-2.5 py-1 rounded-md ${
                        isTeacher
                          ? 'bg-[#722F37]/10 text-[#722F37]'
                          : 'bg-[#E8DCC6] text-[#30231F]'
                      }`}
                    >
                      {step.actor}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-[#30231F] font-serif leading-relaxed">
                    {step.text}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E8DCC6]/60 flex items-center justify-between text-xs text-[#30231F]/50">
                  <span>Step {idx + 1} of 4</span>
                  <Icon className="w-4 h-4 text-[#722F37]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
