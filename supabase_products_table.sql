-- SQL Script para criar a tabela de produtos no Supabase
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índice para busca rápida por nome
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Comentários nas colunas
COMMENT ON TABLE products IS 'Tabela de produtos disponíveis para venda';
COMMENT ON COLUMN products.id IS 'ID único do produto';
COMMENT ON COLUMN products.name IS 'Nome do produto';
COMMENT ON COLUMN products.price IS 'Preço do produto';
COMMENT ON COLUMN products.created_at IS 'Data de criação do registro';

-- Atualizar a tabela transactions para incluir o campo type
-- (Caso ainda não exista)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'service';

-- Criar índice para busca rápida por tipo
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

COMMENT ON COLUMN transactions.type IS 'Tipo da transação: service (serviço) ou product (produto)';

