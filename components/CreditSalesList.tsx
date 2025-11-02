import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreditSales } from '../contexts.tsx';
import { CreditSale, CreditSaleStatus } from '../types.ts';

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

// Helper function to format date and time
const formatDateTime = (sale: CreditSale): string => {
    if (sale.created_at) {
        const date = new Date(sale.created_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} ${timeStr}`;
    }
    return formatDate(sale.date);
};

// Get status color
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

export const CreditSalesListPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { creditSales, installments, fetchCreditSales, updateCreditSaleStatus } = useCreditSales();
    
    // Recarregar credit sales quando cliente for atualizado
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

    const [statusFilter, setStatusFilter] = useState<'all' | CreditSaleStatus>('all');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    useEffect(() => {
        if (location.state?.successMessage) {
            setSuccessMessage(location.state.successMessage);
            window.history.replaceState({}, document.title);
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    }, [location.state]);

    // Filter by status
    const filteredSales = useMemo(() => {
        if (statusFilter === 'all') return creditSales;
        return creditSales.filter(sale => sale.status === statusFilter);
    }, [creditSales, statusFilter]);

    // Sort by date descending
    const sortedSales = useMemo(() => {
        return [...filteredSales].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredSales]);

    // Calculate totals
    const totals = useMemo(() => {
        return {
            total: filteredSales.reduce((sum, s) => sum + s.totalAmount, 0),
            remaining: filteredSales.reduce((sum, s) => sum + s.remainingAmount, 0),
            paid: filteredSales.reduce((sum, s) => sum + s.totalPaid, 0),
            count: filteredSales.length,
            overdue: filteredSales.filter(s => s.status === CreditSaleStatus.Overdue).length,
        };
    }, [filteredSales]);


    // Get next due date for a sale
    const getNextDueDate = (saleId: number): string | null => {
        const saleInstallments = installments
            .filter(inst => inst.creditSaleId === saleId && inst.status !== 'Paga')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        if (saleInstallments.length === 0) return null;
        return formatDate(saleInstallments[0].dueDate);
    };

    return (
        <div className="mx-auto max-w-4xl">
            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg">
                    <p className="font-semibold text-sm text-green-800 dark:text-green-300">{successMessage}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Vendas no Fiado</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">
                        {totals.count} venda{totals.count !== 1 ? 's' : ''} registrada{totals.count !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/sales/new')}
                    className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 px-5 rounded-lg shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                    <Icon name="add" className="text-xl" />
                    <span>Nova Venda no Fiado</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total em Aberto</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.remaining)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Recebido</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.paid)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Valor Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.total)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Atrasados</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.overdue}</p>
                </div>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        statusFilter === 'all'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setStatusFilter(CreditSaleStatus.Active)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        statusFilter === CreditSaleStatus.Active
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Em Aberto
                </button>
                <button
                    onClick={() => setStatusFilter(CreditSaleStatus.Overdue)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        statusFilter === CreditSaleStatus.Overdue
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Atrasados
                </button>
                <button
                    onClick={() => setStatusFilter(CreditSaleStatus.Paid)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        statusFilter === CreditSaleStatus.Paid
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Quitados
                </button>
            </div>

            {/* Credit Sales List */}
            {sortedSales.length === 0 ? (
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <Icon name="credit_card_off" className="text-5xl text-gray-300 dark:text-gray-700 mb-4 mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Nenhuma venda no fiado encontrada</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Comece registrando uma nova venda no fiado</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Layout */}
                    {sortedSales.map((sale) => (
                        <div key={sale.id} className="block sm:hidden">
                            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white break-words mb-1 flex items-center gap-1.5">
                                            <Icon name="person" className="text-base text-primary" />
                                            <span>{sale.clientName}</span>
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                                            <span>{formatDateTime(sale)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                            <span className="material-symbols-outlined text-sm">shopping_cart</span>
                                            <span className="truncate">{sale.products}</span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(sale.status)}`}>
                                        {sale.status}
                                    </span>
                                </div>

                                <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 dark:text-gray-400">Pago:</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(sale.totalPaid)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 dark:text-gray-400">Restante:</span>
                                        <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(sale.remainingAmount)}</span>
                                    </div>
                                    {getNextDueDate(sale.id) && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">Próximo vencimento:</span>
                                            <span className="font-semibold text-orange-600 dark:text-orange-400">{getNextDueDate(sale.id)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => navigate(`/credit-sales/${sale.id}`)}
                                        className="flex-1 flex items-center justify-center gap-1 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-medium hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-sm"
                                    >
                                        <Icon name="visibility" className="text-base" />
                                        <span>Ver Detalhes</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Desktop Layout */}
                    {sortedSales.map((sale) => (
                        <div key={sale.id} className="hidden sm:block">
                            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between gap-4">
                                    {/* Left side - Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon name="person" className="text-lg text-primary" />
                                            <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                {sale.clientName}
                                            </p>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(sale.status)}`}>
                                                {sale.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                                            {sale.products}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                                {formatDateTime(sale)}
                                            </span>
                                            {getNextDueDate(sale.id) && (
                                                <>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-base">schedule</span>
                                                        Próximo: {getNextDueDate(sale.id)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right side - Values and button */}
                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <div className="text-right space-y-1">
                                            <div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                                                <p className="text-base font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(sale.totalAmount)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Pago</p>
                                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(sale.totalPaid)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Restante</p>
                                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                    {formatCurrency(sale.remainingAmount)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/credit-sales/${sale.id}`)}
                                            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-medium hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-sm whitespace-nowrap"
                                        >
                                            <Icon name="visibility" className="text-lg" />
                                            <span>Detalhes</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

