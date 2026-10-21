export interface SynthesizedQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'long_answer';
  text: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  explanation: string;
  rubric?: string;
}

interface QuestionTemplate {
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

// Comprehensive Academic Question Banks
const CS_MCQS: QuestionTemplate[] = [
  {
    text: 'In Python, what is the average-case time complexity of retrieving a value by its key in a dictionary?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctAnswer: 'O(1)',
    explanation: 'Python dictionaries utilize optimized hash tables, providing O(1) expected time for lookup operations.',
  },
  {
    text: 'Which data structure follows the First-In, First-Out (FIFO) principle for element processing?',
    options: ['Queue', 'Stack', 'Binary Search Tree', 'Max Heap'],
    correctAnswer: 'Queue',
    explanation: 'A Queue processes items in the exact chronological order of their arrival (FIFO), unlike a Stack (LIFO).',
  },
  {
    text: 'Which sorting algorithm guarantees an O(n log n) time complexity in the worst-case scenario?',
    options: ['Merge Sort', 'Quick Sort', 'Bubble Sort', 'Selection Sort'],
    correctAnswer: 'Merge Sort',
    explanation: 'Merge Sort consistently divides the input array in half and merges sorted sub-arrays in linear time.',
  },
  {
    text: 'In Object-Oriented Programming, what term describes bundling data and the methods that operate on that data within a single unit?',
    options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
    correctAnswer: 'Encapsulation',
    explanation: 'Encapsulation restricts direct access to some of an object’s components to prevent unintended interference.',
  },
  {
    text: 'In computer networking, which layer of the OSI model is responsible for end-to-end communication, error recovery, and flow control?',
    options: ['Transport Layer', 'Network Layer', 'Data Link Layer', 'Session Layer'],
    correctAnswer: 'Transport Layer',
    explanation: 'The Transport layer (Layer 4), where TCP operates, provides reliable host-to-host communication services.',
  },
  {
    text: 'What is the primary role of an Operating System process scheduler?',
    options: [
      'Allocate CPU execution time among ready processes',
      'Translate high-level source code into binary machine code',
      'Manage firewall rules and outbound network packets',
      'Format physical secondary storage drives',
    ],
    correctAnswer: 'Allocate CPU execution time among ready processes',
    explanation: 'The CPU scheduler determines which ready state process will be assigned the processor for execution.',
  },
];

const CS_TF: QuestionTemplate[] = [
  {
    text: 'In Python, tuples are immutable sequence structures that cannot be modified after creation.',
    correctAnswer: 'True',
    explanation: 'Tuples cannot have elements appended, updated, or removed once initialized in memory.',
  },
  {
    text: 'Binary Search can be executed directly on an unsorted array with O(log n) efficiency.',
    correctAnswer: 'False',
    explanation: 'Binary Search strictly requires the underlying collection to be ordered to make divide-and-conquer decisions.',
  },
  {
    text: 'HTTP is a stateless protocol that inherently retains client session context across discrete requests.',
    correctAnswer: 'False',
    explanation: 'HTTP is stateless by design; session state is managed via cookies, JWTs, or server-side sessions.',
  },
  {
    text: 'A recursive function must define at least one base case to prevent an infinite call stack overflow.',
    correctAnswer: 'True',
    explanation: 'Without a reachable base termination condition, recursive calls continue until memory limits are exceeded.',
  },
];

const DBMS_MCQS: QuestionTemplate[] = [
  {
    text: 'Which relational normal form specifically eliminates transitive functional dependencies on the primary key?',
    options: ['Third Normal Form (3NF)', 'Second Normal Form (2NF)', 'First Normal Form (1NF)', 'Boyce-Codd Normal Form (BCNF)'],
    correctAnswer: 'Third Normal Form (3NF)',
    explanation: '3NF ensures relations are in 2NF and that no non-prime attribute is transitively dependent on any candidate key.',
  },
  {
    text: 'What does the "I" signify in the ACID properties of database transaction processing?',
    options: ['Isolation', 'Integrity', 'Idempotency', 'Indexation'],
    correctAnswer: 'Isolation',
    explanation: 'Isolation ensures concurrent transaction executions result in a system state that would be obtained if executed sequentially.',
  },
  {
    text: 'Which SQL clause is used to filter records resulting from aggregate operations such as COUNT() or SUM()?',
    options: ['HAVING', 'WHERE', 'GROUP BY', 'QUALIFY'],
    correctAnswer: 'HAVING',
    explanation: 'HAVING applies filtering conditions on aggregated values after GROUP BY is evaluated.',
  },
  {
    text: 'What data structure is most commonly utilized by relational database engines to optimize index search and range queries?',
    options: ['B+ Tree', 'Hash Map', 'Red-Black Tree', 'Singly Linked List'],
    correctAnswer: 'B+ Tree',
    explanation: 'B+ Trees provide balanced shallow tree heights and sequential leaf node linking ideal for disk I/O and range scans.',
  },
];

const DBMS_TF: QuestionTemplate[] = [
  {
    text: 'A primary key constraint permits a single NULL value if all other records contain distinct values.',
    correctAnswer: 'False',
    explanation: 'Entity integrity strictly mandates that primary key columns cannot contain NULL values.',
  },
  {
    text: 'A foreign key constraint enforces referential integrity between related relational database tables.',
    correctAnswer: 'True',
    explanation: 'Foreign keys ensure values must match an existing primary/candidate key in the referenced table or be NULL.',
  },
  {
    text: 'The SQL TRUNCATE command is a DML statement that logs every individual row deletion in the database transaction log.',
    correctAnswer: 'False',
    explanation: 'TRUNCATE is a DDL operation that deallocates data pages rapidly with minimal logging compared to DELETE.',
  },
];

const MATH_MCQS: QuestionTemplate[] = [
  {
    text: 'What is the derivative of f(x) = 4x^3 - 5x^2 + 9x - 12 with respect to x?',
    options: ['12x^2 - 10x + 9', '12x^3 - 10x^2 + 9', '4x^2 - 5x + 9', '12x^2 - 5x + 9'],
    correctAnswer: '12x^2 - 10x + 9',
    explanation: 'Using the power rule d/dx(x^n) = n*x^(n-1), we obtain 12x^2 - 10x + 9.',
  },
  {
    text: 'What is the value of log2(64)?',
    options: ['6', '8', '32', '16'],
    correctAnswer: '6',
    explanation: 'Because 2 raised to the 6th power equals 64 (2^6 = 64), log2(64) = 6.',
  },
  {
    text: 'In linear algebra, what must be true about the determinant of an invertible (non-singular) square matrix?',
    options: ['The determinant is non-zero', 'The determinant equals zero', 'The determinant must be positive', 'The determinant equals one'],
    correctAnswer: 'The determinant is non-zero',
    explanation: 'A matrix possesses an inverse if and only if its determinant is non-zero (det(A) != 0).',
  },
  {
    text: 'What is the sum of the interior angles of a convex polygon with n sides?',
    options: ['(n - 2) * 180°', 'n * 180°', '(n + 2) * 180°', '360° / n'],
    correctAnswer: '(n - 2) * 180°',
    explanation: 'A convex polygon can be divided into (n - 2) non-overlapping triangles, each totaling 180 degrees.',
  },
];

const MATH_TF: QuestionTemplate[] = [
  {
    text: 'If a function is differentiable at a given point x = c, it is guaranteed to be continuous at x = c.',
    correctAnswer: 'True',
    explanation: 'Differentiability strictly implies continuity, though the converse is not always true.',
  },
  {
    text: 'The transpose of an orthogonal square matrix Q is always identical to its inverse matrix Q^-1.',
    correctAnswer: 'True',
    explanation: 'By definition of an orthogonal matrix, Q^T * Q = I, which means Q^T = Q^-1.',
  },
  {
    text: 'In standard probability theory, the probability of the union of any two events P(A ∪ B) is always equal to P(A) + P(B).',
    correctAnswer: 'False',
    explanation: 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B); equality only holds if the events are mutually exclusive.',
  },
];

