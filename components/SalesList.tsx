import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTransactions, useCreditSales } from '../contexts.tsx';
import { Transaction, CreditSale, CreditSaleStatus, Installment } from '../types.ts';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper function to format currency
const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return 'R$ 0,00';
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

// Helper function to format date
const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Helper function to format date and time for transactions
const formatDateTime = (transaction: Transaction): string => {
    if (transaction.created_at) {
        const date = new Date(transaction.created_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} ${timeStr}`;
    }
    return formatDate(transaction.date);
};

// Helper function to format date and time for credit sales
const formatCreditDateTime = (sale: CreditSale): string => {
    if (sale.created_at) {
        const date = new Date(sale.created_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} ${timeStr}`;
    }
    return formatDate(sale.date);
};

// Helper function to get date range
const getDateRange = (filter: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filter) {
        case 'today':
            return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return { start: weekStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
        case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start: monthStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
        case 'all':
        default:
            return null;
    }
};

// Get status color for credit sales
const getStatusColor = (status: CreditSaleStatus): string => {
    switch (status) {
        case CreditSaleStatus.Paid:
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
        case CreditSaleStatus.Overdue:
            return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
        case CreditSaleStatus.Active:
        default:
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
    }
};

// Get status label for credit sales
const getStatusLabel = (status: CreditSaleStatus): string => {
    switch (status) {
        case CreditSaleStatus.Paid:
            return 'Pago';
        case CreditSaleStatus.Overdue:
            return 'Atrasado';
        case CreditSaleStatus.Active:
        default:
            return 'Em Aberto';
    }
};

