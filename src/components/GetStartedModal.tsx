import React, { useState } from 'react';
import { X, School, GraduationCap, ArrowRight, CheckCircle2, User } from 'lucide-react';
import { AirflowAnimation } from './AirflowAnimation';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'teacher' | 'student' | null;
  onContinueSession?: (role: 'teacher' | 'student', name: string) => void;
}

export const GetStartedModal: React.FC<GetStartedModalProps> = ({
  isOpen,
  onClose,
  initialRole = null,
  onContinueSession,
}) => {
  const [selectedRole, setSelectedRole] = useState<'Teacher' | 'Student' | null>(() => {
    if (initialRole === 'teacher') return 'Teacher';
    if (initialRole === 'student') return 'Student';
    return null;
  });
  const [name, setName] = useState('');
  const [submittedUser, setSubmittedUser] = useState<{ role: 'Teacher' | 'Student'; name: string } | null>(null);

  // Sync selectedRole when initialRole changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialRole === 'teacher') setSelectedRole('Teacher');
      else if (initialRole === 'student') setSelectedRole('Student');
      else setSelectedRole(null);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const handleRoleSelect = (role: 'Teacher' | 'Student') => {
    setSelectedRole(role);
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !name.trim()) return;

    if (onContinueSession) {
      onContinueSession(selectedRole.toLowerCase() as 'teacher' | 'student', name.trim());
      handleClose();
    } else {
      setSubmittedUser({ role: selectedRole, name: name.trim() });
    }
  };

  const handleReset = () => {
    setSelectedRole(null);
    setName('');
    setSubmittedUser(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#30231F]/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-started-title"
    >
      <div className="relative w-full max-w-md bg-[#F8F4EC] rounded-2xl border border-[#E8DCC6] shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Subtle air-flow animation in modal background */}
        <AirflowAnimation variant="modal" />

        {/* Content with relative z-10 for perfect contrast and accessibility */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8DCC6]">
            <h2 id="get-started-title" className="text-xl font-serif font-bold text-[#30231F]">
              Get Started with EID
            </h2>
            <button
              onClick={handleClose}
              className="text-[#30231F]/60 hover:text-[#30231F] p-1.5 rounded-lg hover:bg-[#E8DCC6]/60 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submittedUser ? (
            /* Confirmation feedback state */
            <div className="py-6 space-y-5 text-center animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-bold text-[#30231F]">
                  Welcome, {submittedUser.name}
                </h3>
                <p className="text-xs text-[#30231F]/70">
                  You selected: <span className="font-semibold text-[#722F37]">Enter as {submittedUser.role}</span>
                </p>
              </div>
              <p className="text-xs text-[#30231F]/70 leading-relaxed font-light bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-[#E8DCC6]">
                Your session identity has been verified. No account, password, or sign-up is required.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-[#B7A89A] hover:border-[#722F37] text-xs font-semibold text-[#30231F] rounded-lg transition-colors cursor-pointer"
                >
                  Change Role or Name
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 bg-[#722F37] hover:bg-[#5b242b] text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContinue} className="mt-6 space-y-6">
              {/* Two Options */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#722F37]">
                  Select Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('Teacher')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col items-start gap-2.5 cursor-pointer ${
                      selectedRole === 'Teacher'
                        ? 'border-[#722F37] bg-[#722F37]/5 ring-1 ring-[#722F37]'
                        : 'border-[#E8DCC6] bg-white/90 hover:border-[#B7A89A]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        selectedRole === 'Teacher'
                          ? 'bg-[#722F37] text-[#F8F4EC]'
                          : 'bg-[#E8DCC6] text-[#30231F]'
                      }`}
                    >
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#30231F]">
                        Enter as Teacher
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('Student')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col items-start gap-2.5 cursor-pointer ${
                      selectedRole === 'Student'
                        ? 'border-[#722F37] bg-[#722F37]/5 ring-1 ring-[#722F37]'
                        : 'border-[#E8DCC6] bg-white/90 hover:border-[#B7A89A]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        selectedRole === 'Student'
                          ? 'bg-[#722F37] text-[#F8F4EC]'
                          : 'bg-[#E8DCC6] text-[#30231F]'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#30231F]">
                        Enter as Student
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name Field (shown after choosing an option) */}
              {selectedRole && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <label
                    htmlFor="user-fullname"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#722F37]"
                  >
                    Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B7A89A]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="user-fullname"
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/95 border border-[#B7A89A]/80 rounded-lg text-sm text-[#30231F] placeholder-[#B7A89A] focus:outline-none focus:ring-2 focus:ring-[#722F37] focus:border-[#722F37] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-[#B7A89A]/60 text-xs font-medium text-[#30231F] rounded-lg hover:bg-[#E8DCC6]/40 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRole || !name.trim()}
                  className="px-6 py-2 bg-[#722F37] hover:bg-[#5b242b] disabled:opacity-40 disabled:cursor-not-allowed text-[#F8F4EC] rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