const PHYSICS_MCQS: QuestionTemplate[] = [
  {
    text: 'According to Newton’s Second Law of Motion, what is the mathematical relation between net force, mass, and acceleration?',
    options: ['F = m * a', 'F = m / a', 'F = 0.5 * m * v^2', 'F = m * g * h'],
    correctAnswer: 'F = m * a',
    explanation: 'Newton’s second law states that net force equals the time rate of change of momentum, simplifying to F = m*a for constant mass.',
  },
  {
    text: 'Which law of thermodynamics states that the entropy of an isolated system always increases over time in any spontaneous process?',
    options: ['Second Law of Thermodynamics', 'First Law of Thermodynamics', 'Third Law of Thermodynamics', 'Zeroth Law of Thermodynamics'],
    correctAnswer: 'Second Law of Thermodynamics',
    explanation: 'The Second Law establishes that natural processes have a preferred direction that maximizes total entropy.',
  },
  {
    text: 'What phenomenon causes a wave to change direction and speed when passing from one medium into another medium of different optical density?',
    options: ['Refraction', 'Diffraction', 'Polarization', 'Interference'],
    correctAnswer: 'Refraction',
    explanation: 'Refraction occurs when wave phase velocity changes across media boundaries, bending the trajectory according to Snell’s Law.',
  },
  {
    text: 'What fundamental particle carries the electromagnetic force in quantum electrodynamics?',
    options: ['Photon', 'Gluon', 'Graviton', 'W Boson'],
    correctAnswer: 'Photon',
    explanation: 'Photons are the gauge bosons mediating electromagnetic interactions between charged particles.',
  },
];

