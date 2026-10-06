import { eq, desc, and, ilike, sql } from 'drizzle-orm';
import { db, pool } from '../../db/index.js';
import { invoices, invoiceItems, invoicePayments, Invoice, InvoiceItem } from '../../db/schema/index.js';

export interface InvoiceFilter {
  status?: string;
  type?: string;
  supplier?: string;
  wallet_code?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class InvoiceRepository {
  async findAll(filter?: InvoiceFilter): Promise<{ total: number; rows: any[] }> {
    const conditions = [];
    if (filter?.status) {
      conditions.push(eq(invoices.status, filter.status as any));
    }
    if (filter?.type) {
      conditions.push(eq(invoices.type, filter.type as any));
    }
    if (filter?.supplier) {
      conditions.push(ilike(invoices.supplier_name, `%${filter.supplier}%`));
    }
    if (filter?.wallet_code) {
      conditions.push(eq(invoices.wallet_code, filter.wallet_code));
    }
    if (filter?.search) {
      const q = `%${filter.search}%`;
      conditions.push(
        sql`(${invoices.invoice_no} ILIKE ${q} OR ${invoices.supplier_name} ILIKE ${q} OR ${invoices.category_name} ILIKE ${q} OR ${invoices.wallet_code} ILIKE ${q})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(invoices)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    let query = db
      .select({
        id: invoices.id,
        invoice_no: invoices.invoice_no,
        date: invoices.invoice_date,
        time: invoices.invoice_time,
        type: invoices.type,
        expense_kind: invoices.expense_kind,
        supplier_name: invoices.supplier_name,
        table_name: invoices.table_name,
        category: invoices.category_name,
        wallet_code: invoices.wallet_code,
        total_usd: sql<number>`CAST(${invoices.total_usd} AS FLOAT)`,
        total_khr: sql<number>`CAST(${invoices.total_khr} AS BIGINT)`,
        paid_usd: sql<number>`CAST(${invoices.paid_usd} AS FLOAT)`,
        paid_khr: sql<number>`CAST(${invoices.paid_khr} AS BIGINT)`,
        status: invoices.status,
        void_reason: invoices.void_reason,
        receipt_url: invoices.receipt_url,
        note: invoices.note,
        created_at: invoices.created_at,
      })
      .from(invoices)
      .where(whereClause)
      .orderBy(desc(invoices.created_at))
      .$dynamic();

    if (filter?.limit && filter.limit > 0) {
      query = query.limit(filter.limit);
      if (filter.page && filter.page > 1) {
        query = query.offset((filter.page - 1) * filter.limit);
      }
    }

    const rows = await query;
    return {
      total,
      rows,
    };
  }

  async findById(id: string | number): Promise<(Invoice & { items: InvoiceItem[] }) | null> {
    const isNum = !isNaN(Number(id));
    const invResult = await db
      .select()
      .from(invoices)
      .where(isNum ? eq(invoices.id, Number(id)) : eq(invoices.invoice_no, String(id)))
      .limit(1);

    if (!invResult.length) return null;
    const inv = invResult[0];

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoice_id, inv.id))
      .orderBy(invoiceItems.created_at);

    return { ...inv, items };
  }

  async getPoolClient() {
    return pool.connect();
  }
}

export const invoiceRepository = new InvoiceRepository();
