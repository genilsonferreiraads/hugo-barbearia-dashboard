import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, PaymentMethod } from '../types.ts';
import { useTransactions, useServices, useProducts, useCreditSales } from '../contexts.tsx';

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

// Helper function to format Date object to YYYY-MM-DD in local timezone (avoiding UTC issues)
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to get start and end of today in local timezone
const getTodayRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    // Start of today in local timezone
    const startOfToday = new Date(year, month, day, 0, 0, 0, 0);
    
    // End of today in local timezone
    const endOfToday = new Date(year, month, day, 23, 59, 59, 999);
    
    return {
        start: startOfToday,
        end: endOfToday,
        dateString: getTodayLocalDate()
    };
};

export const ReportsPage: React.FC = () => {
    const { transactions, fetchTransactions } = useTransactions();
    const { services } = useServices();
    const { products } = useProducts();
    const { installments, fetchCreditSales } = useCreditSales();
    const navigate = useNavigate();
    
    // Recarregar transações e credit sales quando cliente for atualizado
    useEffect(() => {
        const handleClientUpdated = () => {
            fetchTransactions();
            fetchCreditSales();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchTransactions, fetchCreditSales]);
    const [searchParams] = useSearchParams();
    
    const [filterType, setFilterType] = useState<'all' | 'vendas' | 'servicos'>('all');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all-time' | 'custom'>(() => {
        // Se veio da dashboard com parâmetro date=today, filtra por hoje
        return searchParams.get('date') === 'today' ? 'today' : 'month';
    });
    const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [monthlyGoal, setMonthlyGoal] = useState(10000); // Meta mensal padrão R$ 10.000
    const [isDragging, setIsDragging] = useState(false);
    const [topServicesProductsTab, setTopServicesProductsTab] = useState<'servicos' | 'produtos'>('servicos');
    const [activeChartTab, setActiveChartTab] = useState<'performance' | 'line' | 'pie' | 'peak' | 'top'>('performance');
    const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const swipeStartRef = useRef<{ x: number; time: number } | null>(null);

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
    const getDateRange = (filter: 'today' | 'week' | 'month' | 'year' | 'all-time' | 'custom') => {
        const today = new Date();
        const startDate = new Date();
        
        switch(filter) {
            case 'today':
                return {
                    start: getTodayLocalDate(),
                    end: getTodayLocalDate()
                };
            case 'week':
                // Last 7 days (today + 6 days before)
                startDate.setDate(today.getDate() - 6);
                return {
                    start: formatLocalDate(startDate),
                    end: getTodayLocalDate()
                };
            case 'month':
                startDate.setDate(1);
                // For chart display, we need the full month, but for filtering transactions, we use today
                const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                return {
                    start: formatLocalDate(startDate),
                    end: getTodayLocalDate() // Still filter transactions only until today
                };
            case 'year':
                startDate.setMonth(0, 1); // January 1st
                return {
                    start: formatLocalDate(startDate),
                    end: getTodayLocalDate()
                };
            case 'custom':
                // Use custom date range if both dates are set
                if (customStartDate && customEndDate) {
                    return {
                        start: customStartDate,
                        end: customEndDate
                    };
                }
                return null;
            case 'all-time':
            default:
                return null; // No date range for all-time
        }
    };

    // Extract client name (remove WhatsApp if present) - Helper function
    const getClientName = (clientName: string): string => {
        return clientName.includes('|') ? clientName.split('|')[0] : clientName;
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

    // Filter by date range, type, payment method and search
    const filteredTransactions = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        let filtered = categorizedTransactions;

        // Apply date filter
        if (dateRange) {
            filtered = filtered.filter(t => {
                const tDate = t.date;
                
                // For "today" filter, we need to check both date string and time
                if (dateFilter === 'today') {
                    const todayRange = getTodayRange();
                    // Check if transaction date matches today
                    if (tDate !== todayRange.dateString) return false;
                    
                    // If transaction has created_at, check if it's within today's time range
                    if (t.created_at) {
                        try {
                            const transactionTime = new Date(t.created_at);
                            return transactionTime >= todayRange.start && transactionTime <= todayRange.end;
                        } catch (e) {
                            // If parsing fails, just check date string
                            return tDate === todayRange.dateString;
                        }
                    }
                    return true; // If no created_at, assume it's valid if date matches
                }
                
                // For other filters, just compare date strings
                return tDate >= dateRange.start && tDate <= dateRange.end;
            });
        }

        // Apply type filter
        if (filterType !== 'all') {
            if (filterType === 'servicos') {
                // Serviços inclui tanto agendado quanto avulso
                filtered = filtered.filter(t => t.category === 'agendado' || t.category === 'avulso');
            } else {
                filtered = filtered.filter(t => t.category === filterType);
            }
        }

        // Apply payment method filter
        if (paymentFilter !== 'all') {
            filtered = filtered.filter(t => t.paymentMethod === paymentFilter);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t => {
                const clientName = getClientName(t.clientName).toLowerCase();
                const service = (t.service || '').toLowerCase();
                return clientName.includes(query) || service.includes(query);
            });
        }

        return filtered;
    }, [categorizedTransactions, filterType, dateFilter, paymentFilter, searchQuery]);

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

    // Calculate totals
    const totals = useMemo(() => {
        const total = filteredTransactions.reduce((sum, t) => sum + t.value, 0);
        const count = filteredTransactions.length;
        
        const services = filteredTransactions.filter(t => t.category === 'agendado' || t.category === 'avulso').length;
        const sales = filteredTransactions.filter(t => t.category === 'vendas').length;
        
        // Separar vendas normais de vendas no fiado
        const creditSales = filteredTransactions.filter(t => 
            t.category === 'vendas' && t.service.includes('Fiado -')
        );
        const creditSalesTotal = creditSales.reduce((sum, t) => sum + t.value, 0);
        const creditSalesCount = creditSales.length;
        
        // Ticket Médio - valor médio por transação
        const averageTicket = count > 0 ? total / count : 0;
        
        // Total a Receber do Fiado - parcelas pendentes de TODAS as vendas a crédito
        const pendingInstallments = installments.filter(inst => inst.status === 'pendente');
        const totalReceivable = pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0);
        const pendingInstallmentsCount = pendingInstallments.length;
        
        return {
            total,
            count,
            services,
            sales,
            creditSalesTotal,
            creditSalesCount,
            averageTicket,
            totalReceivable,
            pendingInstallmentsCount
        };
    }, [filteredTransactions, installments]);

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
                return 'Total Geral';
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
                return 'Desempenho Geral';
        }
    };

    // Get date range period text for display
    const getDateRangeText = () => {
        const dateRange = getDateRange(dateFilter);
        if (!dateRange) return null;
        
        const startDate = new Date(dateRange.start + 'T00:00:00');
        const endDate = new Date(dateRange.end + 'T00:00:00');
        
        const formatDateShort = (date: Date): string => {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        };
        
        switch(dateFilter) {
            case 'today':
                return `Hoje (${formatDateShort(endDate)})`;
            case 'week':
                return `${formatDateShort(startDate)} a ${formatDateShort(endDate)}`;
            case 'month':
                const monthName = endDate.toLocaleDateString('pt-BR', { month: 'long' });
                return `${formatDateShort(startDate)} a ${formatDateShort(endDate)} de ${monthName}`;
            case 'year':
                return `${formatDateShort(startDate)} a ${formatDateShort(endDate)}`;
            default:
                return null;
        }
    };

    // Get previous period for comparison
    const getPreviousPeriod = (filter: 'today' | 'week' | 'month' | 'year' | 'all-time') => {
        const today = new Date();
        const startDate = new Date();
        
        switch(filter) {
            case 'today':
                startDate.setDate(today.getDate() - 1);
                return {
                    start: formatLocalDate(startDate),
                    end: formatLocalDate(startDate)
                };
            case 'week':
                startDate.setDate(today.getDate() - 13); // 7 days before last week
                const weekEnd = new Date(today);
                weekEnd.setDate(today.getDate() - 7);
                return {
                    start: formatLocalDate(startDate),
                    end: formatLocalDate(weekEnd)
                };
            case 'month':
                startDate.setMonth(today.getMonth() - 1, 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                return {
                    start: formatLocalDate(startDate),
                    end: formatLocalDate(monthEnd)
                };
            case 'year':
                startDate.setFullYear(today.getFullYear() - 1, 0, 1);
                const yearEnd = new Date(today.getFullYear() - 1, 11, 31);
                return {
                    start: formatLocalDate(startDate),
                    end: formatLocalDate(yearEnd)
                };
            default:
                return null;
        }
    };

    // Calculate period comparison
    const periodComparison = useMemo(() => {
        if (dateFilter === 'all-time') return null;
        
        const currentRange = getDateRange(dateFilter);
        const previousRange = getPreviousPeriod(dateFilter);
        
        if (!currentRange || !previousRange) return null;

        const currentTotal = filteredTransactions.reduce((sum, t) => sum + t.value, 0);
        
        const previousTransactions = categorizedTransactions.filter(t => {
            const tDate = t.date;
            return tDate >= previousRange.start && tDate <= previousRange.end;
        });
        const previousTotal = previousTransactions.reduce((sum, t) => sum + t.value, 0);
        
        const difference = currentTotal - previousTotal;
        const percentage = previousTotal > 0 ? ((difference / previousTotal) * 100) : (currentTotal > 0 ? 100 : 0);
        
        return {
            current: currentTotal,
            previous: previousTotal,
            difference,
            percentage
        };
    }, [filteredTransactions, dateFilter, categorizedTransactions]);

    // Pie chart data for category distribution
    const pieChartData = useMemo(() => {
        const vendas = filteredTransactions.filter(t => t.category === 'vendas').reduce((sum, t) => sum + t.value, 0);
        const agendado = filteredTransactions.filter(t => t.category === 'agendado').reduce((sum, t) => sum + t.value, 0);
        const avulso = filteredTransactions.filter(t => t.category === 'avulso').reduce((sum, t) => sum + t.value, 0);
        
        return [
            { name: 'Vendas', value: vendas },
            { name: 'Agendados', value: agendado },
            { name: 'Avulsos', value: avulso }
        ].filter(item => item.value > 0);
    }, [filteredTransactions]);

    // Line chart data for trend
    const lineChartData = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        if (!dateRange) return [];
        
        if (dateFilter === 'week') {
            const days = [];
            const start = new Date(dateRange.start + 'T00:00:00');
            const end = new Date(dateRange.end + 'T23:59:59');
            let currentDate = new Date(start);
            
            while (currentDate <= end) {
                const dateStr = formatLocalDate(currentDate);
                const dayTransactions = filteredTransactions.filter(t => t.date === dateStr);
                const total = dayTransactions.reduce((sum, t) => sum + t.value, 0);
                
                days.push({
                    date: currentDate.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3),
                    total: total
                });
                
                currentDate = new Date(currentDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return days;
        }
        
        if (dateFilter === 'month') {
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
                    return tDate >= formatLocalDate(weekStart) && 
                           tDate <= formatLocalDate(weekEnd > end ? end : weekEnd);
                });
                
                weeks.push({
                    date: `Sem ${weeks.length + 1}`,
                    total: weekTransactions.reduce((sum, t) => sum + t.value, 0)
                });
                
                weekStart.setDate(weekStart.getDate() + 7);
            }
            return weeks;
        }
        
        return [];
    }, [dateFilter, filteredTransactions]);

    // Payment method distribution
    const paymentMethodData = useMemo(() => {
        const methodCount: { [key: string]: number } = {};
        filteredTransactions.forEach(t => {
            const method = t.paymentMethod || 'Não informado';
            methodCount[method] = (methodCount[method] || 0) + 1;
        });
        
        return Object.entries(methodCount).map(([name, value]) => ({ name, value }));
    }, [filteredTransactions]);

    // Peak hours analysis
    const peakHours = useMemo(() => {
        const hourData: { [hour: number]: number } = {};
        
        filteredTransactions.forEach(t => {
            if (!t.created_at) return;
            try {
                const createdDate = new Date(t.created_at);
                const hour = createdDate.getHours();
                hourData[hour] = (hourData[hour] || 0) + t.value;
            } catch (e) {
                // Skip
            }
        });
        
        const hours = Object.entries(hourData)
            .map(([hour, value]) => ({ hour: parseInt(hour), value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        
        return hours;
    }, [filteredTransactions]);

    // Top services - split by comma to count individually with real prices
    const topServices = useMemo(() => {
        const itemCount: { [key: string]: { count: number; revenue: number } } = {};
        
        // Filter only services (not product sales)
        const serviceTransactions = filteredTransactions.filter(t => 
            t.category !== 'vendas' && t.service && t.service !== 'Venda de Produto'
        );
        
        serviceTransactions.forEach(t => {
            const serviceName = t.service || 'Sem nome';
            
            // Split by comma to separate multiple services
            const items = serviceName.split(',').map(item => item.trim()).filter(item => item.length > 0);
            
            // If no items after split, use the original name
            const itemsToProcess = items.length > 0 ? items : [serviceName];
            
            // For each item, find its real price from services list
            itemsToProcess.forEach(item => {
                if (!itemCount[item]) {
                    itemCount[item] = { count: 0, revenue: 0 };
                }
                
                // Find the service by name (case insensitive, partial match)
                const foundService = services.find(s => 
                    s.name.toLowerCase().trim() === item.toLowerCase().trim() ||
                    item.toLowerCase().trim().includes(s.name.toLowerCase().trim()) ||
                    s.name.toLowerCase().trim().includes(item.toLowerCase().trim())
                );
                
                // Use the service's real price, or fallback to transaction value if not found
                const itemPrice = foundService ? foundService.price : (itemsToProcess.length === 1 ? t.value : 0);
                
                itemCount[item].count += 1;
                itemCount[item].revenue += itemPrice;
            });
        });
        
        return Object.entries(itemCount)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [filteredTransactions, services]);

    // Top products - split by comma to count individually with real prices
    const topProducts = useMemo(() => {
        const itemCount: { [key: string]: { count: number; revenue: number } } = {};
        
        // Filter only product sales
        const productTransactions = filteredTransactions.filter(t => 
            t.category === 'vendas' || t.type === 'product'
        );
        
        productTransactions.forEach(t => {
            const productName = t.service || t.product || 'Sem nome';
            
            // Split by comma to separate multiple products
            const items = productName.split(',').map(item => item.trim()).filter(item => item.length > 0);
            
            // If no items after split, use the original name
            const itemsToProcess = items.length > 0 ? items : [productName];
            
            // For each item, find its real price from products list
            itemsToProcess.forEach(item => {
                if (!itemCount[item]) {
                    itemCount[item] = { count: 0, revenue: 0 };
                }
                
                // Find the product by name (case insensitive, partial match)
                const foundProduct = products.find(p => 
                    p.name.toLowerCase().trim() === item.toLowerCase().trim() ||
                    item.toLowerCase().trim().includes(p.name.toLowerCase().trim()) ||
                    p.name.toLowerCase().trim().includes(item.toLowerCase().trim())
                );
                
                // Use the product's real price, or fallback to transaction value if not found
                const itemPrice = foundProduct ? foundProduct.price : (itemsToProcess.length === 1 ? t.value : 0);
                
                itemCount[item].count += 1;
                itemCount[item].revenue += itemPrice;
            });
        });
        
        return Object.entries(itemCount)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [filteredTransactions, products]);

    // Export functions
    const exportToCSV = () => {
        const headers = ['Data', 'Cliente/Produto', 'Tipo', 'Serviço', 'Método de Pagamento', 'Valor', 'Desconto'];
        const rows = sortedTransactions.map(t => [
            formatDate(t.date),
            getClientName(t.clientName),
            t.category === 'vendas' ? 'Venda' : t.category === 'agendado' ? 'Agendado' : 'Avulso',
            t.service || '-',
            t.paymentMethod || '-',
            t.value.toFixed(2).replace('.', ','),
            t.discount.toFixed(2).replace('.', ',')
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${getTodayLocalDate()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        // Simple CSV export (Excel can open CSV)
        exportToCSV();
    };

    const exportToPDF = () => {
        const dateRangeText = getDateRangeText();
        const periodText = periodComparison 
            ? ` (${periodComparison.difference >= 0 ? '+' : ''}${periodComparison.percentage.toFixed(1)}% vs período anterior)`
            : '';

        // Create print styles
        const printStyles = document.createElement('style');
        printStyles.textContent = `
            @media print {
                body * {
                    visibility: hidden;
                }
                .print-content, .print-content * {
                    visibility: visible;
                }
                .print-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                    padding: 20px;
                }
            }
            @media screen {
                .print-content {
                    display: none;
                }
            }
        `;
        document.head.appendChild(printStyles);

        // Create print content
        const printContent = document.createElement('div');
        printContent.className = 'print-content';
        printContent.innerHTML = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    padding: 20px;
                    color: #1f2937;
                    background: white;
                }
                .header {
                    margin-bottom: 30px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 20px;
                }
                .header h1 {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .header p {
                    color: #6b7280;
                    font-size: 14px;
                }
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .card {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 15px;
                }
                .card-label {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #6b7280;
                    font-weight: 600;
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
                }
                .card-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1f2937;
                }
                .section {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                }
                .section-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #1f2937;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }
                th {
                    background: #f9fafb;
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #6b7280;
                }
                td {
                    font-size: 14px;
                }
                .text-right {
                    text-align: right;
                }
                .badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .badge-venda { background: #fef3f2; color: #991b1b; }
                .badge-agendado { background: #eff6ff; color: #1e40af; }
                .badge-avulso { background: #f0fdf4; color: #166534; }
                @media print {
                    body { padding: 10px; }
                    .summary-cards { grid-template-columns: repeat(2, 1fr); }
                }
                @page {
                    margin: 1cm;
                }
            </style>
            <div class="header">
                <h1>Relatório Financeiro</h1>
                <p>Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                ${dateRangeText ? `<p>Período: ${dateRangeText}${periodText}</p>` : ''}
            </div>

            <div class="summary-cards">
                <div class="card">
                    <div class="card-label">${getTotalLabel()}</div>
                    <div class="card-value">${formatCurrency(totals.total)}</div>
                </div>
                <div class="card">
                    <div class="card-label">Total de Receitas</div>
                    <div class="card-value">${totals.count}</div>
                </div>
                <div class="card">
                    <div class="card-label">Serviços</div>
                    <div class="card-value">${totals.services}</div>
                </div>
                <div class="card">
                    <div class="card-label">Vendas</div>
                    <div class="card-value">${totals.sales}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Transações (${sortedTransactions.length})</div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cliente/Produto</th>
                            <th>Tipo</th>
                            <th>Serviço</th>
                            <th>Pagamento</th>
                            <th class="text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTransactions.map(t => {
                            const categoryLabel = t.category === 'vendas' ? 'Venda' : t.category === 'agendado' ? 'Agendado' : 'Avulso';
                            const categoryClass = t.category === 'vendas' ? 'badge-venda' : t.category === 'agendado' ? 'badge-agendado' : 'badge-avulso';
                            return `
                                <tr>
                                    <td>${formatDate(t.date)}</td>
                                    <td>${getClientName(t.clientName)}</td>
                                    <td><span class="badge ${categoryClass}">${categoryLabel}</span></td>
                                    <td>${t.service || '-'}</td>
                                    <td>${t.paymentMethod || '-'}</td>
                                    <td class="text-right">${formatCurrency(t.value)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.body.appendChild(printContent);

        // Trigger print
        window.print();

        // Cleanup after print dialog closes
        setTimeout(() => {
            document.body.removeChild(printContent);
            document.head.removeChild(printStyles);
        }, 100);
    };

    // Generate chart data based on date filter with categories
    // Note: chartData uses filteredTransactions to respect all active filters (date, type, payment, search)
    const chartData = useMemo(() => {
        const dateRange = getDateRange(dateFilter);
        if (!dateRange && dateFilter !== 'all-time') return [];

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
                const dateStr = formatLocalDate(currentDate);
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
            // Show weekly data for month - show all weeks that contain days of the month
            const weeks = [];
            const startStr = dateRange.start;
            const todayStr = getTodayLocalDate();
            const start = new Date(startStr + 'T00:00:00');
            const today = new Date();
            const currentYear = start.getFullYear();
            const currentMonth = start.getMonth();
            
            // Get the last day of the month (not just today)
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
            const lastDayStr = formatLocalDate(lastDayOfMonth);
            
            // Find the first day of the week that contains the first day of the month
            let weekStart = new Date(start);
            weekStart.setDate(start.getDate() - start.getDay()); // Go back to Sunday of that week
            
            // Calculate the last day of the last week that contains the last day of the month
            const lastWeekStart = new Date(lastDayOfMonth);
            lastWeekStart.setDate(lastDayOfMonth.getDate() - lastDayOfMonth.getDay());
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            
            // Iterate through all weeks that touch the month (even if no data yet)
            let weekNumber = 1;
            while (weekStart <= lastWeekEnd) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                const weekStartStr = formatLocalDate(weekStart);
                const weekEndStr = formatLocalDate(weekEnd);
                
                // Filter transactions that fall within this week
                // Since filteredTransactions is already filtered by month date range, we just check the week
                const weekTransactions = filteredTransactions.filter(t => {
                    const tDate = t.date;
                    // Transaction must be in this week (simple string comparison for YYYY-MM-DD format)
                    return tDate >= weekStartStr && tDate <= weekEndStr;
                });
                
                const vendas = weekTransactions.filter(t => t.category === 'vendas').reduce((sum, t) => sum + t.value, 0);
                const servicos = weekTransactions.filter(t => t.category === 'agendado' || t.category === 'avulso').reduce((sum, t) => sum + t.value, 0);
                
                weeks.push({
                    day: `Sem ${weekNumber}`,
                    vendas: vendas,
                    servicos: servicos
                });
                
                weekStart.setDate(weekStart.getDate() + 7);
                weekNumber++;
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 mt-4 sm:mt-6">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Relatórios</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">{totals.count} receita{totals.count !== 1 ? 's' : ''} registrada{totals.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={exportToCSV}
                        className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold flex items-center gap-2"
                        title="Exportar CSV"
                    >
                        <Icon name="download" className="text-base" />
                        <span className="hidden sm:inline">CSV</span>
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold flex items-center gap-2"
                        title="Exportar Excel"
                    >
                        <Icon name="table_chart" className="text-base" />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold flex items-center gap-2"
                        title="Exportar PDF"
                    >
                        <Icon name="picture_as_pdf" className="text-base" />
                        <span className="hidden sm:inline">PDF</span>
                    </button>
                </div>
            </div>

            {/* Search Bar - Discrete at top */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg" />
                    <input
                        type="text"
                        placeholder="Buscar cliente ou serviço..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <Icon name="close" className="text-lg" />
                        </button>
                    )}
                </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'all'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterType('vendas')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'vendas'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                    }`}
                >
                    Vendas
                </button>
                <button
                    onClick={() => setFilterType('servicos')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        filterType === 'servicos'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
                    }`}
                >
                    Serviços
                </button>
            </div>

            {/* Date Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
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
                    Geral
                </button>
                <button
                    onClick={() => setDateFilter('custom')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                        dateFilter === 'custom'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                >
                    <Icon name="date_range" className="text-base" />
                    <span className="hidden sm:inline">Período</span>
                    <span className="sm:hidden">Data</span>
                </button>
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === 'custom' && (
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Icon name="calendar_today" className="text-xl text-primary" />
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Selecione o Período:
                            </label>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">De:</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={customEndDate || getTodayLocalDate()}
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Até:</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    min={customStartDate}
                                    max={getTodayLocalDate()}
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            {customStartDate && customEndDate && (
                                <button
                                    onClick={() => {
                                        setCustomStartDate('');
                                        setCustomEndDate('');
                                    }}
                                    className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors flex items-center gap-1"
                                >
                                    <Icon name="close" className="text-base" />
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>
                    {customStartDate && customEndDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Mostrando dados de {new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Card: Total Geral */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border border-primary/30 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="payments" className="text-xl text-primary" />
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{getTotalLabel()}</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</p>
                    {getDateRangeText() && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">{getDateRangeText()}</p>
                    )}
                    {periodComparison && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <Icon 
                                name={periodComparison.difference >= 0 ? "trending_up" : "trending_down"} 
                                className={`text-sm ${periodComparison.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                            />
                            <span className={`text-xs font-semibold ${periodComparison.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {periodComparison.difference >= 0 ? '+' : ''}{periodComparison.percentage.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                vs período anterior
                            </span>
                        </div>
                    )}
                </div>

                {/* Card: Total de Receitas */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="receipt_long" className="text-xl text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total de Receitas</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{totals.services + totals.sales} transações</p>
                </div>

                {/* Card: Serviços */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="content_cut" className="text-xl text-indigo-600 dark:text-indigo-400" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Serviços</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.services}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{totals.services === 1 ? 'atendimento' : 'atendimentos'}</p>
                </div>

                {/* Card: Vendas */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="shopping_bag" className="text-xl text-purple-600 dark:text-purple-400" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vendas</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.sales}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{totals.sales === 1 ? 'produto vendido' : 'produtos vendidos'}</p>
                </div>
            </div>

            {/* Cards Adicionais - Segunda Linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {/* Card: Ticket Médio */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="trending_up" className="text-xl text-green-600 dark:text-green-400" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ticket Médio</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.averageTicket)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">por transação</p>
                </div>

                {/* Card: Total a Receber (Fiado Pendente) */}
                {totals.pendingInstallmentsCount > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="schedule" className="text-xl text-amber-700 dark:text-amber-400" />
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wide">A Receber (Fiado)</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">{formatCurrency(totals.totalReceivable)}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            {totals.pendingInstallmentsCount} {totals.pendingInstallmentsCount === 1 ? 'parcela pendente' : 'parcelas pendentes'}
                        </p>
                    </div>
                )}

                {/* Card: Recebimentos de Fiado (no período filtrado) */}
                {totals.creditSalesCount > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-300 dark:border-green-700 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="payments" className="text-xl text-green-700 dark:text-green-400" />
                            <p className="text-xs font-semibold text-green-900 dark:text-green-200 uppercase tracking-wide">Recebido (Fiado)</p>
                        </div>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-200">{formatCurrency(totals.creditSalesTotal)}</p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {totals.creditSalesCount} {totals.creditSalesCount === 1 ? 'parcela recebida' : 'parcelas recebidas'} no período
                        </p>
                    </div>
                )}
            </div>

            {/* Card: Meta Mensal (apenas quando filtro for 'month') */}
            {dateFilter === 'month' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 p-5 mb-8 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500 dark:bg-blue-600 rounded-lg p-2">
                                <Icon name="flag" className="text-2xl text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide">Meta do Mês</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatCurrency(totals.total)}</p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">de {formatCurrency(monthlyGoal)}</p>
                        </div>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="relative w-full h-3 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((totals.total / monthlyGoal) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            {((totals.total / monthlyGoal) * 100).toFixed(1)}% atingido
                        </p>
                        {totals.total >= monthlyGoal ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                                <Icon name="check_circle" className="text-sm" />
                                Meta alcançada! 🎉
                            </span>
                        ) : (
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Faltam {formatCurrency(Math.max(monthlyGoal - totals.total, 0))}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Charts with Tabs */}
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-8 shadow-sm">
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActiveChartTab('performance')}
                        className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                            activeChartTab === 'performance'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title="Desempenho"
                    >
                        <Icon name="bar_chart" className="text-base" />
                        <span className="hidden sm:inline">Desempenho</span>
                    </button>
                    {lineChartData.length > 0 && (
                        <button
                            onClick={() => setActiveChartTab('line')}
                            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                                activeChartTab === 'line'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                            title="Tendência"
                        >
                            <Icon name="show_chart" className="text-base" />
                            <span className="hidden sm:inline">Tendência</span>
                        </button>
                    )}
                    {pieChartData.length > 0 && (
                        <button
                            onClick={() => setActiveChartTab('pie')}
                            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                                activeChartTab === 'pie'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                            title="Distribuição"
                        >
                            <Icon name="pie_chart" className="text-base" />
                            <span className="hidden sm:inline">Distribuição</span>
                        </button>
                    )}
                    {peakHours.length > 0 && (
                        <button
                            onClick={() => setActiveChartTab('peak')}
                            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                                activeChartTab === 'peak'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                            title="Horários de Pico"
                        >
                            <Icon name="schedule" className="text-base" />
                            <span className="hidden sm:inline">Horários de Pico</span>
                        </button>
                    )}
                    {(topServices.length > 0 || topProducts.length > 0) && (
                        <button
                            onClick={() => setActiveChartTab('top')}
                            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                                activeChartTab === 'top'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                            title="Top Serviços"
                        >
                            <Icon name="star" className="text-base" />
                            <span className="hidden sm:inline">Top Serviços</span>
                        </button>
                    )}
                </div>

                {/* Chart Content */}
                <div 
                    ref={chartContainerRef}
                    className="relative overflow-hidden"
                    onTouchStart={(e) => {
                        // Only detect swipe if not on the scrollable chart area
                        const target = e.target as HTMLElement;
                        const isChartArea = target.closest('.chart-scroll-container');
                        if (isChartArea && scrollContainerRef.current && scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth) {
                            // User is on scrollable chart, don't handle swipe
                            return;
                        }
                        
                        const touch = e.touches[0];
                        if (touch) {
                            swipeStartRef.current = {
                                x: touch.clientX,
                                time: Date.now()
                            };
                        }
                    }}
                    onTouchEnd={(e) => {
                        if (!swipeStartRef.current) return;
                        
                        // Check if touch was on scrollable chart
                        const target = e.target as HTMLElement;
                        const isChartArea = target.closest('.chart-scroll-container');
                        if (isChartArea && scrollContainerRef.current && scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth) {
                            swipeStartRef.current = null;
                            return;
                        }
                        
                        const touch = e.changedTouches[0];
                        if (!touch) return;
                        
                        const deltaX = touch.clientX - swipeStartRef.current.x;
                        const deltaTime = Date.now() - swipeStartRef.current.time;
                        
                        // Only trigger swipe if movement is significant and quick
                        if (Math.abs(deltaX) > 50 && deltaTime < 300) {
                            const availableTabs: ('performance' | 'line' | 'pie' | 'peak' | 'top')[] = ['performance'];
                            if (lineChartData.length > 0) availableTabs.push('line');
                            if (pieChartData.length > 0) availableTabs.push('pie');
                            if (peakHours.length > 0) availableTabs.push('peak');
                            if (topServices.length > 0 || topProducts.length > 0) availableTabs.push('top');
                            
                            const currentIndex = availableTabs.indexOf(activeChartTab);
                            
                            if (deltaX > 0 && currentIndex > 0) {
                                // Swipe right - go to previous tab
                                setActiveChartTab(availableTabs[currentIndex - 1]);
                            } else if (deltaX < 0 && currentIndex < availableTabs.length - 1) {
                                // Swipe left - go to next tab
                                setActiveChartTab(availableTabs[currentIndex + 1]);
                            }
                        }
                        
                        swipeStartRef.current = null;
                    }}
                >
                    {/* Performance Chart */}
                    {activeChartTab === 'performance' && (
                        <div className="animate-fade-in">
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
                                        .scrollbar-hide {
                                            -ms-overflow-style: none;
                                            scrollbar-width: none;
                                        }
                                        .scrollbar-hide::-webkit-scrollbar {
                                            display: none;
                                        }
                                        @keyframes fade-in {
                                            from { opacity: 0; transform: translateY(-10px); }
                                            to { opacity: 1; transform: translateY(0); }
                                        }
                                        .animate-fade-in {
                                            animation: fade-in 0.3s ease-out;
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
                    )}

                    {/* Line Chart */}
                    {activeChartTab === 'line' && lineChartData.length > 0 && (
                        <div className="animate-fade-in">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Tendência Temporal</h3>
                            <div className="h-64 sm:h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                        <XAxis dataKey="date" tick={{ fill: 'rgb(107, 114, 128)', fontSize: 12 }} />
                                        <YAxis tickFormatter={(value) => `R$${value.toFixed(0)}`} tick={{ fill: 'rgb(107, 114, 128)' }} />
                                        <Tooltip
                                            formatter={(value: number) => [`R$ ${value.toFixed(2).replace('.', ',')}`, 'Total']}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Line type="monotone" dataKey="total" stroke="#ff0000" strokeWidth={2} dot={{ fill: '#ff0000', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Pie Chart */}
                    {activeChartTab === 'pie' && pieChartData.length > 0 && (
                        <div className="animate-fade-in">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Distribuição por Categoria</h3>
                            <div className="h-64 sm:h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieChartData.map((entry, index) => {
                                                const colors = ['#9333EA', '#3B82F6', '#10B981'];
                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                            })}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Peak Hours */}
                    {activeChartTab === 'peak' && peakHours.length > 0 && (
                        <div className="animate-fade-in">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Icon name="schedule" className="text-primary" />
                                Horários de Pico
                            </h3>
                            <div className="space-y-3">
                                {peakHours.map(({ hour, value }, index) => (
                                    <div key={hour} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                                index === 0 ? 'bg-primary' : index === 1 ? 'bg-blue-500' : 'bg-gray-500'
                                            }`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{hour}h - {hour + 1}h</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(value)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Services/Products */}
                    {activeChartTab === 'top' && (topServices.length > 0 || topProducts.length > 0) && (
                        <div className="animate-fade-in">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Icon name="star" className="text-primary" />
                                Top Serviços e Produtos
                            </h3>
                            
                            {/* Tabs */}
                            <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setTopServicesProductsTab('servicos')}
                                    className={`px-4 py-2 font-semibold text-sm transition-all relative ${
                                        topServicesProductsTab === 'servicos'
                                            ? 'text-primary'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Serviços
                                    {topServicesProductsTab === 'servicos' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setTopServicesProductsTab('produtos')}
                                    className={`px-4 py-2 font-semibold text-sm transition-all relative ${
                                        topServicesProductsTab === 'produtos'
                                            ? 'text-primary'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Produtos
                                    {topServicesProductsTab === 'produtos' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
                                    )}
                                </button>
                            </div>

                            {/* Services List */}
                            {topServicesProductsTab === 'servicos' && (
                                <div className="space-y-3">
                                    {topServices.length > 0 ? (
                                        topServices.map((item, index) => (
                                            <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                                        index === 0 ? 'bg-primary' : index === 1 ? 'bg-blue-500' : 'bg-gray-500'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">{item.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} {item.count === 1 ? 'venda' : 'vendas'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary">{formatCurrency(item.revenue)}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum serviço encontrado</p>
                                    )}
                                </div>
                            )}

                            {/* Products List */}
                            {topServicesProductsTab === 'produtos' && (
                                <div className="space-y-3">
                                    {topProducts.length > 0 ? (
                                        topProducts.map((item, index) => (
                                            <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                                        index === 0 ? 'bg-primary' : index === 1 ? 'bg-blue-500' : 'bg-gray-500'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">{item.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} {item.count === 1 ? 'venda' : 'vendas'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary">{formatCurrency(item.revenue)}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum produto encontrado</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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
                        const isCreditSale = isSale && transaction.service.includes('Fiado -');
                        return (
                            <div
                                key={transaction.id}
                                onClick={() => navigate(`/transaction/${transaction.id}`, { state: { from: 'reports' } })}
                                className={`rounded-lg border p-3 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] ${
                                    isCreditSale 
                                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700'
                                        : 'bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
                                }`}
                            >
                                {/* Mobile Layout */}
                                <div className="block sm:hidden">
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left side - Name, Date, Category */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white break-words mb-0.5 flex items-center gap-1.5 flex-wrap">
                                                {isSale ? (
                                                    <>
                                                        <Icon name="local_mall" className="text-base" style={{ color: isCreditSale ? '#f59e0b' : '#ff0000' }} />
                                                        <span>Venda de Produto</span>
                                                        {isCreditSale && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                                                                <Icon name="credit_card" className="text-xs" />
                                                                FIADO
                                                            </span>
                                                        )}
                                                    </>
                                                ) : transaction.category === 'agendado' ? (
                                                    <>
                                                        <Icon name="event_available" className="text-base" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="order_approve" className="text-base" style={{ color: '#ff0000' }} />
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
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                {isSale ? (
                                                    <>
                                                        <Icon name="local_mall" className="text-lg" style={{ color: isCreditSale ? '#f59e0b' : '#ff0000' }} />
                                                        <span>Venda de Produto</span>
                                                    </>
                                                ) : transaction.category === 'agendado' ? (
                                                    <>
                                                        <Icon name="event_available" className="text-lg" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="order_approve" className="text-lg" style={{ color: '#ff0000' }} />
                                                        <span>{getClientName(transaction.clientName)}</span>
                                                    </>
                                                )}
                                            </p>
                                            {isCreditSale && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                                                    <Icon name="credit_card" className="text-sm" />
                                                    FIADO
                                                </span>
                                            )}
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

