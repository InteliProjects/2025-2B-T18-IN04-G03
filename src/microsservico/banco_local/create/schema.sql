PRAGMA foreign_keys = ON;

-- esquema de tabelas igual ao do banco de dados postgres

CREATE TABLE users (
  id_user INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  user_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE service_groups (
  id_group INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT NOT NULL,
  leader_user_id INTEGER NOT NULL,
  group_password_hash TEXT NOT NULL,
  FOREIGN KEY (leader_user_id) REFERENCES users(id_user)
);


CREATE TABLE brokers (
  id_broker INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL UNIQUE
);


CREATE TABLE stations (
  id_station INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  broker_id INTEGER,
  FOREIGN KEY (broker_id) REFERENCES brokers(id_broker)
);


CREATE TABLE cards (
  id_card INTEGER PRIMARY KEY AUTOINCREMENT,
  card_type TEXT NOT NULL,
  user_id INTEGER,
  card_password_hash TEXT,
  group_id INTEGER,
  FOREIGN KEY (group_id) REFERENCES service_groups(id_group),
  FOREIGN KEY (user_id) REFERENCES users(id_user)
);


CREATE TABLE locks (
  id_lock INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  station_id INTEGER NOT NULL,
  esp_id INTEGER NOT NULL,
  locks_type TEXT NOT NULL,
  broker_id INTEGER,
  FOREIGN KEY (station_id) REFERENCES stations(id_station),
  FOREIGN KEY (broker_id) REFERENCES brokers(id_broker)
);


CREATE TABLE access_logs (
  id_log INTEGER PRIMARY KEY AUTOINCREMENT,
  id_card INTEGER NOT NULL,
  id_lock INTEGER NOT NULL,
  access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  access_result TEXT NOT NULL,
  user_id INTEGER,
  group_id INTEGER,
  pin_validated INTEGER,
  FOREIGN KEY (group_id) REFERENCES service_groups(id_group),
  FOREIGN KEY (id_card) REFERENCES cards(id_card),
  FOREIGN KEY (id_lock) REFERENCES locks(id_lock),
  FOREIGN KEY (user_id) REFERENCES users(id_user)
);

-- cria um trigger em que apenas armazena os ultimos 1000 logs no banco local
CREATE TRIGGER IF NOT EXISTS limit_access_logs
AFTER INSERT ON access_logs
BEGIN
    DELETE FROM access_logs
    WHERE id NOT IN (
        SELECT id FROM access_logs
        ORDER BY timestamp DESC
        LIMIT 1000
    );
END;

CREATE TABLE outsourced_group_members (
  id_group INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (id_group, user_id),
  FOREIGN KEY (id_group) REFERENCES service_groups(id_group) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE
);


CREATE TABLE permissions (
  id_permission INTEGER PRIMARY KEY AUTOINCREMENT,
  id_card INTEGER NOT NULL,
  lock_id INTEGER NOT NULL,
  allowed_from TEXT NOT NULL,
  allowed_until TEXT NOT NULL,
  days_of_week TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  FOREIGN KEY (id_card) REFERENCES cards(id_card) ON DELETE CASCADE,
  FOREIGN KEY (lock_id) REFERENCES locks(id_lock) ON DELETE CASCADE
);
