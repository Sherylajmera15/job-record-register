import { CalcResult } from '@/types';

export function calculateJob(
  orderQty: number,
  ups: number,
  sheetL: number,
  sheetW: number,
  gsm: number,
): CalcResult | null {
  if (!orderQty || !ups || !sheetL || !sheetW || !gsm) return null;
  if (orderQty <= 0 || ups <= 0 || sheetL <= 0 || sheetW <= 0 || gsm <= 0) return null;

  const baseSheets = Math.ceil(orderQty / ups);

  let wastagePct: number;
  if (baseSheets < 5000) wastagePct = 10;
  else if (baseSheets <= 7500) wastagePct = 7;
  else wastagePct = 5;

  const finalSheets = Math.ceil(baseSheets * (1 + wastagePct / 100));
  const totalKg = parseFloat(
    (((sheetL * sheetW * gsm) / 20000 / 500) * finalSheets).toFixed(2),
  );

  return { base_sheets: baseSheets, wastage_percentage: wastagePct, final_sheets: finalSheets, total_kg: totalKg };
}
