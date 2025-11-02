import React, { useRef } from 'react';
import html2canvas from 'html2canvas';

interface PaymentReceiptProps {
    clientName: string;
    installmentNumber: number;
    totalInstallments: number;
    amount: number;
    paidDate: string;
    paymentMethod: string;
    products: string;
    onClose: () => void;
}

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
    clientName,
    installmentNumber,
    totalInstallments,
    amount,
    paidDate,
    paymentMethod,
    products,
    onClose
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = React.useState(false);

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

    const shareReceipt = async () => {
        if (!receiptRef.current) return;

        try {
            setIsSharing(true);

            // Gerar imagem do comprovante
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });

            // Converter canvas para blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Erro ao gerar comprovante');
                    setIsSharing(false);
                    return;
                }

                const file = new File([blob], 'comprovante-fiado.png', { type: 'image/png' });

                // Tentar usar Web Share API (funciona no mobile)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Comprovante de Pagamento',
                            text: `Comprovante de pagamento - Parcela ${installmentNumber}/${totalInstallments} - ${clientName}`
                        });
                    } catch (error: any) {
                        if (error.name !== 'AbortError') {
                            // Se cancelar, não mostra erro
                            console.error('Erro ao compartilhar:', error);
                            fallbackShare(blob);
                        }
                    }
                } else {
                    // Fallback: download da imagem
                    fallbackShare(blob);
                }

                setIsSharing(false);
            }, 'image/png');

        } catch (error) {
            console.error('Erro ao gerar comprovante:', error);
            alert('Erro ao gerar comprovante');
            setIsSharing(false);
        }
    };

    const fallbackShare = (blob: Blob) => {
        // Download da imagem como fallback
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprovante-fiado-${clientName.replace(/\s+/g, '-')}-parcela-${installmentNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Comprovante salvo! Você pode compartilhá-lo através de seus arquivos.');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header do Modal */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon name="receipt_long" className="text-2xl text-primary" />
                        Comprovante
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Icon name="close" className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Comprovante */}
                <div className="p-6">
                    <div 
                        ref={receiptRef} 
                        className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 space-y-4"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                        {/* Logo/Header */}
                        <div className="flex items-center gap-4 border-b-2 border-gray-300 pb-4">
                            <img 
                                src="/imagens/logo-barbearia.JPG"
                                alt="Hugo Barbearia Logo"
                                className="w-20 h-20 rounded-full object-cover border-3 border-gray-300 shadow-lg flex-shrink-0"
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
                                <p className="text-lg font-bold text-gray-900">{clientName}</p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Produtos/Serviços</p>
                                <p className="text-sm text-gray-900 font-medium">{products}</p>
                            </div>
                        </div>

                        {/* Detalhes do Pagamento */}
                        <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Parcela:</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {installmentNumber} de {totalInstallments}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Data do Pagamento:</span>
                                <span className="text-sm font-bold text-gray-900">{formatDate(paidDate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Forma de Pagamento:</span>
                                <span className="text-sm font-bold text-gray-900">{paymentMethod}</span>
                            </div>
                        </div>

                        {/* Valor Total */}
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg p-4 text-center">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                                Valor Pago
                            </p>
                            <p className="text-3xl font-black text-green-900">{formatCurrency(amount)}</p>
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

                {/* Botões de Ação */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 space-y-2 rounded-b-xl">
                    <button
                        onClick={shareReceipt}
                        disabled={isSharing}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSharing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Icon name="share" className="text-xl" />
                                Compartilhar Comprovante
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

