/** Normalize GET /wallet/balance response for UI. */
export function parseWalletBalance(res) {
  const payload = res?.data ?? res ?? {};
  const total = Number(payload.total ?? 0);
  const locked = Number(payload.locked ?? 0);
  const available = Number(
    payload.withdrawable ?? payload.balance ?? Math.max(total - locked, 0)
  );

  return { total, locked, available };
}