const PHYSICS_TF: QuestionTemplate[] = [
  {
    text: 'An object moving in a circle at a constant speed has zero acceleration.',
    correctAnswer: 'False',
    explanation: 'Because velocity direction is continuously changing, the object experiences centripetal acceleration directed toward the center.',
  },
  {
    text: 'In an elastic collision between two isolated bodies, both total momentum and total kinetic energy are conserved.',
    correctAnswer: 'True',
    explanation: 'Elastic collisions conserve both mechanical kinetic energy and linear momentum.',
  },
  {
    text: 'Electromagnetic waves require a physical material medium through which to propagate.',
    correctAnswer: 'False',
    explanation: 'Electromagnetic waves propagate through a vacuum at the speed of light c without requiring a medium.',
  },
];

const BIO_MCQS: QuestionTemplate[] = [
  {
    text: 'Which organelle is recognized as the principal site of cellular respiration and ATP synthesis in eukaryotic cells?',
    options: ['Mitochondria', 'Endoplasmic Reticulum', 'Golgi Apparatus', 'Lysosome'],
    correctAnswer: 'Mitochondria',
    explanation: 'Mitochondria generate the majority of cellular adenosine triphosphate (ATP) via the Krebs cycle and oxidative phosphorylation.',
  },
  {
    text: 'Which enzyme synthesizes complementary DNA strands by adding deoxynucleotides during DNA replication?',
    options: ['DNA Polymerase', 'RNA Helicase', 'Topoisomerase', 'DNA Ligase'],
    correctAnswer: 'DNA Polymerase',
    explanation: 'DNA Polymerase synthesizes new DNA strands in the 5\' to 3\' direction using existing template strands.',
  },
  {
    text: 'Which nitrogenous base is incorporated into RNA molecules in place of Thymine found in DNA?',
    options: ['Uracil', 'Guanine', 'Cytosine', 'Adenine'],
    correctAnswer: 'Uracil',
    explanation: 'RNA incorporates Uracil (U), which forms two hydrogen bonds with Adenine (A).',
  },
  {
    text: 'During which phase of mitosis do paired sister chromatids align along the equatorial plane of the dividing cell?',
    options: ['Metaphase', 'Prophase', 'Anaphase', 'Telophase'],
    correctAnswer: 'Metaphase',
    explanation: 'During metaphase, spindle fibers position chromosomes along the central metaphase plate.',
  },
];

