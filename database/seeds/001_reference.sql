INSERT INTO acc.m_interests (id, name, slug)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Music', 'music'),
  ('10000000-0000-4000-8000-000000000002', 'Books', 'books'),
  ('10000000-0000-4000-8000-000000000003', 'Movies', 'movies'),
  ('10000000-0000-4000-8000-000000000004', 'Travel', 'travel'),
  ('10000000-0000-4000-8000-000000000005', 'Gaming', 'gaming'),
  ('10000000-0000-4000-8000-000000000006', 'Technology', 'technology'),
  ('10000000-0000-4000-8000-000000000007', 'Fitness', 'fitness'),
  ('10000000-0000-4000-8000-000000000008', 'Food', 'food'),
  ('10000000-0000-4000-8000-000000000009', 'Art', 'art'),
  ('10000000-0000-4000-8000-000000000010', 'Sports', 'sports'),
  ('10000000-0000-4000-8000-000000000011', 'Life conversations', 'life-conversations')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO acc.m_coin_packages (id, name, coins, price, currency, status, display_order)
VALUES
  ('20000000-0000-4000-8000-000000000001', '100 coins', 100, 99.00, 'INR', 'active', 1),
  ('20000000-0000-4000-8000-000000000002', '550 coins', 550, 499.00, 'INR', 'active', 2),
  ('20000000-0000-4000-8000-000000000003', '1200 coins', 1200, 999.00, 'INR', 'active', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO acc.m_billing_policies (id, communication_type, rounding_mode, grace_seconds, is_active)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'message', 'per_message', 0, TRUE),
  ('30000000-0000-4000-8000-000000000002', 'voice_call', 'ceil_minute', 0, TRUE),
  ('30000000-0000-4000-8000-000000000003', 'video_call', 'ceil_minute', 0, TRUE)
ON CONFLICT (id) DO NOTHING;
