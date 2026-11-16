CREATE TABLE IF NOT EXISTS users (
  sub TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('enterprise', 'municipality', 'community')),
  provider_name TEXT NOT NULL,
  region_id TEXT NOT NULL,
  region_name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  fee_yen INTEGER NOT NULL DEFAULT 0 CHECK (fee_yen >= 0),
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  wifi INTEGER NOT NULL DEFAULT 1,
  outlets INTEGER NOT NULL DEFAULT 1,
  quiet INTEGER NOT NULL DEFAULT 1,
  solo_ok INTEGER NOT NULL DEFAULT 1,
  group_ok INTEGER NOT NULL DEFAULT 0,
  barrier_free INTEGER NOT NULL DEFAULT 1,
  rules_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 1,
  theme_hue INTEGER NOT NULL DEFAULT 215,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_spaces_published_region ON spaces(is_published, region_id);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  user_sub TEXT NOT NULL,
  reserve_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  seats_count INTEGER NOT NULL DEFAULT 1 CHECK (seats_count BETWEEN 1 AND 6),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'checked_in')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_res_space_date ON reservations(space_id, reserve_date, status);
CREATE INDEX IF NOT EXISTS idx_res_user ON reservations(user_sub, reserve_date);

CREATE TABLE IF NOT EXISTS favorites (
  user_sub TEXT NOT NULL,
  space_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_sub, space_id),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS region_stats_demo (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  population_10k REAL NOT NULL,
  transit_access_score INTEGER NOT NULL,
  base_facility_count INTEGER NOT NULL,
  base_seat_count INTEGER NOT NULL,
  base_low_cost_count INTEGER NOT NULL,
  base_evening_count INTEGER NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  estimated_neurons INTEGER NOT NULL DEFAULT 0
);
