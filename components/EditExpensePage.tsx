import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExpenses, useExpenseCategories } from '../contexts.tsx';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Format amount input
const formatAmountInput = (value: string): string => {
    let digits = value.replace(/\D/g, '');
    if (!digits) return '0,00';
    digits = digits.replace(/^0+/, '') || '0';
    if (digits.length === 1) {
        digits = '0' + digits;
    }
    if (digits.length === 2) {
        return '0,' + digits;
    }
    const intPart = digits.slice(0, -2);
    const decimalPart = digits.slice(-2);
    return intPart + ',' + decimalPart;
};

export const EditExpensePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { expenses, updateExpense } = useExpenses();
    const { categories } = useExpenseCategories();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const expense = expenses.find(e => e.id === Number(id));

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        date: '',
        category: '',
    });

    // Preencher formulário quando despesa for carregada
    useEffect(() => {
        if (expense) {
            setFormData({
                description: expense.description,
                amount: expense.amount.toFixed(2).replace('.', ','),
                date: expense.date,
                category: expense.category || '',
            });
        }
    }, [expense]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!expense) {
            setToast({ message: 'Despesa não encontrada', type: 'error' });
            return;
        }

        // Validação
        if (!formData.description.trim()) {
            setToast({ message: 'Descrição é obrigatória', type: 'error' });
            return;
        }

        const amount = parseFloat(formData.amount.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            setToast({ message: 'Valor inválido', type: 'error' });
            return;
        }

        if (!formData.date) {
            setToast({ message: 'Data é obrigatória', type: 'error' });
            return;
        }

        try {
            setIsSubmitting(true);
            await updateExpense(expense.id, {
                description: formData.description.trim(),
                amount: amount,
                date: formData.date,
                category: formData.category.trim() || undefined,
            });

            setToast({ message: 'Despesa atualizada com sucesso!', type: 'success' });

            // Aguardar um pouco para mostrar o Toast e então navegar
            setTimeout(() => {
                navigate('/financial');
            }, 1000);
        } catch (error: any) {
            setIsSubmitting(false);
            setToast({
                message: `Erro ao atualizar despesa: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        }
    };

    const handleBack = () => {
        navigate('/financial');
    };

    if (!expense) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Icon name="error" className="text-5xl text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Despesa não encontrada</p>
                    <button
                        onClick={handleBack}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
                    <div className="flex items-start gap-2 sm:gap-4">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm shrink-0 mt-0.5"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>

                        <div className="text-center flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                Editar Despesa
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Edite as informações da despesa</p>
                        </div>

                        <div className="w-10 sm:w-16" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Description */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <label className="block space-y-2">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                Descrição *
                            </p>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                placeholder="Ex: Aluguel, Materiais, Salário, etc."
                                required
                                autoFocus
                            />
                        </label>
                    </div>

                    {/* Amount */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <label className="block space-y-2">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                Valor *
                            </p>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-600 text-sm">R$</span>
                                <input
                                    type="text"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: formatAmountInput(e.target.value) })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 pl-10 pr-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </label>
                    </div>

                    {/* Date */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <label className="block space-y-2">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                Data *
                            </p>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 px-3 text-sm text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                required
                            />
                        </label>
                    </div>

                    {/* Category */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <label className="block space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                    Categoria <span className="text-gray-500 text-xs">(Opcional)</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/settings/expense-categories')}
                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                >
                                    Gerenciar categorias
                                </button>
                            </div>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 px-3 text-sm text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                            >
                                <option value="">Selecione uma categoria...</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 sm:justify-end flex-wrap sm:flex-nowrap">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 sm:flex-auto px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-auto px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="check_circle" className="text-base" />
                                    <span>Salvar Alterações</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

