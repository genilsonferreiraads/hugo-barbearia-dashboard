import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useTransactions, useCreditSales } from '../contexts.tsx';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

export const PaymentReceiptPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { transactions } = useTransactions();
    const { creditSales, installments } = useCreditSales();

    const transactionId = searchParams.get('id');
    const installmentId = searchParams.get('installmentId');
    const saleId = searchParams.get('saleId');
    
    const { fetchCreditSales } = useCreditSales();

    // Carregar dados de fiado se necessário
    useEffect(() => {
        if ((installmentId || saleId) && creditSales.length === 0) {
            fetchCreditSales();
        }
    }, [installmentId, saleId, creditSales.length, fetchCreditSales]);

    const transaction = transactionId ? transactions.find(t => t.id.toString() === transactionId) : null;
    const installment = installmentId ? installments.find(i => i.id.toString() === installmentId) : null;
    const sale = saleId ? creditSales.find(s => s.id.toString() === saleId) : null;

    // Se não tem transação mas tem parcela e venda, usar dados da parcela
    const useInstallmentData = !transaction && installment && sale;

    // Se está usando dados da parcela (não tem transação)
    if (useInstallmentData) {
        // Usar dados diretamente da parcela e venda
        const receiptData = {
            clientName: sale.clientName,
            installmentNumber: installment.installmentNumber,
            totalInstallments: sale.numberOfInstallments,
            amount: installment.amount,
            paidDate: installment.paidDate || installment.dueDate,
            paymentMethod: installment.paymentMethod || 'Não informado',
            products: sale.products
        };
        // Renderizar comprovante com dados da parcela
        return <ReceiptContent data={receiptData} navigate={navigate} receiptRef={receiptRef} isGenerating={isGenerating} setIsGenerating={setIsGenerating} />;
    }

    // Se não tem transação nem parcela, mostrar erro
    if (!transaction) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icon name="error" className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Comprovante não encontrado</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                    >
                        ← Voltar
                    </button>
                </div>
            </div>
        );
    }

    // Verificar se é pagamento de fiado (pode ter formato antigo ou novo)
    const isOldFormat = transaction.category === 'vendas' && !transaction.service.includes('Fiado -');
    const isNewFormat = transaction.service.includes('Fiado -');
    
    if (!isOldFormat && !isNewFormat) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icon name="error" className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Este não é um pagamento de fiado</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                    >
                        ← Voltar
                    </button>
                </div>
            </div>
        );
    }

    // Extrair informações da transação
    let clientName = 'Cliente';
    let installmentNumber = 1;
    let totalInstallments = 1;

    if (isNewFormat) {
        // Formato novo: "Fiado - Cliente - Parcela X/Y"
        const serviceParts = transaction.service.split(' - ');
        clientName = serviceParts[1] || 'Cliente';
        const parcelaPart = serviceParts[2] || 'Parcela 1/1';
        const parcelaMatch = parcelaPart.match(/Parcela (\d+)\/(\d+)/);
        installmentNumber = parcelaMatch ? parseInt(parcelaMatch[1]) : 1;
        totalInstallments = parcelaMatch ? parseInt(parcelaMatch[2]) : 1;
    } else {
        // Formato antigo: tentar extrair do clientName ou usar informações disponíveis
        clientName = transaction.clientName || 'Cliente';
        // Para pagamentos antigos, mostrar como parcela única
        installmentNumber = 1;
        totalInstallments = 1;
    }

    const receiptData = {
        clientName,
        installmentNumber,
        totalInstallments,
        amount: transaction.value,
        paidDate: transaction.date,
        paymentMethod: transaction.paymentMethod,
        products: 'Produtos do Fiado' // Não temos essa info na transação antiga
    };

    return <ReceiptContent data={receiptData} navigate={navigate} receiptRef={receiptRef} isGenerating={isGenerating} setIsGenerating={setIsGenerating} />;
};

