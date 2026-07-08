"use client";

export default function PhoneInput({ value, onChange, id = "mobile", name = "mobile" }) {
  return (
    <div className="auth-phone-row">
      <div className="auth-country-code">
        <span>+91</span>
        <span className="auth-chevron">▾</span>
      </div>
      <input
        id={id}
        name={name}
        type="tel"
        value={value}
        onChange={onChange}
        placeholder="Please enter the phone number"
        required
        className="auth-input auth-phone-input"
      />
    </div>
  );
}
