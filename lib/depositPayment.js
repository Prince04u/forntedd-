const buildPaymentQueryString = ({ upiId, payeeName, amount, note }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    cu: "INR",
  });

  const parsedAmount = Number(amount);
  if (parsedAmount > 0) {
    params.set("am", parsedAmount.toFixed(2));
  }

  if (note) {
    params.set("tn", note);
  }

  return params.toString();
};

export const buildUpiPaymentUri = (options) => `upi://pay?${buildPaymentQueryString(options)}`;

export const buildPaytmPaymentUri = (options) => `paytmmp://pay?${buildPaymentQueryString(options)}`;

export const buildPhonePePaymentUri = (options) => `phonepe://pay?${buildPaymentQueryString(options)}`;

export const getPaymentAppUri = (app, options) => {
  if (app === "paytm") return buildPaytmPaymentUri(options);
  if (app === "phonepe") return buildPhonePePaymentUri(options);
  return buildUpiPaymentUri(options);
};

export const openPaymentApp = (app, options) => {
  if (!options?.upiId) return false;

  const query = buildPaymentQueryString(options);
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  if (app === "paytm") {
    if (isAndroid) {
      window.location.href = `intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`;
      return true;
    }
    window.location.href = buildPaytmPaymentUri(options);
    return true;
  }

  if (app === "phonepe") {
    if (isAndroid) {
      window.location.href = `intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`;
      return true;
    }
    window.location.href = buildPhonePePaymentUri(options);
    return true;
  }

  window.location.href = buildUpiPaymentUri(options);
  return true;
};
