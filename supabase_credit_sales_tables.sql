-- SQL Script para criar as tabelas de fiado no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    credit_sales_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão se não existir
INSERT INTO system_settings (id, credit_sales_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de vendas no fiado
CREATE TABLE IF NOT EXISTS credit_sales (
    id SERIAL PRIMARY KEY,
    clientname TEXT NOT NULL,
    products TEXT NOT NULL,
    totalamount NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    numberofinstallments INTEGER NOT NULL,
    firstduedate DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Em Aberto',
    totalpaid NUMERIC(10, 2) DEFAULT 0,
    remainingamount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de parcelas
CREATE TABLE IF NOT EXISTS installments (
    id SERIAL PRIMARY KEY,
    creditsaleid INTEGER NOT NULL REFERENCES credit_sales(id) ON DELETE CASCADE,
    installmentnumber INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    duedate DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente',
    paiddate DATE,
    paymentmethod TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_installment_per_sale UNIQUE (creditsaleid, installmentnumber)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_credit_sales_client ON credit_sales(clientname);
CREATE INDEX IF NOT EXISTS idx_credit_sales_status ON credit_sales(status);
CREATE INDEX IF NOT EXISTS idx_credit_sales_date ON credit_sales(date);
CREATE INDEX IF NOT EXISTS idx_installments_credit_sale ON installments(creditsaleid);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(duedate);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);

-- Comentários nas tabelas
COMMENT ON TABLE system_settings IS 'Configurações gerais do sistema';
COMMENT ON TABLE credit_sales IS 'Vendas realizadas no fiado';
COMMENT ON TABLE installments IS 'Parcelas das vendas no fiado';

-- Trigger para atualizar updated_at em system_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

