-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX idx_users_email ON users(email);

-- Dog scans table
CREATE TABLE dog_scans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  dog_breed VARCHAR(100),
  image_url TEXT,
  confidence DECIMAL(5,2),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster user_id lookups
CREATE INDEX idx_scans_user_id ON dog_scans(user_id);

-- Scan history table
CREATE TABLE IF NOT EXISTS scan_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id
  ON scan_history(user_id);

CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at
  ON scan_history(scanned_at DESC);

-- Top-N predictions per scan
CREATE TABLE IF NOT EXISTS scan_predictions (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scan_history(id) ON DELETE CASCADE,
  rank SMALLINT NOT NULL CHECK (rank BETWEEN 1 AND 10),
  breed_id INTEGER REFERENCES breeds(breed_id) ON DELETE SET NULL,
  class_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  UNIQUE (scan_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_scan_predictions_scan_id
  ON scan_predictions(scan_id);

CREATE INDEX IF NOT EXISTS idx_scan_predictions_breed_id
  ON scan_predictions(breed_id);