const BIO_TF: QuestionTemplate[] = [
  {
    text: 'Enzymes function as biological catalysts by lowering the activation energy required for chemical reactions.',
    correctAnswer: 'True',
    explanation: 'Enzymes stabilize transition states, substantially accelerating reaction rates without being consumed.',
  },
  {
    text: 'Plant cells lack mitochondria because chloroplasts perform all necessary energetic functions.',
    correctAnswer: 'False',
    explanation: 'Plant cells have both chloroplasts (for photosynthesis) and mitochondria (for ATP production via respiration).',
  },
  {
    text: 'Passive transport of substances across a cell membrane requires the hydrolysis of metabolic ATP.',
    correctAnswer: 'False',
    explanation: 'Passive transport proceeds along concentration gradients without metabolic energy input.',
  },
];

const CHEMISTRY_MCQS: QuestionTemplate[] = [
  {
    text: 'What type of chemical bond is formed when electrons are shared equally between two atoms of identical electronegativity?',
    options: ['Nonpolar Covalent Bond', 'Polar Covalent Bond', 'Ionic Bond', 'Hydrogen Bond'],
    correctAnswer: 'Nonpolar Covalent Bond',
    explanation: 'When electronegativities are identical, bonding electrons are shared equally, resulting in no dipole moment.',
  },
  {
    text: 'According to Le Chatelier’s Principle, what will happen to an exothermic reaction at equilibrium if temperature is increased?',
    options: [
      'The equilibrium shifts toward the reactants',
      'The equilibrium shifts toward the products',
      'The equilibrium constant increases substantially',
      'The reaction ceases completely',
    ],
    correctAnswer: 'The equilibrium shifts toward the reactants',
    explanation: 'Adding heat to an exothermic system causes the system to absorb heat by shifting in the reverse (endothermic) direction.',
  },
  {
    text: 'What is the pH of a neutral aqueous solution at standard temperature (25°C)?',
    options: ['7.0', '1.0', '14.0', '0.0'],
    correctAnswer: '7.0',
    explanation: 'At 25°C, [H+] = [OH-] = 1.0 x 10^-7 M, resulting in -log(10^-7) = 7.0.',
  },
  {
    text: 'What is the value of Avogadro’s constant representing the number of entities in one mole of substance?',
    options: ['6.022 x 10^23', '3.00 x 10^8', '1.602 x 10^-19', '9.81 x 10^2'],
    correctAnswer: '6.022 x 10^23',
    explanation: 'Avogadro’s number defines the number of constituent particles (atoms or molecules) in one mole.',
  },
];

const CHEMISTRY_TF: QuestionTemplate[] = [
  {
    text: 'Catalysts accelerate chemical reactions by shifting the thermodynamic equilibrium to produce higher product yields.',
    correctAnswer: 'False',
    explanation: 'Catalysts increase reaction rate by lowering activation energy but do NOT alter the final equilibrium position.',
  },
  {
    text: 'Noble gases in Group 18 of the periodic table exhibit low chemical reactivity due to having a stable, complete valence shell.',
    correctAnswer: 'True',
    explanation: 'A full valence shell provides noble gases with high thermodynamic stability and low electronegativity/affinity.',
  },
  {
    text: 'Oxidation is defined as the gain of electrons during a reduction-oxidation (redox) chemical reaction.',
    correctAnswer: 'False',
    explanation: 'Oxidation is the LOSS of electrons (OIL RIG: Oxidation Is Loss, Reduction Is Gain).',
  },
];

