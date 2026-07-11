import "./k3.css";

export const metadata = {
  title: "K3 Lottery",
  description: "Play K3 Lottery on Lucky Nova",
};

export default function K3Layout({ children }) {
  return <div className="k3-layout">{children}</div>;
}
