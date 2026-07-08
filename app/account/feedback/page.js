"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken } from "@/lib/auth";
import { submitFeedback } from "@/lib/userApi";

const CATEGORIES = [
  { id: "account", label: "Account" },
  { id: "deposit", label: "Deposit" },
  { id: "withdrawal", label: "Withdrawal" },
  { id: "game", label: "Game" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "account" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setTicketNumber("");

    try {
      const res = await submitFeedback(form);
      setTicketNumber(res.data?.ticketNumber || "");
      setForm({ subject: "", description: "", category: "account" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="account-page">
        <div className="account-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="account-page account-sub-page">
      <AccountSubHeader title="Feedback" />

      <form className="account-form" onSubmit={handleSubmit}>
        {error && <div className="account-form-error">{error}</div>}
        {ticketNumber ? (
          <div className="account-form-success">
            Thank you! Your ticket <strong>{ticketNumber}</strong> has been submitted.
          </div>
        ) : null}

        <section className="account-form-section">
          <label className="account-form-label">Category</label>
          <div className="account-form-row">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`account-chip ${form.category === item.id ? "active" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, category: item.id }))}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="feedback-subject">
            Subject
          </label>
          <input
            id="feedback-subject"
            className="account-form-input"
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            required
            minLength={3}
          />
        </section>

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="feedback-description">
            Details
          </label>
          <textarea
            id="feedback-description"
            className="account-form-textarea"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            required
            minLength={10}
            rows={5}
          />
        </section>

        <button type="submit" className="account-form-submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit feedback"}
        </button>
      </form>

      <p className="account-form-hint account-kyc-help">
        Urgent issue? <Link href="/support" className="account-inline-link">Contact support</Link>
      </p>
    </main>
  );
}
