import { reportRepository } from './report.repository.js';

export class ReportService {
  async getSummary(period = 'today') {
    let dateFilter = 'invoice_date = CURRENT_DATE';
    let label = 'ថ្ងៃនេះ (Today)';

    if (period === 'yesterday') {
      dateFilter = "invoice_date = CURRENT_DATE - INTERVAL '1 day'";
      label = 'ម្សិលមិញ (Yesterday)';
    } else if (period === 'week') {
      dateFilter = "invoice_date >= date_trunc('week', CURRENT_DATE)";
      label = 'សប្តាហ៍នេះ (This Week)';
    } else if (period === 'month') {
      dateFilter = "invoice_date >= date_trunc('month', CURRENT_DATE)";
      label = 'ខែនេះ (This Month)';
    }

    const row = await reportRepository.getSummary(dateFilter);

    return {
      period,
      label,
      usd: Number(Number(row.total_usd).toFixed(2)),
      khr: Number(row.total_khr),
      oweUsd: `$${Number(row.owe_usd).toFixed(2)}`,
      oweKhr: `${Number(row.owe_khr).toLocaleString()} ៛`,
      paid: `$${Number(row.paid_usd).toFixed(2)} · ${Number(row.paid_khr).toLocaleString()} ៛`,
      qr: `$${Number(row.qr_usd).toFixed(2)} · ${Number(row.qr_khr).toLocaleString()} ៛`,
      cash: `$${Number(row.cash_usd).toFixed(2)} · ${Number(row.cash_khr).toLocaleString()} ៛`,
    };
  }

  async getPurchasedItems(period = 'today') {
    let dateFilter = 'i.invoice_date = CURRENT_DATE';
    if (period === 'yesterday') {
      dateFilter = "i.invoice_date = CURRENT_DATE - INTERVAL '1 day'";
    } else if (period === '7days' || period === 'week') {
      dateFilter = "i.invoice_date >= CURRENT_DATE - INTERVAL '6 days'";
    } else if (period === 'month') {
      dateFilter = "i.invoice_date >= date_trunc('month', CURRENT_DATE)";
    } else if (period === 'all') {
      dateFilter = 'TRUE';
    }

    const rows = await reportRepository.getPurchasedItems(dateFilter);
    return { period, total: rows.length, items: rows };
  }

  async getExportCard() {
    const invoices = await reportRepository.getExportCardInvoices();

    let spendUsd = 0;
    let spendKhr = 0;
    let paidUsd = 0;
    let paidKhr = 0;
    let oweUsd = 0;
    let oweKhr = 0;
    let qrUsd = 0;
    let qrKhr = 0;
    let cashUsd = 0;
    let cashKhr = 0;

    const rows = invoices.map((i: any) => {
      spendUsd += i.total_usd;
      spendKhr += Number(i.total_khr);
      paidUsd += i.paid_usd;
      paidKhr += Number(i.paid_khr);

      const isUnpaid = i.status === 'unpaid';
      if (isUnpaid) {
        oweUsd += i.total_usd - i.paid_usd;
        oweKhr += Number(i.total_khr) - Number(i.paid_khr);
      }

      const isBank = i.wallet_code === 'aba' || i.wallet_code === 'bakong';
      if (isBank) {
        qrUsd += i.paid_usd;
        qrKhr += Number(i.paid_khr);
      } else {
        cashUsd += i.paid_usd;
        cashKhr += Number(i.paid_khr);
      }

      return {
        item: i.category_name || i.supplier_name,
        shop: i.supplier_name,
        pay: isUnpaid ? 'none' : isBank ? 'qr' : 'cash',
        usd: i.total_usd > 0 ? i.total_usd : null,
        khr: Number(i.total_khr) > 0 ? Number(i.total_khr) : null,
      };
    });

    return {
      restaurant_name: 'Bonchi Restaurant',
      report_title: 'របាយការណ៍ចំណាយប្រចាំថ្ងៃ',
      date_km: 'ច័ន្ទ 5 តុលា 2026',
      preparer: 'ស្រីមុំ · 18:30',
      meta: `${invoices.length} វិក្កយបត្រ`,
      totals: {
        spend: { usd: Number(spendUsd.toFixed(2)), khr: spendKhr },
        paid: { usd: Number(paidUsd.toFixed(2)), khr: paidKhr },
        owe: { usd: Number(oweUsd.toFixed(2)), khr: oweKhr },
        methods: {
          qr: { usd: Number(qrUsd.toFixed(2)), khr: qrKhr },
          cash: { usd: Number(cashUsd.toFixed(2)), khr: cashKhr },
        },
      },
      rows,
    };
  }
}

export const reportService = new ReportService();
