import React from 'react';

export type AirflowVariant = 'hero' | 'modal' | 'transition' | 'workspace' | 'exam';

interface AirflowAnimationProps {
  variant?: AirflowVariant;
  className?: string;
}

export const AirflowAnimation: React.FC<AirflowAnimationProps> = ({
  variant = 'hero',
  className = '',
}) => {
  // Styles and line configurations based on variant
  if (variant === 'exam') {
    // Ultra-soft and extra slow for distraction-free exam screen
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      >
        <svg
          className="w-[120%] h-full -ml-[10%]"
          viewBox="0 0 1440 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Gentle airflow wave 1 - Mocha Cream */}
          <path
            className="airflow-flow-exam-1"
            d="M-100 240 C 260 200, 520 280, 840 220 C 1140 170, 1380 260, 1600 210"
            stroke="#E8DCC6"
            strokeWidth="1.2"
            strokeOpacity="0.18"
            strokeLinecap="round"
          />
          {/* Gentle airflow wave 2 - Cosmic Latte */}
          <path
            className="airflow-flow-exam-2"
            d="M-80 390 C 300 420, 640 330, 960 380 C 1220 420, 1460 340, 1620 370"
            stroke="#B7A89A"
            strokeWidth="1"
            strokeOpacity="0.14"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'modal') {
    // Subtle flowing lines for modal background
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      >
        <svg
          className="w-[130%] h-full -ml-[15%]"
          viewBox="0 0 600 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            className="airflow-flow-1"
            d="M-50 140 C 120 110, 260 170, 420 130 C 520 100, 620 150, 700 120"
            stroke="#B7A89A"
            strokeWidth="1.2"
            strokeOpacity="0.22"
          />
          <path
            className="airflow-flow-2"
            d="M-50 260 C 150 290, 310 220, 480 270 C 580 300, 680 240, 720 250"
            stroke="#E8DCC6"
            strokeWidth="1.5"
            strokeOpacity="0.32"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'transition') {
    // Section transition divider wave
    return (
      <div
        aria-hidden="true"
        className={`relative w-full h-12 overflow-hidden pointer-events-none select-none ${className}`}
      >
        <svg
          className="w-[120%] h-full -ml-[10%]"
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            className="airflow-flow-2"
            d="M-80 30 C 240 10, 560 50, 880 20 C 1180 5, 1380 45, 1600 25"
            stroke="#B7A89A"
            strokeWidth="1"
            strokeOpacity="0.18"
          />
          <path
            className="airflow-flow-3"
            d="M-100 42 C 300 55, 620 25, 940 45 C 1240 60, 1420 30, 1600 38"
            stroke="#E8DCC6"
            strokeWidth="1.2"
            strokeOpacity="0.28"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'workspace') {
    // Teacher workspace ambient background
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      >
        <svg
          className="w-[120%] h-full -ml-[10%]"
          viewBox="0 0 1440 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            className="airflow-flow-1"
            d="M-100 180 C 280 130, 600 230, 940 160 C 1240 100, 1440 210, 1650 150"
            stroke="#B7A89A"
            strokeWidth="1.4"
            strokeOpacity="0.2"
          />
          <path
            className="airflow-flow-2"
            d="M-80 420 C 260 480, 620 360, 960 430 C 1260 490, 1460 380, 1650 410"
            stroke="#E8DCC6"
            strokeWidth="1.6"
            strokeOpacity="0.3"
          />
          <path
            className="airflow-flow-3"
            d="M-100 640 C 320 590, 680 680, 1020 620 C 1280 570, 1480 660, 1650 610"
            stroke="#B7A89A"
            strokeWidth="1.2"
            strokeOpacity="0.16"
          />
        </svg>
      </div>
    );
  }

  // Default: 'hero'
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
    >
      <svg
        className="w-[125%] h-full -ml-[12%]"
        viewBox="0 0 1440 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Airflow Line 1 - Mocha Cream Top Stream */}
        <path
          className="airflow-flow-1"
          d="M-100 200 C 240 130, 560 250, 900 170 C 1220 100, 1440 230, 1650 160"
          stroke="#E8DCC6"
          strokeWidth="1.8"
          strokeOpacity="0.32"
          strokeLinecap="round"
        />

        {/* Airflow Line 2 - Cosmic Latte Center Breeze */}
        <path
          className="airflow-flow-2"
          d="M-80 340 C 280 410, 640 280, 960 360 C 1260 430, 1480 300, 1650 330"
          stroke="#B7A89A"
          strokeWidth="1.4"
          strokeOpacity="0.26"
          strokeLinecap="round"
        />

        {/* Airflow Line 3 - Translucent Lower Swell */}
        <path
          className="airflow-flow-3"
          d="M-120 500 C 220 440, 580 560, 920 480 C 1240 410, 1460 540, 1650 470"
          stroke="#E8DCC6"
          strokeWidth="1.6"
          strokeOpacity="0.28"
          strokeLinecap="round"
        />

        {/* Airflow Line 4 - Deep Subtle Flow */}
        <path
          className="airflow-flow-1"
          d="M-60 620 C 320 670, 700 580, 1040 640 C 1300 690, 1500 600, 1650 630"
          stroke="#B7A89A"
          strokeWidth="1.2"
          strokeOpacity="0.18"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
