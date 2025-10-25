import React, { useState, useMemo } from 'react';
import { NewAppointmentModal } from './NewAppointmentModal.tsx';
import { FinalizeAppointmentModal } from './FinalizeAppointmentModal.tsx';
import { useAppointments, useTransactions } from '../contexts.tsx';
import { Appointment, AppointmentStatus, Transaction } from '../types.ts';

// --- Date Helper Functions ---
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const areDatesEqual = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

// Helper function to get status color
const getStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
        case AppointmentStatus.Confirmed:
            return 'bg-blue-500 hover:bg-blue-600';
        case AppointmentStatus.Arrived:
            return 'bg-yellow-500 hover:bg-yellow-600';
        case AppointmentStatus.Attended:
            return 'bg-green-500 hover:bg-green-600';
        default:
            return 'bg-gray-500 hover:bg-gray-600';
    }
};

// Helper function to get status icon
const getStatusIcon = (status: AppointmentStatus): string => {
    switch (status) {
        case AppointmentStatus.Confirmed:
            return 'schedule';
        case AppointmentStatus.Arrived:
            return 'person';
        case AppointmentStatus.Attended:
            return 'check_circle';
        default:
            return 'help';
    }
};

// Helper function to extract client name from clientName field
// Supports both old format: "Name (number)" and new format: "Name|number" or just "Name"
const extractClientName = (clientName: string): string => {
    // Check if it's the new format with pipe separator
    if (clientName.includes('|')) {
        return clientName.split('|')[0];
    }
    // Check if it's the old format with parentheses
    if (clientName.includes('(')) {
        return clientName.split('(')[0].trim();
    }
    // Otherwise, return as is
    return clientName;
};

