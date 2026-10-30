-- SYNTHETIC DEMO DATA. Run ONCE in the Supabase SQL Editor after 002_inventory_core.sql.
-- Prices are in paise. GST percentages are sample values only.

do $$
begin
  if exists (select 1 from public.medicines) then
    raise exception 'Seed data already loaded. Nothing was changed.';
  end if;
end $$;

insert into public.medicine_categories (name) values
  ('Analgesic'), ('Antibiotic'), ('Antacid'), ('Antihistamine'),
  ('Diabetes'), ('Vitamins'), ('Cough & Cold')
on conflict (name) do nothing;

insert into public.medicines
  (name, brand_name, generic_name, category_id, manufacturer, dosage_form, strength, unit,
   purchase_price_paise, selling_price_paise, gst_percent, reorder_level, requires_prescription, is_active)
select v.name, v.brand, v.generic, c.id, v.maker, v.form, v.strength, v.unit,
       v.cost, v.price, v.gst, v.reorder, v.rx, v.active
from (values
  ('Paracetamol 500',        'Calpol',    'Paracetamol',         'Analgesic',     'Sample Pharma Ltd', 'Tablet',  '500 mg', 'strip',  1800,  2500, 12.00, 50, false, true),
  ('Amoxicillin 250',        'Novamox',   'Amoxicillin',         'Antibiotic',    'Sample Pharma Ltd', 'Capsule', '250 mg', 'strip',  5200,  7000, 12.00, 30, true,  true),
  ('Pantoprazole 40',        'Pantocid',  'Pantoprazole',        'Antacid',       'Sample Pharma Ltd', 'Tablet',  '40 mg',  'strip',  6500,  8900, 12.00, 40, false, true),
  ('Cetirizine 10',          'Cetzine',   'Cetirizine',          'Antihistamine', 'Sample Pharma Ltd', 'Tablet',  '10 mg',  'strip',  1500,  2200, 12.00, 40, false, true),
  ('Metformin 500',          'Glycomet',  'Metformin',           'Diabetes',      'Sample Pharma Ltd', 'Tablet',  '500 mg', 'strip',  2300,  3200,  5.00, 60, true,  true),
  ('Vitamin C 500',          'Celin',     'Ascorbic acid',       'Vitamins',      'Sample Pharma Ltd', 'Tablet',  '500 mg', 'strip',  2000,  3000, 12.00, 30, false, true),
  ('Cough Syrup 100ml',      'Benadryl',  'Diphenhydramine',     'Cough & Cold',  'Sample Pharma Ltd', 'Syrup',   '100 ml', 'bottle', 6000,  8500, 12.00, 20, false, true),
  ('Azithromycin 500',       'Azithral',  'Azithromycin',        'Antibiotic',    'Sample Pharma Ltd', 'Tablet',  '500 mg', 'strip',  9000, 12000, 12.00, 25, true,  true),
  ('Ibuprofen 400',          'Brufen',    'Ibuprofen',           'Analgesic',     'Sample Pharma Ltd', 'Tablet',  '400 mg', 'strip',  2500,  3500, 12.00, 40, false, true),
  ('Multivitamin Capsules',  'Supradyn',  'Multivitamin',        'Vitamins',      'Sample Pharma Ltd', 'Capsule', null,     'strip',  4500,  6200, 12.00, 20, false, true),
  ('Antacid Gel 170ml',      'Digene',    'Aluminium hydroxide', 'Antacid',       'Sample Pharma Ltd', 'Syrup',   '170 ml', 'bottle', 5500,  7500, 12.00, 15, false, true),
  ('Old Formula Cough Drops','Generic',   'Menthol',             'Cough & Cold',  'Sample Pharma Ltd', 'Lozenge', null,     'pack',    800,  1200, 12.00, 20, false, false)
) as v(name, brand, generic, category, maker, form, strength, unit, cost, price, gst, reorder, rx, active)
join public.medicine_categories c on c.name = v.category;

-- Batches: expiry is given as days from today (negative = already expired).
insert into public.stock_batches
  (medicine_id, batch_number, manufacturing_date, expiry_date,
   quantity_received, quantity_remaining, purchase_price_paise)
select m.id, b.batch_no,
       current_date + b.expiry_offset - 730,
       current_date + b.expiry_offset,
       b.received, b.remaining, m.purchase_price_paise
from (values
  ('Paracetamol 500',       'PCM-2401',  400, 200, 120),
  ('Paracetamol 500',       'PCM-2312',   45,  60,  30),
  ('Amoxicillin 250',       'AMX-2402',   60,  50,  18),
  ('Pantoprazole 40',       'PAN-2405',  520, 120,  90),
  ('Cetirizine 10',         'CTZ-2403',  300,  60,  25),
  ('Metformin 500',         'MET-2404',  210, 200, 140),
  ('Vitamin C 500',         'VTC-2311',  -20,  60,  35),
  ('Vitamin C 500',         'VTC-2406',  380,  40,  12),
  ('Cough Syrup 100ml',     'CSY-2402',   75,  60,  40),
  ('Azithromycin 500',      'AZT-2405',  330,  50,   0),
  ('Ibuprofen 400',         'IBU-2404',  250, 100,  70),
  ('Multivitamin Capsules', 'MUL-2310',   -5,  40,  22),
  ('Multivitamin Capsules', 'MUL-2407',  450,  30,  15),
  ('Antacid Gel 170ml',     'DGN-2406',  180,  80,  60)
) as b(med, batch_no, expiry_offset, received, remaining)
join public.medicines m on m.name = b.med;

-- Ledger: opening stock for every batch, plus a sample "sale" for batches already used.
insert into public.inventory_movements
  (medicine_id, batch_id, movement_type, quantity_change, balance_after, reason)
select medicine_id, id, 'opening_stock', quantity_received, quantity_received, 'Seed data: opening stock'
from public.stock_batches;

insert into public.inventory_movements
  (medicine_id, batch_id, movement_type, quantity_change, balance_after, reason)
select medicine_id, id, 'sale', -(quantity_received - quantity_remaining), quantity_remaining,
       'Seed data: sample past sales'
from public.stock_batches
where quantity_remaining < quantity_received;

select (select count(*) from public.medicines) as medicines,
       (select count(*) from public.stock_batches) as batches,
       (select count(*) from public.inventory_movements) as movements;
