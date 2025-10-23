import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WEEKLY_REVENUE_DATA } from '../constants.ts';
import { Transaction } from '../types.ts';
import { useTransactions } from '../contexts.tsx';

interface KpiCardProps {
    title: string;
    value: string;
    icon: string;
    iconColor: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, iconColor }) => (
    <div className="rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6">
        <div className="flex items-center justify-between">
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-base font-medium">{title}</p>
            <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
        </div>
        <p className="text-text-light-primary dark:text-text-dark-primary text-3xl font-bold mt-2">{value}</p>
    </div>
);

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const paymentMethodStyles: { [key: string]: string } = {
        'PIX': 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
        'Crédito': 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
        'Dinheiro': 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400',
        'Débito': 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
    };
    
    const methods = transaction.paymentMethod.split(', ');

    const displayDate = useMemo(() => {
        try {
            const [year, month, day] = transaction.date.split('-');
            return `${day}/${month}/${year}`;
        } catch {
            return transaction.date; // Fallback for old format
        }
    }, [transaction.date]);

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <td className="whitespace-nowrap px-6 py-4 text-text-light-secondary dark:text-text-dark-secondary">{displayDate}</td>
            <td className="whitespace-nowrap px-6 py-4 font-medium text-text-light-primary dark:text-text-dark-primary">{transaction.clientName}</td>
            <td className="whitespace-nowrap px-6 py-4 text-text-light-secondary dark:text-text-dark-secondary">{transaction.service}</td>
            <td className="whitespace-nowrap px-6 py-4 text-text-light-secondary dark:text-text-dark-secondary">
                <div className="flex flex-wrap gap-1">
                {methods.map(method => (
                    <span key={method} className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${paymentMethodStyles[method] || 'bg-gray-100 text-gray-800'}`}>
                        {method}
                    </span>
                ))}
                </div>
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-text-light-primary dark:text-text-dark-primary">R$ {transaction.value.toFixed(2).replace('.', ',')}</td>
        </tr>
    );
};


export const ReportsPage: React.FC = () => {
    const { transactions } = useTransactions();

    const { totalRevenue, totalAppointments, averageTicket } = useMemo(() => {
        const revenue = transactions.reduce((acc, tx) => acc + tx.value, 0);
        const appointments = transactions.length;
        const ticket = appointments > 0 ? revenue / appointments : 0;
        return {
            totalRevenue: revenue,
            totalAppointments: appointments,
            averageTicket: ticket
        };
    }, [transactions]);
    
    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <header>
                <h1 className="text-text-light-primary dark:text-text-dark-primary text-4xl font-black leading-tight tracking-[-0.033em]">Relatório de Receitas</h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-base font-normal leading-normal mt-2">Analise o desempenho financeiro do seu negócio.</p>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard title="Receita Total" value={`R$ ${totalRevenue.toFixed(2).replace('.', ',')}`} icon="trending_up" iconColor="text-green-500" />
                <KpiCard title="Número de Atendimentos" value={totalAppointments.toString()} icon="receipt_long" iconColor="text-blue-500" />
                <KpiCard title="Ticket Médio" value={`R$ ${averageTicket.toFixed(2).replace('.', ',')}`} icon="attach_money" iconColor="text-orange-500" />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6">
                <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold">Desempenho Semanal</h3>
                <div className="mt-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={WEEKLY_REVENUE_DATA} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="day" tick={{ fill: 'var(--text-light-secondary)' }} className="text-xs" />
                            <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: 'var(--text-light-secondary)' }} className="text-xs" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--background-dark)',
                                    borderColor: 'var(--border-dark)',
                                    color: 'var(--text-dark-primary)'
                                }}
                                cursor={{ fill: 'rgba(212, 56, 17, 0.1)' }}
                            />
                            <Bar dataKey="revenue" fill="#d43811" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-3 font-medium text-text-light-primary dark:text-text-dark-primary" scope="col">Data</th>
                                <th className="px-6 py-3 font-medium text-text-light-primary dark:text-text-dark-primary" scope="col">Cliente</th>
                                <th className="px-6 py-3 font-medium text-text-light-primary dark:text-text-dark-primary" scope="col">Serviço Prestado</th>
                                <th className="px-6 py-3 font-medium text-text-light-primary dark:text-text-dark-primary" scope="col">Método de Pagamento</th>
                                <th className="px-6 py-3 font-medium text-text-light-primary dark:text-text-dark-primary text-right" scope="col">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                           {transactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-border-dark px-6 py-3">
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Exibindo {transactions.length} de {transactions.length} resultados</p>
                    <div className="flex gap-2">
                        <button disabled className="flex h-8 items-center justify-center rounded-lg border border-slate-300 dark:border-border-dark px-3 text-sm text-text-light-primary dark:text-text-dark-primary disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                        <button disabled className="flex h-8 items-center justify-center rounded-lg border border-slate-300 dark:border-border-dark px-3 text-sm text-text-light-primary dark:text-text-dark-primary disabled:opacity-50 disabled:cursor-not-allowed">Próximo</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
