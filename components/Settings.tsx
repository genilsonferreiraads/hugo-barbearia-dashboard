import React, { useState } from 'react';
import { useServices, useProducts, useTheme } from '../contexts.tsx';
import { Service, Product } from '../types.ts';
import { ServiceModal } from './ServiceModal.tsx';
import { ProductModal } from './ProductModal.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined">{name}</span>;

export const SettingsPage: React.FC = () => {
  const { services, deleteService } = useServices();
  const { products, deleteProduct } = useProducts();
  const { theme, setTheme } = useTheme();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const handleOpenServiceModal = (service: Service | null = null) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleCloseServiceModal = () => {
    setIsServiceModalOpen(false);
    setServiceToEdit(null);
  };

  const handleOpenProductModal = (product: Product | null = null) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setProductToEdit(null);
  };

  const handleDeleteService = async (serviceId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await deleteService(serviceId);
      } catch (error: any) {
        console.error("Failed to delete service:", error);
        alert(`Falha ao excluir serviço: ${error.message || 'Erro desconhecido.'}`);
      }
    }
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
      <header className="mb-8">
        <h1 className="text-text-light-primary dark:text-text-dark-primary text-4xl font-black leading-tight tracking-[-0.033em]">Configurações</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary text-base font-normal leading-normal mt-2">
          Gerencie as informações e preferências da sua barbearia.
        </p>
      </header>

      <div className="bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
        <div className="p-6 border-b border-slate-200 dark:border-border-dark flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Gestão de Serviços
          </h2>
          <button
            onClick={() => handleOpenServiceModal()}
            className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="add" />
            <span>Adicionar Serviço</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {services.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-border-dark">
              {services.map(service => (
                <li key={service.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{service.name}</p>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenServiceModal(service)}
                      className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label={`Editar ${service.name}`}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      aria-label={`Excluir ${service.name}`}
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-text-light-secondary dark:text-text-dark-secondary py-8">
              Nenhum serviço cadastrado. Adicione um para começar.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
        <div className="p-6 border-b border-slate-200 dark:border-border-dark flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Gestão de Produtos
          </h2>
          <button
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="add" />
            <span>Adicionar Produto</span>
          </button>
        </div>

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

      <div className="mt-8 bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
        <div className="p-6 border-b border-slate-200 dark:border-border-dark">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Aparência
            </h2>
        </div>
        <div className="p-6 flex flex-wrap items-center gap-4">
            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">Tema do Sistema</p>
            <div className="flex h-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-[#181211] p-1">
                <button 
                    onClick={() => setTheme('light')}
                    className={`flex h-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors ${
                        theme === 'light' 
                        ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                    Claro
                </button>
                <button 
                    onClick={() => setTheme('dark')}
                    className={`flex h-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors ${
                        theme === 'dark' 
                        ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                    Escuro
                </button>
            </div>
        </div>
      </div>

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={handleCloseServiceModal}
        service={serviceToEdit}
      />
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        product={productToEdit}
      />
    </div>
  );
};
