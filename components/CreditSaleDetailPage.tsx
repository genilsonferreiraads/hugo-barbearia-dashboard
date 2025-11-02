import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCreditSales, useTransactions } from '../contexts.tsx';
import { CreditSale, Installment, InstallmentStatus, PaymentMethod } from '../types.ts';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper functions
const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
    });
};

const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
};

const getStatusColor = (status: InstallmentStatus): string => {
    switch (status) {
        case InstallmentStatus.Paid:
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
        case InstallmentStatus.Overdue:
            return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
        case InstallmentStatus.Pending:
        default:
            return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
    }
};

export const CreditSaleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { creditSales, installments, payInstallment, fetchCreditSales, updateCreditSaleStatus } = useCreditSales();
    const { transactions } = useTransactions();
    const prevLocationKey = useRef<string | undefined>();
    
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


    useEffect(() => {
        fetchCreditSales();
        updateCreditSaleStatus();
    }, [fetchCreditSales, updateCreditSaleStatus, id]); // Recarregar quando o id mudar ou quando voltar para a página

    // Recarregar dados quando volta para a página (detecta mudança na localização)
    useEffect(() => {
        // Se a chave da localização mudou, significa que voltou para esta página
        if (prevLocationKey.current !== undefined && prevLocationKey.current !== location.key) {
            fetchCreditSales();
            updateCreditSaleStatus();
        }
        prevLocationKey.current = location.key;
    }, [location.key, fetchCreditSales, updateCreditSaleStatus]);

    const sale = creditSales.find(s => s.id === Number(id));
    const saleInstallments = installments
        .filter(inst => inst.creditSaleId === Number(id))
        .sort((a, b) => a.installmentNumber - b.installmentNumber);

    if (!sale) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icon name="error" className="text-6xl text-gray-400 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Venda no fiado não encontrada
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        A venda que você está procurando não existe.
                    </p>
                    <button
                        onClick={() => navigate('/credit-sales')}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Voltar para Fiados
                    </button>
                </div>
            </div>
        );
    }


    const pendingInstallments = saleInstallments.filter(inst => inst.status !== InstallmentStatus.Paid);
    const paidInstallments = saleInstallments.filter(inst => inst.status === InstallmentStatus.Paid);
    const overdueInstallments = saleInstallments.filter(inst => inst.status === InstallmentStatus.Overdue);

    return (
        <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/credit-sales')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
                >
                    <Icon name="arrow_back" />
                    <span className="font-medium">Voltar</span>
                </button>
                
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                    Detalhes do Fiado
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Informações completas da venda e parcelas
                </p>
            </div>

            {/* Sale Info Card */}
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{sale.clientName}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Data da Venda</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(sale.date)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Produtos</p>
                        <p className="text-base text-gray-900 dark:text-white">{sale.products}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
                            sale.status === 'Quitado' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' :
                            sale.status === 'Atrasado' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                        }`}>
                            {sale.status}
                        </span>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Valor Total</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(sale.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Pago</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(sale.totalPaid)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Restante</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(sale.remainingAmount)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Installments */}
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Parcelas ({sale.numberOfInstallments})
                    </h2>
                    <div className="flex gap-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                            Pagas: <span className="font-semibold text-green-600 dark:text-green-400">{paidInstallments.length}</span>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                            Pendentes: <span className="font-semibold text-yellow-600 dark:text-yellow-400">{pendingInstallments.length}</span>
                        </span>
                        {overdueInstallments.length > 0 && (
                            <span className="text-gray-600 dark:text-gray-400">
                                Atrasadas: <span className="font-semibold text-red-600 dark:text-red-400">{overdueInstallments.length}</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {saleInstallments.map((installment) => (
                        <div
                            key={installment.id}
                            className={`p-4 rounded-lg border ${
                                installment.status === InstallmentStatus.Paid
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : installment.status === InstallmentStatus.Overdue
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(installment.status)}`}>
                                        {installment.installmentNumber}ª Parcela
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(installment.amount)}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Vencimento: {formatDateShort(installment.dueDate)}
                                        </p>
                                        {installment.status === InstallmentStatus.Paid && installment.paidDate && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                Pago em: {formatDateShort(installment.paidDate)}
                                                {installment.paymentMethod && ` (${installment.paymentMethod})`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {installment.status !== InstallmentStatus.Paid ? (
                                    <button
                                        onClick={() => navigate(`/register-payment?saleId=${sale.id}&installmentId=${installment.id}`)}
                                        className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <Icon name="payment" className="text-base" />
                                        Registrar Pagamento
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            // SEMPRE usar os dados diretamente da parcela clicada para garantir que é a parcela correta
                                            // Isso evita problemas com busca de transações que podem estar incorretas
                                            navigate(`/payment-receipt?saleId=${sale.id}&installmentId=${installment.id}`);
                                        }}
                                        className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-lg font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <Icon name="receipt" className="text-base" />
                                        Ver Comprovante
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

