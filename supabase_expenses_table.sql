-- SQL Script para criar a tabela de despesas no Supabase
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Comentários nas colunas
COMMENT ON TABLE expenses IS 'Tabela de despesas da barbearia';
COMMENT ON COLUMN expenses.id IS 'ID único da despesa';
COMMENT ON COLUMN expenses.description IS 'Descrição da despesa';
COMMENT ON COLUMN expenses.amount IS 'Valor da despesa';
COMMENT ON COLUMN expenses.date IS 'Data da despesa';
COMMENT ON COLUMN expenses.category IS 'Categoria da despesa (opcional)';
COMMENT ON COLUMN expenses.created_at IS 'Data de criação do registro';

-- Habilitar RLS (Row Level Security)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações para usuários autenticados
CREATE POLICY "Users can view all expenses" ON expenses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert expenses" ON expenses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update expenses" ON expenses
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete expenses" ON expenses
    FOR DELETE USING (auth.role() = 'authenticated');