const HISTORY_MCQS: QuestionTemplate[] = [
  {
    text: 'Which naval engagement in June 1942 is widely regarded as the critical turning point in the Pacific Theater of World War II?',
    options: ['Battle of Midway', 'Battle of the Coral Sea', 'Battle of Iwo Jima', 'Battle of Leyte Gulf'],
    correctAnswer: 'Battle of Midway',
    explanation: 'The U.S. victory at Midway destroyed four Japanese fleet carriers, halting imperial expansion in the Pacific.',
  },
  {
    text: 'Which treaty signed in 1919 officially concluded hostilities between the Allied Powers and Germany following World War I?',
    options: ['Treaty of Versailles', 'Treaty of Westphalia', 'Treaty of Utrecht', 'Treaty of Ghent'],
    correctAnswer: 'Treaty of Versailles',
    explanation: 'The 1919 Treaty of Versailles established terms of peace and the League of Nations following WWI.',
  },
  {
    text: 'What major international conflict between 1947 and 1991 was characterized by geopolitical tension between the US and USSR without direct open military conflict?',
    options: ['The Cold War', 'The Franco-Prussian War', 'The Crimean War', 'The Seven Years War'],
    correctAnswer: 'The Cold War',
    explanation: 'The Cold War was waged through ideological competition, nuclear deterrence, proxy wars, and space exploration.',
  },
  {
    text: 'Which ancient civilization constructed the Code of Hammurabi, one of the earliest surviving written legal systems?',
    options: ['Babylonian Empire', 'Ancient Greece', 'Roman Republic', 'Egyptian Middle Kingdom'],
    correctAnswer: 'Babylonian Empire',
    explanation: 'King Hammurabi of Babylon enacted this comprehensive legal code inscribed on stone stelae around 1750 BCE.',
  },
];

const HISTORY_TF: QuestionTemplate[] = [
  {
    text: 'The United States was an original member state of the League of Nations following World War I.',
    correctAnswer: 'False',
    explanation: 'The U.S. Senate voted against ratifying the Treaty of Versailles, preventing U.S. accession to the League.',
  },
  {
    text: 'The Magna Carta, signed in 1215 at Runnymede, established the principle that everyone, even the king, is subject to the law.',
    correctAnswer: 'True',
    explanation: 'The charter restricted monarchical power and protected feudal rights, laying roots for modern constitutionalism.',
  },
  {
    text: 'The Industrial Revolution originated in Great Britain during the late 18th century before spreading globally.',
    correctAnswer: 'True',
    explanation: 'Abundant coal, iron, capital markets, and technological innovations like the steam engine fostered British industrialization.',
  },
];

const ECONOMICS_MCQS: QuestionTemplate[] = [
  {
    text: 'What economic law states that, all else equal, as the price of a good increases, the quantity demanded by consumers decreases?',
    options: ['Law of Demand', 'Law of Supply', 'Law of Diminishing Marginal Utility', 'Say’s Law'],
    correctAnswer: 'Law of Demand',
    explanation: 'The Law of Demand describes the inverse relationship between market price and quantity demanded.',
  },
  {
    text: 'What term describes a market structure dominated by a small number of large, interdependent seller firms?',
    options: ['Oligopoly', 'Monopoly', 'Perfect Competition', 'Monopsony'],
    correctAnswer: 'Oligopoly',
    explanation: 'An oligopoly features high barriers to entry and mutual interdependence among a small group of dominant producers.',
  },
  {
    text: 'Which macroeconomic indicator measures the total monetary value of all finished goods and services produced within a country’s borders over a period?',
    options: ['Gross Domestic Product (GDP)', 'Consumer Price Index (CPI)', 'Gross National Income (GNI)', 'Balance of Trade'],
    correctAnswer: 'Gross Domestic Product (GDP)',
    explanation: 'GDP is the comprehensive standard measure of domestic productive economic activity.',
  },
  {
    text: 'What central banking mechanism involves buying and selling government securities to regulate money supply and interest rates?',
    options: ['Open Market Operations', 'Reserve Ratio adjustments', 'Fiscal stimulus packages', 'Tariff quota schedules'],
    correctAnswer: 'Open Market Operations',
    explanation: 'Central banks buy or sell bonds on the open market to influence commercial banking reserves and interbank rates.',
  },
];

