const steps = [
  "Set up PostgreSQL and run initial Prisma migration",
  "Implement manual lead intake endpoint",
  "Build leads inbox + lead review screens",
  "Connect n8n Yahoo IMAP workflow to /api/intake/email",
  "Add insights queries and charts"
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <h1>Proposal Intelligence + Portfolio Planner</h1>
        <p>Foundation scaffold is ready. Use docs/BUILD_STEPS.md to execute v0.1 in order.</p>
      </section>
      <section className="card">
        <h2>Immediate Next Steps</h2>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

