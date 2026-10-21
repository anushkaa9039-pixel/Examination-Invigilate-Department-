import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutUs } from './components/AboutUs';
import { Features } from './components/Features';
import { HowToUse } from './components/HowToUse';
import { Faqs } from './components/Faqs';
import { GetStartedSection } from './components/GetStartedSection';
import { GetStartedModal } from './components/GetStartedModal';
import { AirflowAnimation } from './components/AirflowAnimation';
import { TeacherWorkspace } from './components/teacher/TeacherWorkspace';
import { StudentWorkspace } from './components/student/StudentWorkspace';

export default function App() {
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);
  const [getStartedRole, setGetStartedRole] = useState<'teacher' | 'student' | null>(null);

  const handleOpenGetStarted = (role?: 'teacher' | 'student') => {
    setGetStartedRole(role || null);
    setIsGetStartedOpen(true);
  };

  // Active Session State
  const [currentRole, setCurrentRole] = useState<'teacher' | 'student' | null>(() => {
    return (sessionStorage.getItem('eid_role') as 'teacher' | 'student') || null;
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return sessionStorage.getItem('eid_user_name') || null;
  });

  // URL query parameter for direct exam links (e.g. ?examId=EID-4821)
  const [urlExamId, setUrlExamId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('examId');
    if (paramId) {
      setUrlExamId(paramId.trim().toUpperCase());
      if (!currentRole || !userName) {
        setIsGetStartedOpen(true);
      }
    }
  }, []);

  const handleContinueSession = (role: 'teacher' | 'student', name: string) => {
    setCurrentRole(role);
    setUserName(name);
    sessionStorage.setItem('eid_role', role);
    sessionStorage.setItem('eid_user_name', name);
    setIsGetStartedOpen(false);
  };

  const handleExitSession = () => {
    setCurrentRole(null);
    setUserName(null);
    sessionStorage.removeItem('eid_role');
    sessionStorage.removeItem('eid_user_name');
  };

  return (
    <div className="min-h-screen bg-[#F8F4EC] text-[#30231F] flex flex-col font-sans selection:bg-[#722F37] selection:text-[#F8F4EC]">
      {/* Universal Navigation Bar */}
      <Navbar
        onOpenGetStarted={handleOpenGetStarted}
        currentRole={currentRole}
        userName={userName}
        onExitSession={handleExitSession}
      />

      {/* Main Body */}
      <main className="flex-1">
        {!currentRole || !userName ? (
          /* Landing Page View */
          <div>
            <Hero onOpenGetStarted={handleOpenGetStarted} />

            {/* Section Transition Airflow 1 */}
            <AirflowAnimation variant="transition" />

            <AboutUs />

            {/* Section Transition Airflow 2 */}
            <AirflowAnimation variant="transition" />

            <Features />

            {/* Section Transition Airflow 3 */}
            <AirflowAnimation variant="transition" />

            <HowToUse />

            {/* Section Transition Airflow 4 */}
            <AirflowAnimation variant="transition" />

            <Faqs />

            {/* Section Transition Airflow 5 */}
            <AirflowAnimation variant="transition" />

            <GetStartedSection onOpenGetStarted={handleOpenGetStarted} />
          </div>
        ) : currentRole === 'teacher' ? (
          /* Teacher Workspace with subtle background airflow */
          <TeacherWorkspace teacherName={userName} />
        ) : (
          /* Student Exam Workspace with ultra-soft calming background airflow */
          <StudentWorkspace studentName={userName} initialExamId={urlExamId} />
        )}
      </main>

      {/* Dignified Academic Footer */}
      <footer className="border-t border-[#E8DCC6] bg-[#F8F4EC] py-10 text-xs text-[#30231F]/65">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5 font-serif text-[#30231F]">
            <span className="w-5 h-5 rounded bg-[#722F37] text-[#F8F4EC] text-[10px] font-bold flex items-center justify-center">
              E
            </span>
            <span className="font-bold tracking-tight text-sm">EID</span>
            <span className="text-[#30231F]/50">· Examination Invigilation Department</span>
          </div>

          <div className="text-[#30231F]/60">
            Exams, with integrity. Every answer deserves a fair chance.
          </div>
        </div>
      </footer>

      {/* Get Started Teacher/Student Selection Dialog */}
      <GetStartedModal
        isOpen={isGetStartedOpen}
        initialRole={getStartedRole}
        onClose={() => setIsGetStartedOpen(false)}
        onContinueSession={handleContinueSession}
      />
    </div>
  );
}
