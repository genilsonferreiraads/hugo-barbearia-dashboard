import React from 'react';
import { Appointment } from '../types.ts';

interface AppointmentReceiptProps {
    appointment: Appointment;
    clientPhone?: string;
}

const formatDate = (dateStr: string): string => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        weekday: 'long'
    }).toUpperCase();
};

const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
};

export const AppointmentReceipt: React.FC<AppointmentReceiptProps> = ({ appointment }) => {
    return (
        <div 
            id="appointment-receipt"
            className="w-full max-w-sm mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200"
            style={{ aspectRatio: '9/16' }}
        >
            {/* Top Section - Logo Area */}
            <div className="bg-white px-6 py-3 flex items-center justify-start gap-4 border-b border-gray-200">
                <img 
                    src="/imagens/logo-barbearia.JPG"
                    alt="Hugo Barbearia Logo"
                    className="w-20 h-20 rounded-full object-cover border-3 border-gray-300 shadow-lg flex-shrink-0"
                />
                <div className="flex flex-col items-start justify-center">
                    <h1 className="text-gray-900 text-lg font-black tracking-tight leading-none">HUGO</h1>
                    <p className="text-gray-600 text-xs font-semibold tracking-widest mt-0.5">BARBEARIA</p>
                    <div className="w-12 h-0.5 bg-gray-400 mt-2"></div>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 py-3 space-y-3 text-gray-900">
                {/* Client Name */}
                <div className="space-y-0.5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Cliente</p>
                    <p className="text-lg font-black text-gray-900">{appointment.clientName.split('|')[0]}</p>
                </div>

                {/* Service */}
                <div className="space-y-0.5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Serviço</p>
                    <p className="text-xs font-semibold text-gray-700">{appointment.service || 'Agendamento Padrão'}</p>
                </div>

                {/* Date and Time */}
                <div className="space-y-2">
                    <div className="space-y-0.5">
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Data</p>
                        <p className="text-xs font-bold text-gray-800">{formatDate(appointment.date)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Horário</p>
                        <p className="text-lg font-black text-gray-900">{formatTime(appointment.time)}</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-300 my-2"></div>

                {/* Status Box */}
                <div className="bg-gray-50 border-2 border-green-600 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-600 uppercase tracking-widest mb-0.5 font-semibold">Status</p>
                    <p className="text-sm font-black text-green-700">✓ CONFIRMADO</p>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-white text-center">
                <p className="text-xs text-gray-700 font-semibold leading-tight">
                    Agradecemos sua confiança
                </p>
                <p className="text-xs text-gray-600 mt-1.5">
                    Até em breve!
                </p>
            </div>
        </div>
    );
};
