import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Expense, InstallmentStatus } from '../types.ts';
import { useExpenses, useTransactions, useCreditSales, useExpenseCategories } from '../contexts.tsx';

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to format Date object to YYYY-MM-DD in local timezone
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type DateFilter = 'day' | 'week' | 'month' | 'year' | 'all';

// Helper to check if installment is paid (works with enum or string)
const isPaid = (status: InstallmentStatus | string): boolean => {
    return status === InstallmentStatus.Paid || status === 'Paga' || String(status).trim() === 'Paga';
};

export const FinancialPage: React.FC = () => {
    const navigate = useNavigate();
    const { expenses, deleteExpense, fetchExpenses } = useExpenses();
    const { transactions, fetchTransactions } = useTransactions();
    const { installments, fetchCreditSales } = useCreditSales();
    const { categories } = useExpenseCategories();

    const [dateFilter, setDateFilter] = useState<DateFilter>('month');

    // Recarregar dados quando necessário
    useEffect(() => {
        fetchExpenses();
        fetchTransactions();
        fetchCreditSales();
    }, [fetchExpenses, fetchTransactions, fetchCreditSales]);

    // Get date range based on filter
    const getDateRange = (filter: DateFilter): { start: string; end: string } | null => {
        const today = new Date();
        const startDate = new Date();
        
        switch(filter) {
            case 'day':
                return {
                    start: getTodayLocalDate(),
                    end: getTodayLocalDate()
                };
            case 'week':
                startDate.setDate(today.getDate() - 6);
                return {
                    start: formatLocalDate(startDate),
                    end: getTodayLocalDate()
                };
            case 'month':
                startDate.setDate(1);
                return {
                    start: formatLocalDate(startDate),
                    end: getTodayLocalDate()
                };
            case 'year':
                startDate.setMonth(0, 1);
                return {
                    start: formatLocalDate(startDate),
                    end: getTodayLocalDate()
                };
            case 'all':
            default:
                return null; // No date range for all-time
        }
    };

    // Filter expenses by date range
    const filteredExpenses = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        if (!dateRange) return expenses;
        
        return expenses.filter(expense => {
            return expense.date >= dateRange.start && expense.date <= dateRange.end;
        });
    }, [expenses, dateFilter]);

    // Calculate revenues
    const revenues = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        
        // Revenue from transactions (services and products)
        let transactionRevenue = 0;
        if (dateRange) {
            transactionRevenue = transactions
                .filter(tx => tx.date >= dateRange.start && tx.date <= dateRange.end)
                .reduce((sum, tx) => sum + tx.value, 0);
        } else {
            transactionRevenue = transactions.reduce((sum, tx) => sum + tx.value, 0);
        }

        // Revenue from credit sale payments (installments paid)
        let installmentRevenue = 0;
        if (dateRange) {
            installmentRevenue = installments
                .filter(inst => 
                    isPaid(inst.status) && 
                    inst.paidDate && 
                    inst.paidDate >= dateRange.start && 
                    inst.paidDate <= dateRange.end
                )
                .reduce((sum, inst) => sum + inst.amount, 0);
        } else {
            installmentRevenue = installments
                .filter(inst => isPaid(inst.status))
                .reduce((sum, inst) => sum + inst.amount, 0);
        }

        return transactionRevenue + installmentRevenue;
    }, [transactions, installments, dateFilter]);

    // Calculate total expenses
    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [filteredExpenses]);

    // Calculate net profit
    const netProfit = useMemo(() => {
        return revenues - totalExpenses;
    }, [revenues, totalExpenses]);

    // Format currency
    const formatCurrency = (value: number): string => {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    // Handle edit expense
    const handleEditExpense = (expense: Expense) => {
        navigate(`/financial/expenses/edit/${expense.id}`);
    };

    // Handle delete expense
    const handleDeleteExpense = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta despesa?')) {
            return;
        }

        try {
            await deleteExpense(id);
        } catch (error: any) {
            console.error('Error deleting expense:', error);
            alert(`Erro ao excluir despesa: ${error.message || 'Erro desconhecido.'}`);
        }
    };

    // Get filter label
    const getFilterLabel = (filter: DateFilter): string => {
        switch(filter) {
            case 'day': return 'Hoje';
            case 'week': return 'Semana';
            case 'month': return 'Mês';
            case 'year': return 'Ano';
            case 'all': return 'Geral';
            default: return 'Mês';
        }
    };

    return (
        <div className="mx-auto max-w-7xl w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8 mt-4 sm:mt-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">
                        Financeiro
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">
                        Gerencie receitas, despesas e lucro do negócio
                    </p>
                </div>
                <button
                    onClick={() => navigate('/financial/expenses/new')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
                >
                    <Icon name="add" />
                    <span>Nova Despesa</span>
                </button>
            </div>

            {/* Date Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
                {(['day', 'week', 'month', 'year', 'all'] as DateFilter[]).map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setDateFilter(filter)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            dateFilter === filter
                                ? 'bg-primary text-white'
                                : 'bg-white dark:bg-gray-900/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        {getFilterLabel(filter)}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Revenue Card */}
                <button
                    onClick={() => navigate(`/financial/revenues?filter=${dateFilter}`)}
                    className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all cursor-pointer hover:shadow-lg text-left"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                <Icon name="trending_up" className="text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">Receitas</span>
                        </div>
                        <Icon name="chevron_right" className="text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-3xl font-black text-green-900 dark:text-green-100">
                        {formatCurrency(revenues)}
                    </p>
                </button>

                {/* Expenses Card */}
                <button
                    onClick={() => navigate(`/financial/expenses-list?filter=${dateFilter}`)}
                    className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all cursor-pointer hover:shadow-lg text-left"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                                <Icon name="trending_down" className="text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">Despesas</span>
                        </div>
                        <Icon name="chevron_right" className="text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-3xl font-black text-red-900 dark:text-red-100">
                        {formatCurrency(totalExpenses)}
                    </p>
                </button>

                {/* Net Profit Card */}
                <button
                    onClick={() => navigate(`/financial/balance?filter=${dateFilter}`)}
                    className={`rounded-xl border p-6 hover:shadow-lg transition-all cursor-pointer text-left ${
                        netProfit >= 0
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                                netProfit >= 0
                                    ? 'bg-blue-100 dark:bg-blue-900/50'
                                    : 'bg-orange-100 dark:bg-orange-900/50'
                            }`}>
                                <Icon 
                                    name={netProfit >= 0 ? "account_balance" : "warning"} 
                                    className={netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"} 
                                />
                            </div>
                            <span className={`text-sm font-medium ${
                                netProfit >= 0
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-orange-700 dark:text-orange-300'
                            }`}>
                                Lucro Líquido
                            </span>
                        </div>
                        <Icon 
                            name="chevron_right" 
                            className={netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"} 
                        />
                    </div>
                    <p className={`text-3xl font-black ${
                        netProfit >= 0
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-orange-900 dark:text-orange-100'
                    }`}>
                        {formatCurrency(netProfit)}
                    </p>
                </button>
            </div>

            {/* Quick Expenses List */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15]">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                        Despesas Recentes ({getFilterLabel(dateFilter)})
                    </h2>
                    <button
                        onClick={() => navigate(`/financial/expenses-list?filter=${dateFilter}`)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                    >
                        Ver todas
                        <Icon name="chevron_right" className="text-base" />
                    </button>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredExpenses.length === 0 ? (
                        <div className="p-8 text-center">
                            <Icon name="receipt_long" className="text-5xl text-zinc-300 dark:text-zinc-700 mb-2" />
                            <p className="text-zinc-500 dark:text-zinc-400">Nenhuma despesa registrada no período selecionado</p>
                        </div>
                    ) : (
                        filteredExpenses.slice(0, 5).map((expense) => (
                            <div key={expense.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-zinc-900 dark:text-white">
                                                {expense.description}
                                            </p>
                                            {expense.category && (() => {
                                                const category = categories.find(c => c.name === expense.category);
                                                return (
                                                    <span 
                                                        className="px-2 py-0.5 text-white text-xs rounded-full font-medium"
                                                        style={{ 
                                                            backgroundColor: category?.color || '#6b7280'
                                                        }}
                                                    >
                                                        {expense.category}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                            {formatCurrency(expense.amount)}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditExpense(expense)}
                                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Editar despesa"
                                            >
                                                <Icon name="edit" className="text-base" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Excluir despesa"
                                            >
                                                <Icon name="delete" className="text-base" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {filteredExpenses.length > 5 && (
                        <div className="p-4 text-center">
                            <button
                                onClick={() => navigate(`/financial/expenses-list?filter=${dateFilter}`)}
                                className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                                Ver mais {filteredExpenses.length - 5} despesa(s)
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

