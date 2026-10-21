import { ActivityEvent, JEVReview, db } from './db';

export function analyzeAttemptActivity(attemptId: string): JEVReview {
  const events = db.getActivityEventsByAttemptId(attemptId);
  const existingReview = db.getJEVReview(attemptId);

  let tabSwitchCount = 0;
  let totalAwaySeconds = 0;
  let copyPasteAttempts = 0;
  let fullscreenExits = 0;
  let contextMenuAttempts = 0;

  let lastBlurTime: number | null = null;

  for (const ev of events) {
    if (ev.eventType === 'window_blur' || ev.eventType === 'tab_hidden') {
      const now = new Date(ev.timestamp).getTime();
      if (!lastBlurTime || now - lastBlurTime > 1500) {
        tabSwitchCount++;
      }
      lastBlurTime = now;
    } else if (ev.eventType === 'window_focus' || ev.eventType === 'tab_visible') {
      if (lastBlurTime) {
        const diffMs = new Date(ev.timestamp).getTime() - lastBlurTime;
        if (diffMs > 0 && diffMs < 3600000) {
          totalAwaySeconds += Math.round(diffMs / 1000);
        }
        lastBlurTime = null;
      }
    } else if (ev.eventType === 'copy_attempt' || ev.eventType === 'paste_attempt') {
      copyPasteAttempts++;
    } else if (ev.eventType === 'fullscreen_exit') {
      fullscreenExits++;
    } else if (ev.eventType === 'context_menu') {
      contextMenuAttempts++;
    }
  }

  const reasons: string[] = [];
  let riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';

  // JEV Risk-Based Caution System logic:
  // Low Risk: Normal exam activity
  // Medium Risk: A few unusual activities, such as one tab change or copy-paste attempt
  // High Risk: Repeated or serious unusual activity, such as multiple tab changes, fullscreen exits, or copy-paste attempts
  if (
    tabSwitchCount >= 2 ||
    fullscreenExits >= 1 ||
    copyPasteAttempts >= 2 ||
    (tabSwitchCount >= 1 && copyPasteAttempts >= 1) ||
    totalAwaySeconds >= 20
  ) {
    riskLevel = 'High Risk';
    reasons.push('High Risk: Repeated or serious unusual activity detected.');
    if (tabSwitchCount >= 2) {
      reasons.push(`Multiple tab changes detected (${tabSwitchCount} times).`);
    } else if (tabSwitchCount === 1) {
      reasons.push('1 tab change detected.');
    }
    if (fullscreenExits >= 1) {
      reasons.push(`Fullscreen exited (${fullscreenExits} time${fullscreenExits > 1 ? 's' : ''}).`);
    }
    if (copyPasteAttempts >= 2) {
      reasons.push(`Multiple copy-paste attempts detected (${copyPasteAttempts} times).`);
    } else if (copyPasteAttempts === 1) {
      reasons.push('1 copy-paste attempt detected.');
    }
    if (tabSwitchCount >= 1 && copyPasteAttempts >= 1) {
      reasons.push('Combined tab change and restricted clipboard action detected.');
    }
    if (totalAwaySeconds >= 20) {
      reasons.push(`Cumulative away duration of approx ${totalAwaySeconds} seconds.`);
    }
  } else if (
    tabSwitchCount === 1 ||
    copyPasteAttempts === 1 ||
    contextMenuAttempts >= 1 ||
    totalAwaySeconds > 0
  ) {
    riskLevel = 'Medium Risk';
    reasons.push('Medium Risk: A few unusual activities detected.');
    if (tabSwitchCount === 1) {
      const durStr = totalAwaySeconds > 0 ? ` (${totalAwaySeconds}s away)` : '';
      reasons.push(`1 tab change detected${durStr}.`);
    }
    if (copyPasteAttempts === 1) {
      reasons.push('1 copy-paste attempt detected.');
    }
    if (contextMenuAttempts >= 1) {
      reasons.push(`Secondary context menu / right click attempted (${contextMenuAttempts} time${contextMenuAttempts > 1 ? 's' : ''}).`);
    }
  } else {
    riskLevel = 'Low Risk';
    reasons.push('Low Risk: Normal exam activity. Continuous single-window focus maintained on exam paper.');
  }

  const cautions = db.getCautionsByAttemptId(attemptId);

  // Preserve existing review status & notes if teacher already reviewed
  const review: JEVReview = {
    id: existingReview?.id || `jev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    attemptId,
    riskLevel,
    reasons,
    status: existingReview?.status || 'Pending',
    teacherNotes: existingReview?.teacherNotes || '',
    reviewedAt: existingReview?.reviewedAt || new Date().toISOString(),
  };

  db.upsertJEVReview(review);
  return review;
}
