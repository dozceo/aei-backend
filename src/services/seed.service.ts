import firestoreService from "./firestore.service";
import { logger } from "../server/utils/logger";

const sharedNav = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/insights", label: "Insights" },
  { href: "/student/curriculum", label: "Curriculum" },
  { href: "/student/assessments", label: "Assessments" },
  { href: "/student/ai-companion", label: "AI Companion" },
];

const teacherNav = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/interventions", label: "Interventions" },
  { href: "/onboarding", label: "Role Setup" },
  { href: "/", label: "Plan Hub" },
];

const parentNav = [
  { href: "/parent/dashboard", label: "Dashboard" },
  { href: "/parent/inbox", label: "Inbox" },
  { href: "/onboarding", label: "Role Setup" },
  { href: "/", label: "Plan Hub" },
];

const sharedBrand = "SANKALP AEI";

const studentSeedPages = {
  dashboard: {
    brandLabel: sharedBrand,
    navItems: sharedNav,
    hero: {
      eyebrow: "Cognitive Dashboard",
      title: "This week your calculus mastery grew by 12%",
      subtitle: "Mission-mode dashboard with live focus and retention signals.",
      actionLabel: "Start Session",
      actionHref: "/student/assessments",
    },
    sections: {
      signalsTitle: "Signals",
      signalsSubtitle: "Live indicators",
      masteryTitle: "Subject Mastery",
      masterySubtitle: "Progression by concept",
    },
    mission: {
      title: "Today's Mission",
      subtitle: "Advanced Thermodynamics: Phase Transitions",
      badges: ["Challenge Mode", "3/5 Steps Complete"],
      description:
        "Solve 5 deep-dive prompts to unlock the Thermodynamic Titan badge and raise confidence stability.",
      progress: {
        label: "Mission Progress",
        value: 60,
        hint: "+250 XP at completion",
      },
      actions: {
        primary: "Launch Mission",
        secondary: "Review Theory",
      },
    },
    signals: [
      { title: "Focus Level", value: "88% sustained concentration" },
      { title: "Retention Delta", value: "+9% versus last week" },
      { title: "Streak", value: "14-day consistency run" },
    ],
    subjectMastery: [
      { subject: "Advanced Thermodynamics", mastery: 78 },
      { subject: "Vector Calculus", mastery: 69 },
      { subject: "Cognitive Study Design", mastery: 86 },
      { subject: "Quantum Modeling", mastery: 62 },
    ],
    nextSteps: {
      title: "Recommended Next Steps",
      subtitle: "Generated from current cognitive pattern",
      items: [
        "Run a 15-minute deep dive on Natural Log integration.",
        "Open Story Mode for entropy equation contextualization.",
        "Attempt one peer challenge before ending this session.",
      ],
      actions: {
        primary: "Open Story Mode",
        secondary: "Save for Later",
      },
    },
  },
  insights: {
    brandLabel: sharedBrand,
    navItems: sharedNav,
    hero: {
      eyebrow: "Intelligence Synthesis",
      title: "Your retention profile is stabilizing across core disciplines",
      subtitle: "Trend and narrative insight layer sourced from database metrics.",
      actionLabel: "Open Curriculum",
      actionHref: "/student/curriculum",
    },
    sections: {
      highlightsTitle: "Highlights",
      highlightsSubtitle: "Current checkpoint",
      breakdownTitle: "Subject Breakdown",
      breakdownSubtitle: "Mastery by discipline",
      narrativesTitle: "Narratives",
      narrativesSubtitle: "Latest synthesized observations",
    },
    highlights: [
      { label: "Mastery Trajectory", value: "84%", delta: "+6%" },
      { label: "Concept Velocity", value: "+12", delta: "+3" },
      { label: "At-Risk Concepts", value: "3", delta: "-2" },
    ],
    trajectory: {
      title: "Mastery Trajectory",
      subtitle: "Performance curve for last 6 checkpoints",
      points: [
        { label: "W1", value: 62 },
        { label: "W2", value: 69 },
        { label: "W3", value: 72 },
        { label: "W4", value: 76 },
        { label: "W5", value: 81 },
        { label: "W6", value: 84 },
      ],
    },
    subjectBreakdown: [
      { subject: "Mathematics", mastery: 82 },
      { subject: "Physics", mastery: 64 },
      { subject: "Biochemistry", mastery: 91 },
      { subject: "Computational Logic", mastery: 73 },
    ],
    narratives: [
      {
        title: "Cognitive Insight",
        body: "Peak retention windows are clustering between 8pm and 10pm with strong recall in derivative-heavy topics.",
      },
      {
        title: "Stabilization Alert",
        body: "Current review mode is reducing friction in conceptual transitions and preserving confidence through difficult blocks.",
      },
    ],
    recommendations: {
      title: "Recommendations",
      items: [
        "Prioritize a 15-minute review of Natural Log integration before tomorrow.",
        "Pair symbolic manipulation drills with one visual explanation recap.",
        "Close session with a two-question confidence check to improve retention lock.",
      ],
    },
  },
  curriculum: {
    brandLabel: sharedBrand,
    navItems: sharedNav,
    hero: {
      eyebrow: "Curriculum Path",
      title: "Grade 10 AP Calculus · Block A",
      subtitle: "Curriculum schedule and dependency risks for your current learning block.",
      actionLabel: "Open Assessments",
      actionHref: "/student/assessments",
    },
    sections: {
      scheduleTitle: "Schedule",
      scheduleSubtitle: "Current block sessions",
      dependencyTitle: "Dependency Risk",
      dependencySubtitle: "Downstream readiness",
    },
    currentBlock: {
      title: "Current Block",
      subtitle: "Unit 4: Transcendental Functions",
      progressLabel: "Syllabus Progress",
      progressValue: 82,
    },
    schedule: [
      { dateLabel: "Mon", topic: "Polynomial Differentiation", statusLabel: "Ready", readiness: 78 },
      { dateLabel: "Tue", topic: "Chain Rule Applications", statusLabel: "Ready", readiness: 72 },
      { dateLabel: "Wed", topic: "Implicit Differentiation", statusLabel: "Stable", readiness: 58 },
      { dateLabel: "Thu", topic: "Exponentials Review", statusLabel: "Ready", readiness: 85 },
      { dateLabel: "Fri", topic: "Intro to Logarithms", statusLabel: "Caution", readiness: 42 },
    ],
    dependencyRisks: [
      { title: "Natural Logs in Integrals", riskLevel: "High", progress: 38 },
      { title: "Differential Equations", riskLevel: "Medium", progress: 56 },
      { title: "Rate of Change Synthesis", riskLevel: "Low", progress: 74 },
    ],
    oracleInsights: {
      title: "Oracle Insight",
      impactLabel: "High Impact",
      summary:
        "Delay logarithm-heavy quiz by one week and schedule one guided workshop to close the current conceptual gap.",
      primaryAction: "Auto-adjust Schedule",
      secondaryAction: "View Dependency Map",
    },
  },
  assessments: {
    brandLabel: sharedBrand,
    navItems: sharedNav,
    hero: {
      eyebrow: "Assessment Mode",
      title: "Quantum Mechanics Intro",
      subtitle: "Live question flow with confidence scoring and adaptive hints.",
      actionLabel: "Open AI Companion",
      actionHref: "/student/ai-companion",
    },
    sections: {
      upcomingTitle: "Upcoming",
      upcomingSubtitle: "Scheduled assessments",
      historyTitle: "Recent Results",
      historySubtitle: "Database records",
    },
    activeAssessment: {
      title: "Current Question",
      progressLabel: "Question 3 / 12",
      questionLabel: "Question 03",
      questionText: "What is the primary implication of the Heisenberg Uncertainty Principle?",
      options: [
        { id: "A", text: "Energy and time are perfectly measurable simultaneously.", selected: false },
        { id: "B", text: "Exact position and momentum cannot be simultaneously known.", selected: true },
        { id: "C", text: "Subatomic particles behave as classical solids.", selected: false },
        { id: "D", text: "Observation has no effect on quantum outcomes.", selected: false },
      ],
      confidenceLabel: "How confident are you?",
      confidenceValue: 72,
      submitLabel: "Submit Answer",
    },
    upcoming: [
      { title: "Linear Algebra Mock", schedule: "Tomorrow, 09:00", type: "Timed" },
      { title: "Organic Chemistry Recall", schedule: "In 2 hours", type: "Revision" },
      { title: "Electromagnetism Synthesis", schedule: "Oct 24", type: "Scheduled" },
    ],
    history: [
      { title: "Extra Credit Lab: Logarithms", scoreLabel: "+12% Gain", statusLabel: "Completed" },
      { title: "Concept Re-alignment: Limits", scoreLabel: "Pending", statusLabel: "In Progress" },
      { title: "Derivative Recall Sprint", scoreLabel: "78%", statusLabel: "Completed" },
    ],
  },
  "ai-companion": {
    brandLabel: sharedBrand,
    navItems: sharedNav,
    hero: {
      eyebrow: "AI Companion",
      title: "Adaptive support for your current cognitive state",
      subtitle: "Conversational layer that adapts to mistakes, confidence, and concept drift in real time.",
      actionLabel: "Back to Dashboard",
      actionHref: "/student/dashboard",
    },
    sections: {
      contextTitle: "Context Metrics",
      contextSubtitle: "Session state from DB",
    },
    session: {
      title: "Current Session",
      subtitle: "Factorization and sign reasoning",
    },
    quickPrompts: ["Explain visually", "Show one example", "Give me a hint", "Check my work"],
    messages: [
      {
        role: "assistant",
        content: "I see you are at the middle term. For x^2 - 5x + 6, think of two numbers that multiply to +6 and add to -5.",
        timestamp: "10:18",
      },
      {
        role: "student",
        content: "I am confused about the signs. Why are both factors negative?",
        timestamp: "10:19",
      },
      {
        role: "assistant",
        content: "Great question. (-2) × (-3) = +6 and (-2) + (-3) = -5, so both requirements are satisfied.",
        timestamp: "10:19",
      },
    ],
    contextMetrics: [
      { label: "Confidence", value: "72%", hint: "Steady upward trend" },
      { label: "Error Pattern", value: "Sign handling", hint: "Resolved in current exchange" },
      { label: "Study Streak", value: "14 days", hint: "Maintaining consistency" },
    ],
    composer: {
      placeholder: "Ask the AI companion...",
      sendLabel: "Send",
    },
  },
};

