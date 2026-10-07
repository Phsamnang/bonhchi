/**
 * Seed today's expense invoices with 50+ items to test report pagination / PDF export.
 *
 *   npx tsx scripts/seed-report-items.ts          # add test invoices for CURRENT_DATE
 *   npx tsx scripts/seed-report-items.ts --clean  # remove every seeded invoice
 *
 * Rows are written straight to invoices / invoice_items (wallet balances are NOT touched) and
 * are tagged with invoice_no 'SEED-…' + note 'seed:report-test' so --clean removes only them.
 */
import 'dotenv/config';
import pg from 'pg';

const TAG = 'seed:report-test';

type Line = [name: string, qty: number, unit: string, price: number, currency: 'USD' | 'KHR'];
type Shop = { supplier: string; wallet: string; unpaid?: number[]; items: Line[] };

const SHOPS: Shop[] = [
  {
    supplier: 'បងណាង', wallet: 'aba',
    items: [
      ['Vital 350', 10, 'កេស', 3.5, 'USD'], ['Anchor', 15, 'កេស', 7.5, 'USD'],
      ['Tiger', 8, 'កេស', 13, 'USD'], ['Ganzberg', 20, 'កេស', 7.5, 'USD'],
      ['Coca-Cola កំប៉ុង', 6, 'កេស', 9.8, 'USD'], ['Sting', 4, 'កេស', 6.5, 'USD'],
    ],
  },
  {
    supplier: 'បងធា', wallet: 'petty', unpaid: [3],
    items: [
      ['ត្រគួន', 2, 'គីឡូ', 3000, 'KHR'], ['សាច់គោ', 5, 'គីឡូ', 40000, 'KHR'],
      ['ត្រសក់', 3, 'គីឡូ', 2500, 'KHR'], ['ស្លឹកគ្រៃ', 1, 'គីឡូ', 6000, 'KHR'],
      ['ខ្ទឹមស', 2, 'គីឡូ', 9000, 'KHR'],
    ],
  },
  {
    supplier: 'ផ្សារដើមគរ', wallet: 'petty',
    items: [
      ['សាច់ជ្រូកបីជាន់', 6, 'គីឡូ', 26000, 'KHR'], ['ឆ្អឹងជំនីជ្រូក', 4, 'គីឡូ', 22000, 'KHR'],
      ['សាច់មាន់', 5, 'គីឡូ', 15000, 'KHR'], ['ស៊ុតមាន់', 3, 'ផ្ទាំង', 14000, 'KHR'],
      ['ត្រីឆ្លាំង', 2, 'គីឡូ', 18000, 'KHR'], ['បង្គាសមុទ្រ (ធំ)', 1.5, 'គីឡូ', 52000, 'KHR'],
    ],
  },
  {
    supplier: 'Lucky Supermarket', wallet: 'bakong',
    items: [
      ['ប្រេងឆា Simply 5L', 2, 'ដប', 9.5, 'USD'], ['ទឹកត្រី', 6, 'ដប', 1.25, 'USD'],
      ['ទឹកស៊ីអ៊ីវ Maggi', 4, 'ដប', 2.1, 'USD'], ['ប្រេងខ្យង', 3, 'ដប', 2.75, 'USD'],
      ['ម្សៅស៊ុប Knorr', 2, 'កញ្ចប់', 3.4, 'USD'], ['ទឹកដោះគោខាប់', 12, 'កំប៉ុង', 0.95, 'USD'],
      ['ក្រដាសជូតមាត់', 5, 'កញ្ចប់', 1.6, 'USD'],
    ],
  },
  {
    supplier: 'ហាងអង្ករ សុខា', wallet: 'drawer', unpaid: [0, 1],
    items: [
      ['អង្ករផ្ការំដួល 50kg', 2, 'បាវ', 38, 'USD'], ['អង្ករសែនក្រអូប 25kg', 1, 'បាវ', 21, 'USD'],
      ['ស្ករស', 10, 'គីឡូ', 4200, 'KHR'], ['អំបិល', 5, 'គីឡូ', 1500, 'KHR'],
    ],
  },
  {
    supplier: 'ផ្សារអូរឫស្សី', wallet: 'petty',
    items: [
      ['ស្ពៃក្តោប', 4, 'គីឡូ', 3500, 'KHR'], ['ការ៉ុត', 3, 'គីឡូ', 4000, 'KHR'],
      ['ប៉េងប៉ោះ', 3, 'គីឡូ', 5000, 'KHR'], ['ត្រសក់ស្រូវ', 2, 'គីឡូ', 4500, 'KHR'],
      ['ម្ទេសប្លោក', 1, 'គីឡូ', 12000, 'KHR'], ['ខ្ទឹមក្រហម', 2, 'គីឡូ', 8000, 'KHR'],
      ['គល់ស្លឹកគ្រៃ និងរំដេង សម្រាប់ធ្វើគ្រឿងសម្លកកូរ', 1, 'គីឡូ', 7000, 'KHR'],
      ['ស្លឹកជីរ', 0.5, 'គីឡូ', 10000, 'KHR'],
    ],
  },
  {
    supplier: 'ទឹកកក ហេង', wallet: 'drawer', unpaid: [0],
    items: [['ទឹកកកដើម', 6, 'ដើម', 6000, 'KHR'], ['ទឹកកកគ្រាប់', 10, 'បាវ', 3500, 'KHR']],
  },
  {
    supplier: 'ហាងហ្គាស មាស', wallet: 'aba',
    items: [['ហ្គាស 15kg', 2, 'ធុង', 19, 'USD'], ['ធ្យូង', 3, 'បាវ', 4.5, 'USD']],
  },
  {
    supplier: 'ហាងចាន ស្រីនាង', wallet: 'bakong', unpaid: [2, 3],
    items: [
      ['ប្រអប់ដាក់បាយ (ខ្ចប់)', 4, 'កញ្ចប់', 3.8, 'USD'], ['ថង់ប្លាស្ទិក', 3, 'គីឡូ', 2.4, 'USD'],
      ['ចង្កឹះឈើ', 5, 'កញ្ចប់', 1.2, 'USD'], ['កែវប្លាស្ទិក 16oz', 4, 'កញ្ចប់', 2.9, 'USD'],
    ],
  },
  {
    supplier: 'Thai Huot', wallet: 'aba',
    items: [
      ['ឈីស Mozzarella', 2, 'គីឡូ', 11.5, 'USD'], ['ប៊ឺ President', 3, 'ដុំ', 4.25, 'USD'],
      ['សាច់ក្រកស្មោក', 2, 'កញ្ចប់', 6.8, 'USD'], ['ម្សៅមី', 5, 'គីឡូ', 1.1, 'USD'],
    ],
  },
  {
    supplier: 'បងស្រី លក់ផ្លែឈើ', wallet: 'petty',
    items: [
      ['ក្រូចឆ្មារ', 2, 'គីឡូ', 6000, 'KHR'], ['ម្នាស់', 6, 'ផ្លែ', 3000, 'KHR'],
      ['ស្វាយទុំ', 3, 'គីឡូ', 7000, 'KHR'], ['ឪឡឹក', 2, 'ផ្លែ', 8000, 'KHR'],
    ],
  },
];

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (process.argv.includes('--clean')) {
      const res = await client.query(`DELETE FROM invoices WHERE note = $1 AND invoice_no LIKE 'SEED-%'`, [TAG]);
      await client.query('COMMIT');
      console.log(`Removed ${res.rowCount} seeded invoices (their items cascade).`);
      return;
    }

    const owner = await client.query(`SELECT id FROM users ORDER BY id LIMIT 1`);
    const userId = owner.rows[0]?.id ?? null;
    const today = (await client.query(`SELECT to_char(CURRENT_DATE, 'YYYYMMDD') d`)).rows[0].d;
    const existing = await client.query(`SELECT count(*)::int n FROM invoices WHERE invoice_no LIKE $1`, [`SEED-${today}-%`]);
    let seq = existing.rows[0].n;
    let itemCount = 0;

    for (const shop of SHOPS) {
      let totalUsd = 0, totalKhr = 0, paidUsd = 0, paidKhr = 0;
      const lines = shop.items.map(([name, qty, unit, price, currency], i) => {
        const lineTotal = Math.round(qty * price * 100) / 100;
        const isPaid = !(shop.unpaid ?? []).includes(i);
        if (currency === 'USD') { totalUsd += lineTotal; if (isPaid) paidUsd += lineTotal; }
        else { totalKhr += lineTotal; if (isPaid) paidKhr += lineTotal; }
        return { name, qty, unit, price, currency, lineTotal, isPaid };
      });
      const hasPaid = paidUsd > 0 || paidKhr > 0;
      const hasUnpaid = paidUsd < totalUsd || paidKhr < totalKhr;
      const status = !hasPaid ? 'unpaid' : hasUnpaid ? 'partial' : 'paid';

      seq += 1;
      const inv = await client.query(
        `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                               wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, note, created_by)
         VALUES ($1, CURRENT_DATE, CURRENT_TIME, 'expense', 'product', $2, 'គ្រឿងផ្សំ', $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [`SEED-${today}-${String(seq).padStart(2, '0')}`, shop.supplier, shop.wallet,
         totalUsd, totalKhr, paidUsd, paidKhr, status, TAG, userId]
      );
      for (const l of lines) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, item_name, quantity, unit, unit_price, currency, line_total, is_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [inv.rows[0].id, l.name, l.qty, l.unit, l.price, l.currency, l.lineTotal, l.isPaid]
        );
        itemCount += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded ${SHOPS.length} invoices / ${itemCount} items for today (wallet balances unchanged).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
