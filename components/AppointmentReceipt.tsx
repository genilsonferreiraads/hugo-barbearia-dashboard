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
            className="w-full max-w-sm mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800"
            style={{ aspectRatio: '9/16' }}
        >
            {/* Top Section - Logo Area */}
            <div className="bg-black p-8 flex flex-col items-center justify-center border-b border-zinc-800">
                <img 
                    src="/imagens/logo-barbearia.JPG"
                    alt="Hugo Barbearia Logo"
                    className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 shadow-lg mb-6"
                />
                <h1 className="text-white text-2xl font-black tracking-tight">HUGO</h1>
                <p className="text-zinc-400 text-xs font-semibold tracking-widest mt-1">BARBEARIA</p>
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-zinc-600 to-transparent mt-4"></div>
            </div>

            {/* Confirmation Badge */}
            <div className="px-6 pt-6 flex items-center justify-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex-shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
                <p className="text-green-400 font-semibold text-sm">CONFIRMADO</p>
            </div>

            {/* Content Section */}
            <div className="px-6 py-8 space-y-8 text-white">
                {/* Client Name */}
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Cliente</p>
                    <p className="text-xl font-black text-white">{appointment.clientName.split('|')[0]}</p>
                </div>

                {/* Service */}
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Serviço</p>
                    <p className="text-sm font-semibold text-zinc-300">{appointment.service || 'Agendamento Padrão'}</p>
                </div>

                {/* Date and Time */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Data</p>
                        <p className="text-sm font-bold text-zinc-100">{formatDate(appointment.date)}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Horário</p>
                        <p className="text-2xl font-black text-white">{formatTime(appointment.time)}</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>

                {/* Status Box */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-semibold">Status</p>
                    <p className="text-lg font-black text-zinc-200">✓ AGENDAMENTO CONFIRMADO</p>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-zinc-800 bg-black text-center">
                <p className="text-xs text-zinc-600 leading-relaxed">
                    Apresente este comprovante<br />na sua chegada
                </p>
                <p className="text-xs text-zinc-700 mt-3">© 2024 HUGO BARBEARIA</p>
            </div>
        </div>
    );
};
