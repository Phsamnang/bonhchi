import { countRepository } from './count.repository.js';

const TOLERANCE = {
  KHR: 10000,
  USD: 2.0,
};

export class CountService {
  async getExpected() {
    const drawer = await countRepository.getExpectedDrawerAmount();
    return {
      expected: {
        USD: drawer.usd,
        KHR: Number(drawer.khr),
      },
      tolerance: TOLERANCE,
    };
  }

  async recordCount(body: {
    wallet_id?: string | number;
    currency: 'USD' | 'KHR';
    denominations: Record<string, number>;
    reason_for_gap?: string;
    userId?: number;
  }) {
    const { wallet_id, currency, denominations, reason_for_gap, userId } = body;

    if (!currency || !denominations) {
      throw new Error('currency and denominations breakdown are required');
    }

    const targetWallet = await countRepository.getWalletForCount(wallet_id);
    if (!targetWallet) throw new Error('Target wallet not found');

    let counted = 0;
    for (const [denom, count] of Object.entries(denominations)) {
      counted += Number(denom) * Number(count);
    }

    const system = currency === 'USD' ? targetWallet.usd : Number(targetWallet.khr);
    const difference = counted - system;
    const tolerance = currency === 'USD' ? TOLERANCE.USD : TOLERANCE.KHR;
    const gapExceedsTolerance = Math.abs(difference) > tolerance;

    if (gapExceedsTolerance && !reason_for_gap) {
      const err: any = new Error('Reason is required because discrepancy exceeds tolerance threshold');
      err.difference = difference;
      err.tolerance = tolerance;
      throw err;
    }

    const record = await countRepository.createCountRecord({
      wallet_id: targetWallet.id,
      currency,
      system_amount: system,
      counted_amount: counted,
      tolerance_threshold: tolerance,
      denominations_breakdown: denominations,
      reason_for_gap: reason_for_gap || null,
      userId,
    });

    return {
      success: true,
      count_record: record,
      alert_triggered: gapExceedsTolerance,
    };
  }

  async getHistory(limit = 30) {
    return countRepository.getHistory(limit);
  }
}

export const countService = new CountService();
