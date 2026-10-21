import React from 'react';

export const AboutUs: React.FC = () => {
  return (
    <section id="about-us" className="py-20 sm:py-28 border-b border-[#E8DCC6] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="border-b border-[#E8DCC6] pb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#30231F] leading-tight">
            About Us
          </h2>
        </div>

        {/* Master Architectural Grid Frame */}
        <div className="border border-[#E8DCC6] rounded-3xl overflow-hidden bg-[#F8F4EC]/90 backdrop-blur-xs shadow-xs grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E8DCC6]">
          {/* Left Grid Cell (5 Columns) */}
          <div className="lg:col-span-5 p-8 sm:p-12 space-y-6 flex flex-col justify-between bg-[#E8DCC6]/20">
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#30231F] leading-tight">
                Restoring trust and focus to examination administration.
              </h3>
            </div>
          </div>

          {/* Right Grid Cell (7 Columns) */}
          <div className="lg:col-span-7 p-8 sm:p-12 space-y-6 bg-white/70">
            <p className="text-base sm:text-lg text-[#30231F] font-serif leading-relaxed">
              EID is an online examination platform that helps teachers create, manage, and review tests in one place. Students can join through a shared link or test ID, complete their exam, and submit their answers online.
            </p>

            <div className="border-t border-[#E8DCC6]/60 pt-6">
              <p className="text-sm sm:text-base text-[#30231F]/80 font-light leading-relaxed">
                EID is designed to support a focused exam experience. Teachers can review unusual activity and decide whether it needs follow-up. Online monitoring can support exam supervision, while checking for other devices or outside assistance may require in-person invigilation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
