import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Installment, InstallmentStatus, Transaction } from '../types.ts';
import { useTransactions, useEditTransaction, useCreditSales } from '../contexts.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

const parseProductList = (value?: string) => {
    if (!value) return [];
    return value.split(',').map((item) => {
        const trimmed = item.trim();
        const match = trimmed.match(/\((\d+)x\)$/);
        if (match) {
            const qty = Number(match[1]);
            const name = trimmed.replace(/\s*\(\d+x\)$/, '').trim();
            return { name, quantity: qty };
        }
        return { name: trimmed, quantity: 1 };
    });
};

export const TransactionDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { transactions, deleteTransaction, updateTransaction } = useTransactions();
    const { creditSales, installments } = useCreditSales();
    const { setEditTransactionData, clearEditTransactionData } = useEditTransaction();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    const parsedProducts = useMemo(() => parseProductList(transaction.service), [transaction.service]);

    const formatDateShort = (dateStr: string): string => {
        if (!dateStr) return '-';
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const installmentStatusColor = (status: InstallmentStatus) => {
        switch (status) {
            case InstallmentStatus.Paid:
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
            case InstallmentStatus.Overdue:
                return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
            default:
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
        }
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

    const baseClientName = getClientName(transaction.clientName);
    const hasClientInfo = !!baseClientName && baseClientName !== 'Venda de Produto';

    const isFiadoTransaction = useMemo(() => {
        const serviceLower = (transaction.service || '').toLowerCase();
        const methodLower = (transaction.paymentMethod || '').toLowerCase();
        return serviceLower.includes('fiado -') || methodLower.includes('fiado');
    }, [transaction.service, transaction.paymentMethod]);

    const fiadoDetails = useMemo(() => {
        if (!isFiadoTransaction) return null;

        const regex = /fiado\s*-\s*(.+?)\s*-\s*parcela\s*(\d+)\s*\/\s*(\d+)/i;
        const match = transaction.service?.match(regex);
        if (!match) return null;

        const parsedClient = match[1]?.trim().toLowerCase();
        const installmentNumber = Number(match[2]);
        const totalInstallments = Number(match[3]);

        const matchingSale = creditSales.find(sale => 
            sale.clientName?.toLowerCase() === parsedClient &&
            sale.numberOfInstallments === totalInstallments
        );

        if (!matchingSale) return null;

        const saleInstallments = installments
            .filter(inst => inst.creditSaleId === matchingSale.id)
            .sort((a, b) => a.installmentNumber - b.installmentNumber);

        const currentInstallment = saleInstallments.find(inst => inst.installmentNumber === installmentNumber) || null;
        const otherInstallments = saleInstallments.filter(inst => inst.id !== currentInstallment?.id);

        return {
            sale: matchingSale,
            parsedClientName: matchingSale.clientName,
            installmentNumber,
            totalInstallments,
            currentInstallment,
            otherInstallments,
        };
    }, [isFiadoTransaction, transaction.service, creditSales, installments]);

    const fiadoProducts = useMemo(() => {
        if (!fiadoDetails) return [];
        return parseProductList(fiadoDetails.sale.products);
    }, [fiadoDetails]);

    const displayProducts = fiadoDetails && fiadoProducts.length > 0 ? fiadoProducts : parsedProducts;

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

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteTransaction(transaction.id);
            setShowDeleteConfirm(false);
            navigate(backRoute);
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert(isProductSale ? 'Erro ao deletar a venda' : 'Erro ao deletar o serviço');
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const isScheduled = !isProductSale && transaction.clientName.includes('|');
    const pageTitle = isProductSale ? 'Detalhes da Venda' : 'Detalhes do Serviço';

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
                    <button 
                        onClick={() => navigate(backRoute)}
                        className="flex items-center justify-center size-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Icon name="arrow_back" className="text-xl" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em]">Resumo</p>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{pageTitle}</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div className="space-y-6">
                    {/* Summary Card */}
                    <section className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6 space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    {isProductSale ? 'Venda registrada em' : 'Atendimento finalizado em'}
                                </p>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                    {formatDateTime(transaction)}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                        <Icon name="payments" className="text-sm" />
                                        {transaction.paymentMethod}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200">
                                        <Icon name={isProductSale ? 'shopping_cart' : isScheduled ? 'event_available' : 'order_approve'} className="text-sm" />
                                    {isProductSale ? 'Venda de Produto' : isScheduled ? 'Agendado' : 'Ordem de chegada'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(transaction.service.includes('Fiado -') || (transaction.category === 'vendas' && transaction.paymentMethod === 'Fiado')) && (
                                    <button
                                        onClick={() => navigate(`/payment-receipt?id=${transaction.id}`)}
                                        className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                        title="Ver Comprovante"
                                    >
                                        <Icon name="receipt_long" className="text-base" />
                                        <span className="text-sm font-semibold">Comprovante</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 hover:bg-primary/15 dark:hover:bg-primary/30 transition-colors"
                                    title="Editar"
                                >
                                    <Icon name="edit" className="text-base" />
                                    <span className="text-sm font-semibold">Editar</span>
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    title="Deletar"
                                >
                                    <Icon name="delete" className="text-base" />
                                    <span className="text-sm font-semibold">Excluir</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/40">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{hasClientInfo ? baseClientName : 'Cliente não informado'}</p>
                                {whatsapp && (
                                    <a
                                        href={whatsappUrl || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
                                    >
                                        <Icon name="chat" className="text-sm" />
                                        <span>{whatsapp}</span>
                                    </a>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/40 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resumo rápido</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(transaction.subtotal)}</span>
                                </div>
                                {transaction.discount > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-red-500">Desconto</span>
                                        <span className="font-semibold text-red-500">- {formatCurrency(transaction.discount)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Total pago</span>
                                    <span className="text-lg font-black text-primary">{formatCurrency(transaction.value)}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                    {/* Client/Type Card */}
                    {(!isProductSale || hasClientInfo) && (
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                        {hasClientInfo ? baseClientName : 'Cliente não informado'}
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
                                    !isProductSale
                                        ? (isScheduled
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                                            : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300')
                                        : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                }`}>
                                    {!isProductSale ? (
                                        isScheduled ? (
                                            <>
                                                <Icon name="event_available" className="text-sm" style={{ color: '#ff0000' }} />
                                                <span>Agendado</span>
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="order_approve" className="text-sm" style={{ color: '#ff0000' }} />
                                                <span>Ordem de chegada</span>
                                            </>
                                        )
                                    ) : (
                                        <>
                                            <Icon name="shopping_cart" className="text-sm" />
                                            <span>Venda de Produto</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product/Service Card */}
                    <section className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {isProductSale ? 'Produtos Vendidos' : 'Serviços Realizados'}
                            </p>
                            {fiadoDetails && (
                                <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                                    Dados do fiado
                                </span>
                            )}
                        </div>
                        {displayProducts.length > 0 ? (
                            <div className="space-y-2">
                                {displayProducts.map((item, index) => (
                                    <div 
                                        key={`${item.name}-${index}`}
                                        className="flex items-center justify-between text-sm sm:text-base bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <span className="font-semibold">{item.name}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            {item.quantity}x
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                {transaction.service || '-'}
                            </p>
                        )}
                    </section>

                    {/* Payment Card */}
                    <section className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Forma de Pagamento</p>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                <Icon name="payments" className="text-sm" />
                                Pagamento
                            </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {transaction.paymentMethod}
                        </p>
                    </section>

                    {/* Financial Summary */}
                    <section className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl border border-primary/20 dark:border-primary/30 p-5 sm:p-6 shadow-sm">
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
                    </section>

                    {/* Fiado Details */}
                    {fiadoDetails && (
                        <section className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resumo do Fiado</p>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {fiadoDetails.parsedClientName} · {fiadoDetails.totalInstallments} parcelas
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Parcela {fiadoDetails.installmentNumber}/{fiadoDetails.totalInstallments} paga em {formatDateShort(fiadoDetails.currentInstallment?.paidDate || transaction.date)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate(`/credit-sales/${fiadoDetails.sale.id}`)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/10 transition-all"
                                >
                                    <Icon name="open_in_new" className="text-base" />
                                    Ver fiado completo
                                </button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
                                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Pagamento desta parcela</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                        {formatCurrency(fiadoDetails.currentInstallment?.amount || transaction.value)}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <Icon name="payments" className="text-base" />
                                        Pago via {transaction.paymentMethod}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        Quitada em {formatDateShort(fiadoDetails.currentInstallment?.paidDate || transaction.date)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
                                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-2">Resumo da venda</p>
                                    <div className="space-y-1 text-sm text-gray-800 dark:text-gray-100">
                                        <p>Total da venda: <span className="font-semibold">{formatCurrency(fiadoDetails.sale.totalAmount)}</span></p>
                                        <p>Já recebido: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(fiadoDetails.sale.totalPaid)}</span></p>
                                        <p>Restante: <span className="font-semibold text-yellow-600 dark:text-yellow-400">{formatCurrency(fiadoDetails.sale.remainingAmount)}</span></p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Parcelas restantes</p>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {fiadoDetails.otherInstallments.filter(inst => inst.status !== InstallmentStatus.Paid).length} em aberto
                                    </span>
                                </div>
                                {fiadoDetails.otherInstallments.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Todas as parcelas foram pagas.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {fiadoDetails.otherInstallments.map((inst: Installment) => (
                                            <div 
                                                key={inst.id}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        Parcela {inst.installmentNumber}/{fiadoDetails.totalInstallments}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Vencimento: {formatDateShort(inst.dueDate)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatCurrency(inst.amount)}
                                                    </p>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${installmentStatusColor(inst.status)}`}>
                                                        {inst.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
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
                                    {isProductSale ? 'Excluir Venda' : 'Excluir Atendimento'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {isProductSale 
                                        ? 'Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.'
                                        : 'Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.'
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-5 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            {!isProductSale && (
                                <p className="text-sm">
                                    <span className="font-semibold text-gray-900 dark:text-white">Cliente:</span>{' '}
                                    <span className="text-gray-700 dark:text-gray-300">{getClientName(transaction.clientName)}</span>
                                </p>
                            )}
                            <p className="text-sm">
                                <span className="font-semibold text-gray-900 dark:text-white">Valor:</span>{' '}
                                <span className="text-gray-700 dark:text-gray-300">{formatCurrency(transaction.value)}</span>
                            </p>
                            {transaction.service && (
                                <p className="text-sm">
                                    <span className="font-semibold text-gray-900 dark:text-white">{isProductSale ? 'Produto:' : 'Serviço:'}</span>{' '}
                                    <span className="text-gray-700 dark:text-gray-300">{transaction.service}</span>
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

