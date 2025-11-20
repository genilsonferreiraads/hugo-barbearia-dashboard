import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices, useTransactions, useClients } from '../contexts.tsx';
import { Service, PaymentMethod, Client } from '../types.ts';
import { Toast, type ToastType } from './Toast.tsx';
import { ClientSearchField } from './ClientSearchField.tsx';
import { BottomSheet } from './BottomSheet.tsx';
import { getPaymentMethodOptions } from '../constants.ts';

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
  const { clients, addClient } = useClients();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: '' as PaymentMethod, amount: '0,00' }]);
  const [discount, setDiscount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [openPaymentMethodSheet, setOpenPaymentMethodSheet] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // Para mobile steps

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

  // Filtrar serviços baseado na busca
  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm.trim()) {
      return services;
    }
    const searchLower = serviceSearchTerm.toLowerCase().trim();
    return services.filter(service => 
      service.name.toLowerCase().includes(searchLower)
    );
  }, [services, serviceSearchTerm]);

  // Ordenar serviços: selecionados primeiro
  const sortedServices = useMemo(() => {
    const selected = filteredServices.filter(service => 
      selectedServices.some(s => s.id === service.id)
    );
    const notSelected = filteredServices.filter(service => 
      !selectedServices.some(s => s.id === service.id)
    );
    return [...selected, ...notSelected];
  }, [filteredServices, selectedServices]);

  const displayedServices = useMemo(() => {
    if (showAllServices) {
      return sortedServices;
    }
    return sortedServices.slice(0, 4);
  }, [sortedServices, showAllServices]);

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

  const handleDiscountChange = (value: string) => {
    const formattedValue = formatDiscountInput(value);
    setDiscount(formattedValue);
    
    // Validar se o desconto é maior ou igual ao subtotal
    const discountNum = parseFloat(formattedValue.replace(',', '.'));
    if (!isNaN(discountNum) && discountNum >= subtotal && subtotal > 0) {
      setDiscountError(`O desconto não pode ser igual ou maior que o subtotal (R$ ${subtotal.toFixed(2).replace('.', ',')})`);
    } else {
      setDiscountError(null);
    }
  };

  const handleClear = () => {
    setClientName('');
    setSelectedServices([]);
    setDiscount('');
    setPayments([{ id: Date.now(), method: '' as PaymentMethod, amount: '0,00' }]);
    setPaymentError(null);
    setDiscountError(null);
    setShowAllServices(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setPaymentError(null);
    
    if (!clientName || selectedServices.length === 0) {
      setToast({ message: "Por favor, preencha o nome do cliente e selecione ao menos um serviço.", type: 'error' });
      return;
    }
    
    // Validar desconto
    if (discountValue >= subtotal && subtotal > 0) {
      setDiscountError(`O desconto não pode ser igual ou maior que o subtotal (R$ ${subtotal.toFixed(2).replace('.', ',')})`);
      setToast({ message: "O desconto não pode ser igual ou maior que o subtotal.", type: 'error' });
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
        
        // Construir clientName com WhatsApp se houver
        let finalClientNameWithWhatsapp = clientName.trim();
        if (selectedClient && selectedClient.whatsapp) {
            finalClientNameWithWhatsapp = `${clientName.trim()}|${selectedClient.whatsapp}`;
        }
        
        await addTransaction({
            date: getTodayLocalDate(),
            clientName: finalClientNameWithWhatsapp,
            service: selectedServices.map(s => s.name).join(', '),
            paymentMethod: payments.map(p => p.method).join(', '),
            subtotal,
            discount: discountValue,
            value: totalValue,
            clientId: selectedClient?.id, // Incluir clientId se cliente foi selecionado da base
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

  // Detectar se é mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleNextStep = () => {
    if (!clientName.trim()) {
      setToast({ message: "Por favor, preencha o nome do cliente.", type: 'error' });
      return;
    }
    if (selectedServices.length === 0) {
      setToast({ message: "Por favor, selecione ao menos um serviço.", type: 'error' });
      return;
    }
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => currentStep === 2 && isMobile ? handlePreviousStep() : navigate(-1)}
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <Icon name="arrow_back" className="text-xl" />
                        <span className="font-medium hidden sm:inline">Voltar</span>
                    </button>
                    <div className="flex-1">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Novo Atendimento</h1>
                        {/* Mobile Steps Indicator */}
                        <div className="md:hidden flex items-center gap-2 mt-1">
                            <div className={`flex items-center gap-1 text-xs font-medium ${currentStep === 1 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>1</span>
                                <span className="hidden xs:inline">Serviços</span>
                            </div>
                            <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                            <div className={`flex items-center gap-1 text-xs font-medium ${currentStep === 2 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>2</span>
                                <span className="hidden xs:inline">Pagamento</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        {/* Main Content - Two Column Layout */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Client & Services */}
                <div className={`lg:col-span-2 space-y-6 ${currentStep === 2 ? 'hidden md:block' : ''}`}>
                    {/* Client Name */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <label className="block space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon name="person" className="text-primary text-xl" />
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Nome do Cliente</p>
                            </div>
                            <ClientSearchField
                                onSelectClient={(client) => {
                                    setSelectedClient(client);
                                    if (client) {
                                        setClientName(client.fullName);
                                    }
                                }}
                                onValueChange={(name) => {
                                    setClientName(name);
                                    if (!name.trim()) {
                                        setSelectedClient(null);
                                    }
                                }}
                                value={clientName}
                                placeholder="Digite o nome do cliente"
                                className="w-full"
                                showAddButton={true}
                            />
                        </label>
                    </div>

                    {/* Services */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Icon name="content_cut" className="text-primary text-xl" />
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Serviços</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} selecionado{selectedServices.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {/* Barra de busca de serviços */}
                        <div className="mb-4">
                            <div className="relative">
                                <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg" />
                                <input
                                    type="text"
                                    placeholder="Buscar serviço..."
                                    value={serviceSearchTerm}
                                    onChange={(e) => {
                                        setServiceSearchTerm(e.target.value);
                                        setShowAllServices(false);
                                    }}
                                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                {serviceSearchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setServiceSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <Icon name="close" className="text-lg" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {displayedServices.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {displayedServices.map(service => {
                                        const isSelected = selectedServices.some(s => s.id === service.id);
                                        return (
                                            <button 
                                                key={service.id}
                                                type="button"
                                                onClick={() => handleServiceToggle(service)}
                                                className={`p-4 rounded-xl border-2 transition-all text-left group ${
                                                    isSelected
                                                        ? 'bg-primary/10 border-primary shadow-md'
                                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-semibold text-sm ${
                                                            isSelected
                                                                ? 'text-primary'
                                                                : 'text-gray-900 dark:text-white'
                                                        }`}>
                                                            {service.name}
                                                        </p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                            R$ {service.price.toFixed(2).replace('.', ',')}
                                                        </p>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                                        isSelected
                                                            ? 'bg-primary shadow-lg'
                                                            : 'border-2 border-gray-300 dark:border-gray-600 group-hover:border-primary/50'
                                                    }`}>
                                                        {isSelected && <Icon name="check" className="text-white text-sm" />}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {sortedServices.length > 4 && (
                                    <div className="mt-4 text-center">
                                        {!showAllServices && (
                                            <button 
                                                type="button"
                                                onClick={() => setShowAllServices(true)}
                                                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors text-sm"
                                            >
                                                <Icon name="expand_more" className="text-lg" />
                                                <span>Exibir mais ({sortedServices.length - 4} restantes)</span>
                                            </button>
                                        )}
                                        {showAllServices && (
                                            <button 
                                                type="button"
                                                onClick={() => setShowAllServices(false)}
                                                className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors text-sm"
                                            >
                                                <Icon name="expand_less" className="text-lg" />
                                                <span>Mostrar menos</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <Icon name="search_off" className="text-4xl mb-2 opacity-50" />
                                <p className="text-sm">Nenhum serviço encontrado</p>
                            </div>
                        )}
                    </div>

                {/* Mobile Next Button - Step 1 */}
                {currentStep === 1 && (
                    <div className="md:hidden bg-white dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-3 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                {selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} selecionado{selectedServices.length !== 1 ? 's' : ''}
                            </span>
                            <span className="font-bold text-lg text-primary">
                                R$ {subtotal.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                        <button 
                            type="button"
                            onClick={handleNextStep}
                            disabled={selectedServices.length === 0 || !clientName.trim()}
                            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            <span>Continuar para Pagamento</span>
                            <Icon name="arrow_forward" className="text-xl" />
                        </button>
                    </div>
                )}
                </div>

                {/* Right Column - Cart (Sticky) */}
                <div className={`lg:col-span-1 ${currentStep === 1 ? 'hidden md:block' : ''}`}>
                    <div className="lg:sticky lg:top-24">
                        <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 space-y-6">
                            {/* Cart Header with Service Count */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                <Icon name="shopping_cart" className="text-primary text-xl" />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pagamento</h2>
                            </div>
                            {selectedServices.length > 0 && (
                                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                                        <Icon name="content_cut" className="text-primary text-sm" />
                                        <span className="text-xs font-bold text-primary">{selectedServices.length}</span>
                                </div>
                            )}
                            </div>

                            {/* Totals */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                
                                {/* Discount Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-900 dark:text-white">Desconto</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 text-sm font-medium">R$</span>
                                        <input 
                                            type="text"
                                            className={`w-full rounded-lg border ${discountError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900 h-10 pl-10 pr-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all`}
                                            placeholder="0,00"
                                            value={discount}
                                            onChange={(e) => handleDiscountChange(e.target.value)}
                                        />
                                    </div>
                                    {discountError && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <Icon name="error" className="text-sm" />
                                            {discountError}
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                                    <span className="text-2xl font-black text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon name="payment" className="text-primary text-lg" />
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Formas de Pagamento</h3>
                                    </div>
                                    <span className="text-xs text-red-600 dark:text-red-400 font-semibold">*</span>
                                </div>

                                {paymentError && (
                                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                        <p className="text-xs text-red-600 dark:text-red-400">{paymentError}</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {payments.map((payment, index) => (
                                        <div key={payment.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
                                            {payments.length > 1 && (
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pagamento {index + 1}</p>
                                            )}
                                            
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <label className="text-xs font-semibold text-gray-900 dark:text-white block mb-1">Método</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenPaymentMethodSheet(payment.id);
                                                            setPaymentError(null);
                                                        }}
                                                        className={`w-full h-9 rounded-lg border px-3 text-xs font-medium text-gray-900 dark:text-white focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                                            paymentError && (!payment.method || (parseFloat(payment.amount.replace(',', '.')) || 0) <= 0)
                                                                ? 'border-red-500 dark:border-red-500 bg-white dark:bg-gray-900 focus:border-red-500'
                                                                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary'
                                                        }`}
                                                    >
                                                        <span className={payment.method ? '' : 'text-gray-400 dark:text-gray-500'}>
                                                            {payment.method || 'Selecione um método...'}
                                                        </span>
                                                        <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-base">
                                                            expand_more
                                                        </span>
                                                    </button>
                                                    {/* Dropdown aparece aqui em desktop */}
                                                    <BottomSheet
                                                        key={`payment-method-${payment.id}`}
                                                        isOpen={openPaymentMethodSheet === payment.id}
                                                        onClose={() => setOpenPaymentMethodSheet(null)}
                                                        title="Selecione o método de pagamento"
                                                        options={getPaymentMethodOptions(false)}
                                                        selectedValue={payment.method || ''}
                                                        onSelect={(value) => {
                                                            handlePaymentChange(payment.id, 'method', value as string);
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold text-gray-900 dark:text-white block mb-1">Valor</label>
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
                                                            className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-3 text-xs font-semibold text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {payments.length > 1 && (
                                                <div className="flex justify-end pt-1">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemovePayment(payment.id)} 
                                                        className="flex items-center gap-1 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors text-xs"
                                                    >
                                                        <Icon name="delete" className="text-sm" />
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
                                        className="w-full py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-primary font-semibold hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-xs"
                                    >
                                        <Icon name="add_circle" className="text-base" />
                                        <span>Adicionar outra forma</span>
                                    </button>
                                )}
                            </div>

                            {/* Confirm Button */}
                            <button 
                                type="submit"
                                disabled={isSubmitting || selectedServices.length === 0 || !clientName.trim()}
                                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check_circle" className="text-xl" />
                                        <span className="hidden lg:inline">Confirmar Atendimento</span>
                                        <span className="lg:hidden">Confirmar</span>
                                    </>
                                )}
                            </button>

                            {/* Cancel Button */}
                            <button 
                                type="button" 
                                onClick={() => navigate(-1)}
                                className="w-full py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </form>
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
            
            /* Ajustes para telas de desktop (otimização de espaço) */
            @media (min-width: 1280px) {
                /* Reduzir espaçamento geral */
                main {
                    padding-top: 1rem !important;
                    padding-bottom: 1rem !important;
                }
                
                /* Header mais compacto */
                header {
                    padding-top: 0.5rem !important;
                    padding-bottom: 0.5rem !important;
                }
                
                /* Cards com menos padding */
                .rounded-xl {
                    padding: 0.875rem !important;
                }
                
                /* Grid de serviços mais compacto */
                .grid.grid-cols-1.sm\\:grid-cols-2 {
                    gap: 0.5rem;
                }
                
                /* Reduzir espaçamento entre sections */
                .space-y-6 > * + * {
                    margin-top: 1rem !important;
                }
                
                /* Labels menores */
                label .text-sm {
                    font-size: 0.8rem !important;
                }
                
                /* Inputs menores */
                input, select, textarea {
                    padding-top: 0.5rem !important;
                    padding-bottom: 0.5rem !important;
                }
                
                /* Botões de serviço menores */
                .grid button {
                    padding: 0.6rem !important;
                }
                
                .grid button .text-sm {
                    font-size: 0.75rem !important;
                }
                
                /* Carrinho lateral compacto */
                .lg\\:col-span-1 .rounded-2xl {
                    padding: 0.75rem !important;
                }
                
                .lg\\:col-span-1 h2 {
                    font-size: 0.875rem !important;
                    margin-bottom: 0.5rem !important;
                }
                
                /* Espaçamento do carrinho */
                .lg\\:col-span-1 .space-y-6 > * + * {
                    margin-top: 0.625rem !important;
                }
                
                .lg\\:col-span-1 .space-y-3 > * + * {
                    margin-top: 0.375rem !important;
                }
                
                .lg\\:col-span-1 .space-y-2 > * + * {
                    margin-top: 0.25rem !important;
                }
                
                /* Total valor menor */
                .lg\\:col-span-1 .text-2xl {
                    font-size: 1.25rem !important;
                }
                
                /* Textos do carrinho menores */
                .lg\\:col-span-1 .text-sm {
                    font-size: 0.75rem !important;
                }
                
                .lg\\:col-span-1 .text-xs {
                    font-size: 0.7rem !important;
                }
                
                .lg\\:col-span-1 label {
                    font-size: 0.75rem !important;
                    margin-bottom: 0.25rem !important;
                }
                
                /* Inputs do carrinho menores */
                .lg\\:col-span-1 input {
                    height: 2rem !important;
                    font-size: 0.75rem !important;
                    padding: 0.375rem 0.5rem !important;
                }
                
                /* Inputs com R$ precisam de padding-left maior */
                .lg\\:col-span-1 input[type="text"] {
                    padding-left: 2.25rem !important;
                }
                
                /* Ajustar o símbolo R$ */
                .lg\\:col-span-1 .relative > span.absolute {
                    font-size: 0.7rem !important;
                    left: 0.5rem !important;
                }
                
                /* Botões do carrinho menores */
                .lg\\:col-span-1 button {
                    padding: 0.375rem 0.625rem !important;
                    font-size: 0.75rem !important;
                }
                
                .lg\\:col-span-1 button[type="submit"] {
                    padding: 0.5rem 0.75rem !important;
                    font-size: 0.8rem !important;
                }
                
                /* Ícones menores no carrinho */
                .lg\\:col-span-1 .material-symbols-outlined {
                    font-size: 1.125rem !important;
                }
                
                /* Cards de métodos de pagamento compactos */
                .lg\\:col-span-1 .bg-gray-50,
                .lg\\:col-span-1 .dark\\:bg-gray-800\\/50 {
                    padding: 0.5rem !important;
                }
            }
            
            /* Ajustes para telas pequenas (tablets/notebooks pequenos) */
            @media (min-width: 768px) and (max-width: 1280px) {
                /* Reduzir padding em telas médias */
                .lg\\:col-span-2 {
                    padding-right: 0.5rem;
                }
                
                /* Ajustar tamanho de fontes em telas pequenas */
                h1, h2, h3 {
                    font-size: 0.95em;
                }
                
                /* Reduzir espaçamento em cards */
                .rounded-xl {
                    padding: 1rem !important;
                }
                
                /* Grid de serviços mais compacto */
                .grid.grid-cols-1.sm\\:grid-cols-2 {
                    gap: 0.5rem;
                }
            }
            
            /* Específico para telas 1024x600 e similares */
            @media (min-width: 1024px) and (max-width: 1280px) and (max-height: 700px) {
                /* Reduzir espaçamento geral */
                main {
                    padding: 0.5rem 1rem !important;
                }
                
                /* Header mais compacto */
                header {
                    padding: 0.4rem 0 !important;
                }
                
                header h1 {
                    font-size: 1rem !important;
                }
                
                /* Carrinho lateral - tamanhos reduzidos */
                .lg\\:col-span-1 .rounded-2xl {
                    padding: 0.875rem !important;
                }
                
                .lg\\:col-span-1 h2 {
                    font-size: 0.875rem !important;
                }
                
                /* Labels e textos menores */
                .lg\\:col-span-1 label {
                    font-size: 0.65rem !important;
                    margin-bottom: 0.25rem !important;
                }
                
                /* Inputs e botões menores */
                .lg\\:col-span-1 input[type="text"] {
                    height: 1.75rem !important;
                    font-size: 0.7rem !important;
                    padding-left: 2rem !important;
                    padding-right: 0.5rem !important;
                }
                
                .lg\\:col-span-1 button[type="button"]:not([type="submit"]) {
                    height: 1.75rem !important;
                    font-size: 0.7rem !important;
                    padding: 0.25rem 0.5rem !important;
                }
                
                /* Ajustar posição e tamanho do símbolo R$ */
                .lg\\:col-span-1 .relative > span {
                    font-size: 0.6rem !important;
                }
                
                /* Garantir que o R$ não sobreponha */
                .lg\\:col-span-1 input[type="text"]::placeholder {
                    padding-left: 0 !important;
                }
                
                /* Total menor */
                .lg\\:col-span-1 .text-2xl {
                    font-size: 1.25rem !important;
                }
                
                .lg\\:col-span-1 .text-sm {
                    font-size: 0.7rem !important;
                }
                
                .lg\\:col-span-1 .text-xs {
                    font-size: 0.65rem !important;
                }
                
                .lg\\:col-span-1 .text-base {
                    font-size: 0.8rem !important;
                }
                
                /* Espaçamentos reduzidos */
                .lg\\:col-span-1 .space-y-6 > * + * {
                    margin-top: 0.75rem !important;
                }
                
                .lg\\:col-span-1 .space-y-3 > * + * {
                    margin-top: 0.4rem !important;
                }
                
                .lg\\:col-span-1 .space-y-2 > * + * {
                    margin-top: 0.3rem !important;
                }
                
                /* Botão de confirmar menor */
                .lg\\:col-span-1 button[type="submit"] {
                    padding: 0.5rem 0.75rem !important;
                    font-size: 0.75rem !important;
                }
                
                .lg\\:col-span-1 button[type="submit"] span {
                    white-space: nowrap !important;
                }
                
                .lg\\:col-span-1 button[type="submit"] + button {
                    padding: 0.5rem !important;
                    font-size: 0.75rem !important;
                }
                
                /* Cards de pagamento mais compactos */
                .lg\\:col-span-1 .bg-gray-50,
                .lg\\:col-span-1 .bg-gray-800\\/50 {
                    padding: 0.5rem !important;
                }
                
                /* Ícones menores */
                .lg\\:col-span-1 .material-symbols-outlined {
                    font-size: 1rem !important;
                }
                
                /* Serviços - cards menores */
                .lg\\:col-span-2 .grid button {
                    padding: 0.6rem !important;
                }
                
                .lg\\:col-span-2 .text-sm {
                    font-size: 0.75rem !important;
                }
            }
        `}</style>
    </div>
  );
};