export const SchedulePage: React.FC = () => {
    const [view, setView] = useState('Semana');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const { appointments, addAppointment, updateAppointmentStatus } = useAppointments();
    const { addTransaction } = useTransactions();

    const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
        await addAppointment(appointmentData);
    };

    const handleAppointmentClick = (appointment: Appointment) => {
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

    const handlePrev = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === 'Semana') {
                newDate.setDate(newDate.getDate() - 7);
            } else {
                newDate.setDate(newDate.getDate() - 1);
            }
            return newDate;
        });
    };
    
    const handleNext = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === 'Semana') {
                newDate.setDate(newDate.getDate() + 7);
            } else {
                newDate.setDate(newDate.getDate() + 1);
            }
            return newDate;
        });
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const { weekDays, currentMonthLabel } = useMemo(() => {
        const startOfWeek = getStartOfWeek(currentDate);
        const days = Array.from({ length: 5 }).map((_, i) => addDays(startOfWeek, i)); // Mon-Fri
        const monthLabel = startOfWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { weekDays: days, currentMonthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
    }, [currentDate]);

    const appointmentsByDateAndTime = useMemo(() => {
        const map = new Map<string, Appointment>();
        appointments.forEach(app => {
            // Normalize time format - remove seconds if present
            const normalizedTime = app.time.includes(':') && app.time.split(':').length === 3 
                ? app.time.substring(0, 5) // Remove seconds (e.g., "10:00:00" -> "10:00")
                : app.time;
            const key = `${app.date}_${normalizedTime}`;
            map.set(key, app);
        });
        return map;
    }, [appointments]);

    const renderWeekView = () => (
        <div className="min-w-[800px] sm:min-w-[1000px]">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                        <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 w-20 sm:w-28">Horário</th>
                        {weekDays.map(day => (
                            <th key={day.toISOString()} className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                                <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${areDatesEqual(day, new Date()) ? 'text-primary' : ''}`}>
                                    <span className="text-xs sm:text-sm">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                                    <span className="text-xs sm:text-sm font-semibold">{day.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {timeSlots.map(time => (
                        <tr key={time}>
                            <td className="h-[40px] px-2 sm:px-4 py-2 align-top pt-3 text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500">{time}</td>
                            {time === "12:00" ? (
                                <td className="h-[40px] px-2 sm:px-4 py-2 text-center text-gray-400 bg-gray-50 dark:bg-gray-900/70 text-xs sm:text-sm" colSpan={5}>Almoço</td>
                            ) : (
                                weekDays.map(date => {
                                    const dateStr = formatDateYYYYMMDD(date);
                                    const appointment = appointmentsByDateAndTime.get(`${dateStr}_${time}`);
                                    return (
                                        <td key={`${time}-${dateStr}`} className="h-[40px] px-2 py-1 align-middle">
                                            {appointment ? (
                                                <button 
                                                    onClick={() => handleAppointmentClick(appointment)}
                                                    className={`inline-flex items-center gap-1 rounded-md h-7 px-2 text-white text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 ${getStatusColor(appointment.status)}`}
                                                >
                                                    <span className="material-symbols-outlined text-xs">{getStatusIcon(appointment.status)}</span>
                                                    <span className="whitespace-nowrap">{extractClientName(appointment.clientName)}</span>
                                                </button>
                                            ) : (
                                                <div className="h-7 w-full"></div>
                                            )}
                                        </td>
                                    );
                                })
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderDayView = () => {
        const todayAppointments = appointments.filter(app => app.date === formatDateYYYYMMDD(currentDate));

        return (
             <div className="min-w-full">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                            <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 w-20 sm:w-28">Horário</th>
                            <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                                 <div className={`flex items-center gap-2 ${areDatesEqual(currentDate, new Date()) ? 'text-primary' : ''}`}>
                                    <span className="text-xs sm:text-sm">{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {timeSlots.map(time => {
                            const appointment = todayAppointments.find(app => {
                                // Normalize time format - remove seconds if present
                                const normalizedAppTime = app.time.includes(':') && app.time.split(':').length === 3 
                                    ? app.time.substring(0, 5) // Remove seconds (e.g., "10:00:00" -> "10:00")
                                    : app.time;
                                return normalizedAppTime === time;
                            });
                             return (
                                <tr key={time}>
                                    <td className="h-[40px] px-2 sm:px-4 py-2 align-middle text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500">{time}</td>
                                    {time === "12:00" ? (
                                        <td className="h-[40px] px-2 sm:px-4 py-2 text-center text-gray-400 bg-gray-50 dark:bg-gray-900/70 text-xs sm:text-sm">Almoço</td>
                                    ) : (
                                        <td className="h-[40px] px-2 py-1 align-middle">
                                             {appointment ? (
                                                <button 
                                                    onClick={() => handleAppointmentClick(appointment)}
                                                    className={`inline-flex items-center gap-1 rounded-md h-7 px-2 text-white text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 ${getStatusColor(appointment.status)}`}
                                                >
                                                    <span className="material-symbols-outlined text-xs">{getStatusIcon(appointment.status)}</span>
                                                    <span className="whitespace-nowrap">{extractClientName(appointment.clientName)}</span>
                                                </button>
                                            ) : (
                                                <div className="h-7 w-full"></div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6 sm:mb-8 mt-4 sm:mt-6">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Agenda</h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 dark:focus:ring-offset-background-dark transition-colors text-sm sm:text-base">
                    <span className="material-symbols-outlined text-base sm:text-lg">add</span>
                    <span className="hidden sm:inline">Novo Agendamento</span>
                    <span className="sm:hidden">Novo</span>
                </button>
            </header>
            
            <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-1">
                        <button onClick={handlePrev} className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Anterior">
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button onClick={handleNext} className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Próximo">
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                    <button onClick={handleToday} className="h-8 sm:h-10 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Hoje</button>
                </div>
                
                <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">{currentMonthLabel}</p>
                
                <div className="flex h-8 sm:h-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800/70 p-1">
                    {['Dia', 'Semana'].map(v => (
                         <label key={v} className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 sm:px-4 has-[:checked]:bg-white dark:has-[:checked]:bg-gray-900 has-[:checked]:shadow-sm has-[:checked]:text-gray-900 dark:has-[:checked]:text-white text-gray-600 dark:text-gray-400">
                             <span className="truncate text-xs sm:text-sm font-medium">{v}</span>
                             <input className="sr-only" name="view-switcher" type="radio" value={v} checked={view === v} onChange={() => setView(v)}/>
                         </label>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                {view === 'Semana' ? renderWeekView() : renderDayView()}
            </div>
            
            <NewAppointmentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveAppointment}
                initialDate={formatDateYYYYMMDD(currentDate)}
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
