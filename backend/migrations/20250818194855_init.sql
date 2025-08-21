-- Step 1: Create users table first (without agent_id FK)
CREATE TABLE users (
   id BIGSERIAL PRIMARY KEY,
   address VARCHAR(255) UNIQUE NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);


-- Step 1.5: Create agent_category enum
CREATE TYPE agent_category AS ENUM (
   'Web3',
   'Financial',
   'Analytics',
   'Healthcare',
   'IoT',
   'Gaming',
   'Consumer Data',
   'Social Media',
   'Environmental'
);


-- ALTER TYPE agent_category ADD VALUE 'NewCategory';

-- Step 2: Create agents table with FK to users
CREATE TABLE agents (
   id BIGSERIAL PRIMARY KEY,
   owner_id BIGINT NOT NULL,
   name VARCHAR(255) NOT NULL,
   description TEXT NOT NULL,
   price DOUBLE PRECISION NOT NULL,
   dataset_path TEXT NOT NULL,
   category agent_category NOT NULL,
   dataset_size DOUBLE PRECISION NOT NULL,
   nft_id BIGINT NULL,
   nft_tx VARCHAR(255) NULL,
   status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
   CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Step 3: Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add triggers for updated_at
CREATE TRIGGER trg_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_agents_updated_at BEFORE
UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION set_updated_at ();

-- Step 5: Add indexes for performance
-- Fast lookup of all agents by owner
CREATE INDEX idx_agents_owner_id ON agents (owner_id);

-- Fast filtering by agent status (active, paused, etc.)
CREATE INDEX idx_agents_status ON agents (status);

-- Fast queries on time ranges (e.g., agents created recently)
CREATE INDEX idx_agents_created_at ON agents (created_at);

-- Composite index: best for "all active agents of a user"
CREATE INDEX idx_agents_owner_status ON agents (owner_id, status);

-- Index for category-based queries
CREATE INDEX idx_agents_category ON agents (category);
