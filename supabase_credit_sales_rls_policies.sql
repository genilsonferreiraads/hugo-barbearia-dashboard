-- SQL Script para configurar as políticas RLS (Row Level Security) 
-- para as tabelas de vendas no fiado
-- Execute este script no SQL Editor do Supabase DEPOIS de criar as tabelas

-- Habilitar RLS nas tabelas
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- POLÍTICAS PARA system_settings
-- ==================================================

-- Permitir leitura de configurações para usuários autenticados
CREATE POLICY "Permitir leitura de system_settings para autenticados"
ON system_settings
FOR SELECT
TO authenticated
USING (true);

-- Permitir atualização de configurações para usuários autenticados
CREATE POLICY "Permitir atualização de system_settings para autenticados"
ON system_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir inserção de configurações para usuários autenticados
CREATE POLICY "Permitir inserção de system_settings para autenticados"
ON system_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==================================================
-- POLÍTICAS PARA credit_sales
-- ==================================================

-- Permitir leitura de vendas no fiado para usuários autenticados
CREATE POLICY "Permitir leitura de credit_sales para autenticados"
ON credit_sales
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserção de vendas no fiado para usuários autenticados
CREATE POLICY "Permitir inserção de credit_sales para autenticados"
ON credit_sales
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir atualização de vendas no fiado para usuários autenticados
CREATE POLICY "Permitir atualização de credit_sales para autenticados"
ON credit_sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir exclusão de vendas no fiado para usuários autenticados
CREATE POLICY "Permitir exclusão de credit_sales para autenticados"
ON credit_sales
FOR DELETE
TO authenticated
USING (true);

-- ==================================================
-- POLÍTICAS PARA installments
-- ==================================================

-- Permitir leitura de parcelas para usuários autenticados
CREATE POLICY "Permitir leitura de installments para autenticados"
ON installments
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserção de parcelas para usuários autenticados
CREATE POLICY "Permitir inserção de installments para autenticados"
ON installments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir atualização de parcelas para usuários autenticados
CREATE POLICY "Permitir atualização de installments para autenticados"
ON installments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir exclusão de parcelas para usuários autenticados
CREATE POLICY "Permitir exclusão de installments para autenticados"
ON installments
FOR DELETE
TO authenticated
USING (true);

-- ==================================================
-- VERIFICAÇÃO DAS POLÍTICAS
-- ==================================================

-- Execute esta query para verificar se as políticas foram criadas corretamente:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename IN ('system_settings', 'credit_sales', 'installments')
-- ORDER BY tablename, policyname;

