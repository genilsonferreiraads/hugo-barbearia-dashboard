import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreditSales } from '../contexts.tsx';
import { InstallmentStatus, PaymentMethod } from '../types.ts';
import { Toast, ToastType } from './Toast.tsx';
import { BottomSheet } from './BottomSheet.tsx';
import { getPaymentMethodOptions } from '../constants.ts';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

export const RegisterPaymentPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { creditSales, installments, payInstallment, fetchCreditSales, updateCreditSaleStatus } = useCreditSales();

    const creditSaleId = searchParams.get('saleId');
    const installmentId = searchParams.get('installmentId');

    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [paidDate, setPaidDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [isPaying, setIsPaying] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isPaymentMethodSheetOpen, setIsPaymentMethodSheetOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        fetchCreditSales();
    }, [fetchCreditSales]);

    // Definir sale e installment antes de usar nos useEffects
    const sale = creditSales.find(s => s.id === Number(creditSaleId));
    const installment = installments.find(inst => inst.id === Number(installmentId));


    const formatCurrency = (value: number): string => {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    const formatDateShort = (dateString: string): string => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    const handlePayInstallment = async () => {
        if (!installment || !paymentMethod) {
            setToast({ message: 'Por favor, selecione um método de pagamento.', type: 'warning' });
            return;
        }

        try {
            setIsPaying(true);
            
            // Registrar pagamento (já atualiza fetchCreditSales automaticamente)
            await payInstallment(installment.id, paymentMethod, paidDate);
            
            // Mostrar mensagem de sucesso imediatamente
            setToast({ 
                message: `Pagamento de ${formatCurrency(installment.amount)} registrado com sucesso!`, 
                type: 'success' 
            });
            
            // Atualizar status de forma assíncrona (não bloqueia a navegação)
            updateCreditSaleStatus().catch(console.error);
            
            // Navegar imediatamente - payInstallment já atualizou os dados
            navigate(`/credit-sales/${creditSaleId}`, { replace: true });
            
        } catch (error: any) {
            setIsPaying(false);
            setToast({ 
                message: `Erro ao registrar pagamento: ${error.message || 'Erro desconhecido'}`, 
                type: 'error' 
            });
        }
    };

    if (!sale || !installment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icon name="error" className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Parcela não encontrada
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        A parcela que você está procurando não existe.
                    </p>
                    <button
                        onClick={() => navigate(creditSaleId ? `/credit-sales/${creditSaleId}` : '/credit-sales')}
                        className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                    >
                        ← Voltar
                    </button>
                </div>
            </div>
        );
    }

    const allInstallments = installments.filter(inst => inst.creditSaleId === sale.id);
    const paidCount = allInstallments.filter(inst => inst.status === InstallmentStatus.Paid).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(`/credit-sales/${creditSaleId}`)}
                            className="flex items-center justify-center size-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Pagamento</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Parcela {installment.installmentNumber} de {sale.numberOfInstallments}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Sale Info Card */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{sale.clientName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Produtos</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{sale.products}</p>
                        </div>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(sale.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pagas</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{paidCount}/{sale.numberOfInstallments}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Restante</p>
                            <p className="text-lg font-bold text-primary">{formatCurrency(sale.remainingAmount)}</p>
                        </div>
                    </div>
                </div>

                {/* Installment Info Card */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border-2 border-primary/30 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Parcela {installment.installmentNumber}</p>
                            <p className="text-3xl font-black text-primary">{formatCurrency(installment.amount)}</p>
                        </div>
                        <div className="bg-primary/20 rounded-lg px-4 py-2 text-center">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Vencimento</p>
                            <p className="text-sm font-bold text-primary">{formatDateShort(installment.dueDate)}</p>
                        </div>
                    </div>
                    
                    {installment.status === InstallmentStatus.Overdue && (
                        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 flex items-center gap-2">
                            <Icon name="warning" className="text-red-600 dark:text-red-400" />
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Esta parcela está vencida</p>
                        </div>
                    )}
                </div>

                {/* Payment Form */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6 relative overflow-visible">
                    <div className="space-y-2 relative">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                            Método de Pagamento <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (isMobile) {
                                    setIsPaymentMethodSheetOpen(true);
                                } else {
                                    setIsPaymentDropdownOpen(!isPaymentDropdownOpen);
                                }
                            }}
                            className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-left text-base font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <span className={paymentMethod ? '' : 'text-gray-500 dark:text-gray-400'}>
                                {paymentMethod || 'Selecione o método de pagamento...'}
                            </span>
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-2xl flex-shrink-0">
                                expand_more
                            </span>
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Escolha como o cliente realizou o pagamento</p>

                        {/* Desktop Dropdown */}
                        {!isMobile && isPaymentDropdownOpen && (
                            <>
                                {/* Overlay to close dropdown */}
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsPaymentDropdownOpen(false)}
                                />
                                {/* Dropdown Menu */}
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                    {getPaymentMethodOptions(true).map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setPaymentMethod(option.id);
                                                setIsPaymentDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                                                paymentMethod === option.id ? 'bg-primary/10 dark:bg-primary/20' : ''
                                            }`}
                                        >
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                                            {paymentMethod === option.id && (
                                                <Icon name="check" className="text-primary text-lg" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                            Data do Pagamento
                        </label>
                        <input
                            type="date"
                            value={paidDate}
                            onChange={(e) => setPaidDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-base font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data em que o pagamento foi realizado (padrão: hoje)</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigate(`/credit-sales/${creditSaleId}`)}
                        disabled={isPaying}
                        className="flex-1 h-12 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePayInstallment}
                        disabled={isPaying || !paymentMethod}
                        className="flex-1 h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                        {isPaying ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                <span>Registrando...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="check_circle" className="text-xl" />
                                <span>Confirmar Pagamento</span>
                            </>
                        )}
                    </button>
                </div>
            </main>

            {/* Toast Notification */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type}
                    duration={4000}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Payment Method Bottom Sheet (Mobile Only) */}
            {isMobile && (
                <BottomSheet
                    isOpen={isPaymentMethodSheetOpen}
                    onClose={() => setIsPaymentMethodSheetOpen(false)}
                    title="Selecione o método de pagamento"
                    options={getPaymentMethodOptions(true)}
                    selectedValue={paymentMethod}
                    onSelect={(value) => {
                        setPaymentMethod(value as string);
                        setIsPaymentMethodSheetOpen(false);
                    }}
                />
            )}
        </div>
    );
};

