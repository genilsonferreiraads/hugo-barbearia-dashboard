import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTransactions } from '../contexts.tsx';
import { Transaction } from '../types.ts';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper function to format currency
const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

// Helper function to format date
const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Helper function to format date and time
const formatDateTime = (transaction: Transaction): string => {
    if (transaction.created_at) {
        const date = new Date(transaction.created_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} ${timeStr}`;
    }
    // Fallback to date only if created_at is not available
    return formatDate(transaction.date);
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

export const SalesListPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { transactions, deleteTransaction } = useTransactions();

    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>(() => {
        // Se veio da dashboard com parâmetro date=today, filtra por hoje
        return searchParams.get('date') === 'today' ? 'today' : 'month';
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<Transaction | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (location.state?.successMessage) {
            setSuccessMessage(location.state.successMessage);
            // Clear the state to prevent showing the message again on refresh
            window.history.replaceState({}, document.title);
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    }, [location.state]);

    // Filter only product sales
    const productSales = useMemo(() => {
        return transactions.filter(t => 
            t.type === 'product' || t.clientName === 'Venda de Produto'
        );
    }, [transactions]);

    // Filter by date range
    const filteredSales = useMemo(() => {
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

    // Sort by date descending
    const sortedSales = useMemo(() => {
        return [...filteredSales].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredSales]);

    // Calculate totals
    const totals = useMemo(() => {
        return {
            all: filteredSales.reduce((sum, t) => sum + t.value, 0),
            count: filteredSales.length,
        };
    }, [filteredSales]);

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
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Vendas de Produtos</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">{totals.count} venda{totals.count !== 1 ? 's' : ''} registrada{totals.count !== 1 ? 's' : ''}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{getTotalLabel()}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.all)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Vendas</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.count}</p>
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

            {/* Sales List */}
            {sortedSales.length === 0 ? (
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <Icon name="shopping_cart" className="text-5xl text-gray-300 dark:text-gray-700 mb-4 mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Nenhuma venda encontrada</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Comece registrando uma nova venda</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Layout */}
                    {sortedSales.map((sale) => (
                        <div key={sale.id} className="block sm:hidden">
                            <div 
                                onClick={() => navigate(`/transaction/${sale.id}`)}
                                className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm cursor-pointer hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* Left side - Products, Date */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white break-words mb-1 flex items-center gap-1.5">
                                            <Icon name="local_mall" className="text-base" style={{ color: '#ff0000' }} />
                                            <span>{sale.service}</span>
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                                            <span>{formatDateTime(sale)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                            <span className="material-symbols-outlined text-sm">payments</span>
                                            <span>{sale.paymentMethod}</span>
                                        </div>
                                    </div>

                                    {/* Right side - Value and buttons */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-base font-bold text-primary">
                                                {formatCurrency(sale.value)}
                                            </p>
                                            {sale.discount > 0 && (
                                                <p className="text-[10px] text-red-600 dark:text-red-400">
                                                    Desc: {formatCurrency(sale.discount)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(sale);
                                                }}
                                                className="flex items-center justify-center size-7 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                title="Deletar"
                                            >
                                                <Icon name="delete" className="text-base" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Desktop Layout */}
                    {sortedSales.map((sale) => (
                        <div key={sale.id} className="hidden sm:block">
                            <div 
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
                        </div>
                    ))}
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

