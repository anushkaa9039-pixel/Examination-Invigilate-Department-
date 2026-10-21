import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Ban,
  XCircle,
  RotateCcw,
  CheckCircle2,
  FileText,
  User,
  ShieldAlert,
  Loader2,
  Send,
} from 'lucide-react';
import { Attempt, DashboardStudentSubmission, SubmissionDetails } from '../../types';
import { api } from '../../api';

interface SubmissionDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: DashboardStudentSubmission | SubmissionDetails | null;
  onDecisionSuccess: () => void;
  currentTeacherName?: string;
}

export const SubmissionDecisionModal: React.FC<SubmissionDecisionModalProps> = ({
  isOpen,
  onClose,
  submission,
  onDecisionSuccess,
  currentTeacherName = 'Instructor',
}) => {
  const [selectedAction, setSelectedAction] = useState<'fail' | 'discard' | 'restore'>('fail');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !submission) return null;

  const attempt: Attempt = submission.attempt;
  const currentDecision = attempt.decisionStatus;
  const isCurrentlyFailedOrDiscarded =
    attempt.status === 'Failed' ||
    attempt.status === 'Discarded' ||
    attempt.decisionStatus === 'Failed' ||
    attempt.decisionStatus === 'Discarded';

  const quickPresets = [
    'Repeated unapproved tab switching / window loss during exam',
    'Multiple fullscreen exits and unheeded invigilator caution notices',
    'Restricted clipboard / copy-paste activity detected during examination',
    'Suspected external aid or unauthorized collaboration',
    'Abandoned session / incomplete and non-responsive examination',
  ];

  const handleApplyPreset = (preset: string) => {
    setNote((prev) => (prev ? `${prev} | ${preset}` : preset));
  };

  const handleConfirmDecision = async () => {
    if ((selectedAction === 'fail' || selectedAction === 'discard') && !note.trim()) {
      setErrorMsg('Please provide a mandatory reason note for the official academic record.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.decideSubmission(
        attempt.id,
        selectedAction,
        note.trim(),
        currentTeacherName
      );
      onDecisionSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update submission decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#30231F]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl border border-[#E8DCC6] shadow-2xl w-full max-w-xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-[#F8F4EC] border-b border-[#E8DCC6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-300 text-red-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                Academic Authority Action
              </span>
              <h2 className="text-lg font-serif font-bold text-[#30231F] mt-0.5">
                Fail or Discard Submission
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#30231F]/60 hover:text-[#30231F] rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Candidate Context Pill */}
          <div className="bg-[#F8F4EC]/80 border border-[#E8DCC6] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#722F37]" />
                <span className="font-bold text-sm text-[#30231F]">{attempt.studentName}</span>
                <code className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-[#B7A89A] rounded text-[#722F37]">
                  {attempt.accessCode}
                </code>
              </div>
              <div className="text-[#30231F]/70 text-[11px]">
                Attempt ID: <span className="font-mono">{attempt.id}</span>
                {attempt.submittedAt
                  ? ` · Submitted ${new Date(attempt.submittedAt).toLocaleTimeString()}`
                  : ` · In session (Active)`}
              </div>
            </div>

            {/* Current Risk Badge */}
            <div className="flex flex-col items-end gap-1">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  submission.review?.riskLevel === 'High Risk'
                    ? 'bg-red-100 text-red-900 border-red-300'
                    : submission.review?.riskLevel === 'Medium Risk'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                JEV: {submission.review?.riskLevel || 'Low Risk'}
              </span>
              {attempt.decisionStatus && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-700 text-white rounded">
                  Currently {attempt.decisionStatus}
                </span>
              )}
            </div>
          </div>

          {/* Current note banner if existing */}
          {attempt.decisionNote && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-900">
                <FileText className="w-3.5 h-3.5" />
                <span>Existing Decision Record ({attempt.decisionStatus}):</span>
              </div>
              <div className="text-red-900/90 italic pl-5">"{attempt.decisionNote}"</div>
              {attempt.decisionBy && (
                <div className="text-[10px] text-red-800/70 pl-5">
                  Decided by {attempt.decisionBy} on {attempt.decisionAt ? new Date(attempt.decisionAt).toLocaleString() : 'N/A'}
                </div>
              )}
            </div>
          )}

          {/* Action Choice Segment */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#30231F] block uppercase tracking-wider">
              Select Disciplinary Action:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fail Submission */}
              <button
                type="button"
                onClick={() => setSelectedAction('fail')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  selectedAction === 'fail'
                    ? 'bg-red-50 border-red-600 ring-2 ring-red-600/20'
                    : 'bg-white border-[#B7A89A]/60 hover:border-red-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-900">
                    <XCircle className="w-4 h-4 text-red-700" />
                    <span>Fail Submission</span>
                  </div>
                  {selectedAction === 'fail' && (
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-[#30231F]/70 leading-relaxed font-normal">
                  Sets evaluated marks to 0 and officially marks student as <strong>Failed</strong> with instructor's note.
                </p>
              </button>

              {/* Discard Submission */}
              <button
                type="button"
                onClick={() => setSelectedAction('discard')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  selectedAction === 'discard'
                    ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-600/20'
                    : 'bg-white border-[#B7A89A]/60 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                    <Ban className="w-4 h-4 text-amber-700" />
                    <span>Discard / Cancel</span>
                  </div>
                  {selectedAction === 'discard' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-[#30231F]/70 leading-relaxed font-normal">
                  Nullifies and cancels this response. Marked as <strong>Discarded</strong> in audit logs with instructor's note.
                </p>
              </button>
            </div>

            {/* Restore option if already failed or discarded */}
            {isCurrentlyFailedOrDiscarded && (
              <button
                type="button"
                onClick={() => setSelectedAction('restore')}
                className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between mt-2 ${
                  selectedAction === 'restore'
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20'
                    : 'bg-white border-[#B7A89A]/60 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                  <RotateCcw className="w-4 h-4 text-blue-700" />
                  <span>Restore to Normal Examination Submission</span>
                </div>
                <span className="text-[11px] text-blue-700 font-medium">Reverts to Submitted status</span>
              </button>
            )}
          </div>

          {/* Note Input */}
          {selectedAction !== 'restore' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#30231F] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#722F37]" />
                  <span>Official Instructor Note / Reason (Mandatory):</span>
                </label>
                <span className="text-[10px] text-[#30231F]/60">Visible in official report & audit</span>
              </div>

              <textarea
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Specify the reason for this action (e.g. Student exited fullscreen multiple times and ignored cautionary warning)..."
                className="w-full px-3 py-2 text-xs border border-[#B7A89A] rounded-xl text-[#30231F] focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 font-medium leading-relaxed"
              />

              {/* Quick Presets */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-[#30231F]/60 uppercase tracking-wider">
                  Quick Note Presets:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-[10px] px-2.5 py-1 bg-[#F8F4EC] hover:bg-[#E8DCC6]/60 border border-[#B7A89A]/60 rounded-lg text-[#30231F] transition-colors cursor-pointer text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-[#F8F4EC] rounded-xl p-3 border border-[#E8DCC6] text-[11px] text-[#30231F]/70 leading-relaxed">
            <span className="font-bold text-[#30231F]">Note:</span> In accordance with invigilation standards, JEV analyzes activity and alerts the instructor; academic consequences (fail or discard) are explicitly invoked by the instructor with an accountable note.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#E8DCC6] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#B7A89A] hover:bg-[#E8DCC6]/40 text-[#30231F] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || (selectedAction !== 'restore' && !note.trim())}
            onClick={handleConfirmDecision}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedAction === 'fail'
                ? 'bg-red-700 hover:bg-red-800'
                : selectedAction === 'discard'
                ? 'bg-amber-700 hover:bg-amber-800'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : selectedAction === 'fail' ? (
              <XCircle className="w-4 h-4" />
            ) : selectedAction === 'discard' ? (
              <Ban className="w-4 h-4" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>
              {selectedAction === 'fail'
                ? 'Confirm & Fail Submission'
                : selectedAction === 'discard'
                ? 'Confirm & Discard Submission'
                : 'Restore Submission'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
