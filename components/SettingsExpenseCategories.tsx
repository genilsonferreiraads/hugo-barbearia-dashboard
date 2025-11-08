import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseCategories } from '../contexts.tsx';
import { ExpenseCategory } from '../types.ts';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Cores pré-definidas para categorias
const PREDEFINED_COLORS = [
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amarelo', value: '#f59e0b' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cinza', value: '#6b7280' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Ciano', value: '#06b6d4' },
    { name: 'Verde Limão', value: '#84cc16' },
];

export const SettingsExpenseCategoriesPage: React.FC = () => {
    const navigate = useNavigate();
    const { categories, addCategory, updateCategory, deleteCategory } = useExpenseCategories();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        color: '#6b7280',
    });

    const handleOpenModal = (category: ExpenseCategory | null = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                color: category.color,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                color: '#6b7280',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            color: '#6b7280',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setToast({ message: 'Nome da categoria é obrigatório', type: 'error' });
            return;
        }

        try {
            setIsSubmitting(true);
            if (editingCategory) {
                await updateCategory(editingCategory.id, {
                    name: formData.name.trim(),
                    color: formData.color,
                });
                setToast({ message: 'Categoria atualizada com sucesso!', type: 'success' });
            } else {
                await addCategory({
                    name: formData.name.trim(),
                    color: formData.color,
                });
                setToast({ message: 'Categoria criada com sucesso!', type: 'success' });
            }
            handleCloseModal();
        } catch (error: any) {
            setIsSubmitting(false);
            setToast({
                message: `Erro ao ${editingCategory ? 'atualizar' : 'criar'} categoria: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria? Despesas com esta categoria não serão removidas, mas perderão a categoria.')) {
            return;
        }

        try {
            await deleteCategory(id);
            setToast({ message: 'Categoria excluída com sucesso!', type: 'success' });
        } catch (error: any) {
            setToast({
                message: `Erro ao excluir categoria: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
                    <div className="flex items-start gap-2 sm:gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/settings')}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm shrink-0 mt-0.5"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>

                        <div className="text-center flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                Categorias de Despesas
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie as categorias de despesas</p>
                        </div>

                        <div className="w-10 sm:w-16" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
                    >
                        <Icon name="add" />
                        <span>Nova Categoria</span>
                    </button>
                </div>

                {/* Categories List */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15]">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Categorias ({categories.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {categories.length === 0 ? (
                            <div className="p-8 text-center">
                                <Icon name="category" className="text-5xl text-zinc-300 dark:text-zinc-700 mb-2" />
                                <p className="text-zinc-500 dark:text-zinc-400">Nenhuma categoria cadastrada</p>
                                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Clique em "Nova Categoria" para adicionar</p>
                            </div>
                        ) : (
                            categories.map((category) => (
                                <div key={category.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: category.color }}
                                            >
                                                <Icon name="category" className="text-white text-xl" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-zinc-900 dark:text-white">
                                                    {category.name}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {category.color}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(category)}
                                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Editar categoria"
                                            >
                                                <Icon name="edit" className="text-base" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Excluir categoria"
                                            >
                                                <Icon name="delete" className="text-base" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={handleCloseModal}
                >
                    <div
                        className="w-full max-w-md rounded-xl bg-white dark:bg-[#1a1a1a] shadow-2xl border border-gray-200 dark:border-zinc-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-6 py-4">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-gray-400"
                            >
                                <Icon name="close" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                    Nome da Categoria *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-10 px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                    placeholder="Ex: Aluguel, Materiais, etc."
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                    Cor
                                </label>
                                <div className="grid grid-cols-5 gap-2 mb-3">
                                    {PREDEFINED_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: color.value })}
                                            className={`h-10 rounded-lg border-2 transition-all ${
                                                formData.color === color.value
                                                    ? 'border-gray-900 dark:border-white scale-110'
                                                    : 'border-gray-300 dark:border-gray-700 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting ? 'Salvando...' : editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

