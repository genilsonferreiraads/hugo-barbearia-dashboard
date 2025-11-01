import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices, useTransactions } from '../contexts.tsx';
import { Service, PaymentMethod } from '../types.ts';
import { Toast, type ToastType } from './Toast.tsx';

const paymentMethodOptions = Object.values(PaymentMethod);

type PaymentState = {
    id: number;
    method: PaymentMethod;
    amount: string;
};

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Helper function to format currency input
const formatDiscountInput = (value: string): string => {
    // Remove all non-numeric characters
    let digits = value.replace(/\D/g, '');
    
    // If empty, return 0,00
    if (!digits) return '0,00';
    
    // Remove leading zeros (keep at least one digit)
    digits = digits.replace(/^0+/, '') || '0';
    
    // Only pad with leading zeros if less than 2 digits
    if (digits.length === 1) {
        digits = '0' + digits; // 3 -> 03
    }
    
    // If less than 2 digits after removing leading zeros
    if (digits.length === 2) {
        // Return as decimal: 03 -> 0,03, 30 -> 0,30
        return '0,' + digits;
    }
    
    // For 3+ digits, last 2 are decimals
    const intPart = digits.slice(0, -2);
    const decimalPart = digits.slice(-2);
    
    return intPart + ',' + decimalPart;
};

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ServiceRegistryPage: React.FC = () => {
  const { services } = useServices();
  const { addTransaction } = useTransactions();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [clientName, setClientName] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: '' as PaymentMethod, amount: '0,00' }]);
  const [discount, setDiscount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);

  const subtotal = useMemo(() => {
    return selectedServices.reduce((acc, service) => acc + service.price, 0);
  }, [selectedServices]);

  const discountValue = useMemo(() => {
    const parsed = parseFloat(discount.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [discount]);

  const totalValue = useMemo(() => {
    const total = subtotal - discountValue;
    return total < 0 ? 0 : total;
  }, [subtotal, discountValue]);

  const displayedServices = showAllServices ? services : services.slice(0, 3);

  useEffect(() => {
    if (payments.length === 1) {
      setPayments(prev => [{...prev[0], amount: totalValue.toFixed(2).replace('.', ',')}]);
    } else if (payments.length > 1) {
        const firstPaymentAmount = parseFloat(payments[0].amount.replace(',', '.')) || 0;
        const remaining = totalValue - firstPaymentAmount;
        setPayments(prev => [prev[0], {...prev[1], amount: remaining >= 0 ? remaining.toFixed(2).replace('.', ',') : '0,00'}]);
    }
  }, [totalValue]);

  const handleServiceToggle = (service: Service) => {
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  const handleAddPayment = () => {
    if (payments.length < 2) {
        const currentPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount.replace(',', '.')) || 0), 0);
        const remaining = totalValue - currentPaid;
        const newPaymentMethod = paymentMethodOptions.find(m => !payments.some(p => p.method === m)) || PaymentMethod.Cash;
        setPayments(prev => [...prev, { id: Date.now(), method: newPaymentMethod, amount: remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '0,00' }]);
    }
  };

  const handleRemovePayment = (id: number) => {
    const newPayments = payments.filter(p => p.id !== id);
    if (newPayments.length === 1) {
        newPayments[0].amount = totalValue.toFixed(2).replace('.', ',');
    }
    setPayments(newPayments);
  };

  const handlePaymentChange = (id: number, field: 'method' | 'amount', value: string) => {
    const newPayments = payments.map(p => p.id === id ? { ...p, [field]: value } : p);
     if (field === 'amount' && newPayments.length === 2) {
        const changedIndex = newPayments.findIndex(p => p.id === id);
        const otherIndex = 1 - changedIndex;
        const changedAmount = parseFloat(value.replace(',', '.')) || 0;
        const remainingAmount = totalValue - changedAmount;
        const formattedRemaining = remainingAmount >= 0 ? remainingAmount.toFixed(2).replace('.', ',') : '0,00';
        newPayments[otherIndex].amount = formattedRemaining;
    }
    setPayments(newPayments);
  };

  const handleClear = () => {
    setCurrentStep(1);
    setClientName('');
    setSelectedServices([]);
    setDiscount('');
    setPayments([{ id: Date.now(), method: '' as PaymentMethod, amount: '0,00' }]);
    setPaymentError(null);
    setShowAllServices(false);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && clientName.trim() && selectedServices.length > 0) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se estiver no passo 1, não deve submeter
    if (currentStep === 1) {
      return;
    }
    
    setPaymentError(null);
    
    if (!clientName || selectedServices.length === 0) {
      setToast({ message: "Por favor, preencha o nome do cliente e selecione ao menos um serviço.", type: 'error' });
      return;
    }
    
    // Validar se há pelo menos um método de pagamento válido
    const validPayments = payments.filter(p => {
      const amount = parseFloat(p.amount.replace(',', '.')) || 0;
      return amount > 0 && p.method;
    });
    
    if (validPayments.length === 0) {
      setPaymentError("Por favor, selecione um método de pagamento válido.");
      setToast({ message: "Por favor, selecione um método de pagamento válido.", type: 'error' });
      return;
    }
    
    const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount.replace(',', '.')) || 0), 0);
    if (Math.abs(totalPaid - totalValue) > 0.01) {
        setPaymentError(`O total pago (R$ ${totalPaid.toFixed(2)}) não corresponde ao valor final (R$ ${totalValue.toFixed(2)}).`);
        setToast({ 
          message: `O total pago (R$ ${totalPaid.toFixed(2)}) não corresponde ao valor final (R$ ${totalValue.toFixed(2)}). Ajuste os valores.`, 
          type: 'error' 
        });
        return;
    }

    try {
        setIsSubmitting(true);
        await addTransaction({
            date: getTodayLocalDate(),
            clientName,
            service: selectedServices.map(s => s.name).join(', '),
            paymentMethod: payments.map(p => p.method).join(', '),
            subtotal,
            discount: discountValue,
            value: totalValue,
        });

        handleClear();
        navigate('/register-service', { state: { successMessage: 'Salvo com sucesso!' } });
    } catch (error: any) {
        console.error("Failed to register service:", error);
        setToast({ 
          message: `Falha ao registrar atendimento: ${error.message || 'Erro desconhecido.'}`, 
          type: 'error' 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / 2) * 100;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
        {/* Header with Progress */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm inset-x-0">
            <div className="w-full px-4 sm:px-6 py-3">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center size-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                            title="Voltar"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                        </button>
                        
                        <div className="text-center flex-1">
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Novo Atendimento</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Passo {currentStep} de 2</p>
                        </div>
                        
                        <div className="w-10" />
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full py-6">
            <div className="max-w-2xl w-full mx-auto px-4 sm:px-6">
            <form onSubmit={handleSubmit}>
                {/* Step 1: Client and Services */}
                {currentStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Client Name */}
                        <div className="max-w-md mx-auto">
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-2.5">
                            <label className="block space-y-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Nome do Cliente</p>
                                <input 
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                    placeholder="Digite o nome do cliente"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (clientName.trim() && selectedServices.length > 0) {
                                                handleNextStep();
                                            }
                                        }
                                    }}
                                />
                            </label>
                            </div>
                        </div>

                        {/* Services */}
                        <div className="max-w-md mx-auto">
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-800 space-y-2">
                            <div className="flex items-baseline justify-between mb-1.5">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Serviços</h3>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                        {selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} selecionado{selectedServices.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <p className="text-xl font-bold text-primary">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {displayedServices.map(service => {
                                    const isSelected = selectedServices.some(s => s.id === service.id);
                                    return (
                                        <button 
                                            key={service.id}
                                            type="button"
                                            onClick={() => handleServiceToggle(service)}
                                            className={`p-1.5 rounded-lg border-2 transition-all ${
                                                isSelected
                                                    ? 'bg-primary/10 border-primary'
                                                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {isSelected && <Icon name="check" className="text-white text-[10px]" />}
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-white text-[11px] leading-tight truncate">{service.name}</p>
                                                    <p className="text-[10px] text-gray-600 dark:text-gray-400">R$ {service.price.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {services.length > 3 && (
                                <div className="mt-2 text-center">
                                    {!showAllServices && (
                                        <button 
                                            type="button"
                                            onClick={() => setShowAllServices(true)}
                                            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition-colors text-xs"
                                        >
                                            <Icon name="expand_more" className="text-base" />
                                            <span>Exibir todos ({services.length})</span>
                                        </button>
                                    )}
                                    {showAllServices && (
                                        <button 
                                            type="button"
                                            onClick={() => setShowAllServices(false)}
                                            className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold transition-colors text-xs"
                                        >
                                            <Icon name="expand_less" className="text-base" />
                                            <span>Mostrar menos</span>
                                        </button>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Payment */}
                {currentStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Total Card */}
                        <div className="bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-6 border border-primary/30 text-center">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total a Pagar</p>
                            <p className="text-4xl font-bold text-primary mb-3">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
                            <div className="flex justify-center gap-4 text-xs">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Subtotal</p>
                                    <p className="font-bold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="w-px bg-gray-300 dark:bg-gray-600" />
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Desconto</p>
                                    <p className="font-bold text-gray-900 dark:text-white">R$ {discountValue.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Discount Field */}
                        <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                            <label className="block space-y-2">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">Desconto (Opcional - R$)</p>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 text-sm font-medium">R$</span>
                                    <input 
                                        type="text"
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 pl-10 pr-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all" 
                                        placeholder="0,00"
                                        value={discount}
                                        onChange={(e) => setDiscount(formatDiscountInput(e.target.value))}
                                    />
                                </div>
                            </label>
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Formas de Pagamento</h3>
                                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">* Obrigatório</span>
                            </div>
                            {paymentError && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{paymentError}</p>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                {payments.map((payment, index) => (
                                    <div key={payment.id} className="space-y-3">
                                        {payments.length > 1 && (
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pagamento {index + 1}</p>
                                        )}
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-900 dark:text-white block">Método</label>
                                                <select 
                                                    value={payment.method}
                                                    onChange={e => {
                                                        handlePaymentChange(payment.id, 'method', e.target.value);
                                                        setPaymentError(null);
                                                    }}
                                                    required
                                                    className={`w-full h-9 rounded-lg border px-3 text-xs font-medium text-gray-900 dark:text-white focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all ${
                                                        paymentError && (!payment.method || (parseFloat(payment.amount.replace(',', '.')) || 0) <= 0)
                                                            ? 'border-red-500 dark:border-red-500 bg-white dark:bg-gray-800 focus:border-red-500'
                                                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary'
                                                    }`}
                                                >
                                                    <option value="">Selecione um método...</option>
                                                    {paymentMethodOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-900 dark:text-white block">Valor</label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-600 text-sm">R$</span>
                                                    <input
                                                        type="text"
                                                        placeholder="0,00"
                                                        value={payment.amount}
                                                        onChange={e => {
                                                            handlePaymentChange(payment.id, 'amount', formatDiscountInput(e.target.value));
                                                            setPaymentError(null);
                                                        }}
                                                        className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-3 text-xs font-semibold text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {payments.length > 1 && (
                                            <div className="flex justify-end">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemovePayment(payment.id)} 
                                                    className="flex items-center gap-1 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors text-sm"
                                                >
                                                    <Icon name="delete" className="text-base" />
                                                    <span>Remover</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {payments.length < 2 && (
                                <button 
                                    type="button" 
                                    onClick={handleAddPayment} 
                                    className="w-full py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-primary font-semibold hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Icon name="add_circle" className="text-lg" />
                                    <span>Adicionar outra forma</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3 justify-center">
                    {currentStep === 1 && (
                        <div className="max-w-md w-full">
                            <button 
                                type="button" 
                                onClick={handleNextStep}
                                disabled={!clientName.trim() || selectedServices.length === 0}
                                className="w-full px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <span>Continuar</span>
                                <Icon name="arrow_forward" className="text-base" />
                            </button>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <>
                            <button 
                                type="button" 
                                onClick={handlePrevStep}
                                className="flex-1 sm:flex-auto px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Icon name="arrow_back" className="text-base" />
                                <span>Voltar</span>
                            </button>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-auto px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span>Finalizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check_circle" className="text-base" />
                                        <span>Confirmar</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
                </form>
            </div>
        </main>

        {toast && (
            <Toast 
                message={toast.message} 
                type={toast.type}
                duration={4000}
                onClose={() => setToast(null)}
            />
        )}

        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out;
            }
        `}</style>
    </div>
  );
};
