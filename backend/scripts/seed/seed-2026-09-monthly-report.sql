-- ============================================================================
-- Seed: September 2026 invoices for checking the monthly report (FRD 14)
-- ============================================================================
-- Adds one realistic month of invoices to the database:
--   income     lunch + dinner sales every day (USD + KHR; weekends busier)
--   purchase   daily market trips with item lines, from the existing suppliers/products
--              (about 1 in 10 bought on credit = unpaid)
--   utility    rent, internet, electricity, water, rubbish, phone, cooking gas
--              (category names exactly as the app stores them -> bonchi.reports.utility-categories)
--   other      ice, moto-dop, charcoal, soap / tissue
-- No payroll: September salary is the real payroll run (FRD 14 §4).
--
-- Safe to re-run: rows from a previous run of this script are deleted first.
-- Seed rows are recognisable by invoice_no 'SEED-2609-%' AND created_by IS NULL
-- (invoices created in the app always have created_by). Item lines go with their invoice
-- (invoice_items.invoice_id ON DELETE CASCADE).
-- Wallet balances are NOT changed — this is report test data only.
--
-- Remove the seed again:
--   DELETE FROM invoices WHERE invoice_no LIKE 'SEED-2609-%' AND created_by IS NULL;
-- ============================================================================

BEGIN;

DELETE FROM invoices WHERE invoice_no LIKE 'SEED-2609-%' AND created_by IS NULL;

DO $$
DECLARE
    d            date;
    dd           text;
    weekend      boolean;
    h            int;
    usd          numeric;
    khr          numeric;
    inv_id       bigint;
    seq          int;
    sup_id       bigint;
    sup_name     text;
    item_count   int;
    tot_usd      numeric;
    tot_khr      numeric;
    is_credit    boolean;
    p            record;
    qty          numeric;
    line         numeric;
