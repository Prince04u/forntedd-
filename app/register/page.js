import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";

function RegisterLoading() {
  return (
    <main className="auth-page">
      <div className="auth-body" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        Loading...
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