export const SalesListPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { transactions, deleteTransaction } = useTransactions();
    const { creditSales, installments, fetchCreditSales, updateCreditSaleStatus } = useCreditSales();

    // Tab state: 'paid' or 'credit'
    const [activeTab, setActiveTab] = useState<'paid' | 'credit'>('paid');

    // Date filter (applies to both tabs)
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>(() => {
        return searchParams.get('date') === 'today' ? 'today' : 'month';
    });

    // Credit sales status filter
    const [creditStatusFilter, setCreditStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<Transaction | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load credit sales on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                await fetchCreditSales();
                await updateCreditSaleStatus();
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            }
        };
        loadData();
    }, [fetchCreditSales, updateCreditSaleStatus]);

    // Reload credit sales when client is updated
    useEffect(() => {
        const handleClientUpdated = () => {
            fetchCreditSales();
            updateCreditSaleStatus();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchCreditSales, updateCreditSaleStatus]);

    useEffect(() => {
        if (location.state?.successMessage) {
            setSuccessMessage(location.state.successMessage);
            window.history.replaceState({}, document.title);
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    }, [location.state]);

    // ============ PAID SALES LOGIC ============
    // Filter only product sales
    const productSales = useMemo(() => {
        return transactions.filter(t => 
            t.type === 'product' || t.clientName === 'Venda de Produto'
        );
    }, [transactions]);

    // Filter paid sales by date range
    const filteredPaidSales = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        let filtered = productSales;

        if (dateRange) {
            filtered = filtered.filter(t => {
                const tDate = t.date;
                return tDate >= dateRange.start && tDate <= dateRange.end;
            });
        }

        return filtered;
    }, [productSales, dateFilter]);

    // Sort paid sales by date descending
    const sortedPaidSales = useMemo(() => {
        return [...filteredPaidSales].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredPaidSales]);

    // ============ CREDIT SALES LOGIC ============
    // Filter credit sales by date range
    const filteredCreditSalesByDate = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        let filtered = creditSales;

        if (dateRange) {
            filtered = filtered.filter(s => {
                const sDate = s.date;
                return sDate >= dateRange.start && sDate <= dateRange.end;
            });
        }

        return filtered;
    }, [creditSales, dateFilter]);

    // Filter credit sales by status
    const filteredCreditSales = useMemo(() => {
        if (creditStatusFilter === 'all') return filteredCreditSalesByDate;
        
        if (creditStatusFilter === 'pending') {
            // A Receber: Em Aberto ou Atrasado
            return filteredCreditSalesByDate.filter(sale => 
                sale.status === CreditSaleStatus.Active || sale.status === CreditSaleStatus.Overdue
            );
        }
        
        if (creditStatusFilter === 'paid') {
            // Recebidas: Pago
            return filteredCreditSalesByDate.filter(sale => sale.status === CreditSaleStatus.Paid);
        }

        return filteredCreditSalesByDate;
    }, [filteredCreditSalesByDate, creditStatusFilter]);

    // Sort credit sales by date descending
    const sortedCreditSales = useMemo(() => {
        return [...filteredCreditSales].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredCreditSales]);

    // ============ CALCULATE TOTALS ============
    // Paid sales totals
    const paidTotals = useMemo(() => {
        return {
            total: filteredPaidSales.reduce((sum, t) => sum + t.value, 0),
            count: filteredPaidSales.length,
        };
    }, [filteredPaidSales]);

    // Credit sales totals (based on date filter, not status filter)
    const creditTotals = useMemo(() => {
        // Total de todas as vendas no período (independente do status)
        const allInPeriod = filteredCreditSalesByDate;
        
        return {
            total: allInPeriod.reduce((sum, s) => sum + s.totalAmount, 0),
            pending: allInPeriod.reduce((sum, s) => sum + s.remainingAmount, 0), // A receber
            paid: allInPeriod.reduce((sum, s) => sum + s.totalPaid, 0),
            count: allInPeriod.length,
        };
    }, [filteredCreditSalesByDate]);

    // Combined totals for stats cards
    const combinedTotals = useMemo(() => {
        // Total geral = vendas pagas + total das vendas a crédito
        const totalSales = paidTotals.total + creditTotals.total;
        // A receber = apenas o que falta receber dos créditos
        const totalPending = creditTotals.pending;
        // Número total de vendas = vendas pagas + vendas a crédito
        const totalCount = paidTotals.count + creditTotals.count;

        return {
            totalSales,
            totalPending,
            totalCount,
        };
    }, [paidTotals, creditTotals]);

    // Get next due date for a credit sale
    const getNextDueDate = (saleId: number): string | null => {
        const saleInstallments = installments
            .filter(inst => inst.creditSaleId === saleId && inst.status !== 'Paga')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        if (saleInstallments.length === 0) return null;
        return formatDate(saleInstallments[0].dueDate);
    };

    // ============ EVENT HANDLERS ============
    const getTotalLabel = () => {
        switch(dateFilter) {
            case 'today':
                return 'Total Hoje';
            case 'week':
                return 'Total Semana';
            case 'month':
                return 'Total Mês';
            case 'all':
            default:
                return 'Total Geral';
        }
    };

    const handleDeleteClick = (sale: Transaction) => {
        setSaleToDelete(sale);
    };

    const handleConfirmDelete = async () => {
        if (!saleToDelete) return;
        
        try {
            setIsDeleting(true);
            await deleteTransaction(saleToDelete.id);
            setSaleToDelete(null);
        } catch (error: any) {
            alert(`Falha ao excluir venda: ${error.message || 'Erro desconhecido.'}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setSaleToDelete(null);
    };

    return (
        <div className="mx-auto max-w-6xl">
            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg animate-fade-in">
                    <p className="font-semibold text-sm text-green-800 dark:text-green-300">{successMessage}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Vendas</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">
                        {combinedTotals.totalCount} venda{combinedTotals.totalCount !== 1 ? 's' : ''} registrada{combinedTotals.totalCount !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/sales/new')}
                    className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 px-5 rounded-lg shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                    <Icon name="add" className="text-xl" />
                    <span>Nova Venda</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                            <Icon name="payments" className="text-primary text-lg" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{getTotalLabel()}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(combinedTotals.totalSales)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-yellow-500/10">
                            <Icon name="schedule" className="text-yellow-600 dark:text-yellow-500 text-lg" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">A Receber</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{formatCurrency(combinedTotals.totalPending)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/10">
                            <Icon name="shopping_bag" className="text-blue-600 dark:text-blue-500 text-lg" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nº de Vendas</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{combinedTotals.totalCount}</p>
                </div>
            </div>

            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setDateFilter('today')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'today'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Hoje
                </button>
                <button
                    onClick={() => setDateFilter('week')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'week'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Semana
                </button>
                <button
                    onClick={() => setDateFilter('month')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'month'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Mês
                </button>
                <button
                    onClick={() => setDateFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'all'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Geral
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('paid')}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                        activeTab === 'paid'
                            ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Icon name="check_circle" className="text-lg" />
                        <span>Vendas Pagas</span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{paidTotals.count}</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('credit')}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                        activeTab === 'credit'
                            ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Icon name="credit_card" className="text-lg" />
                        <span>Fiados</span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{creditTotals.count}</span>
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'paid' ? (
                /* PAID SALES TAB */
                <div className="space-y-4 animate-fade-in">
                    {sortedPaidSales.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                            <Icon name="shopping_cart" className="text-5xl text-gray-300 dark:text-gray-700 mb-4 mx-auto" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Nenhuma venda encontrada</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">Comece registrando uma nova venda</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedPaidSales.map((sale) => (
                                <div 
                                    key={sale.id}
                                    onClick={() => navigate(`/transaction/${sale.id}`)}
                                    className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        {/* Left side - Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-base font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                                    <Icon name="local_mall" className="text-lg" style={{ color: '#ff0000' }} />
                                                    <span>{sale.service}</span>
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-base">calendar_today</span>
                                                    {formatDateTime(sale)}
                                                </span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-base">payments</span>
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right side - Value and buttons */}
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-primary">
                                                    {formatCurrency(sale.value)}
                                                </p>
                                                {sale.discount > 0 && (
                                                    <p className="text-xs text-red-600 dark:text-red-400">
                                                        Desc: {formatCurrency(sale.discount)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(sale);
                                                    }}
                                                    className="flex items-center justify-center size-9 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                    title="Deletar"
                                                >
                                                    <Icon name="delete" className="text-lg" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* CREDIT SALES TAB */
                <div className="animate-fade-in">
                    {/* Credit Status Filter */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button
                            onClick={() => setCreditStatusFilter('all')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                creditStatusFilter === 'all'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                            }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setCreditStatusFilter('pending')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                creditStatusFilter === 'pending'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                            }`}
                        >
                            A Receber
                        </button>
                        <button
                            onClick={() => setCreditStatusFilter('paid')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                creditStatusFilter === 'paid'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                            }`}
                        >
                            Recebidas
                        </button>
                    </div>

                    {/* Credit Sales List */}
                    {sortedCreditSales.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                            <Icon name="credit_card" className="text-5xl text-gray-300 dark:text-gray-700 mb-4 mx-auto" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Nenhuma venda no fiado encontrada</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">Comece registrando uma nova venda no fiado</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedCreditSales.map((sale) => {
                                const nextDueDate = getNextDueDate(sale.id);
                                return (
                                    <div 
                                        key={sale.id}
                                        onClick={() => navigate(`/credit-sales/${sale.id}`)}
                                        className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left side - Main info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="text-base font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                                        <Icon name="person" className="text-lg text-primary" />
                                                        <span>{sale.clientName}</span>
                                                    </p>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(sale.status)}`}>
                                                        {getStatusLabel(sale.status)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                                                    {sale.products}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600 dark:text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="calendar_today" className="text-sm" />
                                                        {formatCreditDateTime(sale)}
                                                    </span>
                                                    {nextDueDate && (
                                                        <>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className="flex items-center gap-1">
                                                                <Icon name="schedule" className="text-sm" />
                                                                Próximo venc.: {nextDueDate}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="credit_card" className="text-sm" />
                                                        {sale.numberOfInstallments}x
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right side - Values */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-lg font-bold text-primary mb-1">
                                                    {formatCurrency(sale.totalAmount)}
                                                </p>
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                                        Pago: {formatCurrency(sale.totalPaid)}
                                                    </span>
                                                    <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                                                        Resta: {formatCurrency(sale.remainingAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {saleToDelete && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={handleCancelDelete}
                >
                    <div 
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-5">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Exclusão</h3>
                            <button 
                                onClick={handleCancelDelete}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                            >
                                <Icon name="close" className="text-lg" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                                    <Icon name="warning" className="text-red-600 dark:text-red-400 text-2xl" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                                        Tem certeza que deseja excluir esta venda?
                                    </p>
                                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-1">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold">Produtos:</span> {saleToDelete.service}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold">Valor:</span> {formatCurrency(saleToDelete.value)}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold">Data e Hora:</span> {formatDateTime(saleToDelete)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Esta ação não pode ser desfeita.
                            </p>
                        </div>

                        <div className="flex gap-3 border-t border-gray-200 dark:border-gray-800 p-5">
                            <button 
                                onClick={handleCancelDelete}
                                disabled={isDeleting}
                                className="flex-1 h-11 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-6 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 h-11 items-center justify-center rounded-lg bg-red-600 px-6 text-base font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
