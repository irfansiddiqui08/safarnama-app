-- Programmes and fees from safarnama.club (November 2026)
insert into public.programmes (id, name, duration, fee_text, amount, is_bundle, sort) values
  ('complete',            'Complete Safarnama Education 5.0',         'All programmes',   '₹11,000',      11000, true,  0),
  ('project-60',          'Commando Training – Project 60',           '60 Days (2 Months)','₹999 / month',   999, false, 10),
  ('the-power',           'The Power (Shakti)',                       '2 Months',         '₹2,100',        2100, false, 20),
  ('chakra-healing',      'Chakra Healing & Balancing',               '7 Days',           '₹999',           999, false, 30),
  ('inner-child',         'Inner Child Healing',                      '3 Days',           '₹999',           999, false, 40),
  ('cord-cutting',        'Energy Cord Cutting',                      '2 Days',           '₹999',           999, false, 50),
  ('forgiveness',         'Forgiveness & Emotional Healing',          '3 Days',           '₹999',           999, false, 60),
  ('money-mastery',       'Money Mastery Practices',                  '3 Days',           '₹999',           999, false, 70),
  ('ritual-121',          '121 Ritual',                               '3 Days',           '₹999',           999, false, 80),
  ('manifestation',       'Advanced Manifestation Meditation',        '5 Days',           '₹999',           999, false, 90),
  ('science-getting-rich','The Science of Getting Rich (Advanced)',   '2 Months 20 Days', '₹3,500',        3500, false, 100),
  ('magic-book',          'Magic Book Practice (Daily)',              'Monthly',          '₹999 / month',   999, false, 110)
on conflict (id) do update set name = excluded.name, duration = excluded.duration, fee_text = excluded.fee_text,
  amount = excluded.amount, is_bundle = excluded.is_bundle, sort = excluded.sort;

update public.programmes set access_days = 31 where id in ('project-60','magic-book');

insert into public.batches (name, starts_on) values ('December 2026 Batch', '2026-12-01');
