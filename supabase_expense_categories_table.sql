-- SQL Script para criar a tabela de categorias de despesas no Supabase
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6b7280', -- Cor padrão (cinza)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

-- Comentários nas colunas
COMMENT ON TABLE expense_categories IS 'Tabela de categorias de despesas';
COMMENT ON COLUMN expense_categories.id IS 'ID único da categoria';
COMMENT ON COLUMN expense_categories.name IS 'Nome da categoria';
COMMENT ON COLUMN expense_categories.color IS 'Cor da categoria (hexadecimal)';
COMMENT ON COLUMN expense_categories.created_at IS 'Data de criação do registro';

-- Habilitar RLS (Row Level Security)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações para usuários autenticados
CREATE POLICY "Users can view all expense categories" ON expense_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert expense categories" ON expense_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update expense categories" ON expense_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete expense categories" ON expense_categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- Inserir categorias padrão
INSERT INTO expense_categories (name, color) VALUES
    ('Aluguel', '#ef4444'),
    ('Materiais', '#3b82f6'),
    ('Salário', '#10b981'),
    ('Contas', '#f59e0b'),
    ('Manutenção', '#8b5cf6'),
    ('Marketing', '#ec4899'),
    ('Outros', '#6b7280')
ON CONFLICT (name) DO NOTHING;