// Componente separado para o conteúdo do comprovante
const ReceiptContent: React.FC<{
    data: {
        clientName: string;
        installmentNumber: number;
        totalInstallments: number;
        amount: number;
        paidDate: string;
        paymentMethod: string;
        products: string;
    };
    navigate: (path: string) => void;
    receiptRef: React.RefObject<HTMLDivElement>;
    isGenerating: boolean;
    setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ data, navigate, receiptRef, isGenerating, setIsGenerating }) => {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const formatCurrency = (value: number): string => {
        const fixedValue = value.toFixed(2);
        const [integerPart, decimalPart] = fixedValue.split('.');
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${formattedInteger},${decimalPart}`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const handleShare = async () => {
        if (!receiptRef.current) {
            setToast({ message: 'Comprovante não encontrado', type: 'error' });
            return;
        }

        try {
            setIsGenerating(true);

            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setToast({ message: 'Erro ao gerar imagem do comprovante', type: 'error' });
                    setIsGenerating(false);
                    return;
                }

                const file = new File([blob], `comprovante-fiado-${data.clientName.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Comprovante de Pagamento',
                            text: `Comprovante de pagamento - Parcela ${data.installmentNumber}/${data.totalInstallments} - ${data.clientName}`
                        });
                        setIsGenerating(false);
                    } catch (error: any) {
                        if (error.name !== 'AbortError') {
                            console.error('Erro ao compartilhar:', error);
                            fallbackDownload(blob);
                        }
                        setIsGenerating(false);
                    }
                } else {
                    fallbackDownload(blob);
                    setIsGenerating(false);
                }
            }, 'image/png');

        } catch (error) {
            setToast({ 
                message: `Erro ao gerar comprovante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 
                type: 'error' 
            });
            setIsGenerating(false);
        }
    };

    const fallbackDownload = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprovante-fiado-${data.clientName.replace(/\s+/g, '-')}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 500);
        
        setToast({ 
            message: 'Comprovante salvo! Você pode compartilhá-lo através de seus arquivos.', 
            type: 'success' 
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-8">
                <div className="max-w-2xl w-full space-y-6">
                    {/* Payment Details Card */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-zinc-700 rounded-lg p-6 shadow-md">
                        {/* Action Buttons at Top */}
                        <div className="flex items-center justify-end gap-2 mb-6">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-sm"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg text-sm"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                        <span>Gerando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="share" className="text-base" />
                                        <span>Compartilhar</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-200 dark:bg-zinc-700 mb-6"></div>

                        {/* Success Icon and Title */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <Icon name="check_circle" className="text-2xl text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pagamento Confirmado</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Seu comprovante está pronto para ser compartilhado</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-200 dark:bg-zinc-700 mb-6"></div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.clientName}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Parcela</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.installmentNumber} de {data.totalInstallments}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Data do Pagamento</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatDate(data.paidDate)}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Forma de Pagamento</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.paymentMethod}</p>
                            </div>
                            <div className="flex flex-col sm:col-span-2">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Valor Pago</p>
                                <p className="text-3xl font-black text-green-600 dark:text-green-400">{formatCurrency(data.amount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Preview (hidden) */}
                    <div ref={receiptRef} className="absolute left-[-9999px] top-[-9999px]">
                        <div 
                            className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 space-y-4 w-[400px]"
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        >
                            {/* Logo/Header */}
                            <div className="flex items-center gap-4 border-b-2 border-gray-300 pb-4">
                                <img 
                                    src="/imagens/logo-barbearia.JPG"
                                    alt="Hugo Barbearia Logo"
                                    className="w-20 h-20 rounded-full object-cover border-3 border-gray-300 shadow-lg flex-shrink-0"
                                    crossOrigin="anonymous"
                                />
                                <div className="flex flex-col items-start justify-center">
                                    <h1 className="text-gray-900 text-2xl font-black tracking-tight leading-none">HUGO</h1>
                                    <p className="text-gray-600 text-xs font-semibold tracking-widest mt-0.5">BARBEARIA</p>
                                    <div className="w-16 h-0.5 bg-gray-400 mt-2"></div>
                                </div>
                            </div>
                            
                            {/* Título do Comprovante */}
                            <div className="text-center py-2">
                                <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Comprovante de Pagamento</p>
                            </div>

                            {/* Status Check */}
                            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-2xl text-green-600">check_circle</span>
                                <span className="text-green-800 font-bold text-lg">PAGAMENTO CONFIRMADO</span>
                            </div>

                            {/* Informações do Cliente */}
                            <div className="space-y-3">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
                                    <p className="text-lg font-bold text-gray-900">{data.clientName}</p>
                                </div>
                            </div>

                            {/* Detalhes do Pagamento */}
                            <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Parcela:</span>
                                    <span className="text-sm font-bold text-gray-900">
                                        {data.installmentNumber} de {data.totalInstallments}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Data do Pagamento:</span>
                                    <span className="text-sm font-bold text-gray-900">{formatDate(data.paidDate)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Forma de Pagamento:</span>
                                    <span className="text-sm font-bold text-gray-900">{data.paymentMethod}</span>
                                </div>
                            </div>

                            {/* Valor Total */}
                            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg p-4 text-center">
                                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                                    Valor Pago
                                </p>
                                <p className="text-3xl font-black text-green-900">{formatCurrency(data.amount)}</p>
                            </div>

                            {/* Footer */}
                            <div className="border-t-2 border-dashed border-gray-300 pt-4 text-center">
                                <p className="text-xs text-gray-500">
                                    Emitido em {new Date().toLocaleDateString('pt-BR', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    ✓ Pagamento registrado no sistema
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type}
                    duration={4000}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

