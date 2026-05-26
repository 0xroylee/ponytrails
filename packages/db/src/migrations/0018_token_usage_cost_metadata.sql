ALTER TABLE token_usage
ADD COLUMN IF NOT EXISTS agent_backend text;

ALTER TABLE token_usage
ADD COLUMN IF NOT EXISTS model text;

ALTER TABLE token_usage
ADD COLUMN IF NOT EXISTS estimated_cost_microusd integer;
