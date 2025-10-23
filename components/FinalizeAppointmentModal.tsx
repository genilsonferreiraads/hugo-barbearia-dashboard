import React, { useState, useMemo, useEffect } from 'react';
import { useServices } from '../contexts.tsx';
import { Appointment, Service, PaymentMethod, Transaction } from '../types.ts';

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

export const FinalizeAppointmentModal: React.FC<FinalizeAppointmentModalProps> = ({ isOpen, onClose, onFinalize, appointment }) => {
    const { services } = useServices();
    
    const [step, setStep] = useState(1);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: PaymentMethod.Pix, amount: '' }]);
    const [discount, setDiscount] = useState('');

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

    useEffect(() => {
        if (isOpen) {
            const appointmentServiceText = appointment.service.toLowerCase();
            const preSelected = services.filter(service => appointmentServiceText.includes(service.name.toLowerCase()));
            setSelectedServices(preSelected);
            
            const initialSubtotal = preSelected.reduce((acc, s) => acc + s.price, 0);
            
            setPayments([{ id: Date.now(), method: PaymentMethod.Pix, amount: initialSubtotal.toFixed(2).replace('.', ',') }]);
            setDiscount('');
            setStep(1); // Reset to step 1
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
            await onFinalize({
                clientName: appointment.clientName,
                service: selectedServices.map(s => s.name).join(', '),
                paymentMethod: payments.map(p => p.method).join(', '),
                subtotal: subtotal,
                discount: discountValue,
                value: totalValue,
            });
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
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Finalizar Atendimento</p>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6 p-5 min-h-[350px] max-h-[70vh] overflow-y-auto">
                        {step === 1 && (
                            <>
                                <div>
                                    <p className="pb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</p>
                                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{appointment.clientName}</p>
                                </div>
                                
                                <div>
                                    <h2 className="text-gray-800 dark:text-gray-100 text-base font-medium leading-tight pb-3">Serviços Realizados</h2>
                                    <div className="flex gap-3 flex-wrap">
                                        {services.map(service => {
                                            const isSelected = selectedServices.some(s => s.id === service.id);
                                            return (
                                            <button 
                                                key={service.id}
                                                type="button"
                                                onClick={() => handleServiceToggle(service)}
                                                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                                                isSelected
                                                    ? 'bg-primary text-white'
                                                    : 'bg-zinc-200 dark:bg-[#392c28] text-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-[#54403b]'
                                                }`}
                                            >
                                                <p className="text-sm font-medium leading-normal">{service.name}</p>
                                            </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <hr className="border-zinc-200 dark:border-zinc-800" />

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-sm">
                                        <p className="text-gray-500 dark:text-gray-400">Subtotal</p>
                                        <p className="font-bold text-lg text-gray-800 dark:text-gray-100">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-gray-500 dark:text-gray-400">Desconto</p>
                                        <p className="font-bold text-lg text-red-600 dark:text-red-500">- R$ {discountValue.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-gray-500 dark:text-gray-400">Total</p>
                                        <p className="font-black text-xl text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>

                                <label className="flex flex-col">
                                    <p className="text-gray-800 dark:text-gray-100 text-base font-medium leading-normal pb-2">Desconto (R$)</p>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 dark:text-[#b9a29d]">R$</span>
                                        <input 
                                            className="form-input w-full rounded-lg text-zinc-900 dark:text-white focus:outline-0 border border-zinc-300 dark:border-[#54403b] bg-background-light dark:bg-[#271e1c] h-12 pl-10 pr-4 text-base font-normal leading-normal" 
                                            placeholder="0,00"
                                            value={discount}
                                            onChange={(e) => setDiscount(e.target.value)}
                                        />
                                    </div>
                                </label>
                            </>
                        )}
                        {step === 2 && (
                             <>
                                <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-center">
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Total a Pagar</p>
                                    <p className="text-3xl font-black text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div>
                                    <p className="text-gray-800 dark:text-gray-100 text-base font-medium leading-normal pb-3">Formas de Pagamento</p>
                                    <div className="space-y-4">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="grid grid-cols-10 gap-2 items-center">
                                            <select 
                                                value={payment.method}
                                                onChange={e => handlePaymentChange(payment.id, 'method', e.target.value)}
                                                className="col-span-10 sm:col-span-4 form-select h-12 w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm font-normal text-gray-900 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            >
                                                {paymentMethodOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <div className="relative col-span-8 sm:col-span-5">
                                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-[#b9a29d]">R$</span>
                                                <input
                                                    type="text"
                                                    placeholder="0,00"
                                                    value={payment.amount}
                                                    onChange={e => handlePaymentChange(payment.id, 'amount', e.target.value)}
                                                    className="form-input h-12 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-2 text-base font-normal text-gray-900 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                                />
                                            </div>
                                            {payments.length > 1 && (
                                                <button type="button" onClick={() => handleRemovePayment(payment.id)} className="col-span-2 sm:col-span-1 flex h-12 w-full items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {payments.length < 2 && (
                                        <button type="button" onClick={handleAddPayment} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                                            <span className="material-symbols-outlined">add_circle</span>
                                            Adicionar outra forma de pagamento
                                        </button>
                                    )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-5 sm:flex-row sm:justify-end dark:border-white/10">
                        {step === 1 && (
                            <>
                                <button type="button" onClick={onClose} className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark">Cancelar</button>
                                <button type="button" onClick={handleNextStep} className="flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark">Continuar para Pagamento</button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <button type="button" onClick={() => setStep(1)} className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark">Voltar</button>
                                <button type="submit" className="flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark">Confirmar e Finalizar</button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
