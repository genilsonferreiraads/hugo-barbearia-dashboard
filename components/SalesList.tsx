import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTransactions, useCreditSales } from '../contexts.tsx';
import { Transaction, CreditSale, CreditSaleStatus, Installment, InstallmentStatus } from '../types.ts';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper function to format currency
const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return 'R$ 0,00';
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const DEFAULT_CLIENT_PLACEHOLDER = 'Venda de Produto';

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

// Helper to format date as YYYY-MM-DD
const toDateString = (date: Date) => date.toISOString().split('T')[0];

// Helper function to get date range
const getDateRange = (filter: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filter) {
        case 'today': {
            const day = toDateString(today);
            return { start: day, end: day };
        }
        case 'week': {
            const weekStart = new Date(today);
            const dayOfWeek = weekStart.getDay();
            // Consider Monday as first day of the week for business reporting
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            weekStart.setDate(weekStart.getDate() + diff);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return { start: toDateString(weekStart), end: toDateString(weekEnd) };
        }
        case 'month': {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { start: toDateString(monthStart), end: toDateString(monthEnd) };
        }
        case 'all':
        default:
            return null;
    }
};

const isDateWithinRange = (dateString: string | undefined, range: { start: string; end: string } | null) => {
    if (!range || !dateString) return true;
    return dateString >= range.start && dateString <= range.end;
};

