-- 92 synthetic, non-reservable sample locations bring the original 8 demo rows to 100.
-- Coordinates are approximate points near municipal centers, not real facilities or addresses.
UPDATE spaces SET is_published = 0 WHERE is_demo = 1;

WITH RECURSIVE
  numbers(n) AS (
    SELECT 9
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 100
  ),
  locations(idx, city, lat, lng) AS (VALUES
    (1, '名古屋市', 35.1814, 136.9064),
    (2, '一宮市', 35.3039, 136.8031),
    (3, '犬山市', 35.3786, 136.9444),
    (4, '瀬戸市', 35.2235, 137.0842),
    (5, '春日井市', 35.2476, 136.9722),
    (6, '小牧市', 35.2910, 136.9120),
    (7, '豊明市', 35.0528, 137.0100),
    (8, '長久手市', 35.1760, 137.0480),
    (9, '津島市', 35.1770, 136.7410),
    (10, '愛西市', 35.1500, 136.7310),
    (11, '半田市', 34.8910, 136.9380),
    (12, '常滑市', 34.8860, 136.8320),
    (13, '南知多町', 34.7160, 136.9300),
    (14, '豊田市', 35.0820, 137.1560),
    (15, '刈谷市', 34.9910, 137.0020),
    (16, '安城市', 34.9580, 137.0800),
    (17, '岡崎市', 34.9550, 137.1730),
    (18, '西尾市', 34.8620, 137.0610),
    (19, '蒲郡市', 34.8270, 137.2200),
    (20, '豊川市', 34.8270, 137.3760),
    (21, '豊橋市', 34.7690, 137.3910),
    (22, '田原市', 34.6690, 137.2670),
    (23, '新城市', 34.8990, 137.4980),
    (24, '設楽町', 35.0970, 137.5710),
    (25, '東栄町', 35.0740, 137.6990),
    (26, '豊根村', 35.1400, 137.7160)
  )
INSERT OR IGNORE INTO spaces (
  id, name, provider_type, provider_name, region_id, region_name, address,
  lat, lng, fee_yen, open_time, close_time, total_seats,
  wifi, outlets, quiet, solo_ok, group_ok, barrier_free,
  rules_json, notes, is_published, is_demo, theme_hue
)
SELECT
  'demo-aichi-' || printf('%03d', n),
  '【サンプル】' || city || ' 学習場所 ' || printf('%03d', n),
  'community',
  '架空の地域サンプル',
  'demo-aichi-' || printf('%02d', idx),
  city,
  'サンプル地点（実在施設・住所ではありません）',
  lat + (((n * 7) % 7) - 3) * 0.0015,
  lng + (((n * 11) % 7) - 3) * 0.0015,
  CASE WHEN n % 3 = 0 THEN 100 ELSE 0 END,
  '15:30',
  '20:30',
  6 + n % 11,
  1, 1, 1, 1, n % 4 = 0, 1,
  '["サンプル情報です。実在施設の利用・予約はできません。"]',
  '画面表示・地図確認用の架空データです。施設情報は運営により確認されていません。',
  0,
  1,
  (190 + n * 7) % 360
FROM numbers
JOIN locations ON locations.idx = ((numbers.n - 9) % 26) + 1;
