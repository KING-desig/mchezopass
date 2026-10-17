export interface StkResult {
  success: boolean;
  receipt?: string;
  message?: string;
}

// THE MASTER SWITCH: true = simulation, false = real Safaricom Daraja
const MOCK_MODE = true;

// Step 1: Ask Safaricom to send the STK push (PIN prompt) to the phone
export async function requestStkPush(phone: string, amount: number, paymentId: string): Promise<StkResult> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 2000)); // simulate network time
    return { success: true };
  }
  const res = await fetch('/api/mpesa/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, amount, paymentId }),
  });
  return await res.json();
}

// Step 2: The player enters their M-Pesa PIN and the payment completes
export async function completeStkPayment(paymentId: string, pin: string): Promise<StkResult> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 1500));
    if (pin.length !== 4) return { success: false, message: 'Invalid PIN. M-Pesa PINs are 4 digits.' };
    return { success: true, receipt: `MCK${Date.now().toString().slice(-8)}` };
  }
  const res = await fetch('/api/mpesa/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, pin }),
  });
  return await res.json();
}