const getClientDisplayName = (clientName?: string) => {
    if (!clientName) return null;
    const baseName = clientName.split('|')[0]?.trim();
    if (!baseName || baseName === DEFAULT_CLIENT_PLACEHOLDER) return null;
    return baseName;
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
        return transactions.filter(t => {
            const isProduct = t.type === 'product' || t.clientName === 'Venda de Produto';
            const payment = (t.paymentMethod || '').toLowerCase();
            const isCreditPayment = payment.includes('fiado') || payment.includes('crédito no fiado');
            return isProduct && !isCreditPayment;
        });
    }, [transactions]);

    const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

    // Filter paid sales by date range
    const filteredPaidSales = useMemo(() => {
        let filtered = productSales;

        if (dateRange) {
            filtered = filtered.filter(t => isDateWithinRange(t.date, dateRange));
        }

        return filtered;
    }, [productSales, dateRange]);

    // Sort paid sales by date descending
    const sortedPaidSales = useMemo(() => {
        return [...filteredPaidSales].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredPaidSales]);

    // ============ CREDIT SALES LOGIC ============
    // Filter credit sales by date range
    const filteredCreditSalesByDate = useMemo(() => {
        let filtered = creditSales;

        if (dateRange) {
            filtered = filtered.filter(s => isDateWithinRange(s.date, dateRange));
        }

        return filtered;
    }, [creditSales, dateRange]);

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

    // Pending installments totals respecting due date range
    const installmentsDueSummary = useMemo(() => {
        if (!installments || installments.length === 0) {
            return { total: 0, count: 0 };
        }

        const pending = installments.filter(inst => {
            const status = inst.status as InstallmentStatus;
            const isOutstanding = status === InstallmentStatus.Pending || status === InstallmentStatus.Overdue;
            if (!isOutstanding) return false;
            return isDateWithinRange(inst.dueDate, dateRange);
        });

        const total = pending.reduce((sum, inst) => sum + inst.amount, 0);
        return { total, count: pending.length };
    }, [installments, dateRange]);

    // Summary totals for dashboard cards (real revenue)
    const summaryTotals = useMemo(() => {
        return {
            totalSales: paidTotals.total,
            totalPending: installmentsDueSummary.total,
            totalCount: paidTotals.count,
        };
    }, [paidTotals, installmentsDueSummary]);

    const paymentMethodSummary = useMemo(() => {
        if (!filteredPaidSales.length) return [];

        const map = new Map<string, { amount: number; count: number }>();

        filteredPaidSales.forEach((sale) => {
            const key = sale.paymentMethod || 'Sem método';
            if (!map.has(key)) {
                map.set(key, { amount: 0, count: 0 });
            }
            const entry = map.get(key)!;
            entry.amount += sale.value;
            entry.count += 1;
        });

        const totalAmount = Array.from(map.values()).reduce((sum, item) => sum + item.amount, 0) || 1;

        return Array.from(map.entries())
            .map(([method, data]) => ({
                method,
                amount: data.amount,
                count: data.count,
                percentage: Math.round((data.amount / totalAmount) * 100),
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredPaidSales]);

    const fiadoAlertSummary = useMemo(() => {
        if (!installments || installments.length === 0) {
            return {
                overdueCount: 0,
                overdueValue: 0,
                upcomingCount: 0,
                upcomingValue: 0,
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const overdue = installments.filter(inst => inst.status === InstallmentStatus.Overdue);
        const overdueValue = overdue.reduce((sum, inst) => sum + inst.amount, 0);

        const upcoming = installments.filter(inst => {
            if (inst.status !== InstallmentStatus.Pending) return false;
            const due = new Date(inst.dueDate + 'T00:00:00');
            return due >= today && due <= nextWeek;
        });
        const upcomingValue = upcoming.reduce((sum, inst) => sum + inst.amount, 0);

        return {
            overdueCount: overdue.length,
            overdueValue,
            upcomingCount: upcoming.length,
            upcomingValue,
        };
    }, [installments]);

    // Get next due date for a credit sale
    const getNextDueDate = (saleId: number): string | null => {
        const saleInstallments = installments
            .filter(inst => inst.creditSaleId === saleId && inst.status !== InstallmentStatus.Paid)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        if (saleInstallments.length === 0) return null;
        return formatDate(saleInstallments[0].dueDate);
    };

    // ============ EVENT HANDLERS ============
    const getTotalLabel = () => {
        switch(dateFilter) {
            case 'today':
                return 'Total Recebido Hoje';
            case 'week':
                return 'Total Recebido Semana';
            case 'month':
                return 'Total Recebido Mês';
            case 'all':
            default:
                return 'Total Recebido Geral';
        }
    };

    const getPendingLabel = () => {
        switch(dateFilter) {
            case 'today':
                return 'A Receber Hoje';
            case 'week':
                return 'A Receber Semana';
            case 'month':
                return 'A Receber Mês';
            case 'all':
            default:
                return 'A Receber Geral';
        }
    };

    const getFilterContextDescription = () => {
        switch(dateFilter) {
            case 'today':
                return 'Movimento das últimas 24h';
            case 'week':
                return 'Resumo desta semana';
            case 'month':
                return 'Indicadores do mês atual';
            case 'all':
            default:
                return 'Histórico completo';
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

    const dateFilterOptions: Array<{ id: 'today' | 'week' | 'month' | 'all'; label: string }> = [
        { id: 'today', label: 'Hoje' },
        { id: 'week', label: 'Semana' },
        { id: 'month', label: 'Mês' },
        { id: 'all', label: 'Geral' },
    ];

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
                        {summaryTotals.totalCount} venda{summaryTotals.totalCount !== 1 ? 's' : ''} registrada{summaryTotals.totalCount !== 1 ? 's' : ''}
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

            {/* Overview Panel */}
            <section className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em] mb-1">Visão Geral</p>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Panorama financeiro</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getFilterContextDescription()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {dateFilterOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setDateFilter(option.id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                                    dateFilter === option.id
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary/60'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">{getTotalLabel()}</p>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-gray-900/60 text-primary border border-primary/20">À vista</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(summaryTotals.totalSales)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Somente vendas já pagas no período.</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">{getPendingLabel()}</p>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200/60">Fiado</span>
                        </div>
                        <p className="text-3xl font-black text-yellow-600 dark:text-yellow-500">{formatCurrency(summaryTotals.totalPending)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{installmentsDueSummary.count} parcela{installmentsDueSummary.count === 1 ? '' : 's'} dentro do filtro.</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">Volume de vendas</p>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60">Resumo</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white">{summaryTotals.totalCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {paidTotals.count} venda{paidTotals.count === 1 ? '' : 's'} à vista · {creditTotals.count} fiado{creditTotals.count === 1 ? '' : 's'} no período.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Distribuição por pagamento</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">Onde o dinheiro entra</p>
                            </div>
                            <Icon name="pie_chart" className="text-primary text-2xl" />
                        </div>
                        {paymentMethodSummary.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma venda registrada neste período.</p>
                        ) : (
                            <div className="space-y-4">
                                {paymentMethodSummary.map((item) => (
                                    <div key={item.method}>
                                        <div className="flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            <span>{item.method} · {item.count}x</span>
                                            <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                            <span>Participação</span>
                                            <span>{item.percentage}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            <div 
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saúde do fiado</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">Acompanhe o que falta receber</p>
                            </div>
                            <Icon name="insights" className="text-yellow-500 text-2xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 p-3">
                                <p className="text-[11px] uppercase text-yellow-700 dark:text-yellow-400 font-semibold mb-1">No filtro</p>
                                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{formatCurrency(summaryTotals.totalPending)}</p>
                                <p className="text-xs text-yellow-700/80 dark:text-yellow-400/80">{installmentsDueSummary.count} parcelas</p>
                            </div>
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3">
                                <p className="text-[11px] uppercase text-blue-700 dark:text-blue-400 font-semibold mb-1">Total fiado</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(creditTotals.pending)}</p>
                                <p className="text-xs text-blue-700/80 dark:text-blue-400/80">{creditTotals.count} venda{creditTotals.count === 1 ? '' : 's'}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                                <div>
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Parcelas vencidas</p>
                                    <p className="text-xs text-red-600/80 dark:text-red-300/80">{fiadoAlertSummary.overdueCount} aguardando pagamento</p>
                                </div>
                                <span className="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(fiadoAlertSummary.overdueValue)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                                <div>
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Próximos 7 dias</p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-300/80">{fiadoAlertSummary.upcomingCount} parcela{fiadoAlertSummary.upcomingCount === 1 ? '' : 's'} a vencer</p>
                                </div>
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatCurrency(fiadoAlertSummary.upcomingValue)}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveTab('credit')}
                            className="w-full mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                            <Icon name="open_in_new" className="text-base" />
                            Ir para fiados
                        </button>
                    </div>
                </div>
            </section>

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
                            {sortedPaidSales.map((sale) => {
                                const clientDisplayName = getClientDisplayName(sale.clientName);
                                const isFiadoService = sale.service?.toLowerCase().startsWith('fiado -');
                                return (
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
                                                {clientDisplayName && !isFiadoService && (
                                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                                                        Cliente: <span className="font-semibold text-gray-800 dark:text-gray-200">{clientDisplayName}</span>
                                                    </p>
                                                )}
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
                                );
                            })}
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
                                const clientDisplayName = getClientDisplayName(sale.clientName) || sale.clientName;
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
                                                        <span>{clientDisplayName}</span>
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
