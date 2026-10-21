import React, { useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';

export const Faqs: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I join a test?',
      a: 'Enter your name and open the link or enter the test ID shared by your teacher. You can join while the test is open.',
    },
    {
      q: 'The test link is unavailable. What should I do?',
      a: 'Check that you entered the correct exam ID or link and that the teacher has opened the test. Contact your teacher if it should be available.',
    },
    {
      q: 'What happens if my internet disconnects?',
      a: 'Reconnect and return to the test as soon as possible. If you can’t resume or your answers appear missing, contact your teacher.',
    },
    {
      q: 'Can I change my answers before submitting?',
      a: 'You can change answers while your attempt is active and the test is open. After submission, changes may not be possible.',
    },
    {
      q: 'When will I see my result?',
      a: 'Results appear after grading is complete and the teacher releases them.',
    },
    {
      q: 'Can I take a test after it closes?',
      a: 'No. Ask your teacher whether they can reopen it or provide another test window.',
    },
  ];

  return (
    <section id="faqs" className="py-20 sm:py-28 border-b border-[#E8DCC6] scroll-mt-20 bg-grid-eid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="border-b border-[#E8DCC6] pb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#30231F] leading-tight">
            FAQs
          </h2>
        </div>

        {/* Master Architectural Grid Frame */}
        <div className="border border-[#E8DCC6] rounded-3xl overflow-hidden bg-[#F8F4EC]/90 backdrop-blur-xs shadow-xs grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E8DCC6]">
          {/* Left Grid Cell (4 Columns) */}
          <div className="lg:col-span-4 p-8 sm:p-10 space-y-6 flex flex-col justify-between bg-[#E8DCC6]/20">
            <div className="space-y-4">
              <h3 className="text-2xl font-serif font-bold text-[#30231F]">
                Candidate & Teacher Guidelines
              </h3>
              <p className="text-sm text-[#30231F]/70 font-light leading-relaxed">
                Common questions about joining tests, network interruptions, answer editing, and result releases.
              </p>
            </div>

            <div className="pt-6 border-t border-[#E8DCC6] flex items-center gap-2 text-xs text-[#722F37] font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-[#722F37]" />
              <span>Have additional questions? Ask your instructor.</span>
            </div>
          </div>

          {/* Right Grid Cell (8 Columns): Stacked Accordion Grid Cells */}
          <div className="lg:col-span-8 bg-white/70 divide-y divide-[#E8DCC6]">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index} className="transition-colors hover:bg-white/90">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-7 sm:px-9 py-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base sm:text-lg font-serif font-semibold text-[#30231F]">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#722F37] transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-7 sm:px-9 pb-6 pt-1 text-sm sm:text-base text-[#30231F]/80 leading-relaxed font-light border-t border-[#E8DCC6]/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
