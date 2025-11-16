import React, { useState, useEffect } from 'react';
import { useProducts } from '../contexts.tsx';
import { Product } from '../types.ts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product }) => {
  const { addProduct, updateProduct } = useProducts();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price.toFixed(2).replace('.', ','));
    } else {
      setName('');
      setPrice('');
    }
  }, [product, isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePriceChange = (value: string) => {
    // Remove tudo que não é número
    let digits = value.replace(/\D/g, '');
    
    if (!digits) {
      setPrice('');
      return;
    }
    
    // Remove zeros à esquerda
    digits = digits.replace(/^0+/, '') || '0';
    
    // Garante pelo menos 2 dígitos
    if (digits.length === 1) {
      setPrice('0,0' + digits);
      return;
    }
    
    if (digits.length === 2) {
      setPrice('0,' + digits);
      return;
    }
    
    // Para 3+ dígitos, últimos 2 são decimais
    const intPart = digits.slice(0, -2);
    const decimalPart = digits.slice(-2);
    
    setPrice(intPart + ',' + decimalPart);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("Por favor, preencha o nome do produto.");
      return;
    }

    const priceNumber = parseFloat(price.replace(',', '.'));
    if (isNaN(priceNumber) || priceNumber <= 0) {
      alert("Por favor, preencha um preço válido maior que zero.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (product) {
        await updateProduct({ ...product, name: name.trim(), price: priceNumber });
      } else {
        await addProduct({ name: name.trim(), price: priceNumber });
      }
      onClose();
      setName('');
      setPrice('');
    } catch (error: any) {
      console.error("Failed to save product:", error);
      alert(`Falha ao salvar produto: ${error.message || 'Erro desconhecido.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-slide-up border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={handleModalContentClick}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary to-red-600 rounded-xl shadow-lg shadow-primary/25">
                <Icon name={product ? "edit" : "add"} className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {product ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {product ? 'Atualize as informações' : 'Cadastre um novo produto'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product Name */}
          <div>
            <label className="block">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name="shopping_bag" className="text-primary text-base" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  Nome do Produto
                </span>
                <span className="text-red-500 text-xs">*</span>
              </div>
              <input
                required
                autoFocus
                type="text"
                className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 transition-all font-medium text-sm"
                placeholder="Ex: Pomada, Shampoo, Cera..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </label>
          </div>

          {/* Price */}
          <div>
            <label className="block">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name="payments" className="text-primary text-base" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  Preço
                </span>
                <span className="text-red-500 text-xs">*</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold text-sm">
                  R$
                </span>
                <input
                  required
                  type="text"
                  className="w-full h-10 pl-10 pr-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 transition-all font-bold text-base"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                />
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
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
                product ? 'Atualizar' : 'Adicionar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
