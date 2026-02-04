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