const ECONOMICS_TF: QuestionTemplate[] = [
  {
    text: 'Inflation represents a sustained increase in the general price level of goods and services over time.',
    correctAnswer: 'True',
    explanation: 'Inflation diminishes the purchasing power per unit of currency over time.',
  },
  {
    text: 'In perfectly competitive markets in long-run equilibrium, firms earn positive economic supernormal profits.',
    correctAnswer: 'False',
    explanation: 'Free entry and exit drive economic profit to zero in long-run perfectly competitive equilibrium.',
  },
  {
    text: 'Fiscal policy refers to decisions made by independent central banks regarding benchmark interest rates.',
    correctAnswer: 'False',
    explanation: 'Fiscal policy refers to government taxation and spending; interest rate policy is monetary policy.',
  },
];

// Helper to select and clone questions
function selectQuestions(
  pool: QuestionTemplate[],
  count: number,
  marks: number,
  type: 'multiple_choice' | 'true_false'
): SynthesizedQuestion[] {
  const result: SynthesizedQuestion[] = [];
  if (pool.length === 0) return result;

  for (let i = 0; i < count; i++) {
    const item = pool[i % pool.length];
    result.push({
      type,
      text: item.text,
      options: type === 'multiple_choice' ? [...(item.options || ['Option A', 'Option B', 'Option C', 'Option D'])] : ['True', 'False'],
      correctAnswer: item.correctAnswer,
      marks,
      explanation: item.explanation || 'Verified curriculum standard answer.',
      rubric: `Full marks (${marks}) for the accurate answer.`,
    });
  }
  return result;
}

