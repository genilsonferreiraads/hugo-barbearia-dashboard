import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useTransactions, useEditTransaction } from '../contexts.tsx';
import { Product, PaymentMethod, Transaction } from '../types.ts';

const paymentMethodOptions = Object.values(PaymentMethod);

type PaymentState = {
    id: number;
    method: PaymentMethod | '';
    amount: string;
};

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Helper function to format discount input
const formatDiscountInput = (value: string): string => {
    let digits = value.replace(/\D/g, '');
    if (!digits) return '0,00';
    digits = digits.replace(/^0+/, '') || '0';
    if (digits.length === 1) {
        digits = '0' + digits;
    }
    if (digits.length === 2) {
        return '0,' + digits;
    }
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

export const SalesPage: React.FC = () => {
    const navigate = useNavigate();
    const { products } = useProducts();
    const { addTransaction, updateTransaction } = useTransactions();
    const { transaction: editTransaction, onSave: onEditSave, clearEditTransactionData } = useEditTransaction();

    const isEditing = !!editTransaction && (editTransaction.type === 'product' || editTransaction.clientName === 'Venda de Produto');

    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Map<number, { product: Product; quantity: number }>>(new Map());
    const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: '' as PaymentMethod | '', amount: '' }]);
    const [discount, setDiscount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter products based on search query
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(product => 
            product.name.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

    const subtotal = useMemo(() => {
        let total = 0;
        selectedProducts.forEach(({ product, quantity }) => {
            total += product.price * quantity;
        });
        return total;
    }, [selectedProducts]);

    const discountValue = useMemo(() => {
        const parsed = parseFloat(discount.replace(',', '.'));
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }, [discount]);

    const totalValue = useMemo(() => {
        const total = subtotal - discountValue;
        return total < 0 ? 0 : total;
    }, [subtotal, discountValue]);

    // Pre-fill data when editing (only once when component mounts or editTransaction changes)
    const initializedTransactionId = React.useRef<number | null>(null);
    useEffect(() => {
        if (isEditing && editTransaction && products.length > 0 && initializedTransactionId.current !== editTransaction.id) {
            initializedTransactionId.current = editTransaction.id;
            // Parse products from transaction.service (format: "Produto 1 (2x), Produto 2")
            const serviceText = editTransaction.service;
            const productEntries = serviceText.split(',').map(s => s.trim());
            
            const newSelected = new Map<number, { product: Product; quantity: number }>();
            
            productEntries.forEach(entry => {
                // Check if has quantity: "Produto (2x)"
                const quantityMatch = entry.match(/\((\d+)x\)$/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                const productName = entry.replace(/\s*\(\d+x\)$/, '').trim();
                
                // Find matching product
                const matchingProduct = products.find(p => 
                    p.name.toLowerCase() === productName.toLowerCase() ||
                    productName.toLowerCase().includes(p.name.toLowerCase())
                );
                
                if (matchingProduct) {
                    newSelected.set(matchingProduct.id, { product: matchingProduct, quantity });
                }
            });
            
            if (newSelected.size > 0) {
                setSelectedProducts(newSelected);
            }
            
            // Set discount
            setDiscount(editTransaction.discount.toFixed(2).replace('.', ','));
            
            // Set payments
            const paymentMethods = editTransaction.paymentMethod.split(',').map(m => m.trim());
            
            setPayments(paymentMethods.map((method, index) => ({
                id: Date.now() + index,
                method: method as PaymentMethod,
                amount: editTransaction.value.toFixed(2).replace('.', ',')
            })));
            
            // Auto-advance to step 2 if we have data
            setStep(2);
        } else if (!isEditing) {
            initializedTransactionId.current = null;
        }
    }, [isEditing, editTransaction?.id, products.length]); // Only depend on editTransaction.id, not the whole object

    useEffect(() => {
        if (step === 2 && payments.length === 1 && selectedProducts.size > 0 && payments[0].method) {
            setPayments(prev => [{...prev[0], amount: totalValue.toFixed(2).replace('.', ',')}]);
        }
    }, [totalValue, selectedProducts.size, payments.length, step]);

    const handleProductToggle = (product: Product) => {
        setSelectedProducts(prev => {
            const newMap = new Map(prev);
            if (newMap.has(product.id)) {
                newMap.delete(product.id);
            } else {
                newMap.set(product.id, { product, quantity: 1 });
                // Limpar a busca após selecionar o produto
                setSearchQuery('');
            }
            return newMap;
        });
    };

    const handleQuantityChange = (productId: number, change: number) => {
        setSelectedProducts(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(productId);
            if (existing) {
                const newQuantity = Math.max(1, existing.quantity + change);
                newMap.set(productId, { ...existing, quantity: newQuantity });
            }
            return newMap;
        });
    };

    const handleRemoveProduct = (productId: number) => {
        setSelectedProducts(prev => {
            const newMap = new Map(prev);
            newMap.delete(productId);
            return newMap;
        });
    };

    const handleAddPayment = () => {
        if (payments.length < 2 && payments[0].method) {
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
        if (field === 'method' && newPayments.length === 1 && value) {
            // Quando seleciona método no primeiro pagamento, atualiza o valor automaticamente
            newPayments[0].amount = totalValue.toFixed(2).replace('.', ',');
        } else if (field === 'amount' && newPayments.length === 2) {
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
        if (selectedProducts.size === 0) {
            alert("Selecione ao menos um produto para continuar.");
            return;
        }
        setStep(2);
    };

    const handleBackStep = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (step === 2) {
            setStep(1);
        } else {
            if (isEditing) {
                clearEditTransactionData();
                navigate('/sales');
            } else {
                navigate(-1);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Verificar se todos os pagamentos têm método selecionado
        const hasInvalidPayment = payments.some(p => !p.method || p.method === '');
        if (hasInvalidPayment) {
            alert('Por favor, selecione a forma de pagamento para todos os pagamentos.');
            return;
        }
        
        const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount.replace(',', '.')) || 0), 0);
        if (Math.abs(totalPaid - totalValue) > 0.01) {
            alert(`O total pago (R$ ${totalPaid.toFixed(2)}) não corresponde ao valor final (R$ ${totalValue.toFixed(2)}). Ajuste os valores.`);
            return;
        }

        try {
            setIsSubmitting(true);
            
            // Build service string with quantities
            const serviceDescription = Array.from(selectedProducts.values())
                .map(({ product, quantity }) => 
                    quantity > 1 ? `${product.name} (${quantity}x)` : product.name
                )
                .join(', ');

            if (isEditing && editTransaction && onEditSave) {
                // Update existing transaction
                await onEditSave({
                    service: serviceDescription,
                    paymentMethod: payments.map(p => p.method).join(', '),
                    subtotal: subtotal,
                    discount: discountValue,
                    value: totalValue,
                    type: 'product',
                });
                
                clearEditTransactionData();
                navigate('/sales', { state: { successMessage: 'Venda atualizada com sucesso!' } });
            } else {
                // Create new transaction
                const transactionData: Omit<Transaction, 'id' | 'created_at'> = {
                    clientName: 'Venda de Produto',
                    service: serviceDescription,
                    paymentMethod: payments.map(p => p.method).join(', '),
                    subtotal: subtotal,
                    discount: discountValue,
                    value: totalValue,
                    date: getTodayLocalDate(),
                    type: 'product',
                };
                
                await addTransaction(transactionData);
                navigate('/sales', { state: { successMessage: 'Venda registrada com sucesso!' } });
            }
        } catch (error: any) {
            console.error(`Failed to ${isEditing ? 'update' : 'register'} sale:`, error);
            alert(`Falha ao ${isEditing ? 'atualizar' : 'registrar'} venda: ${error.message || 'Erro desconhecido.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progressPercentage = (step / 2) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header with Back Button and Progress */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
                    <div className="flex items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <button 
                            type="button"
                            onClick={handleBackStep}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm shrink-0 mt-0.5"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>
                        
                        <div className="text-center flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                {isEditing ? 'Editar Venda' : 'Nova Venda'}
                            </h1>
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
                <form onSubmit={handleSubmit} onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && step === 1) {
                        e.preventDefault();
                    }
                }}>
                    {/* Step 1: Product Selection */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Search Bar */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                                <label className="block space-y-2">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">Pesquisar Produto</p>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-600">
                                            <Icon name="search" className="text-lg" />
                                        </span>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 pl-10 pr-3 text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                            placeholder="Digite o nome do produto..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </label>
                            </div>

                            {/* Products Section - Only show when searching */}
                            {searchQuery.trim() ? (
                                <div className="space-y-4">
                                    <div className="flex items-baseline justify-between mb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Resultados da Pesquisa</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                                                {selectedProducts.size > 0 && ` • ${selectedProducts.size} selecionado${selectedProducts.size !== 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                        {selectedProducts.size > 0 && (
                                            <p className="text-2xl font-bold text-primary">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                                        )}
                                    </div>

                                    {filteredProducts.length === 0 ? (
                                        <div className="text-center py-8 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                                            <Icon name="search_off" className="text-4xl text-gray-300 dark:text-gray-700 mb-2" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente com outros termos de busca</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
                                            {filteredProducts.map(product => {
                                                const selectedItem = selectedProducts.get(product.id);
                                                const isSelected = !!selectedItem;
                                                return (
                                                    <button 
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => handleProductToggle(product)}
                                                        className={`w-full p-4 flex items-center justify-between transition-all text-left ${
                                                            isSelected
                                                                ? 'bg-primary/5 dark:bg-primary/10'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                        }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`font-semibold text-base ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>{product.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                                                                {isSelected && selectedItem && (
                                                                    <span className="text-xs font-semibold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded">
                                                                        Qtd: {selectedItem.quantity}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={`ml-4 w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                            isSelected
                                                                ? 'bg-primary border-primary'
                                                                : 'border-gray-300 dark:border-gray-600'
                                                        }`}>
                                                            {isSelected && <Icon name="check" className="text-white text-xs" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <Icon name="search" className="text-5xl text-gray-300 dark:text-gray-700 mb-4" />
                                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">Pesquise um produto</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Digite o nome do produto no campo de busca acima</p>
                                </div>
                            )}

                            {/* Selected Products Summary */}
                            {selectedProducts.size > 0 && (
                                <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-4 border border-primary/30">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Produtos Selecionados</h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{selectedProducts.size} produto{selectedProducts.size !== 1 ? 's' : ''}</p>
                                        </div>
                                        <p className="text-xl font-bold text-primary">R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="space-y-3">
                                        {Array.from(selectedProducts.values()).map(({ product, quantity }) => (
                                            <div key={product.id} className="flex items-center justify-between gap-2 text-sm bg-white dark:bg-gray-900/30 rounded-lg p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">R$ {product.price.toFixed(2).replace('.', ',')} cada</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(product.id, -1);
                                                        }}
                                                        className="flex items-center justify-center size-7 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                                        title="Diminuir quantidade"
                                                    >
                                                        <Icon name="remove" className="text-base" />
                                                    </button>
                                                    <span className="min-w-[2rem] text-center font-bold text-gray-900 dark:text-white">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(product.id, 1);
                                                        }}
                                                        className="flex items-center justify-center size-7 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                                        title="Aumentar quantidade"
                                                    >
                                                        <Icon name="add" className="text-base" />
                                                    </button>
                                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white min-w-[4rem] text-right">
                                                        R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveProduct(product.id);
                                                        }}
                                                        className="flex items-center justify-center size-7 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 ml-1"
                                                        title="Remover produto"
                                                    >
                                                        <Icon name="close" className="text-base" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                            onChange={(e) => setDiscount(formatDiscountInput(e.target.value))}
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

                            {/* Products Summary */}
                            {selectedProducts.size > 0 && (
                                <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resumo dos Produtos</h3>
                                    </div>
                                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {Array.from(selectedProducts.values()).map(({ product, quantity }) => (
                                            <div key={product.id} className="p-3 flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                        {quantity} unidade{quantity !== 1 ? 's' : ''} × R$ {product.price.toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                        R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                                        value={payment.method || ''}
                                                        onChange={e => handlePaymentChange(payment.id, 'method', e.target.value)}
                                                        className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                        required
                                                    >
                                                        <option value="">Selecione...</option>
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
                                                            onChange={e => handlePaymentChange(payment.id, 'amount', formatDiscountInput(e.target.value))}
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

                                {payments.length < 2 && payments[0].method && (
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
                                    onClick={handleBackStep}
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
                                            <span>{isEditing ? 'Salvando...' : 'Registrando...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check_circle" className="text-base" />
                                            <span>{isEditing ? 'Salvar Alterações' : 'Confirmar Venda'}</span>
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

