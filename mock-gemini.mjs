import http from "node:http";

const roadmap = {
  title: "Data Analyst in 12 Weeks",
  tagline: "From spreadsheets to SQL, Python and a portfolio that gets interviews.",
  targetRole: "Data Analyst",
  difficulty: "beginner",
  totalWeeks: 12,
  weeklyHours: 5,
  outcomes: ["Write SQL joins confidently", "Clean data with pandas", "Ship a dashboard"],
  phases: [
    {
      id: "p1",
      title: "SQL as a thinking tool",
      duration: "Weeks 1-4",
      focus: "Query real tables until joins stop being scary.",
      objectives: ["Model a schema", "Write multi-table joins"],
      skills: ["SQL", "Data modelling"],
      tasks: [
        { title: "Set up a local Postgres", detail: "Install Postgres and load the sample dataset.", hours: 2 },
        { title: "Write 20 join queries", detail: "Solve 20 exercises against the sample schema.", hours: 6 },
        { title: "Explain a schema", detail: "Draw the ERD for the sample DB.", hours: 2 },
      ],
      resources: [
        { title: "PostgreSQL Tutorial", type: "docs", provider: "PostgreSQL", url: "https://www.postgresqltutorial.com", why: "Official-style reference you will return to." },
      ],
      project: { title: "Retail sales queries", brief: "Answer 8 business questions with SQL.", deliverable: "A .sql file plus a results memo." },
      checkpoint: "You can write a 4-table join without copying an example.",
    },
    {
      id: "p2",
      title: "Python for messy data",
      duration: "Weeks 5-8",
      focus: "Turn raw CSVs into clean tables you can defend.",
      objectives: ["Use pandas fluently", "Handle missing data"],
      skills: ["Python", "pandas"],
      tasks: [
        { title: "Clean a dirty CSV", detail: "Fix types, duplicates and nulls in a public dataset.", hours: 5 },
        { title: "Write a notebook", detail: "Document five cleaning decisions and why.", hours: 3 },
        { title: "Automate the clean", detail: "Turn the notebook into a reusable script.", hours: 4 },
      ],
      resources: [
        { title: "pandas docs", type: "docs", provider: "pandas", url: "https://pandas.pydata.org/docs/", why: "The reference covers every edge case you will hit." },
      ],
      project: { title: "City bike usage clean-up", brief: "Clean two years of trip data.", deliverable: "Reusable script and a data-quality report." },
      checkpoint: "You can explain every null-handling choice you made.",
    },
    {
      id: "p3",
      title: "Proof that you can be hired",
      duration: "Weeks 9-12",
      focus: "One dashboard, one write-up, one confident interview story.",
      objectives: ["Build a dashboard", "Present findings"],
      skills: ["Visualisation", "Storytelling"],
      tasks: [
        { title: "Build the dashboard", detail: "Ship a three-view dashboard from cleaned data.", hours: 8 },
        { title: "Write the case study", detail: "One page: question, method, finding, limit.", hours: 3 },
        { title: "Rehearse the walkthrough", detail: "Record a 5-minute screen walkthrough.", hours: 2 },
      ],
      resources: [
        { title: "Storytelling with Data", type: "book", provider: "Cole Nussbaumer Knaflic", url: "", why: "The standard on making charts argue clearly." },
      ],
      project: { title: "Public dashboard", brief: "Publish it where a recruiter can click it.", deliverable: "Live link plus repo." },
      checkpoint: "A stranger can understand your finding in 60 seconds.",
    },
  ],
  milestones: [
    { week: 4, title: "SQL fluency", proof: "20 solved queries committed to GitHub." },
    { week: 8, title: "Cleaning pipeline", proof: "A script someone else can rerun." },
    { week: 12, title: "Portfolio live", proof: "Dashboard and case study published." },
  ],
  finalProject: {
    title: "City mobility analysis",
    brief: "Answer a real question with public data and publish the result.",
    deliverable: "Dashboard, repo and a one-page write-up.",
    skillsShown: ["SQL", "pandas", "Visualisation"],
  },
  successMetrics: ["All 9 tasks ticked", "Dashboard live", "Case study under 500 words"],
  pitfalls: [
    { pitfall: "Tutorial hopping", fix: "Finish one project before starting the next course." },
    { pitfall: "Skipping the write-up", fix: "Write 150 words every Friday." },
  ],
  nextSteps: ["Apply to 5 junior roles per week", "Ask two analysts for feedback"],
};

