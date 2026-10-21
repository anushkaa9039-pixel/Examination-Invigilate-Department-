import React, { useState } from 'react';
import { Menu, X, LogOut, School, BookOpen, Layers } from 'lucide-react';

interface NavbarProps {
  onOpenGetStarted: (role?: 'teacher' | 'student') => void;
  currentRole?: 'teacher' | 'student' | null;
  userName?: string | null;
  onExitSession?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenGetStarted,
  currentRole = null,
  userName = null,
  onExitSession,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8DCC6] bg-[#F8F4EC]/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Department Header */}
        <button
          type="button"
          onClick={() => {
            if (currentRole && onExitSession) {
              onExitSession();
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-3 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#722F37]"
          aria-label="EID Home"
        >
          <div className="w-10 h-10 rounded-lg bg-[#722F37] text-[#F8F4EC] flex items-center justify-center font-serif text-xl font-bold shadow-xs">
            E
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-serif text-2xl font-bold tracking-tight text-[#30231F] leading-tight">
              EID
            </span>
            <span className="text-[10px] sm:text-[11px] tracking-wide uppercase text-[#722F37] font-semibold leading-tight break-words">
              Examination Invigilation Department
            </span>
          </div>
        </button>

        {/* Desktop Navigation */}
        {!currentRole ? (
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-[#30231F]"
          >
            <button
              onClick={() => scrollTo('about-us')}
              className="hover:text-[#722F37] transition-colors cursor-pointer py-1"
            >
              About Us
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="hover:text-[#722F37] transition-colors cursor-pointer py-1"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('how-to-use')}
              className="hover:text-[#722F37] transition-colors cursor-pointer py-1"
            >
              How to Use
            </button>
            <button
              onClick={() => scrollTo('faqs')}
              className="hover:text-[#722F37] transition-colors cursor-pointer py-1"
            >
              FAQs
            </button>
          </nav>
        ) : currentRole === 'teacher' ? (
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-[#722F37] bg-white border border-[#E8DCC6] px-3 py-1.5 rounded-lg shadow-xs">
            <School className="w-3.5 h-3.5" />
            <span>Teacher Dashboard Active</span>
          </div>
        ) : null}

        {/* Desktop Right: Session Status or Get Started */}
        <div className="hidden md:flex items-center gap-3">
          {currentRole && userName ? (
            <div className="flex items-center gap-2.5">
              {currentRole === 'student' && (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('eid_open_student_portal'));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8F4EC] border border-[#B7A89A] text-xs font-semibold text-[#722F37] flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Return to Examinations Portal to give another test or view all exams"
                >
                  <Layers className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>Examinations Hub</span>
                </button>
              )}
              <div className="flex items-center gap-2 bg-[#E8DCC6]/60 border border-[#B7A89A]/40 rounded-lg px-3.5 py-1.5 text-xs text-[#30231F]">
                <span className="w-2 h-2 rounded-full bg-[#722F37]" />
                <span className="capitalize text-[#722F37] font-semibold">{currentRole}:</span>
                <span className="truncate max-w-[140px] font-medium">{userName}</span>
              </div>
              {onExitSession && (
                <button
                  onClick={onExitSession}
                  title="Exit current session"
                  className="text-[#30231F]/70 hover:text-[#722F37] px-2.5 py-1.5 rounded-lg border border-[#B7A89A]/40 transition-colors cursor-pointer flex items-center gap-1 text-xs hover:bg-[#E8DCC6]/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Exit</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenGetStarted()}
              className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[#722F37]"
            >
              Get Started
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#30231F] hover:text-[#722F37] rounded-lg cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8DCC6] bg-[#F8F4EC] px-4 pt-3 pb-6 space-y-3 animate-in fade-in duration-150">
          {!currentRole ? (
            <div className="flex flex-col space-y-2 text-sm font-medium text-[#30231F]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenGetStarted('teacher');
                }}
                className="text-left py-2 text-[#722F37] font-semibold flex items-center gap-2 hover:underline cursor-pointer border-b border-[#E8DCC6]/60 pb-3"
              >
                <School className="w-4 h-4" />
                <span>Enter as Teacher</span>
              </button>
              <button
                onClick={() => scrollTo('about-us')}
                className="text-left py-2 hover:text-[#722F37] transition-colors cursor-pointer"
              >
                About Us
              </button>
              <button
                onClick={() => scrollTo('features')}
                className="text-left py-2 hover:text-[#722F37] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo('how-to-use')}
                className="text-left py-2 hover:text-[#722F37] transition-colors cursor-pointer"
              >
                How to Use
              </button>
              <button
                onClick={() => scrollTo('faqs')}
                className="text-left py-2 hover:text-[#722F37] transition-colors cursor-pointer"
              >
                FAQs
              </button>
            </div>
          ) : (
            <div className="py-2 text-xs text-[#30231F]/80">
              Active session as <strong className="text-[#722F37] capitalize">{currentRole}</strong> ({userName})
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            {currentRole === 'student' && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('eid_open_student_portal'));
                }}
                className="w-full py-2.5 bg-white border border-[#B7A89A] text-[#722F37] rounded-lg text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4 text-[#722F37]" />
                <span>Examinations Hub (Give More Exams)</span>
              </button>
            )}
            {currentRole && onExitSession ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExitSession();
                }}
                className="w-full py-3 bg-[#E8DCC6] text-[#30231F] rounded-lg text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer text-center"
              >
                Exit Session
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenGetStarted();
                }}
                className="w-full py-3 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-lg text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer text-center"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
