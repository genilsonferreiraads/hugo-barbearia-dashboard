import React, { useState, useMemo, useEffect } from 'react';
import { useServices, useTransactions } from '../contexts.tsx';
import { Service, PaymentMethod } from '../types.ts';

const paymentMethodOptions = Object.values(PaymentMethod);

type PaymentState = {
    id: number;
    method: PaymentMethod;
    amount: string;
};


export const ServiceRegistryPage: React.FC = () => {
  const { services } = useServices();
  const { addTransaction } = useTransactions();
  const [currentStep, setCurrentStep] = useState(1);
  const [clientName, setClientName] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: PaymentMethod.Pix, amount: '0,00' }]);
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
        newPayments[otherIndex].amount = remainingAmount >= 0 ? remainingAmount.toFixed(2).replace('.', ',') : '0,00';
    }
    setPayments(newPayments);
  };

  const handleClear = () => {
    setCurrentStep(1);
    setClientName('');
    setSelectedServices([]);
    setDiscount('');
    setPayments([{ id: Date.now(), method: PaymentMethod.Pix, amount: '0,00' }]);
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
    if (!clientName || selectedServices.length === 0) {
      alert("Por favor, preencha o nome do cliente e selecione ao menos um serviço.");
      return;
    }
    
    const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount.replace(',', '.')) || 0), 0);
    if (Math.abs(totalPaid - totalValue) > 0.01) {
        alert(`O total pago (R$ ${totalPaid.toFixed(2)}) não corresponde ao valor final (R$ ${totalValue.toFixed(2)}). Ajuste os valores.`);
        return;
    }

    try {
        await addTransaction({
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            clientName,
            service: selectedServices.map(s => s.name).join(', '),
            paymentMethod: payments.map(p => p.method).join(', '),
            subtotal,
            discount: discountValue,
            value: totalValue,
        });

        alert(`Atendimento finalizado para ${clientName}!`);
        handleClear();
    } catch (error: any) {
        console.error("Failed to register service:", error);
        alert(`Falha ao registrar atendimento: ${error.message || 'Erro desconhecido.'}`);
    }
  };
  
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 sm:mb-10 lg:mb-12 mt-4 sm:mt-6">
        <h1 className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">Registro de Atendimento Avulso</h1>
        <p className="text-zinc-500 dark:text-[#b9a29d] text-sm sm:text-base font-normal leading-normal">Para clientes que chegam sem hora marcada.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#181211]/60 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 pb-6 sm:pb-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-primary text-white' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {step}
                </div>
                {step < 2 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Client Information and Services */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold mb-4">Cliente e Serviços</h2>
              <label className="flex flex-col mb-6">
                <p className="text-zinc-900 dark:text-white text-sm sm:text-base font-medium leading-normal pb-2">Nome do Cliente</p>
                <input 
                  autoFocus 
                  className="form-input w-full rounded-lg text-zinc-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-zinc-300 dark:border-[#54403b] bg-background-light dark:bg-[#271e1c] focus:border-primary dark:focus:border-primary h-12 placeholder:text-zinc-400 dark:placeholder:text-[#b9a29d] px-4 text-base font-normal leading-normal" 
                  placeholder="Digite o nome do cliente" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </label>
              
              <div>
                <p className="text-zinc-900 dark:text-white text-sm sm:text-base font-medium leading-normal pb-3">Serviços Realizados</p>
                <div className="flex gap-2 sm:gap-3 flex-wrap mb-6">
                  {services.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <button 
                        key={service.id}
                        type="button"
                        onClick={() => handleServiceToggle(service)}
                        className={`flex h-8 sm:h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-3 sm:px-4 transition-colors ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-zinc-200 dark:bg-[#392c28] text-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-[#54403b]'
                        }`}
                      >
                        <p className="text-xs sm:text-sm font-medium leading-normal">{service.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Value Display */}
              {selectedServices.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">Total dos Serviços:</span>
                    <span className="text-xl font-bold text-primary">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={handleNextStep}
                disabled={!clientName.trim() || selectedServices.length === 0}
                className="h-12 px-6 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold mb-4">Pagamento</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 mb-6">
                <div className="text-sm">
                  <p className="text-gray-500 dark:text-gray-400">Subtotal</p>
                  <p className="font-bold text-lg text-gray-800 dark:text-gray-100">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-500 dark:text-gray-400">Desconto</p>
                  <p className="font-bold text-lg text-red-600 dark:text-red-500">- R$ {discountValue.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-500 dark:text-gray-400">Total a Pagar</p>
                  <p className="font-black text-xl text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
              
              <label className="flex flex-col mb-6">
                <p className="text-zinc-900 dark:text-white text-sm sm:text-base font-medium leading-normal pb-2">Desconto (R$)</p>
                <div className="relative max-w-xs">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 dark:text-[#b9a29d]">R$</span>
                  <input 
                    className="form-input w-full rounded-lg text-zinc-900 dark:text-white focus:outline-0 border border-zinc-300 dark:border-[#54403b] bg-background-light dark:bg-[#271e1c] h-12 pl-10 pr-4 text-base font-normal leading-normal" 
                    placeholder="0,00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </label>

              <div>
                <p className="text-zinc-900 dark:text-white text-sm sm:text-base font-medium leading-normal pb-3">Forma de Pagamento</p>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-10 gap-2 items-center">
                      <select 
                        value={payment.method}
                        onChange={e => handlePaymentChange(payment.id, 'method', e.target.value)}
                        className="col-span-10 sm:col-span-4 form-select h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-normal text-gray-900 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                          className="form-input h-10 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-2 text-sm font-normal text-gray-900 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      {payments.length > 1 && (
                        <button type="button" onClick={() => handleRemovePayment(payment.id)} className="col-span-2 sm:col-span-1 flex h-10 w-full items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
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
            </div>
            
            <div className="flex justify-between">
              <button 
                type="button"
                onClick={handlePrevStep}
                className="h-12 px-6 rounded-lg font-medium text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Voltar
              </button>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={handleClear} 
                  className="h-12 px-6 rounded-lg font-medium text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Limpar
                </button>
                <button 
                  type="submit" 
                  className="h-12 px-8 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Finalizar Atendimento
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