const transition = {
  headline: "You are closer than you think, but SQL depth decides it.",
  summary:
    "Your teaching background gives you rare communication and stakeholder skills, and your Excel work is a real foundation. The barrier is not intelligence or time, it is demonstrable SQL and Python on messy data.",
  feasibility: {
    score: 62,
    label: "Realistic with effort",
    estimatedMonths: 9,
    reasoning:
      "Explaining complex ideas and curriculum design transfer directly to stakeholder communication, and Excel modelling is a genuine analytical base. Hiring managers will still test SQL depth and independent analysis, which you have not yet shown.",
  },
  currentAssets: ["Explaining complexity to non-experts", "Excel modelling", "Curriculum design"],
  transferable: [
    {
      skill: "Explaining complex ideas",
      strength: "direct",
      whereItHelps: "Stakeholder readouts and dashboard commentary",
      proof: "Reframe lesson plans as stakeholder-facing analysis walkthroughs with outcomes.",
    },
    {
      skill: "Excel",
      strength: "strong",
      whereItHelps: "Quick exploratory analysis and business modelling",
      proof: "Show one workbook that answers a real business question end to end.",
    },
    {
      skill: "Basic Python",
      strength: "partial",
      whereItHelps: "Automating cleaning steps once you know pandas",
      proof: "Publish a cleaning script, not a tutorial certificate.",
    },
  ],
  gaps: [
    { skill: "SQL", priority: "critical", why: "Every analyst interview tests joins and aggregation.", weeks: 6, howToClose: "20 join exercises plus a published query portfolio." },
    { skill: "pandas", priority: "important", why: "Real datasets arrive messy.", weeks: 5, howToClose: "Clean one public dataset per week." },
    { skill: "Dashboarding", priority: "nice-to-have", why: "Makes your work visible.", weeks: 3, howToClose: "Publish one dashboard." },
  ],
  bridgeRoles: [
    { role: "Data-aware operations analyst", why: "Pays now and leans on Excel and reporting.", fit: "high" },
    { role: "EdTech data analyst", why: "Your domain knowledge is an advantage.", fit: "high" },
  ],
  risks: [
    { risk: "Course collecting replaces building", mitigation: "One project per phase, no new course until it ships." },
    { risk: "No visible work", mitigation: "Publish every artifact." },
  ],
  positioning: {
    narrative:
      "Six years teaching maths taught you to make complex ideas land with sceptical audiences. You now pair that with SQL and Python to turn messy data into decisions.",
    headline: "Data Analyst · Educator · SQL + Python",
    resumeBullets: ["Built a dashboard answering X", "Taught 120 students maths"],
    keywords: ["SQL", "Python", "pandas", "dashboard", "stakeholder communication"],
  },
  quickWins: [
    { action: "Publish your best Excel workbook with a write-up", why: "Proves analysis before you finish SQL.", effort: "a weekend" },
    { action: "Rewrite your CV headline", why: "Stops you reading as a teacher only.", effort: "under an hour" },
  ],
  roadmap,
};

const server = http.createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;

  const isTransition = body.includes("career transition");
  console.log(
    `${request.method} ${request.url} bytes=${body.length} schema=${body.includes("responseJsonSchema")} mode=${isTransition ? "transition" : "roadmap"}`,
  );

  const payload = {
    candidates: [
      {
        content: { role: "model", parts: [{ text: JSON.stringify(isTransition ? transition : roadmap) }] },
        finishReason: "STOP",
      },
    ],
  };

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
});

server.listen(4545, () => console.log("mock gemini on 4545"));
