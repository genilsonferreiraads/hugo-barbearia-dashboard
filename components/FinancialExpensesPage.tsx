import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Expense } from '../types.ts';
import { useExpenses, useExpenseCategories } from '../contexts.tsx';

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

export const FinancialExpensesPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { expenses, deleteExpense, fetchExpenses } = useExpenses();
    const { categories } = useExpenseCategories();

    // Get date filter from URL params or default to 'month'
    const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
        const filter = searchParams.get('filter') as DateFilter;
        return filter && ['day', 'week', 'month', 'year', 'all'].includes(filter) ? filter : 'month';
    });

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

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

    // Filter expenses by date range
    const filteredExpenses = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        if (!dateRange) return expenses;
        
        return expenses.filter(expense => {
            return expense.date >= dateRange.start && expense.date <= dateRange.end;
        }).sort((a, b) => {
            // Sort by date (newest first)
            if (b.date !== a.date) {
                return b.date.localeCompare(a.date);
            }
            return b.id - a.id;
        });
    }, [expenses, dateFilter]);

    // Calculate total expenses
    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [filteredExpenses]);

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
                                Despesas
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Lista detalhada de despesas</p>
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

                {/* Total Expenses Card */}
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                                <Icon name="trending_down" className="text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                Total de Despesas ({getFilterLabel(dateFilter)})
                            </span>
                        </div>
                        <p className="text-3xl font-black text-red-900 dark:text-red-100">
                            {formatCurrency(totalExpenses)}
                        </p>
                    </div>
                </div>

                {/* Expenses List */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15]">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Lista de Despesas
                        </h2>
                    </div>
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {filteredExpenses.length === 0 ? (
                            <div className="p-8 text-center">
                                <Icon name="receipt_long" className="text-5xl text-zinc-300 dark:text-zinc-700 mb-2" />
                                <p className="text-zinc-500 dark:text-zinc-400">Nenhuma despesa registrada no período selecionado</p>
                            </div>
                        ) : (
                            filteredExpenses.map((expense) => (
                                <div key={expense.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon name="receipt" className="text-base text-red-600 dark:text-red-400" />
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
                                            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                <span className="flex items-center gap-1">
                                                    <Icon name="calendar_today" className="text-xs" />
                                                    {formatDate(expense.date)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
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
                    </div>
                </div>
            </main>
        </div>
    );
};

