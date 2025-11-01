import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts.tsx';
import { Product } from '../types.ts';
import { ProductModal } from './ProductModal.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined">{name}</span>;

export const SettingsProductsPage: React.FC = () => {
  const { products, deleteProduct } = useProducts();
  const navigate = useNavigate();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const handleOpenProductModal = (product: Product | null = null) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setProductToEdit(null);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(productId);
      } catch (error: any) {
        console.error("Failed to delete product:", error);
        alert(`Falha ao excluir produto: ${error.message || 'Erro desconhecido.'}`);
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header with Back Button */}
      <header className="mb-8">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors mb-4"
        >
          <Icon name="arrow_back" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-light-primary dark:text-text-dark-primary text-4xl font-black leading-tight tracking-[-0.033em]">Gestão de Produtos</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-base font-normal leading-normal mt-2">
              Cadastre e gerencie os produtos vendidos pela sua barbearia.
            </p>
          </div>
          <button
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="add" />
            <span>Adicionar Produto</span>
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
        <div className="p-6 space-y-4">
          {products.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-border-dark">
              {products.map(product => (
                <li key={product.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{product.name}</p>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenProductModal(product)}
                      className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label={`Editar ${product.name}`}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      aria-label={`Excluir ${product.name}`}
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-text-light-secondary dark:text-text-dark-secondary py-8">
              Nenhum produto cadastrado. Adicione um para começar.
            </p>
          )}
        </div>
      </div>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        product={productToEdit}
      />
    </div>
  );
};

