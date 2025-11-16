import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../contexts.tsx';
import { Appointment, Service, PaymentMethod, Transaction } from '../types.ts';
import { BottomSheet } from './BottomSheet.tsx';
import { getPaymentMethodOptions } from '../constants.ts';

const paymentMethodOptions = Object.values(PaymentMethod);

type PaymentState = {
    id: number;
    method: PaymentMethod;
    amount: string;
};

interface FinalizeAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFinalize: (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => Promise<void>;
    appointment: Appointment;
}

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined !text-2xl">{name}</span>;

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

export const FinalizeAppointmentModal: React.FC<FinalizeAppointmentModalProps> = ({ isOpen, onClose, onFinalize, appointment }) => {
    const { services } = useServices();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: PaymentMethod.Pix, amount: '' }]);
    const [discount, setDiscount] = useState('');
    const [showAllServices, setShowAllServices] = useState(false);
    const [openPaymentMethodSheet, setOpenPaymentMethodSheet] = useState<number | null>(null);

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
        if (isOpen) {
            const appointmentServiceText = appointment.service.toLowerCase();
            const preSelected = services.filter(service => appointmentServiceText.includes(service.name.toLowerCase()));
            setSelectedServices(preSelected);
            
            const initialSubtotal = preSelected.reduce((acc, s) => acc + s.price, 0);
            
            setPayments([{ id: Date.now(), method: PaymentMethod.Pix, amount: initialSubtotal.toFixed(2).replace('.', ',') }]);
            setDiscount('');
            setStep(1);
            setShowAllServices(false);
        }
    }, [isOpen, appointment, services]);

    useEffect(() => {
        if (payments.length === 1 && isOpen) {
             setPayments(prev => [{...prev[0], amount: totalValue.toFixed(2).replace('.', ',')}]);
        }
    }, [totalValue, payments.length, isOpen]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

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
            await onFinalize({
                clientName: appointment.clientName,
                service: selectedServices.map(s => s.name).join(', '),
                paymentMethod: payments.map(p => p.method).join(', '),
                subtotal: subtotal,
                discount: discountValue,
                value: totalValue,
            });
            console.log('onFinalize completed, closing modal and navigating...');
            onClose();
            console.log('Modal closed, navigating to /register-service');
            navigate('/register-service', { state: { successMessage: 'Salvo com sucesso!' } });
            console.log('Navigate called');
        } catch (error: any) {
            console.error("Failed to finalize appointment:", error);
            alert(`Falha ao finalizar atendimento: ${error.message || 'Erro desconhecido.'}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-2xl max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/10">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">Finalizar Atendimento</p>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4">
                        {step === 1 && (
                            <div className="flex flex-col gap-4">
                                {/* Client Name */}
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cliente</p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                                        {(() => {
                                            if (appointment.clientName.includes('|')) {
                                                return appointment.clientName.split('|')[0];
                                            } else if (appointment.clientName.includes('(')) {
                                                return appointment.clientName.split('(')[0].trim();
                                            }
                                            return appointment.clientName;
                                        })()}
                                    </p>
                                </div>
                                
                                {/* Services */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Serviços ({selectedServices.length} selecionado{selectedServices.length !== 1 ? 's' : ''})</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {displayedServices.map(service => {
                                            const isSelected = selectedServices.some(s => s.id === service.id);
                                            return (
                                            <button 
                                                key={service.id}
                                                type="button"
                                                onClick={() => handleServiceToggle(service)}
                                                className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                isSelected
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <span className="text-xs">{service.name}</span>
                                                <span className="text-xs text-gray-600 dark:text-gray-400">R$ {service.price.toFixed(2).replace('.', ',')}</span>
                                            </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {services.length > 3 && !showAllServices && (
                                        <button 
                                            type="button"
                                            onClick={() => setShowAllServices(true)}
                                            className="mt-2 text-xs font-medium text-primary hover:underline"
                                        >
                                            Exibir todos ({services.length} serviços)
                                        </button>
                                    )}
                                    
                                    {showAllServices && services.length > 3 && (
                                        <button 
                                            type="button"
                                            onClick={() => setShowAllServices(false)}
                                            className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
                                        >
                                            Mostrar menos
                                        </button>
                                    )}
                                </div>

                                {/* Subtotal */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    
                                    <label className="block">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Desconto (R$)</p>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-600 text-sm">R$</span>
                                            <input 
                                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 pl-9 pr-3 text-sm font-normal text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20" 
                                                placeholder="0,00"
                                                value={discount}
                                                onChange={(e) => setDiscount(formatDiscountInput(e.target.value))}
                                            />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                        
                        {step === 2 && (
                            <div className="flex flex-col gap-4">
                                {/* Total to Pay */}
                                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total a Pagar</p>
                                    <p className="text-3xl font-black text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
                                </div>

                                {/* Payment Methods */}
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-3">Formas de Pagamento</p>
                                    <div className="space-y-3">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="grid grid-cols-10 gap-2 items-center">
                                            <button
                                                type="button"
                                                onClick={() => setOpenPaymentMethodSheet(payment.id)}
                                                className="col-span-10 sm:col-span-5 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 text-xs font-normal text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <span>{payment.method}</span>
                                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-base">
                                                    expand_more
                                                </span>
                                            </button>
                                            <div className="relative col-span-8 sm:col-span-4">
                                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-600 text-sm">R$</span>
                                                <input
                                                    type="text"
                                                    placeholder="0,00"
                                                    value={payment.amount}
                                                    onChange={e => handlePaymentChange(payment.id, 'amount', formatDiscountInput(e.target.value))}
                                                    className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 pl-9 pr-2 text-sm font-normal text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                            {payments.length > 1 && (
                                                <button type="button" onClick={() => handleRemovePayment(payment.id)} className="col-span-2 sm:col-span-1 flex h-10 w-full items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {payments.length < 2 && (
                                        <button type="button" onClick={handleAddPayment} className="flex items-center gap-2 text-xs font-medium text-primary hover:underline">
                                            <span className="material-symbols-outlined text-base">add_circle</span>
                                            <span>Adicionar outra forma</span>
                                        </button>
                                    )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-white/10 flex-wrap sm:flex-nowrap">
                        {step === 1 && (
                            <>
                                <button type="button" onClick={onClose} className="flex-1 h-10 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark flex">Cancelar</button>
                                <button type="button" onClick={handleNextStep} className="flex-1 h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark flex">Continuar</button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <button type="button" onClick={() => setStep(1)} className="flex-1 h-10 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark flex">Voltar</button>
                                <button type="submit" className="flex-1 h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark flex">Confirmar</button>
                            </>
                        )}
                    </div>
                </form>
            </div>

            {/* Payment Method Bottom Sheets */}
            {payments.map((payment) => (
                <BottomSheet
                    key={`payment-method-${payment.id}`}
                    isOpen={openPaymentMethodSheet === payment.id}
                    onClose={() => setOpenPaymentMethodSheet(null)}
                    title="Selecione o método de pagamento"
                    options={getPaymentMethodOptions(false)}
                    selectedValue={payment.method}
                    onSelect={(value) => {
                        handlePaymentChange(payment.id, 'method', value as string);
                    }}
                />
            ))}
        </div>
    );
};
