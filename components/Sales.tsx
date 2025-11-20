import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useTransactions, useEditTransaction, useSystemSettings, useCreditSales, useClients } from '../contexts.tsx';
import { Product, PaymentMethod, Transaction, Client } from '../types.ts';
import { ClientSearchField } from './ClientSearchField.tsx';
import { BottomSheet } from './BottomSheet.tsx';
import { getPaymentMethodOptions } from '../constants.ts';

const paymentMethodOptions = Object.values(PaymentMethod).filter(m => m !== PaymentMethod.Credit); // Remover Fiado da lista normal

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

const DEFAULT_CLIENT_NAME = 'Venda de Produto';

const stripClientName = (value?: string): string => {
    if (!value) return '';
    return value.split('|')[0]?.trim() || '';
};

const buildClientDisplayName = (rawName: string, client?: Client | null): string => {
    const sanitized = stripClientName(rawName);

    if (client) {
        const baseName = client.fullName?.trim() || sanitized || DEFAULT_CLIENT_NAME;
        const whatsapp = client.whatsapp?.trim();
        return whatsapp ? `${baseName}|${whatsapp}` : baseName;
    }

    return sanitized || DEFAULT_CLIENT_NAME;
};

export const SalesPage: React.FC = () => {
    const navigate = useNavigate();
    const { products } = useProducts();
    const { addTransaction, updateTransaction } = useTransactions();
    const { transaction: editTransaction, onSave: onEditSave, clearEditTransactionData } = useEditTransaction();
    const { settings } = useSystemSettings();
    const { addCreditSale } = useCreditSales();
    const { clients, addClient } = useClients();

    const findClientByName = useCallback((name: string): Client | null => {
        if (!name || !name.trim()) return null;
        const normalized = name.trim().toLowerCase();
        return clients.find(c => c.fullName.toLowerCase() === normalized) || null;
    }, [clients]);

    const isEditing = !!editTransaction && (editTransaction.type === 'product' || editTransaction.clientName === 'Venda de Produto');

    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Map<number, { product: Product; quantity: number }>>(new Map());
    const [payments, setPayments] = useState<PaymentState[]>([{ id: Date.now(), method: '' as PaymentMethod | '', amount: '' }]);
    const [discount, setDiscount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openPaymentMethodSheet, setOpenPaymentMethodSheet] = useState<number | null>(null);
    
    // Estados para venda avulso
    const [avulsoClientName, setAvulsoClientName] = useState('');
    const [avulsoSelectedClient, setAvulsoSelectedClient] = useState<Client | null>(null);
    
    // Estados para venda no fiado
    const [isCreditSale, setIsCreditSale] = useState(false);
    const [clientName, setClientName] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [numberOfInstallments, setNumberOfInstallments] = useState(1);
    const [installmentsInputValue, setInstallmentsInputValue] = useState('1'); // Estado para permitir edição livre
    const [openPaymentDropdown, setOpenPaymentDropdown] = useState<number | null>(null);
    const [firstDueDate, setFirstDueDate] = useState(() => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const year = nextMonth.getFullYear();
        const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
        const day = String(nextMonth.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

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
        if (!isEditing || !editTransaction) return;
        const baseName = stripClientName(editTransaction.clientName);

        if (!baseName || baseName === DEFAULT_CLIENT_NAME) {
            setAvulsoClientName('');
            setAvulsoSelectedClient(null);
            return;
        }

        const matchingClient = editTransaction.clientId
            ? clients.find(c => c.id === editTransaction.clientId)
            : findClientByName(baseName);

        setAvulsoClientName(baseName);
        setAvulsoSelectedClient(matchingClient || null);
    }, [isEditing, editTransaction, clients, findClientByName]);

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
            if (existing && typeof existing === 'object' && 'quantity' in existing && 'product' in existing) {
                const newQuantity = Math.max(1, (existing.quantity as number) + change);
                newMap.set(productId, { ...existing, quantity: newQuantity } as { product: Product; quantity: number });
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
        if (field === 'method') {
            // Verificar se é fiado
            if (value === PaymentMethod.Credit) {
                setIsCreditSale(true);
                // Limpar outros pagamentos se existirem
                if (newPayments.length > 1) {
                    setPayments([newPayments[0]]);
                    return;
                }
            } else {
                setIsCreditSale(false);
            }
            
            if (newPayments.length === 1 && value) {
                // Quando seleciona método no primeiro pagamento, atualiza o valor automaticamente
                newPayments[0].amount = totalValue.toFixed(2).replace('.', ',');
            }
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
        
        let resolvedFiadoClient: Client | null = null;
        // Se for venda no fiado
        if (isCreditSale) {
            resolvedFiadoClient = selectedClient || findClientByName(clientName);
            if (!clientName.trim()) {
                alert('Por favor, informe o nome do cliente.');
                return;
            }
            if (numberOfInstallments < 1 || numberOfInstallments > 24) {
                alert('O número de parcelas deve ser entre 1 e 24.');
                return;
            }
            if (!firstDueDate) {
                alert('Por favor, informe a data do primeiro vencimento.');
                return;
            }
        } else {
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
                // Update existing transaction (não permite editar para fiado)
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
            } else if (isCreditSale) {
                // Criar venda no fiado
                const installmentAmount = totalValue / numberOfInstallments;
                const installments = Array.from({ length: numberOfInstallments }, (_, index) => ({
                    amount: index === numberOfInstallments - 1 
                        ? totalValue - (installmentAmount * (numberOfInstallments - 1)) // Última parcela ajusta para não ter centavos perdidos
                        : Math.floor(installmentAmount * 100) / 100, // Arredonda para 2 casas decimais
                }));

                await addCreditSale({
                    clientName: buildClientDisplayName(clientName.trim(), resolvedFiadoClient),
                    clientId: resolvedFiadoClient?.id,
                    products: serviceDescription,
                    totalAmount: totalValue,
                    subtotal: subtotal,
                    discount: discountValue,
                    numberOfInstallments: numberOfInstallments,
                    firstDueDate: firstDueDate,
                    date: getTodayLocalDate(),
                }, installments);

                navigate('/credit-sales', { state: { successMessage: 'Venda no fiado registrada com sucesso!' } });
            } else {
                let resolvedAvulsoClient = avulsoSelectedClient || findClientByName(avulsoClientName);
                let finalClientId = resolvedAvulsoClient?.id;
                let finalClientName = buildClientDisplayName(avulsoClientName.trim() || DEFAULT_CLIENT_NAME, resolvedAvulsoClient);
                
                // Venda avulso - verificar se precisa salvar cliente
                // Se digitou um nome e não selecionou cliente da base, perguntar se quer salvar
                if (avulsoClientName.trim() && !resolvedAvulsoClient && avulsoClientName.trim() !== DEFAULT_CLIENT_NAME) {
                    // Verificar se o cliente já existe na base
                    const clientExists = !!findClientByName(avulsoClientName.trim());
                    
                    if (!clientExists) {
                        // Perguntar se quer salvar como cliente
                        const shouldSave = confirm(
                            `Deseja salvar "${avulsoClientName.trim()}" como cliente na base de dados?\n\n` +
                            `Isso permitirá buscar este cliente em vendas futuras.`
                        );
                        
                        if (shouldSave) {
                            // Mostrar modal para pedir WhatsApp (obrigatório)
                            const whatsapp = prompt(
                                `Para salvar como cliente, informe o WhatsApp de "${avulsoClientName.trim()}":\n\n` +
                                `Formato: (87) 99155-6444`
                            );
                            
                            if (whatsapp && whatsapp.trim()) {
                                try {
                                    const numbers = whatsapp.replace(/\D/g, '');
                                    if (numbers.length < 10 || numbers.length > 11) {
                                        alert('WhatsApp inválido. O cliente não foi salvo, mas a venda foi registrada.');
                                    } else {
                                        const newClient = await addClient({
                                            fullName: avulsoClientName.trim(),
                                            whatsapp: whatsapp.trim(),
                                            nickname: undefined,
                                            observation: undefined,
                                            cpf: undefined,
                                        });
                                        alert('Cliente salvo com sucesso!');
                                        resolvedAvulsoClient = newClient;
                                        finalClientId = newClient.id;
                                        finalClientName = buildClientDisplayName(newClient.fullName, newClient);
                                        setAvulsoSelectedClient(newClient);
                                        setAvulsoClientName(newClient.fullName);
                                    }
                                } catch (error: any) {
                                    console.error('Erro ao salvar cliente:', error);
                                    alert('Erro ao salvar cliente. A venda será registrada mesmo assim.');
                                }
                            } else {
                                alert('WhatsApp não informado. O cliente não foi salvo, mas a venda foi registrada.');
                            }
                        }
                    }
                }
                
                // Create new transaction
                const transactionData: Omit<Transaction, 'id' | 'created_at'> = {
                    clientName: finalClientName,
                    clientId: finalClientId,
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

    // Detectar se é mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sincronizar cliente avulso com cliente do fiado quando estiver em modo fiado
    useEffect(() => {
        if (isCreditSale) {
            // Quando está em modo fiado, manter sincronizado com o cliente avulso
            setClientName(avulsoClientName);
            setSelectedClient(avulsoSelectedClient);
        }
    }, [avulsoClientName, avulsoSelectedClient, isCreditSale]);

    const progressPercentage = (step / 2) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header with Back Button */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={handleBackStep}
                            className="flex items-center justify-center size-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                        </button>
                        
                        <div className="flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                {isEditing ? 'Editar Venda' : 'Nova Venda'}
                            </h1>
                            {isMobile && <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 2</p>}
                        </div>
                    </div>

                    {/* Progress Bar - Mobile only */}
                    {isMobile && (
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden mt-3">
                        <div 
                            className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit} onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                        e.preventDefault();
                    }
                }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna Esquerda - Cliente e Produtos (Desktop sempre visível, Mobile Step 1) */}
                    <div className={`lg:col-span-2 space-y-5 ${step === 2 && isMobile ? 'hidden' : ''}`}>
                        {/* Cliente */}
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="person" className="text-primary text-xl" />
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Cliente</h2>
                                <span className="text-xs text-gray-500 dark:text-gray-400">(Opcional)</span>
                            </div>
                            
                                        <ClientSearchField
                                            onSelectClient={(client) => {
                                                setAvulsoSelectedClient(client);
                                                if (client) {
                                                    setAvulsoClientName(client.fullName);
                                                } else {
                                                    setAvulsoClientName('');
                                                }
                                            }}
                                            onValueChange={(name) => {
                                                setAvulsoClientName(name);
                                                if (!name.trim()) {
                                                    setAvulsoSelectedClient(null);
                                                }
                                            }}
                                            value={avulsoClientName}
                                placeholder="Buscar cliente ou digite o nome..."
                                            className="w-full"
                                showAddButton={true}
                            />
                                            </div>

                        {/* Produtos */}
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="shopping_bag" className="text-primary text-xl" />
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Produtos</h2>
                                </div>
                            
                            {/* Search Bar */}
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

                            {/* Empty State - Show when no search and no products selected */}
                            {!searchQuery.trim() && selectedProducts.size === 0 && (
                                <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900/30 dark:via-gray-900/20 dark:to-gray-900/30 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                                    <div className="max-w-sm mx-auto space-y-4">
                                        <div className="relative inline-block">
                                            <div className="flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 mx-auto">
                                                <Icon name="shopping_bag" className="text-4xl text-primary" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 flex items-center justify-center size-8 rounded-full bg-blue-500 border-4 border-white dark:border-gray-900">
                                                <Icon name="search" className="text-white text-base" />
                                            </div>
                            </div>
                                        
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                Nenhum produto selecionado
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                Use o campo de busca acima para encontrar e adicionar produtos à venda
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-center gap-2 pt-2">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                                <Icon name="keyboard" className="text-gray-500 dark:text-gray-400 text-sm" />
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                    Digite para buscar
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Products Section - Only show when searching */}
                            {searchQuery.trim() && (
                                <div className="space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 dark:bg-primary/20">
                                                <Icon name="search" className="text-primary text-lg" />
                                            </div>
                                        <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Resultados da Pesquisa</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        </div>
                                    </div>

                                    {filteredProducts.length === 0 ? (
                                        <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                                            <div className="flex items-center justify-center size-16 rounded-full bg-gray-200 dark:bg-gray-800 mx-auto mb-3">
                                                <Icon name="search_off" className="text-3xl text-gray-400 dark:text-gray-600" />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nenhum produto encontrado</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">Tente buscar por outro nome</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredProducts.map(product => {
                                                const selectedItem = selectedProducts.get(product.id);
                                                const isSelected = !!selectedItem;
                                                return (
                                                    <button 
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => handleProductToggle(product)}
                                                        className={`group relative rounded-xl p-4 transition-all duration-200 text-left ${
                                                            isSelected
                                                                ? 'bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-2 border-primary/30 shadow-sm'
                                                                : 'bg-white dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-800 hover:border-primary/30 hover:shadow-md'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            {/* Checkbox */}
                                                            <div className={`relative flex items-center justify-center size-11 rounded-xl transition-all ${
                                                                isSelected
                                                                    ? 'bg-primary shadow-lg shadow-primary/20'
                                                                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                                                            }`}>
                                                                {isSelected ? (
                                                                    <Icon name="check_circle" className="text-white text-2xl" />
                                                                ) : (
                                                                    <Icon name="add_circle" className="text-gray-400 dark:text-gray-600 text-2xl group-hover:text-primary transition-colors" />
                                                                )}
                                                            </div>

                                                            {/* Product Info */}
                                                        <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className={`font-bold text-base mb-1 truncate ${
                                                                            isSelected 
                                                                                ? 'text-primary' 
                                                                                : 'text-gray-900 dark:text-white group-hover:text-primary transition-colors'
                                                                        }`}>
                                                                            {product.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-lg font-black ${
                                                                                isSelected 
                                                                                    ? 'text-primary' 
                                                                                    : 'text-gray-900 dark:text-white'
                                                                            }`}>
                                                                                R$ {product.price.toFixed(2).replace('.', ',')}
                                                                            </span>
                                                                            {product.stock !== undefined && (
                                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                                    product.stock > 10
                                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                                        : product.stock > 0
                                                                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                                }`}>
                                                                                    {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Quantity Badge */}
                                                                {isSelected && selectedItem && (
                                                                        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-primary/20 shadow-sm">
                                                                            <Icon name="shopping_bag" className="text-primary text-sm" />
                                                                            <span className="text-sm font-bold text-primary">
                                                                                {selectedItem.quantity}x
                                                                    </span>
                                                                        </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        </div>

                                                        {/* Selected indicator line */}
                                                        {isSelected && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
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
                                            <div key={product.id} className="bg-white dark:bg-gray-900/30 rounded-lg p-3">
                                                {/* Mobile Layout */}
                                                <div className="flex sm:hidden flex-col gap-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">R$ {product.price.toFixed(2).replace('.', ',')} cada</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveProduct(product.id);
                                                            }}
                                                            className="flex items-center justify-center size-6 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                                                            title="Remover produto"
                                                        >
                                                            <Icon name="close" className="text-sm" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuantityChange(product.id, -1);
                                                                }}
                                                                className="flex items-center justify-center size-8 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
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
                                                                className="flex items-center justify-center size-8 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                                                title="Aumentar quantidade"
                                                            >
                                                                <Icon name="add" className="text-base" />
                                                            </button>
                                                        </div>
                                                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                                            R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Desktop Layout */}
                                                <div className="hidden sm:flex items-center justify-between gap-2 text-sm">
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Continue Button */}
                        {isMobile && (
                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleBackStep}
                                    className="flex-1 px-6 h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleNextStep}
                                    disabled={selectedProducts.size === 0}
                                    className="flex-1 px-6 h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span>Continuar</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                                    </div>
                        )}
                                    </div>

                    {/* Coluna Direita - Carrinho e Pagamento (Desktop sempre visível, Mobile Step 2) */}
                    <div className={`lg:col-span-1 ${step === 1 && isMobile ? 'hidden' : ''}`}>
                        <div className="sticky top-24 space-y-5">
                            {/* Carrinho - Resumo */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-lg space-y-5">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <Icon name="shopping_cart" className="text-primary text-xl" />
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Carrinho</h2>
                                    </div>
                                    {selectedProducts.size > 0 && (
                                        <span className="flex items-center justify-center size-6 rounded-full bg-primary text-white text-xs font-bold">
                                            {selectedProducts.size}
                                        </span>
                                    )}
                                </div>

                                {/* Produtos Selecionados */}
                                {selectedProducts.size > 0 ? (
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                        {Array.from(selectedProducts.values()).map(({ product, quantity }) => (
                                            <div key={product.id} className="flex items-center justify-between text-sm">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{quantity}x R$ {product.price.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Icon name="shopping_cart" className="text-4xl text-gray-300 dark:text-gray-700 mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto selecionado</p>
                                    </div>
                                )}

                                {/* Desconto */}
                                {selectedProducts.size > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
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

                                        {/* Resumo de valores */}
                                        <div className="space-y-2 pt-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                                            {discountValue > 0 && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Desconto</span>
                                                    <span className="font-semibold text-red-600 dark:text-red-500">- R$ {discountValue.toFixed(2).replace('.', ',')}</span>
                        </div>
                    )}
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between items-center">
                                                <span className="text-gray-900 dark:text-white font-bold">Total</span>
                                                <span className="text-xl font-black text-primary">R$ {totalValue.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    </div>
                                </div>
                                )}
                            </div>

                            {/* Pagamento */}
                            {selectedProducts.size > 0 && (
                                <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-lg space-y-4">
                                    <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-800">
                                        <Icon name="payments" className="text-primary text-xl" />
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Pagamento</h2>
                                    </div>

                                    {/* Opções de Pagamento */}
                            <div className="space-y-3">
                                <div>
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Formas de Pagamento</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecione como será realizado o pagamento</p>
                                </div>

                                {/* Opção de Fiado (se habilitada) */}
                                {settings.creditSalesEnabled && (
                                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isCreditSale}
                                                onChange={(e) => {
                                                    setIsCreditSale(e.target.checked);
                                                    if (e.target.checked) {
                                                        // Limpar métodos de pagamento normais
                                                        setPayments([{ id: Date.now(), method: PaymentMethod.Credit, amount: totalValue.toFixed(2).replace('.', ',') }]);
                                                        // Resetar valores do fiado
                                                        setInstallmentsInputValue('1');
                                                        setNumberOfInstallments(1);
                                                        // Copiar cliente da venda avulso para o fiado
                                                        if (avulsoClientName || avulsoSelectedClient) {
                                                            setClientName(avulsoClientName);
                                                            setSelectedClient(avulsoSelectedClient);
                                                        }
                                                    } else {
                                                        setPayments([{ id: Date.now(), method: '' as PaymentMethod | '', amount: '' }]);
                                                        // Copiar cliente do fiado de volta para venda avulso
                                                        if (clientName || selectedClient) {
                                                            setAvulsoClientName(clientName);
                                                            setAvulsoSelectedClient(selectedClient);
                                                        }
                                                    }
                                                }}
                                                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary focus:ring-2"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Icon name="credit_card" className="text-primary text-lg" />
                                                    <span className="font-semibold text-gray-900 dark:text-white">Vender no Fiado</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    Registre a venda como fiado parcelado
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                {!isCreditSale && (
                                <div className="space-y-3">
                                    {payments.map((payment, index) => (
                                                    <div key={payment.id} className="space-y-3">
                                            {payments.length > 1 && (
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pagamento {index + 1}</p>
                                            )}
                                            
                                                        {/* Se só tem 1 método, mostrar só o seletor */}
                                                        {payments.length === 1 ? (
                                                            <div className="space-y-2 relative">
                                                                <label className="text-xs font-semibold text-gray-900 dark:text-white block">Método de Pagamento</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isMobile) {
                                                                            setOpenPaymentMethodSheet(payment.id);
                                                                        } else {
                                                                            setOpenPaymentDropdown(openPaymentDropdown === payment.id ? null : payment.id);
                                                                        }
                                                                    }}
                                                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                >
                                                                    <span className={payment.method ? '' : 'text-gray-400 dark:text-gray-500'}>
                                                                        {payment.method || 'Selecione...'}
                                                                    </span>
                                                                    <Icon name="expand_more" className="text-gray-400 dark:text-gray-500 text-lg" />
                                                                </button>

                                                                {/* Dropdown Menu - Desktop only */}
                                                                {!isMobile && openPaymentDropdown === payment.id && (
                                                                    <>
                                                                        {/* Overlay para fechar ao clicar fora */}
                                                                        <div 
                                                                            className="fixed inset-0 z-10" 
                                                                            onClick={() => setOpenPaymentDropdown(null)}
                                                                        />
                                                                        
                                                                        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl max-h-60 overflow-auto">
                                                                            {getPaymentMethodOptions(true).map((option) => (
                                                                                <button
                                                                                    key={option.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handlePaymentChange(payment.id, 'method', option.id as string);
                                                                                        setOpenPaymentDropdown(null);
                                                                                    }}
                                                                                    className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-3 ${
                                                                                        payment.method === option.id
                                                                                            ? 'bg-primary/10 text-primary font-semibold'
                                                                                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                                    }`}
                                                                                >
                                                                                    <div 
                                                                                        className="w-3 h-3 rounded-full" 
                                                                                        style={{ backgroundColor: option.color }}
                                                                                    />
                                                                                    <span>{option.label}</span>
                                                                                    {payment.method === option.id && (
                                                                                        <Icon name="check" className="text-lg ml-auto" />
                                                                                    )}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            /* Se tem mais de 1, mostrar grid com método e valor */
                                                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5 relative">
                                                    <label className="text-xs font-semibold text-gray-900 dark:text-white block">Método</label>
                                                    <button
                                                        type="button"
                                                                            onClick={() => {
                                                                                if (isMobile) {
                                                                                    setOpenPaymentMethodSheet(payment.id);
                                                                                } else {
                                                                                    setOpenPaymentDropdown(openPaymentDropdown === payment.id ? null : payment.id);
                                                                                }
                                                                            }}
                                                                            className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >
                                                        <span className={payment.method ? '' : 'text-gray-400 dark:text-gray-500'}>
                                                            {payment.method || 'Selecione...'}
                                                        </span>
                                                                            <Icon name="expand_more" className="text-gray-400 dark:text-gray-500 text-base" />
                                                    </button>

                                                                        {/* Dropdown Menu - Desktop only */}
                                                                        {!isMobile && openPaymentDropdown === payment.id && (
                                                                            <>
                                                                                {/* Overlay para fechar ao clicar fora */}
                                                                                <div 
                                                                                    className="fixed inset-0 z-10" 
                                                                                    onClick={() => setOpenPaymentDropdown(null)}
                                                                                />
                                                                                
                                                                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl max-h-60 overflow-auto">
                                                                                    {getPaymentMethodOptions(true).map((option) => (
                                                                                        <button
                                                                                            key={option.id}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                handlePaymentChange(payment.id, 'method', option.id as string);
                                                                                                setOpenPaymentDropdown(null);
                                                                                            }}
                                                                                            className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${
                                                                                                payment.method === option.id
                                                                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                                                                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                                            }`}
                                                                                        >
                                                                                            <div 
                                                                                                className="w-2.5 h-2.5 rounded-full" 
                                                                                                style={{ backgroundColor: option.color }}
                                                                                            />
                                                                                            <span>{option.label}</span>
                                                                                            {payment.method === option.id && (
                                                                                                <Icon name="check" className="text-base ml-auto" />
                                                                                            )}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </>
                                                                        )}
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
                                                                                className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-3 text-xs font-semibold text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                                                <div className="flex justify-end pt-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemovePayment(payment.id)} 
                                                                        className="flex items-center gap-1 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors text-xs"
                                                    >
                                                                        <Icon name="delete" className="text-sm" />
                                                        <span>Remover</span>
                                                    </button>
                                                                </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                                {/* Botão Adicionar Forma de Pagamento */}
                                                {payments.length < 2 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={handleAddPayment}
                                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors text-sm font-medium"
                                                    >
                                                        <Icon name="add" className="text-lg" />
                                                        <span>Adicionar Forma de Pagamento</span>
                                                    </button>
                                                )}
                                </div>
                                )}

                                {/* Campos de Fiado */}
                                {isCreditSale && settings.creditSalesEnabled && (
                                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-4 border border-primary/30 space-y-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon name="credit_card" className="text-primary text-lg" />
                                            <h4 className="font-bold text-gray-900 dark:text-white">Informações do Fiado</h4>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Mostrar cliente selecionado */}
                                            {(clientName || selectedClient) ? (
                                                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
                                                    <div className="flex items-center justify-center size-8 rounded-lg bg-green-100 dark:bg-green-900/30">
                                                        <Icon name="person" className="text-green-600 dark:text-green-400 text-lg" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{clientName}</p>
                                            </div>
                                                </div>
                                            ) : (
                                                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800/30">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex items-center justify-center size-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 shrink-0">
                                                            <Icon name="warning" className="text-yellow-600 dark:text-yellow-400 text-xl" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">Cliente obrigatório</p>
                                                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                                                Selecione um cliente no campo de busca acima para continuar com a venda no fiado
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-900 dark:text-white block">
                                                        Número de Parcelas *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="24"
                                                        value={installmentsInputValue}
                                                        onChange={(e) => {
                                                            const inputValue = e.target.value;
                                                            // Permite edição livre (incluindo campo vazio)
                                                            setInstallmentsInputValue(inputValue);
                                                            
                                                            // Atualiza o valor numérico se válido
                                                            if (inputValue !== '' && inputValue !== '-') {
                                                                const numValue = parseInt(inputValue);
                                                                if (!isNaN(numValue) && numValue > 0) {
                                                                    const clampedValue = Math.min(24, Math.max(1, numValue));
                                                                    setNumberOfInstallments(clampedValue);
                                                                    // Sincroniza o input se foi ajustado
                                                                    if (clampedValue !== numValue) {
                                                                        setInstallmentsInputValue(String(clampedValue));
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            // Valida e corrige quando sai do campo
                                                            const inputValue = e.target.value.trim();
                                                            if (inputValue === '' || isNaN(parseInt(inputValue)) || parseInt(inputValue) < 1) {
                                                                setInstallmentsInputValue('1');
                                                                setNumberOfInstallments(1);
                                                            } else {
                                                                const numValue = parseInt(inputValue);
                                                                const clampedValue = Math.min(24, Math.max(1, numValue));
                                                                setInstallmentsInputValue(String(clampedValue));
                                                                setNumberOfInstallments(clampedValue);
                                                            }
                                                        }}
                                                        className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                        required
                                                    />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Valor por parcela: R$ {(totalValue / numberOfInstallments).toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-900 dark:text-white block">
                                                        Primeiro Vencimento *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={firstDueDate}
                                                        onChange={(e) => setFirstDueDate(e.target.value)}
                                                        min={getTodayLocalDate()}
                                                        className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-gray-900/30 rounded-lg p-3 mt-2">
                                                <div className="flex justify-between items-center text-sm mb-1">
                                                    <span className="text-gray-600 dark:text-gray-400">Total a Parcelar:</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">R$ {totalValue.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Parcelas de:</span>
                                                    <span className="font-semibold text-primary">R$ {(totalValue / numberOfInstallments).toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                                    {/* Botão Finalizar Venda */}
                                <button 
                                    type="submit"
                                        disabled={isSubmitting || (!isCreditSale && payments.some(p => !p.method)) || (isCreditSale && !clientName.trim())}
                                        className="w-full px-6 h-11 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                                <span>{isEditing ? 'Salvando...' : 'Processando...'}</span>
                                        </>
                                    ) : (
                                        <>
                                                <Icon name="check_circle" className="text-lg" />
                                            <span>{isEditing ? 'Salvar Alterações' : 'Confirmar Venda'}</span>
                                        </>
                                    )}
                                </button>
                                </div>
                        )}
                        </div>
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

            {/* Payment Method Bottom Sheets */}
            {payments.map((payment) => (
                <BottomSheet
                    key={`payment-method-${payment.id}`}
                    isOpen={openPaymentMethodSheet === payment.id}
                    onClose={() => setOpenPaymentMethodSheet(null)}
                    title="Selecione o método de pagamento"
                    options={getPaymentMethodOptions(true)}
                    selectedValue={payment.method || ''}
                    onSelect={(value) => {
                        handlePaymentChange(payment.id, 'method', value as string);
                        setOpenPaymentMethodSheet(null);
                    }}
                />
            ))}
        </div>
    );
};

