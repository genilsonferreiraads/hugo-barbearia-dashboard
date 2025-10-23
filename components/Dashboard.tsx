import React, { useState, useCallback, useMemo } from 'react';
import { Appointment, AppointmentStatus, Transaction, PaymentMethod } from '../types.ts';
import { generateDailySummary } from '../services/geminiService.ts';
import { NewAppointmentModal } from './NewAppointmentModal.tsx';
import { useAppointments, useTransactions } from '../contexts.tsx';
import { FinalizeAppointmentModal } from './FinalizeAppointmentModal.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined text-2xl text-zinc-500 dark:text-zinc-400">{name}</span>;

interface AppointmentCardProps {
    appointment: Appointment;
    onClick: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onClick }) => {
    const statusStyles: { [key in AppointmentStatus]: string } = {
        [AppointmentStatus.Confirmed]: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300",
        [AppointmentStatus.Arrived]: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300",
        [AppointmentStatus.Attended]: "bg-zinc-200 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-300",
    };
    
    const isAttended = appointment.status === AppointmentStatus.Attended;

    return (
        <button
            onClick={onClick}
            disabled={isAttended}
            className={`flex items-center gap-4 p-4 w-full text-left transition-colors ${isAttended ? 'opacity-60 cursor-not-allowed' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
        >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#392c28]">
                <Icon name="schedule" />
            </div>
            <div className="flex-1">
                <p className="text-zinc-900 dark:text-white font-medium">{appointment.time} - {appointment.clientName}</p>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{appointment.service}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>{appointment.status}</span>
        </button>
    );
};

const StatCard = ({ icon, value, label }: { icon: string; value: string; label: string; }) => (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15] p-5">
        <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#392c28]">
                <span className="material-symbols-outlined text-2xl text-zinc-500 dark:text-zinc-400">{icon}</span>
            </div>
            <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
            </div>
        </div>
    </div>
);

export const DashboardPage: React.FC = () => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    
    const { appointments, addAppointment, updateAppointmentStatus } = useAppointments();
    const { transactions, addTransaction } = useTransactions();

    const todayStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTransactions = transactions.filter(tx => tx.date === todayStr);

        const totalRevenue = todayTransactions.reduce((acc, tx) => acc + tx.value, 0);
        const servicesCompleted = todayTransactions.length;
        const averageTicket = servicesCompleted > 0 ? totalRevenue / servicesCompleted : 0;
        
        return { totalRevenue, servicesCompleted, averageTicket };
    }, [transactions]);
    
    const sortedTodayAppointments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const statusOrder: { [key in AppointmentStatus]: number } = {
            [AppointmentStatus.Arrived]: 1,
            [AppointmentStatus.Confirmed]: 2,
            [AppointmentStatus.Attended]: 3,
        };

        return appointments
            .filter(app => app.date === today)
            .sort((a, b) => {
                const orderA = statusOrder[a.status];
                const orderB = statusOrder[b.status];
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return a.time.localeCompare(b.time);
            });
    }, [appointments]);


    const handleGenerateSummary = useCallback(async () => {
        setIsLoading(true);
        setSummary('');
        const result = await generateDailySummary(todayStats);
        setSummary(result);
        setIsLoading(false);
    }, [todayStats]);

    const handleSaveAppointment = async (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
        await addAppointment(appointment);
    };

    const handleOpenFinalizeModal = (appointment: Appointment) => {
        if (appointment.status === AppointmentStatus.Attended) return;
        setSelectedAppointment(appointment);
        setIsFinalizeModalOpen(true);
    };

    const handleFinalizeAppointment = async (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => {
        if (!selectedAppointment) return;

        await Promise.all([
             addTransaction({
                ...transactionData,
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            }),
            updateAppointmentStatus(selectedAppointment.id, AppointmentStatus.Attended)
        ]);

        setIsFinalizeModalOpen(false);
        setSelectedAppointment(null);
    };

    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-3xl sm:text-4xl font-black tracking-[-0.033em]">Olá, Hugo!</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-base font-normal">Aqui está um resumo do seu dia.</p>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#392c28]/40 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                        <span>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                    </div>
                    <button 
                        onClick={() => setIsNewAppointmentModalOpen(true)}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] transition-transform active:scale-95">
                        <span className="material-symbols-outlined text-base">add</span>
                        <span className="truncate hidden sm:inline">Novo Agendamento</span>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
                <div className="flex flex-col gap-4 lg:col-span-1">
                    <h2 className="text-zinc-900 dark:text-white text-xl font-bold tracking-[-0.015em]">Agendamentos de Hoje</h2>
                    <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15]">
                        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                            {sortedTodayAppointments.length > 0 ? (
                                sortedTodayAppointments
                                    .map(app => <AppointmentCard key={app.id} appointment={app} onClick={() => handleOpenFinalizeModal(app)} />)
                            ) : (
                                <p className="p-4 text-center text-zinc-500 dark:text-zinc-400">Nenhum agendamento para hoje.</p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-4">
                    <h2 className="text-zinc-900 dark:text-white text-xl font-bold tracking-[-0.015em]">Seu Desempenho Hoje</h2>
                    <div className="rounded-xl border border-primary/30 bg-primary/10 dark:border-primary/50 dark:bg-[#392c28] p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium text-primary dark:text-primary">Total Recebido no Dia</p>
                                <p className="text-4xl font-black text-zinc-900 dark:text-white">R$ {todayStats.totalRevenue.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <span className="material-symbols-outlined text-4xl text-primary">payments</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                       <StatCard icon="check_circle" value={todayStats.servicesCompleted.toString()} label="Serviços Finalizados" />
                       <StatCard icon="receipt_long" value={`R$ ${todayStats.averageTicket.toFixed(2).replace('.', ',')}`} label="Ticket Médio" />
                    </div>
                </div>
            </div>
            
            <div className="mt-8">
                 <h2 className="text-zinc-900 dark:text-white text-xl font-bold tracking-[-0.015em] mb-4">Resumo do Dia com IA</h2>
                 <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15] p-6">
                     <button 
                        onClick={handleGenerateSummary}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
                    >
                        {isLoading ? (
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        ) : (
                           <span className="material-symbols-outlined text-lg">auto_awesome</span>
                        )}
                         <span>{isLoading ? 'Gerando...' : 'Gerar Resumo com IA'}</span>
                     </button>
                     {summary && (
                        <div className="mt-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                            <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{summary}</p>
                        </div>
                     )}
                 </div>
            </div>
             <NewAppointmentModal 
                isOpen={isNewAppointmentModalOpen} 
                onClose={() => setIsNewAppointmentModalOpen(false)} 
                onSave={handleSaveAppointment}
            />
            {selectedAppointment && (
                <FinalizeAppointmentModal
                    isOpen={isFinalizeModalOpen}
                    onClose={() => setIsFinalizeModalOpen(false)}
                    onFinalize={handleFinalizeAppointment}
                    appointment={selectedAppointment}
                />
            )}
        </div>
    );
};
