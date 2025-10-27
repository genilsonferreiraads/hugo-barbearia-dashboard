import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useAppointments } from '../contexts.tsx';
import { AppointmentReceipt } from './AppointmentReceipt.tsx';

export const AppointmentReceiptPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { appointments } = useAppointments();

    const appointmentId = searchParams.get('id');
    const appointment = appointments.find(apt => apt.id.toString() === appointmentId);

    if (!appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Agendamento não encontrado</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/80 transition-colors"
                    >
                        ← Voltar
                    </button>
                </div>
            </div>
        );
    }

    const handleShareWhatsApp = async () => {
        if (!receiptRef.current) return;

        try {
            setIsGenerating(true);

            // Convert receipt to image
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#000000',
                scale: 3,
                logging: false,
                allowTaint: true,
                useCORS: true,
                quality: 1,
            });

            // Get client info
            const clientNameOnly = appointment.clientName.split('|')[0];

            // Convert canvas to blob for sharing
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem');
                    setIsGenerating(false);
                    return;
                }

                try {
                    const file = new File([blob], `comprovante-${clientNameOnly}.png`, { type: 'image/png' });
                    
                    // Use native share
                    await navigator.share({
                        files: [file],
                        title: 'Comprovante de Agendamento',
                        text: `Agendamento confirmado! 📅 ${appointment.date} - ⏰ ${appointment.time}`
                    });

                    setIsGenerating(false);
                    onClose();
                } catch (error: any) {
                    // User canceled - just close
                    if (error.name === 'AbortError') {
                        setIsGenerating(false);
                    } else {
                        console.error('Erro ao compartilhar:', error);
                        alert('Não foi possível compartilhar. Tente novamente.');
                        setIsGenerating(false);
                    }
                }
            }, 'image/png');
        } catch (error) {
            console.error('Erro ao gerar comprovante:', error);
            alert('Erro ao gerar comprovante');
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Agendamento Confirmado ✅</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Seu comprovante está pronto para compartilhar</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                        title="Voltar"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-12">
                <div className="max-w-2xl w-full space-y-8">
                    {/* Receipt Preview */}
                    <div className="flex justify-center">
                        <div ref={receiptRef} className="drop-shadow-2xl">
                            <AppointmentReceipt appointment={appointment} />
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>← Voltar para Agendamentos</span>
                        </button>
                        <button
                            onClick={handleShareWhatsApp}
                            disabled={isGenerating}
                            className="px-6 py-4 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-green-600 text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                    <span>Gerando Comprovante...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-brands fa-whatsapp text-lg"></i>
                                    <span>Compartilhar no WhatsApp</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <span className="text-2xl">📱</span>
                            <p className="font-semibold text-gray-900 dark:text-white">Como Funciona?</p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Ao clicar em "Compartilhar no WhatsApp", o comprovante será baixado automaticamente e o WhatsApp será aberto com uma mensagem pré-preenchida. Você pode então compartilhar a imagem com o cliente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
