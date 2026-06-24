INSERT INTO site_settings (key, value) VALUES ('hero_images', '["/hero.png"]')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('hero_interval', '5')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('news_items', '["Welcome to ThunderLeague — tournaments are now open!"]')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('news_interval', '5')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('ad_code', '')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('about_text', 'ThunderLeague is the ultimate War Thunder tournament platform. Compete against the best players, climb the leaderboard, and prove your skills in epic aerial and ground battles.')
  ON CONFLICT (key) DO NOTHING;