// Generate intelligent contextual questions for any arbitrary subject
function generateContextualQuestions(
  subject: string,
  topics: string,
  mcqCount: number,
  tfCount: number,
  marksPerMcq: number,
  marksPerTf: number
): SynthesizedQuestion[] {
  const questions: SynthesizedQuestion[] = [];
  const cleanSubject = subject.trim();
  const cleanTopics = topics.trim() || 'core foundational curriculum';

  const mcqTemplates = [
    {
      text: (s: string, t: string) => `In ${s}, what is the primary objective of studying ${t}?`,
      options: [
        `To analyze foundational mechanisms and apply empirical principles systematically`,
        `To eliminate the need for systematic testing and documented verification`,
        `To replace standardized methodologies with random heuristic approximations`,
        `To establish purely speculative hypotheses without experimental support`,
      ],
      correctAnswer: `To analyze foundational mechanisms and apply empirical principles systematically`,
      explanation: (s: string, t: string) => `Studying ${t} in ${s} emphasizes systematic understanding, empirical verification, and analytical rigor.`,
    },
    {
      text: (s: string, t: string) => `Which of the following best characterizes a standard best practice when analyzing ${t} in ${s}?`,
      options: [
        `Validating hypotheses against established theoretical models and controlled data`,
        `Relying exclusively on unverified assumptions without peer review`,
        `Discarding reproducible baseline measurements whenever variance occurs`,
        `Ignoring edge conditions and domain boundary limits`,
      ],
      correctAnswer: `Validating hypotheses against established theoretical models and controlled data`,
      explanation: (s: string, t: string) => `Rigorous academic inquiry in ${s} demands validation against documented baselines and theoretical frameworks.`,
    },
    {
      text: (s: string, t: string) => `When evaluating problem-solving approaches in ${s} (${t}), what factor is most critical for accuracy?`,
      options: [
        `Consistency, precision in measurement, and adherence to domain principles`,
        `Arbitrary selection of metrics based on subjective preference`,
        `Minimizing documentation to expedite theoretical conclusions`,
        `Treating correlation as conclusive proof of underlying causation`,
      ],
      correctAnswer: `Consistency, precision in measurement, and adherence to domain principles`,
      explanation: (s: string, t: string) => `Precision, reproducible methods, and domain consistency form the bedrock of valid conclusions in ${s}.`,
    },
    {
      text: (s: string, t: string) => `In advanced applications of ${s}, how does understanding ${t} influence practical outcomes?`,
      options: [
        `It provides predictable frameworks for troubleshooting and optimization`,
        `It isolates practitioners from evolving technological innovations`,
        `It guarantees that external environmental factors have zero impact`,
        `It eliminates the need for qualitative and quantitative data checks`,
      ],
      correctAnswer: `It provides predictable frameworks for troubleshooting and optimization`,
      explanation: (s: string, t: string) => `Comprehending ${t} enables practitioners to design, optimize, and troubleshoot complex systems in ${s}.`,
    },
    {
      text: (s: string, t: string) => `Which metric or criterion serves as the standard benchmark for quality in ${s} (${t})?`,
      options: [
        `Reproducibility, efficiency, and adherence to verified specifications`,
        `Subjective popularity among unverified public opinions`,
        `Complete absence of formal documentation or records`,
        `Random execution without pre-established constraints`,
      ],
      correctAnswer: `Reproducibility, efficiency, and adherence to verified specifications`,
      explanation: (s: string, t: string) => `Quality benchmarks in ${s} rely on reproducible outcomes and adherence to defined standards.`,
    },
  ];

  const tfTemplates = [
    {
      text: (s: string, t: string) => `In ${s}, rigorous verification and adherence to core principles of ${t} are essential for valid results.`,
      correctAnswer: 'True',
      explanation: (s: string, t: string) => `Controlled methodology and verified principles are fundamental across ${s}.`,
    },
    {
      text: (s: string, t: string) => `In the context of ${s}, theoretical models for ${t} can be conclusively proven true without any empirical observation.`,
      correctAnswer: 'False',
      explanation: (s: string, t: string) => `Academic and scientific disciplines require empirical data or rigorous proofs; theoretical models require validation.`,
    },
    {
      text: (s: string, t: string) => `Systematic documentation of methodologies in ${s} allows independent peers to reproduce and verify outcomes.`,
      correctAnswer: 'True',
      explanation: (s: string, t: string) => `Reproducibility through clear documentation is an essential standard in ${s}.`,
    },
    {
      text: (s: string, t: string) => `In ${s}, changes in baseline parameters of ${t} will never affect overall system performance or conclusions.`,
      correctAnswer: 'False',
      explanation: (s: string, t: string) => `System parameters directly influence operational outcomes and experimental conclusions in ${s}.`,
    },
  ];

  for (let i = 0; i < mcqCount; i++) {
    const tpl = mcqTemplates[i % mcqTemplates.length];
    questions.push({
      type: 'multiple_choice',
      text: tpl.text(cleanSubject, cleanTopics),
      options: [...tpl.options],
      correctAnswer: tpl.correctAnswer,
      marks: marksPerMcq,
      explanation: tpl.explanation(cleanSubject, cleanTopics),
      rubric: `Award ${marksPerMcq} marks for identifying the correct analytical principle.`,
    });
  }

  for (let j = 0; j < tfCount; j++) {
    const tpl = tfTemplates[j % tfTemplates.length];
    questions.push({
      type: 'true_false',
      text: tpl.text(cleanSubject, cleanTopics),
      options: ['True', 'False'],
      correctAnswer: tpl.correctAnswer,
      marks: marksPerTf,
      explanation: tpl.explanation(cleanSubject, cleanTopics),
      rubric: `Award ${marksPerTf} marks for the correct Boolean determination.`,
    });
  }

  return questions;
}