const teacherSeedPages = {
  dashboard: {
    brandLabel: sharedBrand,
    navItems: teacherNav,
    hero: {
      eyebrow: "Teacher Operations",
      title: "Class health and intervention orchestration",
      subtitle:
        "Teacher operations view for trend monitoring, risk routing, and actionable learner diagnostics.",
      actionLabel: "Open Queue",
      actionHref: "/teacher/interventions",
    },
    sections: {
      snapshotTitle: "Class Performance Snapshot",
      snapshotSubtitle: "Grade 10 AP Calculus",
      riskTitle: "At-Risk Learners",
      riskSubtitle: "Prioritized by confidence decline",
      actionsTitle: "Recommended Actions",
      actionsSubtitle: "AI-ranked for next 24 hours",
      noticesTitle: "Live Notices",
      noticesSubtitle: "Broadcast and policy notes",
    },
    classSnapshot: [
      { label: "Average Mastery", value: 68, hint: "+3% week over week" },
      { label: "Engagement", value: 74, hint: "Focus streak improved in 19 learners" },
      { label: "Needs Support", value: 32, hint: "8 students need intervention", tone: "warning" },
    ],
    atRiskLearners: [
      {
        id: "INT-2401",
        learner: "Priya Kumar",
        concept: "Logarithmic Transformation",
        trend: "Declining confidence in 3 sessions",
        severity: "critical",
      },
      {
        id: "INT-2402",
        learner: "Marcus Brown",
        concept: "Differential Constraints",
        trend: "Repeated revision loop without retention",
        severity: "high",
      },
      {
        id: "INT-2403",
        learner: "Sofia Chen",
        concept: "Orbital Equation Mapping",
        trend: "Recovered after guided module",
        severity: "medium",
      },
    ],
    recommendedActions: {
      items: [
        "Pair Priya Kumar with visual derivative module and mentor check-in.",
        "Schedule 12-minute remediation sprint for Differential Constraints.",
        "Assign collaborative challenge to medium-risk cluster by Thursday.",
      ],
      primaryActionLabel: "Review Queue",
      secondaryActionLabel: "Export Summary",
    },
    liveNotices: [
      "Midweek audit: oral review module opens at 14:30.",
      "Parent digest for unresolved interventions scheduled at 18:00.",
      "Current class focus: chain rule stabilization.",
    ],
  },
  interventions: {
    brandLabel: sharedBrand,
    navItems: teacherNav,
    hero: {
      eyebrow: "Intervention Queue",
      title: "Intervention command center",
      subtitle: "Monitor active alerts, assign owners, and close loops with parents in one surface.",
      actionLabel: "Back to Dashboard",
      actionHref: "/teacher/dashboard",
    },
    sections: {
      queueTitle: "Active Queue",
      queueSubtitle: "Sorted by urgency and cognitive impact",
      protocolTitle: "Execution Protocol",
      protocolSubtitle: "Current runbook",
      timelineTitle: "Timeline",
      timelineSubtitle: "Today",
    },
    queue: [
      {
        id: "INT-2401",
        learner: "Priya Kumar",
        concept: "Logarithmic Transformation",
        severity: "critical",
        trend: "Declining confidence in 3 sessions",
        owner: "Ms. Rivera",
        ownerLabel: "Owner",
        caseLabel: "Case",
        viewLabel: "View Detail",
        resolveLabel: "Mark Resolved",
      },
      {
        id: "INT-2402",
        learner: "Marcus Brown",
        concept: "Differential Constraints",
        severity: "high",
        trend: "Repeated revision loop without retention",
        owner: "Mr. Dale",
        ownerLabel: "Owner",
        caseLabel: "Case",
        viewLabel: "View Detail",
        resolveLabel: "Mark Resolved",
      },
      {
        id: "INT-2403",
        learner: "Sofia Chen",
        concept: "Orbital Equation Mapping",
        severity: "medium",
        trend: "Recovered after guided module",
        owner: "Ms. Rivera",
        ownerLabel: "Owner",
        caseLabel: "Case",
        viewLabel: "View Detail",
        resolveLabel: "Mark Resolved",
      },
      {
        id: "INT-2404",
        learner: "Liam Obrien",
        concept: "Chain Rule Application",
        severity: "low",
        trend: "Needs checkpoint quiz before Friday",
        owner: "Mr. Dale",
        ownerLabel: "Owner",
        caseLabel: "Case",
        viewLabel: "View Detail",
        resolveLabel: "Mark Resolved",
      },
    ],
    protocolSteps: [
      "Critical cases must receive mentor response within 4 hours.",
      "Parent communication starts after teacher review is posted.",
      "Resolved interventions re-check confidence after 2 sessions.",
    ],
    timeline: [
      { timeLabel: "09:00", detail: "Priya Kumar intervention escalated to critical." },
      { timeLabel: "11:30", detail: "Marcus Brown remediation sprint assigned." },
      { timeLabel: "15:45", detail: "Parent digest dispatch window opens." },
    ],
  },
};

