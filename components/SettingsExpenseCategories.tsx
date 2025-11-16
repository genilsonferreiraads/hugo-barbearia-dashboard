import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseCategories } from '../contexts.tsx';
import { ExpenseCategory } from '../types.ts';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

// Função para determinar o ícone baseado no nome da categoria
const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    // Aluguel / Imóvel
    if (name.includes('aluguel') || name.includes('imovel') || name.includes('imóvel') || name.includes('condominio') || name.includes('condomínio')) {
        return 'home';
    }
    // Salários / Funcionários
    if (name.includes('salario') || name.includes('salário') || name.includes('funcionario') || name.includes('funcionário') || name.includes('folha') || name.includes('pessoal')) {
        return 'badge';
    }
    // Energia / Luz
    if (name.includes('energia') || name.includes('luz') || name.includes('eletric')) {
        return 'bolt';
    }
    // Água
    if (name.includes('agua') || name.includes('água')) {
        return 'water_drop';
    }
    // Internet / Telefone
    if (name.includes('internet') || name.includes('telefone') || name.includes('celular') || name.includes('wifi')) {
        return 'wifi';
    }
    // Marketing / Publicidade
    if (name.includes('marketing') || name.includes('publicidade') || name.includes('propaganda') || name.includes('anuncio') || name.includes('anúncio')) {
        return 'campaign';
    }
    // Materiais / Produtos
    if (name.includes('material') || name.includes('produto') || name.includes('estoque') || name.includes('insumo')) {
        return 'inventory_2';
    }
    // Equipamentos / Ferramentas
    if (name.includes('equipamento') || name.includes('ferramenta') || name.includes('maquina') || name.includes('máquina')) {
        return 'build';
    }
    // Manutenção / Reparo
    if (name.includes('manutencao') || name.includes('manutenção') || name.includes('reparo') || name.includes('conserto')) {
        return 'handyman';
    }
    // Limpeza
    if (name.includes('limpeza') || name.includes('higiene')) {
        return 'cleaning_services';
    }
    // Transporte / Combustível
    if (name.includes('transporte') || name.includes('combustivel') || name.includes('combustível') || name.includes('gasolina') || name.includes('frete')) {
        return 'local_shipping';
    }
    // Alimentação
    if (name.includes('alimentacao') || name.includes('alimentação') || name.includes('comida') || name.includes('cafe') || name.includes('café')) {
        return 'restaurant';
    }
    // Impostos / Taxas
    if (name.includes('imposto') || name.includes('taxa') || name.includes('tributo')) {
        return 'receipt_long';
    }
    // Contabilidade / Contador
    if (name.includes('contabil') || name.includes('contador') || name.includes('contadora')) {
        return 'calculate';
    }
    // Cursos / Treinamento
    if (name.includes('curso') || name.includes('treinamento') || name.includes('capacitacao') || name.includes('capacitação')) {
        return 'school';
    }
    // Saúde / Plano de Saúde
    if (name.includes('saude') || name.includes('saúde') || name.includes('medico') || name.includes('médico') || name.includes('plano')) {
        return 'medical_services';
    }
    // Banco / Financeiro
    if (name.includes('banco') || name.includes('financ') || name.includes('juros') || name.includes('emprestimo') || name.includes('empréstimo')) {
        return 'account_balance';
    }
    // Software / Sistema
    if (name.includes('software') || name.includes('sistema') || name.includes('app') || name.includes('licenca') || name.includes('licença')) {
        return 'computer';
    }
    // Diversos / Outros
    if (name.includes('diversos') || name.includes('outros') || name.includes('geral')) {
        return 'more_horiz';
    }
    
    // Ícone padrão
    return 'category';
};

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
    const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
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
                setToast({ message: 'Categoria atualizada!', type: 'success' });
            } else {
                await addCategory({
                    name: formData.name.trim(),
                    color: formData.color,
                });
                setToast({ message: 'Categoria criada!', type: 'success' });
            }
            handleCloseModal();
        } catch (error: any) {
            setToast({
                message: `Erro: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (category: ExpenseCategory) => {
        setCategoryToDelete(category);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await deleteCategory(categoryToDelete.id);
            setToast({ message: 'Categoria excluída!', type: 'success' });
            setCategoryToDelete(null);
        } catch (error: any) {
            setToast({
                message: `Erro ao excluir: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <style>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .animate-slide-in-up {
                    animation: slideInUp 0.4s ease-out;
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <button
                            onClick={() => navigate('/settings')}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm font-medium"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="hidden sm:inline">Voltar</span>
                        </button>

                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-semibold py-2 px-4 rounded-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Icon name="add" className="text-lg" />
                            <span className="hidden sm:inline">Nova Categoria</span>
                            <span className="sm:hidden">Nova</span>
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                Categorias de Despesas
                            </h1>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Organize suas despesas por categorias personalizadas
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                {categories.length === 0 ? (
                    // Empty State
                    <div className="animate-slide-in-up bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center">
                            <Icon name="category" className="text-4xl text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            Nenhuma categoria cadastrada
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Crie categorias para organizar suas despesas
                        </p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="inline-flex items-center gap-2 bg-primary hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
                        >
                            <Icon name="add" className="text-lg" />
                            <span>Criar Primeira Categoria</span>
                        </button>
                    </div>
                ) : (
                    // Categories Grid
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {categories.map((category, index) => (
                            <div
                                key={category.id}
                                className="animate-slide-in-up group bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                {/* Background Decoration */}
                                <div 
                                    className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
                                    style={{ backgroundColor: category.color }}
                                ></div>
                                
                                <div className="relative">
                                    {/* Icon & Title */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="p-2.5 rounded-lg shadow-sm"
                                                style={{ backgroundColor: category.color }}
                                            >
                                                <Icon name={getCategoryIcon(category.name)} className="text-white text-xl" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                                                    {category.name}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Color Info */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-6 h-6 rounded-md border-2 border-gray-200 dark:border-gray-700"
                                                style={{ backgroundColor: category.color }}
                                            ></div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {category.color}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(category)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium text-sm transition-all"
                                        >
                                            <Icon name="edit" className="text-base" />
                                            <span>Editar</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(category)}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-medium text-sm transition-all"
                                        >
                                            <Icon name="delete" className="text-base" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Category Count */}
                {categories.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total de <span className="font-bold text-primary">{categories.length}</span> {categories.length === 1 ? 'categoria' : 'categorias'}
                        </p>
                    </div>
                )}
            </main>

            {/* Category Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={handleCloseModal}
                >
                    <div
                        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-slide-in-up border border-gray-200 dark:border-gray-800 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent p-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-primary to-red-600 rounded-xl shadow-lg shadow-primary/25">
                                        <Icon name={editingCategory ? "edit" : "add"} className="text-white text-2xl" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                                        </h2>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            {editingCategory ? 'Atualize as informações' : 'Crie uma nova categoria'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
                                >
                                    <Icon name="close" className="text-xl" />
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Icon name="label" className="text-primary text-base" />
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            Nome da Categoria
                                        </span>
                                        <span className="text-red-500 text-xs">*</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 transition-all font-medium text-sm"
                                        placeholder="Ex: Aluguel, Materiais, Salários..."
                                        required
                                        autoFocus
                                    />
                                </label>
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="block">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="palette" className="text-primary text-base" />
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            Cor da Categoria
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 mb-2">
                                        {PREDEFINED_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: color.value })}
                                                className={`h-10 rounded-lg border-2 transition-all ${
                                                    formData.color === color.value
                                                        ? 'border-primary scale-110 ring-2 ring-primary/30'
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
                                        className="w-full h-10 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                                    />
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Salvando...
                                        </span>
                                    ) : (
                                        editingCategory ? 'Atualizar' : 'Criar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {categoryToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-slide-in-up border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl flex-shrink-0">
                                <Icon name="warning" className="text-red-600 dark:text-red-400 text-3xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Confirmar Exclusão
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Tem certeza que deseja excluir:
                                </p>
                                <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span 
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: categoryToDelete.color }}
                                    ></span>
                                    {categoryToDelete.name}?
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Despesas com esta categoria não serão removidas
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setCategoryToDelete(null)}
                                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30"
                            >
                                Excluir
                            </button>
                        </div>
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
