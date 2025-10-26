import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../contexts.tsx';
import { Appointment, Service, PaymentMethod, Transaction } from '../types.ts';

const paymentMethodOptions = Object.values(PaymentMethod);

type PaymentState = {
    id: number;
    method: PaymentMethod;
    amount: string;
};

interface FinalizeAppointmentPageProps {
    appointment: Appointment;
    onFinalize: (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => Promise<void>;
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const FinalizeAppointmentPage: React.FC<FinalizeAppointmentPageProps> = ({ appointment, onFinalize }) => {
    const navigate = useNavigate();
    const { services } = useServices();
    
    const [step, setStep] = useState(1);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: PaymentMethod.Pix, amount: '' }]);
    const [discount, setDiscount] = useState('');
    const [showAllServices, setShowAllServices] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        const appointmentServiceText = appointment.service.toLowerCase();
        const preSelected = services.filter(service => appointmentServiceText.includes(service.name.toLowerCase()));
        setSelectedServices(preSelected);
        
        const initialSubtotal = preSelected.reduce((acc, s) => acc + s.price, 0);
        setPayments([{ id: Date.now(), method: PaymentMethod.Pix, amount: initialSubtotal.toFixed(2).replace('.', ',') }]);
        setDiscount('');
        setStep(1);
        setShowAllServices(false);
    }, [appointment, services]);

    useEffect(() => {
        if (payments.length === 1) {
            setPayments(prev => [{...prev[0], amount: totalValue.toFixed(2).replace('.', ',')}]);
        }
    }, [totalValue, payments.length]);

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
            newPayments[otherIndex].amount = remainingAmount >= 0 ? remainingAmount.toFixed(2).replace('.', ',') : '0,00';
        }
        setPayments(newPayments);
    };

    const handleNextStep = () => {
        if (selectedServices.length === 0) {
            alert("Selecione ao menos um serviço para continuar.");
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount.replace(',', '.')) || 0), 0);
        if (Math.abs(totalPaid - totalValue) > 0.01) {
            alert(`O total pago (R$ ${totalPaid.toFixed(2)}) não corresponde ao valor final (R$ ${totalValue.toFixed(2)}). Ajuste os valores.`);
            return;
        }

        try {
            setIsSubmitting(true);
            await onFinalize({
                clientName: appointment.clientName,
                service: selectedServices.map(s => s.name).join(', '),
                paymentMethod: payments.map(p => p.method).join(', '),
                subtotal: subtotal,
                discount: discountValue,
                value: totalValue,
            });
            navigate(-1);
        } catch (error: any) {
            console.error("Failed to finalize appointment:", error);
            alert(`Falha ao finalizar atendimento: ${error.message || 'Erro desconhecido.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clientName = (() => {
        if (appointment.clientName.includes('|')) {
            return appointment.clientName.split('|')[0];
        } else if (appointment.clientName.includes('(')) {
            return appointment.clientName.split('(')[0].trim();
        }
        return appointment.clientName;
    })();

    const progressPercentage = (step / 2) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header with Back Button and Progress */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
                    <div className="flex items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm shrink-0 mt-0.5"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>
                        
                        <div className="text-center flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">Finalizar Atendimento</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 2</p>
                        </div>
                        
                        <div className="w-10 sm:w-16" />
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Services Selection */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Client Info Card */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{clientName}</h2>
                            </div>

                            {/* Services Section */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-baseline justify-between mb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Serviços Realizados</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} selecionado{selectedServices.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <p className="text-2xl font-bold text-primary">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {displayedServices.map(service => {
                                            const isSelected = selectedServices.some(s => s.id === service.id);
                                            return (
                                                <button 
                                                    key={service.id}
                                                    type="button"
                                                    onClick={() => handleServiceToggle(service)}
                                                    className={`p-3 rounded-lg border-2 transition-all text-left text-sm ${
                                                        isSelected
                                                            ? 'bg-primary/10 border-primary'
                                                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{service.name}</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">R$ {service.price.toFixed(2).replace('.', ',')}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                            isSelected
                                                                ? 'bg-primary border-primary'
                                                                : 'border-gray-300 dark:border-gray-600'
                                                        }`}>
                                                            {isSelected && <Icon name="check" className="text-white text-sm" />}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {services.length > 3 && (
                                        <div className="mt-4 text-center">
                                            {!showAllServices && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowAllServices(true)}
                                                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition-colors text-sm"
                                                >
                                                    <Icon name="expand_more" className="text-lg" />
                                                    <span>Exibir todos ({services.length})</span>
                                                </button>
                                            )}
                                            {showAllServices && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowAllServices(false)}
                                                    className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold transition-colors text-sm"
                                                >
                                                    <Icon name="expand_less" className="text-lg" />
                                                    <span>Mostrar menos</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Discount Section */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resumo</p>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Desconto</span>
                                        <span className="font-semibold text-red-600 dark:text-red-500">- R$ {discountValue.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between items-center">
                                        <span className="text-gray-900 dark:text-white font-semibold text-sm">Total</span>
                                        <span className="text-lg font-bold text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                </div>

                                <label className="block space-y-2">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">Desconto (Opcional)</p>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 text-sm font-medium">R$</span>
                                        <input 
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-9 pl-10 pr-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all" 
                                            placeholder="0,00"
                                            value={discount}
                                            onChange={(e) => setDiscount(e.target.value)}
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Payment */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
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

                            {/* Payment Methods */}
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Formas de Pagamento</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Selecione como será realizado o pagamento</p>
                                </div>

                                <div className="space-y-3">
                                    {payments.map((payment, index) => (
                                        <div key={payment.id} className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                                            {payments.length > 1 && (
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pagamento {index + 1}</p>
                                            )}
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-900 dark:text-white block">Método</label>
                                                    <select 
                                                        value={payment.method}
                                                        onChange={e => handlePaymentChange(payment.id, 'method', e.target.value)}
                                                        className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                    >
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
                                                            onChange={e => handlePaymentChange(payment.id, 'amount', e.target.value)}
                                                            className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-3 text-xs font-semibold text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {payments.length > 1 && (
                                                <div className="flex justify-end pt-1">
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
                    <div className="mt-8 flex gap-3 sm:justify-end flex-wrap sm:flex-nowrap">
                        {step === 1 && (
                            <>
                                <button 
                                    type="button" 
                                    onClick={() => navigate(-1)}
                                    className="flex-1 sm:flex-auto px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleNextStep}
                                    className="flex-1 sm:flex-auto px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span>Continuar</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)}
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
            </main>

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