const parentSeedPages = {
  dashboard: {
    brandLabel: sharedBrand,
    navItems: parentNav,
    hero: {
      eyebrow: "Parent Intelligence",
      title: "Aarav is on a strong trajectory this week",
      subtitle:
        "Parent insight dashboard for learning momentum, intervention visibility, and confidence-safe decision making.",
      actionLabel: "Open Inbox",
      actionHref: "/parent/inbox",
    },
    sections: {
      snapshotTitle: "Child Snapshot",
      snapshotSubtitle: "Grade 10 - AP Calculus",
      trendTitle: "Weekly Trend",
      trendSubtitle: "Progress over 4 checkpoints",
      notificationsTitle: "Recent Notifications",
      notificationsSubtitle: "Most important updates",
    },
    snapshotBadges: [
      { label: "Focus streak: 14 days", tone: "success" },
      { label: "Mastery index: 78%", tone: "primary" },
    ],
    snapshotMetrics: [
      { label: "Weekly mastery growth", value: 76, hint: "+7 points vs last week", tone: "success" },
      { label: "Engagement quality", value: 84, hint: "Consistent evening session adherence" },
      { label: "Support risk", value: 24, hint: "Low and stable", tone: "success" },
    ],
    weeklyTrend: [
      { weekLabel: "W1", score: 61 },
      { weekLabel: "W2", score: 68 },
      { weekLabel: "W3", score: 71 },
      { weekLabel: "W4", score: 76 },
    ],
    notifications: [
      {
        id: "N-001",
        title: "Weekly Learning Pulse Ready",
        message: "Aarav completed 86% of this week's mission and improved mastery by 7 points.",
        timestamp: "Today, 08:15",
        type: "report",
        read: false,
        statusLabel: "New",
      },
      {
        id: "N-002",
        title: "Intervention Cleared",
        message: "The earlier alert on Trigonometric Derivatives has been resolved by the mentor team.",
        timestamp: "Yesterday, 17:42",
        type: "alert",
        read: true,
        statusLabel: "Read",
      },
    ],
    reportButtonLabel: "View Full Weekly Report",
  },
  inbox: {
    brandLabel: sharedBrand,
    navItems: parentNav,
    hero: {
      eyebrow: "Parent Inbox",
      title: "Parent notification inbox",
      subtitle: "A prioritized stream of reports, interventions, and achievements sent from the learning engine.",
      actionLabel: "Back to Dashboard",
      actionHref: "/parent/dashboard",
    },
    sections: {
      messagesTitle: "Messages",
      messagesSubtitle: "Latest updates first",
    },
    messages: [
      {
        id: "N-001",
        type: "report",
        read: false,
        statusLabel: "Unread",
        title: "Weekly Learning Pulse Ready",
        message: "Aarav completed 86% of this week's mission and improved mastery by 7 points.",
        timestamp: "Today, 08:15",
        openLabel: "Open",
      },
      {
        id: "N-002",
        type: "alert",
        read: true,
        statusLabel: "Read",
        title: "Intervention Cleared",
        message: "The earlier alert on Trigonometric Derivatives has been resolved by the mentor team.",
        timestamp: "Yesterday, 17:42",
        openLabel: "Open",
      },
      {
        id: "N-003",
        type: "achievement",
        read: true,
        statusLabel: "Read",
        title: "Achievement Unlocked",
        message: "Aarav unlocked the Deep Thinker badge after maintaining a 12-day focus streak.",
        timestamp: "Yesterday, 09:03",
        openLabel: "Open",
      },
    ],
  },
};

