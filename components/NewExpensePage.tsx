import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenses, useExpenseCategories } from '../contexts.tsx';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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

export const NewExpensePage: React.FC = () => {
    const navigate = useNavigate();
    const { addExpense } = useExpenses();
    const { categories } = useExpenseCategories();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        date: getTodayLocalDate(),
        category: '',
    });
    const quickAmounts = ['50,00', '100,00', '150,00', '200,00'];
    const descriptionSuggestions = ['Aluguel do espaço', 'Compra de materiais', 'Marketing digital', 'Pagamento da equipe'];
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            await addExpense({
                description: formData.description.trim(),
                amount: amount,
                date: formData.date,
                category: formData.category.trim() || undefined,
            });

            setToast({ message: 'Despesa registrada com sucesso!', type: 'success' });

            // Aguardar um pouco para mostrar o Toast e então navegar
            setTimeout(() => {
                navigate('/financial');
            }, 1000);
        } catch (error: any) {
            setIsSubmitting(false);
            setToast({
                message: `Erro ao registrar despesa: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        }
    };

    const handleBack = () => {
        navigate('/financial');
    };

    const formattedHeadingDate = useMemo(() => {
        if (!formData.date) return '';
        try {
            return new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
            });
        } catch {
            return '';
        }
    }, [formData.date]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCategorySelect = (value: string) => {
        setFormData({ ...formData, category: value });
        setIsCategoryDropdownOpen(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fbf5ef] via-white to-[#f1f4ff] dark:from-background-dark dark:via-gray-900 dark:to-gray-950 flex flex-col">
            <header className="sticky top-0 z-40 bg-transparent">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 border border-white/60 dark:border-white/5 backdrop-blur-xl shadow-xl p-4 sm:p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                            >
                                <Icon name="arrow_back" className="text-lg" />
                                Voltar
                            </button>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                <Icon name="note_add" className="text-base" />
                                Registro manual
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Financeiro</p>
                            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Nova despesa</h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Registre o gasto com uma experiência mais elegante</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs uppercase font-semibold text-gray-400">Para</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formattedHeadingDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div className="space-y-5">
                            {/* Description */}
                            <div className="bg-white dark:bg-gray-900/70 rounded-2xl p-5 border border-gray-200/70 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                                        <Icon name="drive_file_rename_outline" className="text-lg" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Detalhes</p>
                                        <p className="text-sm text-gray-400">Como você quer reconhecer essa despesa no futuro?</p>
                                    </div>
                                </div>
                                <label className="block space-y-3">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                        Descrição *
                                    </p>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-12 px-4 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30 transition-all"
                                        placeholder="Ex: Aluguel do salão, materiais, salário..."
                                        required
                                        autoFocus
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {descriptionSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        description: prev.description
                                                            ? `${prev.description}; ${suggestion}`
                                                            : suggestion,
                                                    }))
                                                }
                                                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary/60 hover:text-primary transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </label>
                            </div>

                            {/* Amount */}
                            <div className="bg-white dark:bg-gray-900/70 rounded-2xl p-5 border border-gray-200/70 dark:border-gray-800 shadow-sm space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200">
                                        <Icon name="attach_money" className="text-lg" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Valor</p>
                                        <p className="text-sm text-gray-400">Quanto saiu do caixa?</p>
                                    </div>
                                </div>
                                <label className="block space-y-2">
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 dark:text-gray-500 text-base font-semibold">R$</span>
                                        <input
                                            type="text"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: formatAmountInput(e.target.value) })}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-14 pl-14 pr-4 text-2xl font-black text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30 transition-all tracking-tight"
                                            placeholder="0,00"
                                            required
                                        />
                                    </div>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {quickAmounts.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, amount: value })}
                                            className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-primary/60 hover:text-primary transition-colors"
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date & Category */}
                            <div className="bg-white dark:bg-gray-900/70 rounded-2xl p-5 border border-gray-200/70 dark:border-gray-800 shadow-sm space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <label className="block space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Icon name="event" className="text-sm text-primary" />
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                                                Data *
                                            </p>
                                        </div>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-12 px-4 text-base text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30 transition-all"
                                            required
                                        />
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon name="category" className="text-sm text-primary" />
                                                <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                                                    Categoria
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/settings/expense-categories');
                                                }}
                                                className="text-xs text-primary hover:text-primary/80 font-semibold"
                                            >
                                                Gerenciar
                                            </button>
                                        </div>
                                        <div className="relative" ref={categoryDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-12 px-4 text-base text-gray-900 dark:text-white focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30 transition-all flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <span className={formData.category ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                                                    {formData.category || 'Selecione uma categoria'}
                                                </span>
                                                <Icon name={isCategoryDropdownOpen ? 'expand_less' : 'expand_more'} className="text-gray-400 dark:text-gray-500" />
                                            </button>
                                            {isCategoryDropdownOpen && (
                                                <div className="absolute z-30 bottom-full mb-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/95 shadow-2xl max-h-64 overflow-y-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCategorySelect('')}
                                                        className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center justify-between ${
                                                            formData.category === '' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                                                        } hover:bg-primary/10`}
                                                    >
                                                        Nenhuma categoria
                                                        {formData.category === '' && <Icon name="check" className="text-base" />}
                                                    </button>
                                                    {categories.map((category) => (
                                                        <button
                                                            key={category.id}
                                                            type="button"
                                                            onClick={() => handleCategorySelect(category.name)}
                                                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                                                formData.category === category.name ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <span className="inline-flex size-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                                                                {category.name}
                                                            </span>
                                                            {formData.category === category.name && <Icon name="check" className="text-base" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl bg-white dark:bg-gray-900/70 border border-gray-200/70 dark:border-gray-800 p-5 shadow-sm">
                                <p className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-[0.4em]">Dicas rápidas</p>
                                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                    <p className="flex items-start gap-2">
                                        <Icon name="bolt" className="text-primary mt-0.5 text-base" />
                                        Use descrições padronizadas para facilitar relatórios mensais.
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <Icon name="category" className="text-primary mt-0.5 text-base" />
                                        Categorias organizam seu fluxo e ajudam no planejamento.
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <Icon name="calendar_month" className="text-primary mt-0.5 text-base" />
                                        Ajuste a data para lançar despesas passadas ou futuras facilmente.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/25 dark:to-primary/10 border border-primary/30 p-5 shadow-sm">
                                <p className="text-xs uppercase font-semibold text-primary tracking-[0.4em] mb-3">Resumo</p>
                                <p className="text-sm text-primary/80 dark:text-primary/90">
                                    Você está registrando uma despesa em <span className="font-semibold">{formData.category || 'Categoria geral'}</span> no valor de <span className="font-semibold">{formData.amount || '0,00'}</span>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 sm:justify-end flex-wrap sm:flex-nowrap">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 sm:flex-auto px-6 h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-auto px-6 h-12 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="inline-block size-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                                    <span>Registrando...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="check_circle" className="text-base" />
                                    <span>Registrar Despesa</span>
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

