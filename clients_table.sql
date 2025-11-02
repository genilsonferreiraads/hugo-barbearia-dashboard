-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    nickname VARCHAR(100),
    observation TEXT,
    cpf VARCHAR(14),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por nome
CREATE INDEX IF NOT EXISTS idx_clients_fullname ON clients(fullname);

-- Criar índice para busca rápida por WhatsApp
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp ON clients(whatsapp);

-- Criar índice para busca rápida por CPF (se fornecido)
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON clients(cpf) WHERE cpf IS NOT NULL;

-- Adicionar comentários na tabela
COMMENT ON TABLE clients IS 'Tabela de clientes do sistema';
COMMENT ON COLUMN clients.id IS 'ID único do cliente';
COMMENT ON COLUMN clients.fullname IS 'Nome completo do cliente (obrigatório)';
COMMENT ON COLUMN clients.whatsapp IS 'Número do WhatsApp do cliente (obrigatório)';
COMMENT ON COLUMN clients.nickname IS 'Apelido do cliente (opcional)';
COMMENT ON COLUMN clients.observation IS 'Observações sobre o cliente (opcional)';
COMMENT ON COLUMN clients.cpf IS 'CPF do cliente (opcional)';
COMMENT ON COLUMN clients.created_at IS 'Data de criação do registro';

-- Habilitar Row Level Security (RLS) - opcional, mas recomendado
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações para usuários autenticados
-- Ajuste conforme suas necessidades de segurança
CREATE POLICY "Permitir todas operações para usuários autenticados" ON clients
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