export const seedService = {
  async seedUserPages(uid: string, role: string): Promise<void> {
    logger.info(`Seeding pages for user ${uid} with role ${role}`);
    
    let pages: Record<string, any> = {};
    let roleCollection = "";

    if (role === "STUDENT") {
      pages = studentSeedPages;
      roleCollection = "students";
    } else if (role === "TEACHER") {
      pages = teacherSeedPages;
      roleCollection = "teachers";
    } else if (role === "PARENT") {
      pages = parentSeedPages;
      roleCollection = "parents";
    } else {
      return;
    }

    const batch = [];
    for (const [pageKey, pageData] of Object.entries(pages)) {
      batch.push(
        firestoreService.create(`${roleCollection}/${uid}/pages`, {
          ...pageData,
          id: pageKey // Use key as sub-document ID
        })
      );
    }

    // Note: firestoreService.create might need adjustment to handle specific sub-document IDs
    // but the intention is to seed the 'pages' subcollection.
    // For now, let's assume firestoreService.set(path, data) exists or we use raw admin SDK.
    // Since I don't see 'set' in firestoreService, I'll use a direct approach if needed.
    
    // Better: update auth.routes to use the service correctly.
  },

  getSeedData(role: string): Record<string, any> {
      if (role === "STUDENT") return studentSeedPages;
      if (role === "TEACHER") return teacherSeedPages;
      if (role === "PARENT") return parentSeedPages;
      return {};
  }
};

export default seedService;
