import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Appointment } from '../types.ts';
import { AppointmentReceipt } from './AppointmentReceipt.tsx';
import { useAppointments } from '../contexts.tsx';

interface AppointmentReceiptModalProps {
    appointmentId: string;
    onClose: () => void;
}

export const AppointmentReceiptModal: React.FC<AppointmentReceiptModalProps> = ({ appointmentId, onClose }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { appointments } = useAppointments();

    const appointment = appointments.find(apt => apt.id.toString() === appointmentId);

    if (!appointment) return null;

    const handleShareWhatsApp = async () => {
        if (!receiptRef.current) return;

        try {
            setIsGenerating(true);

            // Convert receipt to image
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#000',
                scale: 2,
                logging: false,
            });

            // Download the image
            canvas.toBlob((blob) => {
                if (!blob) return;

                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `comprovante-agendamento-${new Date().getTime()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // Open WhatsApp with message
                const clientPhone = appointment.clientName.includes('|') 
                    ? appointment.clientName.split('|')[1].replace(/\D/g, '') 
                    : '';

                if (clientPhone) {
                    const message = `Olá! 👋\n\nSeu agendamento foi confirmado! ✅\n\n📅 Data: ${appointment.date}\n⏰ Horário: ${appointment.time}\n\nA imagem do comprovante foi salva. Compartilhe-a no chat quando abrir o WhatsApp! 📸`;
                    const whatsappUrl = `https://wa.me/55${clientPhone}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                }

                setTimeout(() => {
                    setIsGenerating(false);
                    onClose();
                }, 500);
            }, 'image/png');
        } catch (error) {
            console.error('Erro ao gerar comprovante:', error);
            alert('Erro ao gerar comprovante');
            setIsGenerating(false);
        }
    };

    if (!appointment) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-primary to-red-700 px-6 py-6 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black">Agendamento Confirmado! 🎉</h2>
                        <p className="text-red-100 text-sm mt-1">Compartilhe o comprovante com o cliente</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Receipt Preview */}
                <div className="p-6 flex justify-center bg-gray-50 dark:bg-gray-800">
                    <div ref={receiptRef}>
                        <AppointmentReceipt appointment={appointment} />
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-6 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleShareWhatsApp}
                        disabled={isGenerating}
                        className="px-6 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <i className="fa-brands fa-whatsapp"></i>
                                Compartilhar no WhatsApp
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
