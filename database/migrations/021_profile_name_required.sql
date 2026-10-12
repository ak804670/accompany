-- Repair profiles created while display_name was nullable, then restore the invariant.
UPDATE acc.m_profiles
SET display_name =
  (ARRAY['Calm', 'Kind', 'Bright', 'Gentle', 'Quiet', 'Sunny', 'Brave', 'Clever'])[1 + floor(random() * 8)::int]
  || (ARRAY['Fox', 'Owl', 'River', 'Maple', 'Robin', 'Willow', 'Panda', 'Dove'])[1 + floor(random() * 8)::int]
  || lpad(floor(random() * 10000)::int::text, 4, '0')
WHERE display_name IS NULL OR btrim(display_name) = '';

ALTER TABLE acc.m_profiles ALTER COLUMN display_name SET NOT NULL;
