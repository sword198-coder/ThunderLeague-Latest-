INSERT INTO site_settings (key, value) VALUES ('news_text', 'Welcome to ThunderLeague — tournaments are now open!')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('youtube_url', 'https://youtube.com')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('discord_url', 'https://discord.gg/thunderleague')
  ON CONFLICT (key) DO NOTHING;
