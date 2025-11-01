import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Transaction } from '../types.ts';
import { useTransactions, useEditTransaction } from '../contexts.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

export const TransactionDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { transactions, deleteTransaction, updateTransaction } = useTransactions();
    const { setEditTransactionData, clearEditTransactionData } = useEditTransaction();

    const transaction = transactions.find(t => t.id === Number(id));
    const isProductSale = transaction ? (transaction.type === 'product' || transaction.clientName === 'Venda de Produto') : false;
    
    // Determine back route: if came from reports, go back to reports; otherwise use default
    const fromReports = (location.state as any)?.from === 'reports';
    const backRoute = fromReports ? '/reports' : (isProductSale ? '/sales' : '/register-service');

    if (!transaction) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icon name="error" className="text-6xl text-gray-400 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {isProductSale ? 'Venda não encontrada' : 'Serviço não encontrado'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {isProductSale ? 'A venda que você está procurando não existe.' : 'O serviço que você está procurando não existe.'}
                    </p>
                    <button
                        onClick={() => navigate(backRoute)}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                        {isProductSale ? 'Voltar para Vendas' : 'Voltar para Serviços Finalizados'}
                    </button>
                </div>
            </div>
        );
    }

    // Format date
    const formatDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            weekday: 'long'
        });
    };

    // Format date and time
    const formatDateTime = (transaction: Transaction): string => {
        if (transaction.created_at) {
            const date = new Date(transaction.created_at);
            const dateStr = date.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                weekday: 'long'
            });
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `${dateStr} às ${timeStr}`;
        }
        // Fallback to date only if created_at is not available
        return formatDate(transaction.date);
    };

    // Format currency
    const formatCurrency = (value: number): string => {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    // Extract client name (remove WhatsApp if present)
    const getClientName = (clientName: string): string => {
        return clientName.includes('|') ? clientName.split('|')[0] : clientName;
    };

    // Extract WhatsApp number
    const getWhatsApp = (clientName: string): string | null => {
        if (clientName.includes('|')) {
            const match = clientName.match(/\|(.+)$/);
            return match ? match[1].trim() : null;
        }
        return null;
    };

    const whatsapp = getWhatsApp(transaction.clientName);
    const whatsappUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}` : null;

    const handleEdit = () => {
        if (isProductSale) {
            // Para vendas de produtos, navegar para página de edição de vendas
            setEditTransactionData(transaction, async (updates) => {
                try {
                    await updateTransaction(transaction.id, updates);
                    setTimeout(() => {
                        clearEditTransactionData();
                    }, 200);
                } catch (error) {
                    console.error('Erro ao atualizar:', error);
                    alert('Erro ao atualizar a venda');
                }
            });
            setTimeout(() => {
                navigate('/sales/edit');
            }, 0);
        } else {
            // Para serviços, usar o fluxo existente
            setEditTransactionData(transaction, async (updates) => {
                try {
                    await updateTransaction(transaction.id, updates);
                    setTimeout(() => {
                        clearEditTransactionData();
                    }, 200);
                } catch (error) {
                    console.error('Erro ao atualizar:', error);
                    alert('Erro ao atualizar o serviço');
                }
            });
            setTimeout(() => {
                navigate('/edit-transaction');
            }, 0);
        }
    };

    const handleDelete = async () => {
        const confirmMessage = isProductSale 
            ? 'Tem certeza que deseja deletar esta venda? Esta ação não pode ser desfeita.'
            : 'Tem certeza que deseja deletar este serviço? Esta ação não pode ser desfeita.';
        
        if (confirm(confirmMessage)) {
            try {
                await deleteTransaction(transaction.id);
                navigate(backRoute);
            } catch (error) {
                console.error('Erro ao deletar:', error);
                alert(isProductSale ? 'Erro ao deletar a venda' : 'Erro ao deletar o serviço');
            }
        }
    };

    const isScheduled = transaction.clientName.includes('|');
    const pageTitle = isProductSale ? 'Detalhes da Venda' : 'Detalhes do Serviço';

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    {/* Mobile Layout */}
                    <div className="block sm:hidden">
                        <div className="flex items-center gap-2 mb-2">
                            <button 
                                onClick={() => navigate(backRoute)}
                                className="flex items-center justify-center size-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                            >
                                <Icon name="arrow_back" className="text-xl" />
                            </button>
                            <div className="flex-1">
                                <h1 className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">{pageTitle}</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatDateTime(transaction)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleEdit}
                                className="flex items-center justify-center size-9 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                title="Editar"
                            >
                                <Icon name="edit" className="text-base" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center justify-center size-9 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                title="Deletar"
                            >
                                <Icon name="delete" className="text-base" />
                            </button>
                        </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center gap-4">
                        <button 
                            onClick={() => navigate(backRoute)}
                            className="flex items-center justify-center size-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(transaction)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleEdit}
                                className="flex items-center justify-center size-10 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                title="Editar"
                            >
                                <Icon name="edit" className="text-lg" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center justify-center size-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                title="Deletar"
                            >
                                <Icon name="delete" className="text-lg" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="space-y-4">
                    {/* Client/Type Card - Only show for services */}
                    {!isProductSale && (
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                        {getClientName(transaction.clientName)}
                                    </h2>
                                    {whatsapp && (
                                        <a
                                            href={whatsappUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-2"
                                        >
                                            <Icon name="chat" className="text-base" />
                                            <span>{whatsapp}</span>
                                        </a>
                                    )}
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                                    isScheduled
                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                                        : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                                }`}>
                                    {isScheduled ? (
                                        <>
                                            <Icon name="event_available" className="text-sm" style={{ color: '#ff0000' }} />
                                            <span>Agendado</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="order_approve" className="text-sm" style={{ color: '#ff0000' }} />
                                            <span>Avulso</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product/Service Card */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                            {isProductSale ? 'Produtos Vendidos' : 'Serviços Realizados'}
                        </p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            {transaction.service || '-'}
                        </p>
                    </div>

                    {/* Payment Card */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Forma de Pagamento</p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            {transaction.paymentMethod}
                        </p>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border border-primary/20 dark:border-primary/30 p-4 sm:p-6">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Resumo Financeiro</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                                <span className="text-base font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(transaction.subtotal)}
                                </span>
                            </div>
                            {transaction.discount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-red-600 dark:text-red-400">Desconto</span>
                                    <span className="text-base font-semibold text-red-600 dark:text-red-400">
                                        - {formatCurrency(transaction.discount)}
                                    </span>
                                </div>
                            )}
                            <div className="border-t border-primary/20 dark:border-primary/30 pt-3 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                                    <span className="text-2xl sm:text-3xl font-black text-primary">
                                        {formatCurrency(transaction.value)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