export function synthesizeQuestions(params: {
  subject: string;
  topics?: string;
  mcqCount: number;
  tfCount: number;
  marksPerMcq?: number;
  marksPerTf?: number;
}): SynthesizedQuestion[] {
  const {
    subject,
    topics = '',
    mcqCount = 3,
    tfCount = 2,
    marksPerMcq = 2,
    marksPerTf = 1,
  } = params;

  const targetMcq = Math.max(0, mcqCount);
  const targetTf = Math.max(0, tfCount);
  const subLower = (subject + ' ' + topics).toLowerCase();

  let mcqPool: QuestionTemplate[] = [];
  let tfPool: QuestionTemplate[] = [];

  if (
    subLower.includes('dbms') ||
    subLower.includes('database') ||
    subLower.includes('sql') ||
    subLower.includes('relational')
  ) {
    mcqPool = DBMS_MCQS;
    tfPool = DBMS_TF;
  } else if (
    subLower.includes('python') ||
    subLower.includes('programming') ||
    subLower.includes('computer') ||
    subLower.includes('software') ||
    subLower.includes('code') ||
    subLower.includes('java') ||
    subLower.includes('c++') ||
    subLower.includes('algorithm') ||
    subLower.includes('network')
  ) {
    mcqPool = CS_MCQS;
    tfPool = CS_TF;
  } else if (
    subLower.includes('math') ||
    subLower.includes('calculus') ||
    subLower.includes('algebra') ||
    subLower.includes('geometry') ||
    subLower.includes('trig') ||
    subLower.includes('statistic')
  ) {
    mcqPool = MATH_MCQS;
    tfPool = MATH_TF;
  } else if (
    subLower.includes('physics') ||
    subLower.includes('motion') ||
    subLower.includes('mechanic') ||
    subLower.includes('thermodynamic') ||
    subLower.includes('gravity') ||
    subLower.includes('quantum')
  ) {
    mcqPool = PHYSICS_MCQS;
    tfPool = PHYSICS_TF;
  } else if (
    subLower.includes('bio') ||
    subLower.includes('genetics') ||
    subLower.includes('cell') ||
    subLower.includes('life') ||
    subLower.includes('anatomy') ||
    subLower.includes('organism')
  ) {
    mcqPool = BIO_MCQS;
    tfPool = BIO_TF;
  } else if (
    subLower.includes('chem') ||
    subLower.includes('organic') ||
    subLower.includes('reaction') ||
    subLower.includes('periodic') ||
    subLower.includes('molecule')
  ) {
    mcqPool = CHEMISTRY_MCQS;
    tfPool = CHEMISTRY_TF;
  } else if (
    subLower.includes('history') ||
    subLower.includes('war') ||
    subLower.includes('civilization') ||
    subLower.includes('empire') ||
    subLower.includes('revolution')
  ) {
    mcqPool = HISTORY_MCQS;
    tfPool = HISTORY_TF;
  } else if (
    subLower.includes('econ') ||
    subLower.includes('finance') ||
    subLower.includes('market') ||
    subLower.includes('commerce') ||
    subLower.includes('trade') ||
    subLower.includes('gdp')
  ) {
    mcqPool = ECONOMICS_MCQS;
    tfPool = ECONOMICS_TF;
  }

  // If matched to a specific academic bank, use it
  if (mcqPool.length > 0 && tfPool.length > 0) {
    const mcqRes = selectQuestions(mcqPool, targetMcq, marksPerMcq, 'multiple_choice');
    const tfRes = selectQuestions(tfPool, targetTf, marksPerTf, 'true_false');
    return [...mcqRes, ...tfRes];
  }

  // Otherwise, synthesize intelligent contextual questions tailored to the subject and topic
  return generateContextualQuestions(
    subject,
    topics,
    targetMcq,
    targetTf,
    marksPerMcq,
    marksPerTf
  );
}
