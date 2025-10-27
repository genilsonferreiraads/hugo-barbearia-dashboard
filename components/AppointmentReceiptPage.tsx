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
        if (!receiptRef.current) {
            alert('Comprovante não encontrado');
            return;
        }

        try {
            setIsGenerating(true);

            // Convert receipt to image directly without cloning
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#000000',
                scale: 2,
                logging: false,
                allowTaint: true,
                useCORS: true,
                proxy: null,
                foreignObjectRendering: false,
            });

            // Get client info
            const clientNameOnly = appointment.clientName.split('|')[0];

            // Convert canvas to blob directly
            canvas.toBlob((blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem: blob nulo');
                    setIsGenerating(false);
                    return;
                }

                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `comprovante-${clientNameOnly}.png`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up after a short delay
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    setIsGenerating(false);
                }, 500);
            }, 'image/png');

        } catch (error) {
            alert(`Erro ao gerar comprovante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            setIsGenerating(false);
        }
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            weekday: 'long'
        });
    };

    const formatTime = (timeStr: string): string => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        let period = 'Noite';
        if (hour >= 5 && hour < 12) period = 'Manhã';
        else if (hour >= 12 && hour < 18) period = 'Tarde';
        return `${hours}:${minutes} da ${period}`;
    };

    const clientNameOnly = appointment.clientName.split('|')[0];

    const handleSendWhatsApp = () => {
        // Extract WhatsApp number from clientName format: "Name|PhoneNumber"
        let whatsappNumber = appointment.clientName.split('|')[1] || '';
        
        if (!whatsappNumber) {
            alert('Número de WhatsApp não disponível');
            return;
        }
        
        // Remove all non-numeric characters
        whatsappNumber = whatsappNumber.replace(/\D/g, '');
        
        // Ensure it has country code (55 for Brazil)
        if (whatsappNumber.length === 11) {
            whatsappNumber = '55' + whatsappNumber;
        } else if (whatsappNumber.length === 10) {
            whatsappNumber = '55' + whatsappNumber;
        }
        
        if (!whatsappNumber || whatsappNumber.length < 12) {
            alert('Número de WhatsApp inválido');
            return;
        }

        const message = `🎯 *AGENDAMENTO CONFIRMADO* ✅\n\n📱 Hugo Barbearia\n\n👤 *Cliente:* ${clientNameOnly}\n📅 *Data:* ${formatDate(appointment.date)}\n⏰ *Horário:* ${formatTime(appointment.time)}\n💇 *Serviço:* ${appointment.service || 'Padrão'}\n\nObrigado por agendar conosco! 🙏`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-8">
                <div className="max-w-2xl w-full space-y-6">
                    {/* Appointment Details */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-zinc-700 rounded-lg p-6 shadow-md">
                        {/* Action Buttons at Top */}
                        <div className="flex items-center justify-end gap-2 mb-6">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-sm"
                            >
                                Sair
                            </button>
                            <button
                                onClick={handleShareWhatsApp}
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
                                        <i className="fa-solid fa-download text-sm"></i>
                                        <span>Baixar</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleSendWhatsApp}
                                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                            >
                                <i className="fa-brands fa-whatsapp text-sm"></i>
                                <span>WhatsApp</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-200 dark:bg-zinc-700 mb-6"></div>

                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agendamento Confirmado</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Seu comprovante está pronto para ser baixado</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-200 dark:bg-zinc-700 mb-6"></div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{clientNameOnly}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Data</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{formatDate(appointment.date)}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Horário</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatTime(appointment.time)}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Serviço</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{appointment.service || 'Padrão'}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">Confirmado</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Preview (hidden) */}
                    <div ref={receiptRef} className="absolute left-[-9999px] top-[-9999px]">
                        <AppointmentReceipt appointment={appointment} />
                    </div>
                </div>
            </div>
        </div>
    );
};
