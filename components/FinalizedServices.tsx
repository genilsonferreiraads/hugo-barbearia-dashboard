import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Transaction } from '../types.ts';
import { useTransactions, useEditTransaction } from '../contexts.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const FinalizedServicesPage: React.FC = () => {
    const { transactions, fetchTransactions, updateTransaction, deleteTransaction } = useTransactions();
    const { setEditTransactionData, clearEditTransactionData } = useEditTransaction();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Recarregar transações quando cliente for atualizado
    useEffect(() => {
        const handleClientUpdated = () => {
            fetchTransactions();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchTransactions]);
    
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'agendado' | 'avulso'>('all');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>(() => {
        // Se veio da dashboard (parâmetro ?from=dashboard), filtra por hoje
        return searchParams.get('from') === 'dashboard' ? 'today' : 'month';
    });
    
    // Delete confirmation state
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<number | null>(null);

    // Show success message from location state and auto-dismiss after 3 seconds
    useEffect(() => {
        const message = (location.state as any)?.successMessage;
        if (message) {
            setSuccessMessage(message);
            
            // Replace current history entry to clear the state (prevents showing message on refresh)
            navigate('/register-service', { replace: true });
            
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [location.pathname]);

    const handleEditClick = (transaction: any) => {
        setEditTransactionData(transaction, async (updates) => {
            try {
                await updateTransaction(transaction.id, updates);
                // Clear the edit context after a small delay to ensure navigation completes
                setTimeout(() => {
                    clearEditTransactionData();
                }, 200);
            } catch (error) {
                console.error('Erro ao atualizar:', error);
                alert('Erro ao atualizar o serviço');
            }
        });
        // Navigate after setting the context
        setTimeout(() => {
            navigate('/edit-transaction');
        }, 0);
    };

    const handleDeleteClick = (transaction: any, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setSelectedTransaction(transaction);
        setIsDeleting(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedTransaction) return;
        try {
            // Iniciar animação de remoção
            setDeletingTransactionId(selectedTransaction.id);
            setIsDeleting(false);
            
            // Aguardar animação completar antes de deletar
            setTimeout(async () => {
                try {
                    await deleteTransaction(selectedTransaction.id);
                    setDeletingTransactionId(null);
                    setSelectedTransaction(null);
                } catch (error) {
                    console.error('Erro ao deletar:', error);
                    alert('Erro ao deletar o serviço');
                    setDeletingTransactionId(null);
                }
            }, 300); // Duração da animação em ms
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert('Erro ao deletar o serviço');
            setDeletingTransactionId(null);
            setSelectedTransaction(null);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleting(false);
        setSelectedTransaction(null);
    };

    // Get date ranges
    const getDateRange = (filter: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        const startDate = new Date();
        
        switch(filter) {
            case 'today':
                return {
                    start: getTodayLocalDate(),
                    end: getTodayLocalDate()
                };
            case 'week':
                startDate.setDate(today.getDate() - today.getDay());
                return {
                    start: startDate.toISOString().split('T')[0],
                    end: getTodayLocalDate()
                };
            case 'month':
                startDate.setDate(1);
                return {
                    start: startDate.toISOString().split('T')[0],
                    end: getTodayLocalDate()
                };
            case 'all':
            default:
                return null;
        }
    };

    // Categorize transactions - excluir produtos, apenas serviços
    const categorizedTransactions = useMemo(() => {
        return transactions
            .filter(transaction => {
                // Excluir vendas de produtos - verificar tanto pelo type quanto pelo clientName
                if (transaction.type === 'product') return false;
                if (transaction.clientName === 'Venda de Produto') return false;
                return true;
            })
            .map(transaction => {
                // Categorize as scheduled or walk-in service
                // Usar o campo fromAppointment para determinar se é agendado
                const isScheduled = transaction.fromAppointment === true;
            return {
                ...transaction,
                    type: isScheduled ? 'agendado' as const : 'avulso' as const
            };
        });
    }, [transactions]);

    // Filter by date range and type
    const filteredTransactions = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        let filtered = categorizedTransactions;

        // Apply date filter
        if (dateRange) {
            filtered = filtered.filter(t => {
                const tDate = t.date;
                return tDate >= dateRange.start && tDate <= dateRange.end;
            });
        }

        // Apply type filter
        if (filterType === 'agendado' || filterType === 'avulso') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        return filtered;
    }, [categorizedTransactions, filterType, dateFilter]);

    // Sort by date descending
    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredTransactions]);

    // Format date
    const formatDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Format currency
    const formatCurrency = (value: number): string => {
        const fixedValue = value.toFixed(2);
        const [integerPart, decimalPart] = fixedValue.split('.');
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${formattedInteger},${decimalPart}`;
    };

    // Extract client name (remove WhatsApp if present)
    const getClientName = (clientName: string): string => {
        return clientName.includes('|') ? clientName.split('|')[0] : clientName;
    };

    // Calculate totals
    const totals = useMemo(() => {
        return {
            all: filteredTransactions.reduce((sum, t) => sum + t.value, 0), // Total já considera descontos aplicados
            count: filteredTransactions.length,
        };
    }, [filteredTransactions]);

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

    return (
        <div className="mx-auto max-w-6xl w-full">
            {/* Success Message Toast - Top Right */}
            {successMessage && (
                <div className="fixed top-6 right-6 max-w-sm p-4 bg-green-500 dark:bg-green-600 text-white rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 z-50">
                    <span className="material-symbols-outlined text-lg flex-shrink-0">check_circle</span>
                    <p className="font-semibold text-sm">{successMessage}</p>
                </div>
            )}

            {/* Header with New Service Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8 mt-4 sm:mt-6">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Atendimentos</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">{totals.count} serviço{totals.count !== 1 ? 's' : ''} finalizado{totals.count !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => navigate('/register-service/new')}
                    className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg hover:bg-primary/90 transition-all active:scale-95 w-full sm:w-auto"
                >
                    <Icon name="add" />
                    <span>Novo Atendimento</span>
                </button>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'all'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterType('agendado')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'agendado'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                    }`}
                >
                    Agendados
                </button>
                <button
                    onClick={() => setFilterType('avulso')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'avulso'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                    }`}
                >
                    Ordem de chegada
                </button>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{getTotalLabel()}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.all)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Serviços</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.count}</p>
                </div>
            </div>

            {/* Transactions List */}
            {sortedTransactions.length === 0 ? (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4 block">inbox</span>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Nenhum serviço finalizado nesta categoria</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {sortedTransactions.map((transaction) => {
                        const isDeletingItem = deletingTransactionId === transaction.id;
                        return (
                        <div
                            key={transaction.id}
                            onClick={() => !isDeletingItem && navigate(`/transaction/${transaction.id}`)}
                            className={`bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] ${
                                isDeletingItem 
                                    ? 'opacity-0 transform scale-95 -translate-y-2 pointer-events-none' 
                                    : 'opacity-100 transform scale-100 translate-y-0 hover:shadow-md'
                            }`}
                            style={{ 
                                transition: 'opacity 300ms ease-out, transform 300ms ease-out',
                                pointerEvents: isDeletingItem ? 'none' : 'auto'
                            }}
                        >
                            {/* Mobile Layout */}
                            <div className="block sm:hidden">
                                <div className="flex items-start justify-between gap-3">
                                    {/* Left side - Name, Date, Category */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis mb-1 flex items-center gap-1.5">
                                            {transaction.type === 'agendado' ? (
                                                <>
                                                    <Icon name="event_available" className="text-base flex-shrink-0" style={{ color: '#ff0000' }} />
                                                    <span className="truncate">{getClientName(transaction.clientName)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon name="order_approve" className="text-base flex-shrink-0" style={{ color: '#ff0000' }} />
                                                    <span className="truncate">{getClientName(transaction.clientName)}</span>
                                                </>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                                            <span>{formatDate(transaction.date)}</span>
                                </div>
                                </div>

                                    {/* Right side - Value and buttons */}
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-base font-bold text-primary">
                                                {formatCurrency(transaction.value)}
                                            </p>
                                            {transaction.discount > 0 && (
                                                <p className="text-[10px] text-red-600 dark:text-red-400">
                                                    Desc: {formatCurrency(transaction.discount)}
                                                </p>
                                            )}
                                </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(transaction);
                                                }}
                                                className="flex items-center justify-center size-7 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-base">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(transaction);
                                                }}
                                                className="flex items-center justify-center size-7 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                title="Deletar"
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                </div>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden sm:flex items-center justify-between gap-3">
                                {/* Left side - Main info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-base font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                            {transaction.type === 'agendado' ? (
                                                <>
                                                    <Icon name="event_available" className="text-lg" style={{ color: '#ff0000' }} />
                                                    <span>{getClientName(transaction.clientName)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon name="order_approve" className="text-lg" style={{ color: '#ff0000' }} />
                                                    <span>{getClientName(transaction.clientName)}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-base">calendar_today</span>
                                            {formatDate(transaction.date)}
                                </span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="truncate">{transaction.service || '-'}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="hidden sm:inline">{transaction.paymentMethod}</span>
                                    </div>
                                </div>

                                {/* Right side - Value and actions */}
                                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-primary">
                                            {formatCurrency(transaction.value)}
                                        </p>
                                        {transaction.discount > 0 && (
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                Desc: {formatCurrency(transaction.discount)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1 sm:gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(transaction);
                                        }}
                                            className="flex items-center justify-center size-9 rounded-lg text-primary dark:text-white hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                                        title="Editar"
                                    >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(transaction, e);
                                        }}
                                            className="flex items-center justify-center size-9 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        title="Deletar"
                                    >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleting && selectedTransaction && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed inset-0 bg-black/60 dark:bg-black/70 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm"
                    style={{ position: 'fixed', zIndex: 99999 }}
                    onClick={handleCancelDelete}
                >
                    <div 
                        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-2xl max-w-md w-full p-5 sm:p-6 transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-5">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Icon name="warning" className="text-red-600 dark:text-red-400 text-xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                    Excluir Atendimento
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-5 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm">
                                <span className="font-semibold text-gray-900 dark:text-white">Cliente:</span>{' '}
                                <span className="text-gray-700 dark:text-gray-300">{getClientName(selectedTransaction.clientName)}</span>
                            </p>
                            <p className="text-sm">
                                <span className="font-semibold text-gray-900 dark:text-white">Valor:</span>{' '}
                                <span className="text-gray-700 dark:text-gray-300">{formatCurrency(selectedTransaction.value)}</span>
                            </p>
                            {selectedTransaction.service && (
                                <p className="text-sm">
                                    <span className="font-semibold text-gray-900 dark:text-white">Serviço:</span>{' '}
                                    <span className="text-gray-700 dark:text-gray-300">{selectedTransaction.service}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={handleCancelDelete}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Icon name="delete" className="text-base" />
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
