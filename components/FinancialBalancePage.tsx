import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

// Helper to check if installment is paid
const isPaid = (status: InstallmentStatus | string): boolean => {
    return status === InstallmentStatus.Paid || status === 'Paga' || String(status).trim() === 'Paga';
};

// Format date
const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
};

// Format currency
const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

interface BalanceItem {
    id: string;
    type: 'revenue' | 'expense';
    description: string;
    amount: number;
    date: string;
    paymentMethod?: string;
    clientName?: string;
    category?: string;
    expenseId?: number;
}

export const FinancialBalancePage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { expenses, deleteExpense, fetchExpenses } = useExpenses();
    const { transactions, fetchTransactions } = useTransactions();
    const { installments, fetchCreditSales } = useCreditSales();
    const { categories } = useExpenseCategories();

    // Get date filter from URL params or default to 'month'
    const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
        const filter = searchParams.get('filter') as DateFilter;
        return filter && ['day', 'week', 'month', 'year', 'all'].includes(filter) ? filter : 'month';
    });

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
                return null;
        }
    };

    // Get filter label
    const getFilterLabel = (filter: DateFilter): string => {
        switch(filter) {
            case 'day': return 'Do Dia';
            case 'week': return 'Semanal';
            case 'month': return 'Mensal';
            case 'year': return 'Anual';
            case 'all': return 'Geral';
            default: return 'Mensal';
        }
    };

    // Build balance items from revenues and expenses, sorted by date
    const balanceItems = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        const items: BalanceItem[] = [];

        // Add transactions (revenues)
        transactions.forEach(tx => {
            if (dateRange) {
                if (tx.date >= dateRange.start && tx.date <= dateRange.end) {
                    items.push({
                        id: `tx-${tx.id}`,
                        type: 'revenue',
                        description: tx.service,
                        amount: tx.value,
                        date: tx.date,
                        paymentMethod: tx.paymentMethod,
                        clientName: tx.clientName,
                    });
                }
            } else {
                items.push({
                    id: `tx-${tx.id}`,
                    type: 'revenue',
                    description: tx.service,
                    amount: tx.value,
                    date: tx.date,
                    paymentMethod: tx.paymentMethod,
                    clientName: tx.clientName,
                });
            }
        });

        // Add paid installments (revenues)
        installments.forEach(inst => {
            if (isPaid(inst.status) && inst.paidDate) {
                if (dateRange) {
                    if (inst.paidDate >= dateRange.start && inst.paidDate <= dateRange.end) {
                        items.push({
                            id: `inst-${inst.id}`,
                            type: 'revenue',
                            description: `Parcela de Fiado - ${inst.installmentNumber}ª parcela`,
                            amount: inst.amount,
                            date: inst.paidDate,
                            paymentMethod: inst.paymentMethod,
                        });
                    }
                } else {
                    items.push({
                        id: `inst-${inst.id}`,
                        type: 'revenue',
                        description: `Parcela de Fiado - ${inst.installmentNumber}ª parcela`,
                        amount: inst.amount,
                        date: inst.paidDate,
                        paymentMethod: inst.paymentMethod,
                    });
                }
            }
        });

        // Add expenses
        expenses.forEach(exp => {
            if (dateRange) {
                if (exp.date >= dateRange.start && exp.date <= dateRange.end) {
                    items.push({
                        id: `exp-${exp.id}`,
                        type: 'expense',
                        description: exp.description,
                        amount: exp.amount,
                        date: exp.date,
                        category: exp.category,
                        expenseId: exp.id,
                    });
                }
            } else {
                items.push({
                    id: `exp-${exp.id}`,
                    type: 'expense',
                    description: exp.description,
                    amount: exp.amount,
                    date: exp.date,
                    category: exp.category,
                    expenseId: exp.id,
                });
            }
        });

        // Sort by date (newest first), then by type (revenue first if same date)
        return items.sort((a, b) => {
            if (b.date !== a.date) {
                return b.date.localeCompare(a.date);
            }
            // If same date, expenses come first (to show negative first)
            if (a.type !== b.type) {
                return a.type === 'expense' ? -1 : 1;
            }
            return b.id.localeCompare(a.id);
        });
    }, [transactions, installments, expenses, dateFilter]);

    // Calculate totals
    const totalRevenue = useMemo(() => {
        return balanceItems
            .filter(item => item.type === 'revenue')
            .reduce((sum, item) => sum + item.amount, 0);
    }, [balanceItems]);

    const totalExpenses = useMemo(() => {
        return balanceItems
            .filter(item => item.type === 'expense')
            .reduce((sum, item) => sum + item.amount, 0);
    }, [balanceItems]);

    const netProfit = useMemo(() => {
        return totalRevenue - totalExpenses;
    }, [totalRevenue, totalExpenses]);

    // Handle edit expense
    const handleEditExpense = (expenseId: number) => {
        navigate(`/financial/expenses/edit/${expenseId}`);
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

    const handleFilterChange = (filter: DateFilter) => {
        setDateFilter(filter);
        setSearchParams({ filter });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
                    <div className="flex items-start gap-2 sm:gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/financial')}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm shrink-0 mt-0.5"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>

                        <div className="text-center flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                Lucro Líquido
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Receitas e despesas ordenadas por data</p>
                        </div>

                        <div className="w-10 sm:w-16" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
                {/* Date Filter */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {(['day', 'week', 'month', 'year', 'all'] as DateFilter[]).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => handleFilterChange(filter)}
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

                {/* Net Profit Card */}
                <div className={`rounded-xl border p-6 mb-6 ${
                    netProfit >= 0
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-3 rounded-lg ${
                                netProfit >= 0
                                    ? 'bg-blue-100 dark:bg-blue-900/50'
                                    : 'bg-orange-100 dark:bg-orange-900/50'
                            }`}>
                                <Icon 
                                    name={netProfit >= 0 ? "account_balance" : "warning"} 
                                    className={netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"} 
                                />
                            </div>
                            <div>
                                <span className={`text-sm font-medium ${
                                    netProfit >= 0
                                        ? 'text-blue-700 dark:text-blue-300'
                                        : 'text-orange-700 dark:text-orange-300'
                                }`}>
                                    Lucro Líquido ({getFilterLabel(dateFilter)})
                                </span>
                                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                    <span>Receitas: {formatCurrency(totalRevenue)}</span>
                                    <span>•</span>
                                    <span>Despesas: {formatCurrency(totalExpenses)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className={`text-4xl font-black mt-4 ${
                        netProfit >= 0
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-orange-900 dark:text-orange-100'
                    }`}>
                        {formatCurrency(netProfit)}
                    </p>
                </div>

                {/* Balance List */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15]">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Movimentações ({getFilterLabel(dateFilter)})
                        </h2>
                    </div>
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {balanceItems.length === 0 ? (
                            <div className="p-8 text-center">
                                <Icon name="account_balance" className="text-5xl text-zinc-300 dark:text-zinc-700 mb-2" />
                                <p className="text-zinc-500 dark:text-zinc-400">Nenhuma movimentação no período selecionado</p>
                            </div>
                        ) : (
                            balanceItems.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors ${
                                        item.type === 'expense' ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon 
                                                    name={item.type === 'revenue' ? 'trending_up' : 'trending_down'} 
                                                    className={`text-base ${
                                                        item.type === 'revenue' 
                                                            ? 'text-green-600 dark:text-green-400' 
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`} 
                                                />
                                                <p className="font-semibold text-zinc-900 dark:text-white">
                                                    {item.description}
                                                </p>
                                                {item.type === 'revenue' && item.description.includes('Fiado') && (
                                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                                                        Fiado
                                                    </span>
                                                )}
                                                {item.type === 'expense' && item.category && (() => {
                                                    const category = categories.find(c => c.name === item.category);
                                                    return (
                                                        <span 
                                                            className="px-2 py-0.5 text-white text-xs rounded-full font-medium"
                                                            style={{ 
                                                                backgroundColor: category?.color || '#6b7280'
                                                            }}
                                                        >
                                                            {item.category}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                <span className="flex items-center gap-1">
                                                    <Icon name="calendar_today" className="text-xs" />
                                                    {formatDate(item.date)}
                                                </span>
                                                {item.paymentMethod && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Icon name="payments" className="text-xs" />
                                                            {item.paymentMethod}
                                                        </span>
                                                    </>
                                                )}
                                                {item.clientName && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="truncate">{item.clientName.split('|')[0]}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            <p className={`text-lg font-bold ${
                                                item.type === 'revenue' 
                                                    ? 'text-green-600 dark:text-green-400' 
                                                    : 'text-red-600 dark:text-red-400'
                                            }`}>
                                                {item.type === 'revenue' ? '+' : '-'}{formatCurrency(item.amount)}
                                            </p>
                                            {item.type === 'expense' && item.expenseId && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditExpense(item.expenseId!)}
                                                        className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Editar despesa"
                                                    >
                                                        <Icon name="edit" className="text-base" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteExpense(item.expenseId!)}
                                                        className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Excluir despesa"
                                                    >
                                                        <Icon name="delete" className="text-base" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

