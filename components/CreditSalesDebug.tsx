import React, { useState, useEffect } from 'react';
import { useCreditSales } from '../contexts.tsx';
import { supabase } from '../services/supabaseClient.ts';

/**
 * Componente de Debug para Vendas no Fiado
 * 
 * Como usar:
 * 1. Importe este componente em CreditSalesList.tsx
 * 2. Adicione <CreditSalesDebug /> no topo da página
 * 3. Veja as informações de debug no card
 * 4. Remova depois de resolver o problema
 */
export const CreditSalesDebug: React.FC = () => {
    const { creditSales, installments } = useCreditSales();
    const [dbData, setDbData] = useState<any>(null);
    const [rls, setRls] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        const checkDatabase = async () => {
            try {
                // Testar acesso direto ao banco
                const { data, error, count } = await supabase
                    .from('credit_sales')
                    .select('*', { count: 'exact' });

                setDbData({ data, error, count });
                setLoading(false);
            } catch (err) {
                setDbData({ error: err });
                setLoading(false);
            }
        };

        checkDatabase();
    }, []);

    if (!expanded) {
        return (
            <div className="mb-4">
                <button
                    onClick={() => setExpanded(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    🐛 Mostrar Debug
                </button>
            </div>
        );
    }

    return (
        <div className="mb-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    🐛 Debug: Vendas no Fiado
                </h2>
                <button
                    onClick={() => setExpanded(false)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                    Minimizar
                </button>
            </div>

            <div className="space-y-4 text-sm font-mono">
                {/* Status do Contexto */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded">
                    <h3 className="font-bold mb-2 text-gray-900 dark:text-white">📊 Estado do Contexto React</h3>
                    <div className="space-y-1 text-gray-700 dark:text-gray-300">
                        <p>✓ creditSales.length: <strong>{creditSales.length}</strong></p>
                        <p>✓ installments.length: <strong>{installments.length}</strong></p>
                        {creditSales.length > 0 && (
                            <details className="mt-2">
                                <summary className="cursor-pointer hover:text-blue-600">Ver vendas</summary>
                                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto max-h-60 text-xs">
                                    {JSON.stringify(creditSales, null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>

                {/* Status do Banco de Dados */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded">
                    <h3 className="font-bold mb-2 text-gray-900 dark:text-white">💾 Consulta Direta ao Banco</h3>
                    {loading ? (
                        <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
                    ) : (
                        <div className="space-y-2">
                            {dbData?.error ? (
                                <div className="text-red-600 dark:text-red-400">
                                    <p className="font-bold">❌ ERRO DETECTADO:</p>
                                    <p className="mt-1">Code: {dbData.error.code}</p>
                                    <p>Message: {dbData.error.message}</p>
                                    {(dbData.error.code === 'PGRST301' || 
                                      dbData.error.message?.includes('RLS') || 
                                      dbData.error.message?.includes('policy')) && (
                                        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded">
                                            <p className="font-bold">🚨 PROBLEMA DE RLS CONFIRMADO!</p>
                                            <p className="mt-2">Solução:</p>
                                            <ol className="list-decimal ml-5 mt-1">
                                                <li>Vá para o Supabase SQL Editor</li>
                                                <li>Execute: supabase_credit_sales_rls_policies.sql</li>
                                                <li>Faça logout e login novamente</li>
                                            </ol>
                                        </div>
                                    )}
                                    <details className="mt-2">
                                        <summary className="cursor-pointer hover:text-blue-600">Ver erro completo</summary>
                                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto text-xs">
                                            {JSON.stringify(dbData.error, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            ) : (
                                <div className="text-green-600 dark:text-green-400">
                                    <p>✅ Conexão OK</p>
                                    <p>✓ Registros encontrados: <strong>{dbData?.count ?? dbData?.data?.length ?? 0}</strong></p>
                                    {dbData?.data && dbData.data.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer hover:text-blue-600 text-gray-700 dark:text-gray-300">
                                                Ver dados brutos
                                            </summary>
                                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto max-h-60 text-xs text-gray-700 dark:text-gray-300">
                                                {JSON.stringify(dbData.data, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Diagnóstico */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded">
                    <h3 className="font-bold mb-2 text-gray-900 dark:text-white">🔍 Diagnóstico</h3>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                        {dbData?.error && !creditSales.length && (
                            <div className="text-red-600 dark:text-red-400 font-semibold">
                                ⚠️ Erro no banco E array vazio no contexto = Problema de RLS
                            </div>
                        )}
                        {!dbData?.error && !creditSales.length && dbData?.count === 0 && (
                            <div className="text-blue-600 dark:text-blue-400">
                                ℹ️ Não há vendas no fiado registradas ainda
                            </div>
                        )}
                        {!dbData?.error && dbData?.data && dbData.data.length > 0 && creditSales.length === 0 && (
                            <div className="text-orange-600 dark:text-orange-400 font-semibold">
                                ⚠️ Dados existem no banco mas não chegam ao contexto
                                <br />→ Possível problema no mapeamento ou RLS parcial
                            </div>
                        )}
                        {!dbData?.error && creditSales.length > 0 && (
                            <div className="text-green-600 dark:text-green-400 font-semibold">
                                ✅ Tudo funcionando corretamente!
                            </div>
                        )}
                    </div>
                </div>

                {/* Console */}
                <div className="bg-gray-900 dark:bg-gray-950 p-4 rounded text-gray-300">
                    <h3 className="font-bold mb-2 text-white">💻 Console</h3>
                    <p className="text-xs">Abra o Console do navegador (F12) para ver logs detalhados com emojis:</p>
                    <ul className="mt-2 text-xs space-y-1">
                        <li>🔍 = Busca iniciada</li>
                        <li>📊 = Dados encontrados</li>
                        <li>✅ = Sucesso</li>
                        <li>❌ = Erro</li>
                        <li>🚨 = Problema de RLS detectado</li>
                    </ul>
                </div>
            </div>

            <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                <p>💡 Este componente é apenas para debug. Remova após resolver o problema.</p>
            </div>
        </div>
    );
};

