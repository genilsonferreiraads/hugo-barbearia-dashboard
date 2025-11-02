-- Script para verificar e diagnosticar problemas com vendas no fiado
-- Execute cada seção separadamente no SQL Editor do Supabase

-- ==================================================
-- 1. VERIFICAR SE AS TABELAS EXISTEM
-- ==================================================
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename IN ('credit_sales', 'installments', 'system_settings')
ORDER BY tablename;

-- Resultado esperado: 3 linhas (uma para cada tabela)
-- Se não aparecer nenhuma linha, você precisa executar o script de criação de tabelas

-- ==================================================
-- 2. VERIFICAR SE O RLS ESTÁ HABILITADO
-- ==================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename IN ('credit_sales', 'installments', 'system_settings');

-- rls_enabled deve ser 'true' para todas as tabelas
-- Se for 'false', execute o script de políticas RLS

-- ==================================================
-- 3. VERIFICAR POLÍTICAS RLS
-- ==================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('credit_sales', 'installments', 'system_settings')
ORDER BY tablename, policyname;

-- Resultado esperado: 12 políticas (4 para cada tabela)
-- Se não houver políticas, execute o script supabase_credit_sales_rls_policies.sql

-- ==================================================
-- 4. CONTAR VENDAS NO FIADO
-- ==================================================
SELECT 
    COUNT(*) AS total_vendas,
    COUNT(CASE WHEN status = 'Em Aberto' THEN 1 END) AS em_aberto,
    COUNT(CASE WHEN status = 'Atrasado' THEN 1 END) AS atrasadas,
    COUNT(CASE WHEN status = 'Quitado' THEN 1 END) AS quitadas
FROM credit_sales;

-- Se retornar 0 vendas e você já criou algumas, o problema é RLS

-- ==================================================
-- 5. VER TODAS AS VENDAS NO FIADO
-- ==================================================
SELECT 
    id,
    clientname,
    products,
    totalamount,
    totalpaid,
    remainingamount,
    status,
    date,
    created_at
FROM credit_sales
ORDER BY created_at DESC
LIMIT 10;

-- ==================================================
-- 6. VER PARCELAS
-- ==================================================
SELECT 
    i.id,
    i.creditsaleid,
    c.clientname,
    i.installmentnumber,
    i.amount,
    i.duedate,
    i.status,
    i.paiddate,
    i.paymentmethod
FROM installments i
LEFT JOIN credit_sales c ON i.creditsaleid = c.id
ORDER BY i.creditsaleid, i.installmentnumber
LIMIT 20;

-- ==================================================
-- 7. VERIFICAR CONFIGURAÇÕES DO SISTEMA
-- ==================================================
SELECT 
    id,
    credit_sales_enabled,
    created_at,
    updated_at
FROM system_settings;

-- Deve retornar uma linha com credit_sales_enabled = true ou false
-- Se não retornar nada, execute: 
-- INSERT INTO system_settings (id, credit_sales_enabled) VALUES (1, true);

-- ==================================================
-- 8. CRIAR VENDA DE TESTE (OPCIONAL)
-- ==================================================
-- Descomente e execute se quiser criar uma venda de teste

/*
-- Primeiro, criar a venda
INSERT INTO credit_sales (
    clientname,
    products,
    totalamount,
    subtotal,
    discount,
    numberofinstallments,
    firstduedate,
    status,
    totalpaid,
    remainingamount,
    date
) VALUES (
    'Cliente Teste',
    'Produto Teste (2x)',
    100.00,
    100.00,
    0.00,
    2,
    '2024-12-01',
    'Em Aberto',
    0.00,
    100.00,
    CURRENT_DATE
) RETURNING id;

-- Anote o ID retornado e substitua no próximo comando
-- Exemplo: se retornou id = 1, use 1 no lugar de SEU_ID_AQUI

-- Criar parcelas da venda de teste
INSERT INTO installments (creditsaleid, installmentnumber, amount, duedate, status)
VALUES 
    (SEU_ID_AQUI, 1, 50.00, '2024-12-01', 'Pendente'),
    (SEU_ID_AQUI, 2, 50.00, '2025-01-01', 'Pendente');
*/

-- ==================================================
-- 9. LIMPAR VENDA DE TESTE (OPCIONAL)
-- ==================================================
-- Descomente e execute se criou uma venda de teste e quer removê-la

/*
DELETE FROM credit_sales WHERE clientname = 'Cliente Teste';
-- As parcelas serão excluídas automaticamente por causa do ON DELETE CASCADE
*/

-- ==================================================
-- 10. ESTATÍSTICAS GERAIS
-- ==================================================
SELECT 
    'Vendas Total' AS tipo,
    COUNT(*) AS quantidade,
    COALESCE(SUM(totalamount), 0) AS valor_total
FROM credit_sales
UNION ALL
SELECT 
    'Vendas Em Aberto' AS tipo,
    COUNT(*) AS quantidade,
    COALESCE(SUM(remainingamount), 0) AS valor_total
FROM credit_sales
WHERE status != 'Quitado'
UNION ALL
SELECT 
    'Parcelas Pagas' AS tipo,
    COUNT(*) AS quantidade,
    COALESCE(SUM(amount), 0) AS valor_total
FROM installments
WHERE status = 'Paga'
UNION ALL
SELECT 
    'Parcelas Atrasadas' AS tipo,
    COUNT(*) AS quantidade,
    COALESCE(SUM(amount), 0) AS valor_total
FROM installments
WHERE status = 'Atrasada';