BEGIN
    -- "Random" values come from hashtext(date || label), so every run produces the same month
    FOR d IN SELECT g::date FROM generate_series('2026-09-01'::date, '2026-09-30'::date, INTERVAL '1 day') g LOOP
        dd := to_char(d, 'DD');
        weekend := EXTRACT(ISODOW FROM d) IN (6, 7);

        -- ── Income: lunch and dinner ────────────────────────────────────────
        h := abs(hashtext(d::text || 'lunch')) % 100;
        usd := 120 + h + CASE WHEN weekend THEN 60 ELSE 0 END;
        khr := (150 + (abs(hashtext(d::text || 'lunch-khr')) % 250)) * 1000 + CASE WHEN weekend THEN 100000 ELSE 0 END;
        INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                              wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
        VALUES ('SEED-2609-' || dd || '-L', d, '14:30', 'income', NULL, 'លក់ពេលថ្ងៃត្រង់ (Lunch)', 'ចំណូលលក់',
                'main_drawer', usd, khr, usd, khr, 'paid', NULL);

        h := abs(hashtext(d::text || 'dinner')) % 170;
        usd := 180 + h + CASE WHEN weekend THEN 90 ELSE 0 END;
        khr := (200 + (abs(hashtext(d::text || 'dinner-khr')) % 300)) * 1000 + CASE WHEN weekend THEN 150000 ELSE 0 END;
        INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                              wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
        VALUES ('SEED-2609-' || dd || '-D', d, '21:30', 'income', NULL, 'លក់ពេលល្ងាច (Dinner)', 'ចំណូលលក់',
                'main_drawer', usd, khr, usd, khr, 'paid', NULL);

        -- ── Purchases: which suppliers today ────────────────────────────────
        seq := 0;
        FOR sup_id IN
            SELECT s FROM unnest(ARRAY[
                CASE WHEN EXTRACT(DAY FROM d)::int % 2 = 0 THEN 2 ELSE 3 END,          -- meat / fish, alternating
                6,                                                                      -- vegetables, daily
                CASE WHEN EXTRACT(ISODOW FROM d) = 1 THEN 1 END,                        -- drinks, Mondays
                CASE WHEN EXTRACT(ISODOW FROM d) = 3 THEN 4 END,                        -- supermarket, Wednesdays
                CASE WHEN EXTRACT(ISODOW FROM d) = 5 THEN 10 END,                       -- imported goods, Fridays
                CASE WHEN EXTRACT(DAY FROM d)::int IN (1, 15) THEN 5 END,               -- rice, twice a month
                CASE WHEN EXTRACT(DAY FROM d)::int % 3 = 0 THEN 11 END,                 -- fruit, every 3 days
                CASE WHEN EXTRACT(DAY FROM d)::int IN (2, 16) THEN 9 END                -- packaging, twice a month
            ]) s WHERE s IS NOT NULL
        LOOP
            SELECT name INTO sup_name FROM suppliers WHERE id = sup_id;
            CONTINUE WHEN sup_name IS NULL;
            seq := seq + 1;
            is_credit := abs(hashtext(d::text || 'credit' || sup_id)) % 10 = 0;
            item_count := 3 + abs(hashtext(d::text || 'items' || sup_id)) % 4;    -- 3..6 lines

            INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_id, supplier_name,
                                  category_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
            VALUES ('SEED-2609-' || dd || '-P' || seq, d, make_time(7 + (10 * seq) / 60, (10 * seq) % 60, 0), 'expense', 'product', sup_id, sup_name,
                    'គ្រឿងផ្សំ', 'main_drawer_khr', 0, 0, 0, 0, 'paid', NULL)
            RETURNING id INTO inv_id;

            tot_usd := 0;
            tot_khr := 0;
            FOR p IN
                SELECT id, name, default_unit, default_currency, default_unit_price
                  FROM products
                 WHERE supplier_id = sup_id AND is_active AND default_unit_price > 0
                 ORDER BY md5(id::text || d::text)
                 LIMIT item_count
            LOOP
                -- kg-type goods in half units, everything else whole units
                IF p.default_unit IN ('គីឡូ') THEN
                    qty := (1 + abs(hashtext(d::text || p.id)) % 10) / 2.0;            -- 0.5 .. 5
                ELSE
                    qty := 1 + abs(hashtext(d::text || p.id)) % 4;                     -- 1 .. 4
                END IF;
                IF p.default_currency = 'KHR' THEN
                    line := round(qty * p.default_unit_price / 100) * 100;             -- whole 100 riel
                    tot_khr := tot_khr + line;
                ELSE
                    line := round(qty * p.default_unit_price, 2);
                    tot_usd := tot_usd + line;
                END IF;
                INSERT INTO invoice_items (invoice_id, product_id, item_name, quantity, unit, unit_price, currency, line_total, is_paid)
                VALUES (inv_id, p.id, p.name, qty, p.default_unit, p.default_unit_price, COALESCE(p.default_currency, 'USD'),
                        line, NOT is_credit);
            END LOOP;

            UPDATE invoices
               SET total_usd = tot_usd,
                   total_khr = tot_khr,
                   paid_usd  = CASE WHEN is_credit THEN 0 ELSE tot_usd END,
                   paid_khr  = CASE WHEN is_credit THEN 0 ELSE tot_khr END,
                   status    = (CASE WHEN is_credit THEN 'unpaid' ELSE 'paid' END)::invoice_status,
                   wallet_code = CASE WHEN tot_usd * 4000 > tot_khr THEN 'main_drawer' ELSE 'main_drawer_khr' END
             WHERE id = inv_id;
        END LOOP;

        -- ── Other small expenses ────────────────────────────────────────────
        khr := (24 + abs(hashtext(d::text || 'ice')) % 13) * 1000;                     -- ice, daily
        INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                              wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
        VALUES ('SEED-2609-' || dd || '-O-ICE', d, '09:00', 'expense', 'small', 'ទឹកកក ហេង', 'ទឹកកក',
                'main_drawer_khr', 0, khr, 0, khr, 'paid', NULL);

        IF EXTRACT(DAY FROM d)::int % 2 = 1 THEN                                       -- moto-dop to the market
            khr := (6 + abs(hashtext(d::text || 'moto')) % 5) * 1000;
            INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                                  wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
            VALUES ('SEED-2609-' || dd || '-O-MOTO', d, '06:45', 'expense', 'small', 'ម៉ូតូឌុប', 'ម៉ូតូឌុប',
                    'main_drawer_khr', 0, khr, 0, khr, 'paid', NULL);
        END IF;

        IF EXTRACT(ISODOW FROM d) = 6 THEN                                             -- charcoal, Saturdays
            INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                                  wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
            VALUES ('SEED-2609-' || dd || '-O-CHAR', d, '10:00', 'expense', 'small', 'ហាងហ្គាស មាស', 'ធ្យូង',
                    'main_drawer', 4.50, 0, 4.50, 0, 'paid', NULL);
        END IF;

        IF EXTRACT(ISODOW FROM d) = 2 THEN                                             -- soap / tissue, Tuesdays
            usd := 2 + abs(hashtext(d::text || 'soap')) % 5;
            INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                                  wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
            VALUES ('SEED-2609-' || dd || '-O-SOAP', d, '10:30', 'expense', 'small', 'Lucky Supermarket',
                    CASE WHEN EXTRACT(DAY FROM d)::int % 2 = 0 THEN 'សាប៊ូ' ELSE 'ក្រដាសអនាម័យ' END,
                    'main_drawer', usd, 0, usd, 0, 'paid', NULL);
        END IF;

        -- ── Utilities: cooking gas every 4 days ─────────────────────────────
        IF EXTRACT(DAY FROM d)::int % 4 = 2 THEN
            INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                                  wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, created_by)
            VALUES ('SEED-2609-' || dd || '-U-GAS', d, '08:00', 'expense', 'small', 'ហាងហ្គាស មាស', 'ហ្គាស',
                    'main_drawer', 19.00, 0, 19.00, 0, 'paid', NULL);
        END IF;
    END LOOP;

    -- ── Utilities: monthly bills ────────────────────────────────────────────
    INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name,
                          wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, note, created_by)
    VALUES
        ('SEED-2609-01-U-RENT',  '2026-09-01', '09:30', 'expense', 'small', 'ម្ចាស់ផ្ទះ (ជួលកន្លែង)', 'ជួលផ្ទះ',  'wallet_usd',      800.00,       0, 800.00,       0, 'paid', 'ថ្លៃជួលខែកញ្ញា', NULL),
        ('SEED-2609-01-U-NET',   '2026-09-01', '09:40', 'expense', 'small', 'សេវាអ៊ីនធឺណិត',        'អ៊ីនធឺណិត', 'wallet_usd',       35.00,       0,  35.00,       0, 'paid', NULL, NULL),
        ('SEED-2609-05-U-ELEC',  '2026-09-05', '11:00', 'expense', 'small', 'វិក្កយបត្រភ្លើង',       'ភ្លើង',    'wallet_khr',         0, 1350000,      0, 1350000, 'paid', NULL, NULL),
        ('SEED-2609-07-U-WATER', '2026-09-07', '11:00', 'expense', 'small', 'វិក្កយបត្រទឹក',         'ទឹក',      'main_drawer_khr',    0,  185000,      0,  185000, 'paid', NULL, NULL),
        ('SEED-2609-15-U-TRASH', '2026-09-15', '10:00', 'expense', 'small', 'សេវាប្រមូលសំរាម',      'សំរាម',    'main_drawer_khr',    0,   40000,      0,   40000, 'paid', NULL, NULL),
        ('SEED-2609-20-U-PHONE', '2026-09-20', '12:00', 'expense', 'small', 'កាតទូរស័ព្ទ',          'ទូរស័ព្ទ',  'main_drawer',     10.00,       0,  10.00,       0, 'paid', NULL, NULL);
END $$;

-- Summary of what is now in September (seed + anything else)
SELECT CASE
           WHEN type = 'income' THEN 'income'
           WHEN expense_kind = 'product' THEN 'purchase'
           WHEN expense_kind = 'salary' THEN 'payroll'
           WHEN category_name IN ('ភ្លើង','អគ្គិសនី','ទឹក','ទឹកស្អាត','អ៊ីនធឺណិត','ទូរស័ព្ទ','ហ្គាស','ជួលផ្ទះ','សំរាម') THEN 'utility'
           ELSE 'other'
       END AS bucket,
       COUNT(*)                         AS invoices,
       SUM(total_usd)                   AS usd,
       SUM(total_khr)                   AS khr
  FROM invoices
 WHERE invoice_date BETWEEN '2026-09-01' AND '2026-09-30' AND status != 'void'
 GROUP BY 1
 ORDER BY 1;

COMMIT;
