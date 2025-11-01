import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types.ts';
import { useTransactions } from '../contexts.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ReportsPage: React.FC = () => {
    const { transactions } = useTransactions();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [filterType, setFilterType] = useState<'all' | 'vendas' | 'agendado' | 'avulso'>('all');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all-time'>(() => {
        // Se veio da dashboard com parâmetro date=today, filtra por hoje
        return searchParams.get('date') === 'today' ? 'today' : 'year';
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Global mouse event handlers for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const rect = container.getBoundingClientRect();
                const x = e.pageX - rect.left;
                const walk = (x - dragStartRef.current.x) * 2;
                container.scrollLeft = dragStartRef.current.scrollLeft - walk;
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    // Get date ranges
    const getDateRange = (filter: 'today' | 'week' | 'month' | 'year' | 'all-time') => {
        const today = new Date();
        const startDate = new Date();
        
        switch(filter) {
            case 'today':
                return {
                    start: getTodayLocalDate(),
                    end: getTodayLocalDate()
                };
            case 'week':
                startDate.setDate(today.getDate() - today.getDay());
                return {
                    start: startDate.toISOString().split('T')[0],
                    end: getTodayLocalDate()
                };
            case 'month':
                startDate.setDate(1);
                return {
                    start: startDate.toISOString().split('T')[0],
                    end: getTodayLocalDate()
                };
            case 'year':
                startDate.setMonth(0, 1); // January 1st
                return {
                    start: startDate.toISOString().split('T')[0],
                    end: getTodayLocalDate()
                };
            case 'all-time':
            default:
                return null; // No date range for all-time
        }
    };

    // Categorize all transactions (services and sales)
    const categorizedTransactions = useMemo(() => {
        return transactions.map(transaction => {
            // Check if it's a product sale
            if (transaction.type === 'product' || transaction.clientName === 'Venda de Produto') {
                return {
                    ...transaction,
                    category: 'vendas' as const
                };
            }
            
            // Categorize as scheduled or walk-in service
            const isScheduled = transaction.clientName.includes('|');
            return {
                ...transaction,
                category: isScheduled ? 'agendado' as const : 'avulso' as const
            };
        });
    }, [transactions]);

    // Filter by date range and type
    const filteredTransactions = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        let filtered = categorizedTransactions;

        // Apply date filter
        if (dateRange) {
            filtered = filtered.filter(t => {
                const tDate = t.date;
                return tDate >= dateRange.start && tDate <= dateRange.end;
            });
        }

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.category === filterType);
        }

        return filtered;
    }, [categorizedTransactions, filterType, dateFilter]);

    // Sort by date descending
    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredTransactions]);

    // Format date
    const formatDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Format currency
    const formatCurrency = (value: number): string => {
        const fixedValue = value.toFixed(2);
        const [integerPart, decimalPart] = fixedValue.split('.');
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${formattedInteger},${decimalPart}`;
    };

    // Extract client name (remove WhatsApp if present)
    const getClientName = (clientName: string): string => {
        return clientName.includes('|') ? clientName.split('|')[0] : clientName;
    };

    // Calculate totals
    const totals = useMemo(() => {
        const total = filteredTransactions.reduce((sum, t) => sum + t.value, 0);
        const count = filteredTransactions.length;
        
        const services = filteredTransactions.filter(t => t.category === 'agendado' || t.category === 'avulso').length;
        const sales = filteredTransactions.filter(t => t.category === 'vendas').length;
        
        return {
            total,
            count,
            services,
            sales
        };
    }, [filteredTransactions]);

    const getTotalLabel = () => {
        switch(dateFilter) {
            case 'today':
                return 'Total Hoje';
            case 'week':
                return 'Total Semana';
            case 'month':
                return 'Total Mês';
            case 'year':
                return 'Total Ano';
            case 'all-time':
            default:
                return 'Total Todo Tempo';
        }
    };

    const getPerformanceLabel = () => {
        switch(dateFilter) {
            case 'today':
                return 'Desempenho Hoje';
            case 'week':
                return 'Desempenho Semanal';
            case 'month':
                return 'Desempenho Mensal';
            case 'year':
                return 'Desempenho Anual';
            case 'all-time':
            default:
                return 'Desempenho Todo Tempo';
        }
    };

    // Generate chart data based on date filter with categories
    const chartData = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        

        if (dateFilter === 'today') {
            // Show hourly data for today based on actual transaction time
            const today = getTodayLocalDate();
            const todayTransactions = filteredTransactions.filter(t => t.date === today);
            
            // Initialize hours from 6am to 11pm (typical business hours) or show all 24h
            const hoursData: { [hour: number]: { vendas: number; servicos: number } } = {};
            
            // Initialize all hours to 0
            for (let i = 0; i < 24; i++) {
                hoursData[i] = { vendas: 0, servicos: 0 };
            }
            
            // Group transactions by hour using created_at
            todayTransactions.forEach(transaction => {
                if (!transaction.created_at) return;
                
                try {
                    const createdDate = new Date(transaction.created_at);
                    const hour = createdDate.getHours();
                    
                    if (transaction.category === 'vendas') {
                        hoursData[hour].vendas += transaction.value;
                    } else if (transaction.category === 'agendado' || transaction.category === 'avulso') {
                        hoursData[hour].servicos += transaction.value;
                    }
                } catch (e) {
                    // Skip if date parsing fails
                    console.error('Error parsing created_at:', e);
                }
            });
            
            // Convert to array format, showing all hours that have data
            const hours: { day: string; vendas: number; servicos: number }[] = [];
            
            // Find min and max hours with data
            const hoursWithData = Object.keys(hoursData)
                .map(Number)
                .filter(h => hoursData[h].vendas > 0 || hoursData[h].servicos > 0);
            
            const minHour = hoursWithData.length > 0 ? Math.min(...hoursWithData) : 6;
            const maxHour = hoursWithData.length > 0 ? Math.max(...hoursWithData) : 22;
            
            // Show from min hour to max hour (or default business hours if no data)
            const startHour = Math.max(0, minHour - 1); // Show one hour before first data
            const endHour = Math.min(23, maxHour + 1); // Show one hour after last data
            
            for (let i = startHour; i <= endHour; i++) {
                hours.push({
                    day: `${String(i).padStart(2, '0')}h`,
                    vendas: hoursData[i].vendas,
                    servicos: hoursData[i].servicos
                });
            }
            
            // If no hours were added, show default business hours range
            if (hours.length === 0) {
                for (let i = 6; i <= 22; i++) {
                    hours.push({
                        day: `${String(i).padStart(2, '0')}h`,
                        vendas: 0,
                        servicos: 0
                    });
                }
            }
            
            return hours;
        }

        if (dateFilter === 'week') {
            const days = [];
            const start = new Date(dateRange.start + 'T00:00:00');
            const end = new Date(dateRange.end + 'T23:59:59');
            
            // Create a copy of start date to avoid mutation issues
            let currentDate = new Date(start);
            
            // Loop through all days from start to end (inclusive)
            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayTransactions = filteredTransactions.filter(t => t.date === dateStr);
                
                const vendas = dayTransactions.filter(t => t.category === 'vendas').reduce((sum, t) => sum + t.value, 0);
                const servicos = dayTransactions.filter(t => t.category === 'agendado' || t.category === 'avulso').reduce((sum, t) => sum + t.value, 0);
                
                days.push({
                    day: currentDate.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3),
                    vendas: vendas,
                    servicos: servicos
                });
                
                // Move to next day
                currentDate = new Date(currentDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return days;
        }

        if (dateFilter === 'month') {
            // Show weekly data for month
            const weeks = [];
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            let weekStart = new Date(start);
            weekStart.setDate(start.getDate() - start.getDay());
            
            while (weekStart <= end) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                const weekTransactions = filteredTransactions.filter(t => {
                    const tDate = t.date;
                    return tDate >= weekStart.toISOString().split('T')[0] && 
                           tDate <= (weekEnd > end ? end : weekEnd).toISOString().split('T')[0];
                });
                
                const vendas = weekTransactions.filter(t => t.category === 'vendas').reduce((sum, t) => sum + t.value, 0);
                const servicos = weekTransactions.filter(t => t.category === 'agendado' || t.category === 'avulso').reduce((sum, t) => sum + t.value, 0);
                
                weeks.push({
                    day: `Sem ${weeks.length + 1}`,
                    vendas: vendas,
                    servicos: servicos
                });
                
                weekStart.setDate(weekStart.getDate() + 7);
            }
            return weeks;
        }

        if (dateFilter === 'year') {
            // Show monthly data for year - show all 12 months
            const months = [];
            const today = new Date();
            const currentYear = today.getFullYear();
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            
            // Show all 12 months
            for (let month = 0; month < 12; month++) {
                const monthStart = new Date(currentYear, month, 1);
                const monthEnd = new Date(currentYear, month + 1, 0);
                
                // Filter transactions for this month
                const monthTransactions = filteredTransactions.filter(t => {
                    const tDate = new Date(`${t.date}T00:00:00`);
                    return tDate >= monthStart && tDate <= monthEnd;
                });
                
                const vendas = monthTransactions.filter(t => t.category === 'vendas').reduce((sum, t) => sum + t.value, 0);
                const servicos = monthTransactions.filter(t => t.category === 'agendado' || t.category === 'avulso').reduce((sum, t) => sum + t.value, 0);
                
                months.push({
                    day: monthNames[month],
                    vendas: vendas,
                    servicos: servicos
                });
            }
            
            return months;
        }

        if (dateFilter === 'all-time') {
            // Show yearly data - 10 years before and 10 years after 2025
            const currentYear = 2025;
            const startYear = currentYear - 10;
            const endYear = currentYear + 10;
            
            const yearsData: { [year: number]: { vendas: number; servicos: number } } = {};
            
            // Initialize all years in range with 0
            for (let year = startYear; year <= endYear; year++) {
                yearsData[year] = { vendas: 0, servicos: 0 };
            }
            
            // Group transactions by year
            filteredTransactions.forEach(transaction => {
                try {
                    const transactionYear = new Date(`${transaction.date}T00:00:00`).getFullYear();
                    
                    // Only include if within the range
                    if (transactionYear >= startYear && transactionYear <= endYear && yearsData[transactionYear]) {
                        if (transaction.category === 'vendas') {
                            yearsData[transactionYear].vendas += transaction.value;
                        } else if (transaction.category === 'agendado' || transaction.category === 'avulso') {
                            yearsData[transactionYear].servicos += transaction.value;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing transaction date:', e);
                }
            });
            
            // Convert to array with all years from startYear to endYear
            const years = [];
            for (let year = startYear; year <= endYear; year++) {
                years.push({
                    day: year.toString(),
                    vendas: yearsData[year]?.vendas || 0,
                    servicos: yearsData[year]?.servicos || 0
                });
            }
            
            return years;
        }

        return [];
    }, [dateFilter, filteredTransactions]);
    
    return (
        <div className="mx-auto max-w-6xl w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8 mt-4 sm:mt-6">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Relatórios</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">{totals.count} receita{totals.count !== 1 ? 's' : ''} registrada{totals.count !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'all'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterType('vendas')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'vendas'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700'
                    }`}
                >
                    Vendas
                </button>
                <button
                    onClick={() => setFilterType('agendado')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'agendado'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700'
                    }`}
                >
                    Agendados
                </button>
                <button
                    onClick={() => setFilterType('avulso')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'avulso'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700'
                    }`}
                >
                    Avulsos
                </button>
            </div>

            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setDateFilter('today')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'today'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Hoje
                </button>
                <button
                    onClick={() => setDateFilter('week')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'week'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Semana
                </button>
                <button
                    onClick={() => setDateFilter('month')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'month'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Mês
                </button>
                <button
                    onClick={() => setDateFilter('year')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'year'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Ano
                </button>
                <button
                    onClick={() => setDateFilter('all-time')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        dateFilter === 'all-time'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    Todo Tempo
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{getTotalLabel()}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.total)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total de Receitas</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.count}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Serviços</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.services}</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Vendas</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.sales}</p>
                </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-8 shadow-sm" style={{ cursor: 'pointer' }}>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">{getPerformanceLabel()}</h3>
                <div className="h-64 sm:h-80 overflow-hidden relative" style={{ cursor: 'pointer' }}>
                    <div 
                        ref={scrollContainerRef}
                        className={`h-full chart-scroll-container ${dateFilter === 'year' || dateFilter === 'month' || dateFilter === 'all-time' || dateFilter === 'week' ? 'chart-scroll-visible' : ''}`} 
                        style={{ 
                            overflowX: 'auto', 
                            overflowY: 'hidden', 
                            WebkitOverflowScrolling: 'touch', 
                            height: '100%',
                            cursor: isDragging ? 'grabbing' : 'pointer',
                            userSelect: 'none'
                        }}
                        onMouseDown={(e) => {
                            if (dateFilter === 'year' || dateFilter === 'month' || dateFilter === 'all-time' || dateFilter === 'week') {
                                const container = scrollContainerRef.current;
                                if (container && container.scrollWidth > container.clientWidth) {
                                    const rect = container.getBoundingClientRect();
                                    setIsDragging(true);
                                    dragStartRef.current = {
                                        x: e.pageX - rect.left,
                                        scrollLeft: container.scrollLeft
                                    };
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }
                        }}
                    >
                        <style>{`
                            .chart-scroll-container {
                                scrollbar-width: thin;
                                scrollbar-color: rgba(255, 0, 0, 0.8) rgba(229, 231, 235, 0.2);
                            }
                            .dark .chart-scroll-container {
                                scrollbar-color: rgba(255, 0, 0, 0.7) rgba(55, 65, 81, 0.3);
                            }
                            .chart-scroll-container::-webkit-scrollbar {
                                height: 12px;
                                display: block !important;
                            }
                            .chart-scroll-container::-webkit-scrollbar:vertical {
                                display: none !important;
                                width: 0 !important;
                            }
                            .chart-scroll-container::-webkit-scrollbar-track {
                                background: rgba(229, 231, 235, 0.3);
                                border-radius: 6px;
                                margin: 0 10px;
                            }
                            .chart-scroll-container::-webkit-scrollbar-thumb {
                                background: linear-gradient(90deg, #ff0000, #ff3333);
                                border-radius: 6px;
                                border: 2px solid rgba(255, 255, 255, 0.2);
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            }
                            .chart-scroll-container::-webkit-scrollbar-thumb:hover {
                                background: linear-gradient(90deg, #cc0000, #ff0000);
                                box-shadow: 0 2px 6px rgba(255, 0, 0, 0.3);
                            }
                            .dark .chart-scroll-container::-webkit-scrollbar-track {
                                background: rgba(55, 65, 81, 0.4);
                                border: 1px solid rgba(75, 85, 99, 0.2);
                            }
                            .dark .chart-scroll-container::-webkit-scrollbar-thumb {
                                background: linear-gradient(90deg, #ff3333, #ff6666);
                                border: 2px solid rgba(55, 65, 81, 0.3);
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                            }
                            .dark .chart-scroll-container::-webkit-scrollbar-thumb:hover {
                                background: linear-gradient(90deg, #ff0000, #ff3333);
                                box-shadow: 0 2px 6px rgba(255, 0, 0, 0.4);
                            }
                            .chart-scroll-container * {
                                cursor: pointer !important;
                            }
                        `}</style>
                        <div style={{ width: dateFilter === 'year' ? '1000px' : dateFilter === 'week' ? Math.max(600, chartData.length * 80) + 'px' : dateFilter === 'month' || dateFilter === 'all-time' ? Math.max(900, chartData.length * 70) + 'px' : '100%', height: '100%', minHeight: '100%', cursor: 'pointer' }}>
                            <ResponsiveContainer 
                                width="100%" 
                                height="100%"
                                style={{ cursor: 'pointer' }}
                            >
                        <BarChart 
                            data={chartData} 
                            margin={{ 
                                top: 5, 
                                right: 20, 
                                left: -10, 
                                bottom: 5 
                            }}
                            barCategoryGap={dateFilter === 'all-time' ? '5%' : '20%'}
                            barGap={dateFilter === 'all-time' ? 1 : 4}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis 
                                dataKey="day" 
                                tick={{ fill: 'rgb(107, 114, 128)', fontSize: dateFilter === 'all-time' ? 11 : 12 }} 
                                className="text-xs dark:[fill:rgb(156,163,175)]"
                                style={{ fill: 'var(--text-gray-500)' }}
                            />
                            <YAxis 
                                tickFormatter={(value) => `R$${value.toFixed(0)}`} 
                                tick={{ fill: 'rgb(107, 114, 128)' }} 
                                className="text-xs dark:[fill:rgb(156,163,175)]"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderColor: 'rgba(0, 0, 0, 0.1)',
                                    color: '#1f2937',
                                    borderRadius: '8px'
                                }}
                                formatter={(value: number, name: string) => {
                                    const labels: { [key: string]: string } = {
                                        'vendas': 'Vendas',
                                        'servicos': 'Serviços'
                                    };
                                    return [`R$ ${value.toFixed(2).replace('.', ',')}`, labels[name] || name];
                                }}
                                cursor={{ fill: 'rgba(139, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="vendas" stackId="a" fill="#9333EA" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="servicos" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-purple-600"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Vendas</span>
            </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Serviços</span>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            {sortedTransactions.length === 0 ? (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4 block">inbox</span>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Nenhuma receita registrada nesta categoria</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {sortedTransactions.map((transaction) => {
                        const isSale = transaction.category === 'vendas';
                        return (
                            <div
                                key={transaction.id}
                                onClick={() => navigate(`/transaction/${transaction.id}`, { state: { from: 'reports' } })}
                                className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                            >
                                {/* Mobile Layout */}
                                <div className="block sm:hidden">
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left side - Name, Date, Category */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white break-words mb-0.5 flex items-center gap-1.5">
                                                {isSale ? (
                                                    <>
                                                        <Icon name="local_mall" className="text-sm" style={{ color: '#ff0000' }} />
                                                        <span>Venda de Produto</span>
                                                    </>
                                                ) : transaction.category === 'agendado' ? (
                                                    <>
                                                        <Icon name="event_available" className="text-sm" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="order_approve" className="text-sm" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                <span>{formatDate(transaction.date)}</span>
                                            </div>
                                        </div>

                                        {/* Right side - Value */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-base font-bold text-primary">
                                                {formatCurrency(transaction.value)}
                                            </p>
                                            {transaction.discount > 0 && (
                                                <p className="text-[10px] text-red-600 dark:text-red-400">
                                                    Desc: {formatCurrency(transaction.discount)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden sm:flex items-center justify-between gap-3">
                                    {/* Left side - Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-base font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                                {isSale ? (
                                                    <>
                                                        <Icon name="local_mall" className="text-sm" style={{ color: '#ff0000' }} />
                                                        <span>Venda de Produto</span>
                                                    </>
                                                ) : transaction.category === 'agendado' ? (
                                                    <>
                                                        <Icon name="event_available" className="text-sm" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="order_approve" className="text-sm" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                                {formatDate(transaction.date)}
                                            </span>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="truncate">{transaction.service || '-'}</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="hidden sm:inline">{transaction.paymentMethod}</span>
                                        </div>
                                    </div>

                                    {/* Right side - Value */}
                                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-primary">
                                                {formatCurrency(transaction.value)}
                                            </p>
                                            {transaction.discount > 0 && (
                                                <p className="text-xs text-red-600 dark:text-red-400">
                                                    Desc: {formatCurrency(transaction.discount)}
                                                </p>
                                            )}
                                        </div>
                                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

