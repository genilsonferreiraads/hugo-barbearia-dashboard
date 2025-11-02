-- Adicionar coluna client_id nas tabelas para vincular registros aos clientes da base de dados

-- 1. Adicionar client_id na tabela appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- 2. Adicionar client_id na tabela transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Adicionar client_id na tabela credit_sales
ALTER TABLE credit_sales
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- 4. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_client_id ON credit_sales(client_id);

-- 5. Comentários nas colunas
COMMENT ON COLUMN appointments.client_id IS 'ID do cliente na tabela clients. NULL se o cliente não foi salvo na base de dados.';
COMMENT ON COLUMN transactions.client_id IS 'ID do cliente na tabela clients. NULL se o cliente não foi salvo na base de dados.';
COMMENT ON COLUMN credit_sales.client_id IS 'ID do cliente na tabela clients. NULL se o cliente não foi salvo na base de dados.';

