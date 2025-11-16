import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointments, useTransactions, useFinalizeAppointment, useNewAppointment, useAppointmentDetail } from '../contexts.tsx';
import { Appointment, AppointmentStatus, Transaction } from '../types.ts';

// --- Date Helper Functions ---
const formatDateYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AVAILABLE_TIMES = ['08:00', '10:00', '14:00', '16:00'];

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const SchedulePage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate());
    const [showCalendar, setShowCalendar] = useState(false);
    const { appointments, fetchAppointments, addAppointment } = useAppointments();
    const { addTransaction } = useTransactions();
    const { setFinalizeData } = useFinalizeAppointment();
    const { setNewAppointmentData } = useNewAppointment();
    const { setAppointmentDetail } = useAppointmentDetail();
    
    // Recarregar agendamentos quando cliente for atualizado
    useEffect(() => {
        const handleClientUpdated = () => {
            fetchAppointments();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchAppointments]);

    const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
    
    // Get appointments for the selected date
    const dayAppointments = useMemo(() => {
        return appointments.filter(app => app.date === selectedDate);
    }, [appointments, selectedDate]);

    // Format displayed date
    const formatDisplayDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        const isToday = dateStr === getTodayLocalDate();
        
        if (isToday) {
            return 'Hoje';
        }
        
        return date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long' 
        }).charAt(0).toUpperCase() + date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long' 
        }).slice(1);
    };

    const handlePrevDay = () => {
        const prev = new Date(selectedDateObj);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(formatDateYYYYMMDD(prev));
    };

    const handleNextDay = () => {
        const next = new Date(selectedDateObj);
        next.setDate(next.getDate() + 1);
        setSelectedDate(formatDateYYYYMMDD(next));
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(formatDateYYYYMMDD(date));
        setShowCalendar(false);
    };

    const handleToday = () => {
        setSelectedDate(getTodayLocalDate());
        setShowCalendar(false);
    };

    const handleAppointmentClick = (appointment: Appointment) => {
        setAppointmentDetail(appointment);
        navigate(`/appointment/${appointment.id}`);
    };

    const handleNewAppointment = (preSelectedTime?: string) => {
        const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
            await addAppointment(appointmentData);
        };
        setNewAppointmentData(handleSaveAppointment, selectedDate);
        
        // Navegar com parâmetros de data e hora se fornecidos
        if (preSelectedTime) {
            // Para hash routing, os parâmetros vêm depois do path no hash
            const url = `/new-appointment?date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(preSelectedTime)}`;
            console.log('Schedule: Navigating to:', url);
            navigate(url);
        } else {
            navigate('/new-appointment');
        }
    };

    // Extract client name helper
    const extractClientName = (clientName: string): string => {
        if (clientName.includes('|')) {
            return clientName.split('|')[0];
        }
        if (clientName.includes('(')) {
            const match = clientName.match(/^(.+?)\s*\(/);
            return match ? match[1].trim() : clientName;
        }
        return clientName;
    };

    // Generate calendar days for picker
    const generateCalendarDays = () => {
        const today = new Date(getTodayLocalDate() + 'T00:00:00');
        const days = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            days.push(date);
        }
        return days;
    };

    const calendarDays = generateCalendarDays();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="mb-6 mt-4 sm:mt-6">
                <div className="max-w-4xl mx-auto px-4 sm:px-0">
                </div>
                
                {/* Date Navigation - Modernized */}
                <div className="max-w-4xl mx-auto px-4 sm:px-0 space-y-3">
                    {/* Date Display with Calendar */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="w-full flex items-center justify-between py-4 px-5 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/10 border border-primary/30 hover:border-primary/50 dark:hover:border-primary/40 transition-all group shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                                    <Icon name="calendar_today" className="text-primary text-2xl" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        {formatDisplayDate(selectedDate)}
                                    </p>
                                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                        {selectedDateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).charAt(0).toUpperCase() + selectedDateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).slice(1)}
                                    </p>
                                </div>
                            </div>
                            <Icon name={showCalendar ? 'expand_less' : 'expand_more'} className="text-gray-400 dark:text-gray-600 text-2xl group-hover:text-primary transition-colors" />
                        </button>

                        {/* Calendar Picker Dropdown - Modern Design */}
                        {showCalendar && (
                            <div className="absolute top-full left-0 right-0 mt-3 z-30 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl px-2 py-3 sm:p-4 md:p-6 backdrop-blur-sm max-w-full overflow-x-hidden">
                                <div className="space-y-4">
                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                        <button
                                            onClick={handleToday}
                                            className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2"
                                        >
                                            <Icon name="today" className="text-sm sm:text-base" />
                                            <span>Hoje</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const tomorrow = new Date(selectedDateObj);
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                handleDateSelect(tomorrow);
                                            }}
                                            className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs sm:text-sm"
                                        >
                                            Amanhã
                                        </button>
                                        <button
                                            onClick={() => {
                                                const nextWeek = new Date(selectedDateObj);
                                                nextWeek.setDate(nextWeek.getDate() + 7);
                                                handleDateSelect(nextWeek);
                                            }}
                                            className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs sm:text-sm"
                                        >
                                            Próx. sem.
                                        </button>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-7 gap-x-2 sm:gap-x-3 gap-y-1 sm:gap-y-2">
                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                                <div key={idx} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-500 py-1.5 sm:py-2">
                                                    {day}
                                                </div>
                                            ))}
                                            {calendarDays.slice(0, 30).map((date) => {
                                    const dateStr = formatDateYYYYMMDD(date);
                                                const isSelected = dateStr === selectedDate;
                                                const isToday = dateStr === getTodayLocalDate();
                                                const hasAppointments = appointments.some(app => app.date === dateStr);
                                                
                                    return (
                                                <button 
                                                        key={dateStr}
                                                        onClick={() => handleDateSelect(date)}
                                                        className={`py-1 sm:py-2 px-0 sm:px-1 rounded text-xs sm:text-sm font-semibold transition-all ${
                                                            isSelected
                                                                ? 'bg-primary text-white shadow-md'
                                                                : hasAppointments
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-bold'
                                                                : isToday
                                                                ? 'bg-primary/20 text-primary border border-primary/50 font-bold'
                                                                : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                                                        }`}
                                                    >
                                                        {date.getDate()}
                                                </button>
                                                );
                                            })}
                                        </div>
        </div>
                                </div>
                            </div>
                        )}
            </div>

                    {/* Day Navigation Arrows */}
                    <div className="flex items-center justify-between gap-3">
                <button 
                            onClick={handlePrevDay}
                            className="flex-1 py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
                        >
                            <Icon name="chevron_left" className="text-lg" />
                            <span>Anterior</span>
                        </button>

                        <button 
                            onClick={handleNextDay}
                            className="flex-1 py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
                        >
                            <span>Próximo</span>
                            <Icon name="chevron_right" className="text-lg" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Appointments Cards - Centered and Compact */}
            <main className="flex-1 w-full px-4 sm:px-0">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Morning and Afternoon Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Morning Section (08:00, 10:00) */}
                        <div>
                            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">Manhã</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                                {AVAILABLE_TIMES.slice(0, 2).map((timeSlot) => {
                                    const appointment = dayAppointments.find(app => {
                                        const normalizedAppTime = app.time.includes(':') && app.time.split(':').length === 3 
                                            ? app.time.substring(0, 5)
                                            : app.time;
                                        return normalizedAppTime === timeSlot;
                                    });

                                    const clientName = appointment ? extractClientName(appointment.clientName) : 'Disponível';
                                    
                                    // Check if time slot is in the past for today
                                    const isToday = selectedDate === getTodayLocalDate();
                                    const now = new Date();
                                    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                    const isTimePassed = isToday && timeSlot < currentTime;
                                    const shouldHide = isTimePassed && !appointment;

                                    const statusStyles: { [key in AppointmentStatus]: { bg: string; text: string; label: string; dot: string } } = {
                                        [AppointmentStatus.Confirmed]: { 
                                            bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', 
                                            text: 'text-blue-700 dark:text-blue-300',
                                            label: 'Confirmado',
                                            dot: 'bg-blue-500'
                                        },
                                        [AppointmentStatus.Arrived]: { 
                                            bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800', 
                                            text: 'text-yellow-700 dark:text-yellow-300',
                                            label: 'Chegou',
                                            dot: 'bg-yellow-500'
                                        },
                                        [AppointmentStatus.Attended]: { 
                                            bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800', 
                                            text: 'text-green-700 dark:text-green-300',
                                            label: 'Atendido',
                                            dot: 'bg-green-500'
                                        },
                                    };

                                    // Don't render past available slots for today
                                    if (shouldHide) {
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={timeSlot}
                                            onClick={() => appointment ? handleAppointmentClick(appointment) : handleNewAppointment(timeSlot)}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left min-h-appointment ${
                                                appointment
                                                    ? `${statusStyles[appointment.status].bg} border-current hover:shadow-md hover:-translate-y-0.5 cursor-pointer`
                                                    : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{timeSlot}</p>
                                                        {appointment && (
                                                            <div className={`w-2 h-2 rounded-full ${statusStyles[appointment.status].dot}`} />
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{clientName}</p>
                                                    {appointment && (
                                                        <>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{appointment.service}</p>
                                                            <p className={`text-xs font-semibold ${statusStyles[appointment.status].text}`}>
                                                                {statusStyles[appointment.status].label}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {appointment ? (
                                                        <Icon name="arrow_forward" className="text-gray-400 dark:text-gray-600 text-lg" />
                                                    ) : (
                                                        <Icon name="add" className="text-gray-300 dark:text-gray-700 text-lg" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Afternoon Section (14:00, 16:00) */}
                        <div>
                            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">Tarde</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                                {AVAILABLE_TIMES.slice(2, 4).map((timeSlot) => {
                                    const appointment = dayAppointments.find(app => {
                                        const normalizedAppTime = app.time.includes(':') && app.time.split(':').length === 3 
                                            ? app.time.substring(0, 5)
                                            : app.time;
                                        return normalizedAppTime === timeSlot;
                                    });

                                    const clientName = appointment ? extractClientName(appointment.clientName) : 'Disponível';
                                    
                                    const statusStyles: { [key in AppointmentStatus]: { bg: string; text: string; label: string; dot: string } } = {
                                        [AppointmentStatus.Confirmed]: { 
                                            bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', 
                                            text: 'text-blue-700 dark:text-blue-300',
                                            label: 'Confirmado',
                                            dot: 'bg-blue-500'
                                        },
                                        [AppointmentStatus.Arrived]: { 
                                            bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800', 
                                            text: 'text-yellow-700 dark:text-yellow-300',
                                            label: 'Chegou',
                                            dot: 'bg-yellow-500'
                                        },
                                        [AppointmentStatus.Attended]: { 
                                            bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800', 
                                            text: 'text-green-700 dark:text-green-300',
                                            label: 'Atendido',
                                            dot: 'bg-green-500'
                                        },
                                    };

                                    // Check if time slot is in the past for today
                                    const isToday = selectedDate === getTodayLocalDate();
                                    const now = new Date();
                                    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                    const isTimePassed = isToday && timeSlot < currentTime;
                                    const shouldHide = isTimePassed && !appointment;

                                    // Don't render past available slots for today
                                    if (shouldHide) {
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={timeSlot}
                                            onClick={() => appointment ? handleAppointmentClick(appointment) : handleNewAppointment(timeSlot)}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left min-h-appointment ${
                                                appointment
                                                    ? `${statusStyles[appointment.status].bg} border-current hover:shadow-md hover:-translate-y-0.5 cursor-pointer`
                                                    : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{timeSlot}</p>
                                                        {appointment && (
                                                            <div className={`w-2 h-2 rounded-full ${statusStyles[appointment.status].dot}`} />
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{clientName}</p>
                                                    {appointment && (
                                                        <>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{appointment.service}</p>
                                                            <p className={`text-xs font-semibold ${statusStyles[appointment.status].text}`}>
                                                                {statusStyles[appointment.status].label}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {appointment ? (
                                                        <Icon name="arrow_forward" className="text-gray-400 dark:text-gray-600 text-lg" />
                                                    ) : (
                                                        <Icon name="add" className="text-gray-300 dark:text-gray-700 text-lg" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* New Appointment Button */}
            <footer className="mt-6 mb-4 max-w-4xl mx-auto w-full px-4 sm:px-0">
                <button 
                    onClick={handleNewAppointment}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold py-3 px-5 rounded-xl shadow-md hover:shadow-lg hover:from-primary/90 hover:to-primary/70 transition-all active:scale-95"
                >
                    <Icon name="add_circle" className="text-lg" />
                    <span>Novo Agendamento</span>
                </button>
            </footer>
        </div>
    );
};
