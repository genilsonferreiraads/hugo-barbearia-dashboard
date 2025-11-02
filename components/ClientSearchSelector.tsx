import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useClients } from '../contexts.tsx';
import { Client } from '../types.ts';

interface ClientSearchSelectorProps {
    onSelectClient: (client: Client | null) => void;
    value?: string; // Nome do cliente atual (para edit mode)
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void; // Callback para quando o valor do input muda
    onNewClient?: (clientName: string) => void; // Callback para quando o usuário quer criar novo cliente
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const ClientSearchSelector: React.FC<ClientSearchSelectorProps> = ({
    onSelectClient,
    value = '',
    placeholder = 'Buscar cliente...',
    className = '',
    disabled = false,
    onValueChange,
    onNewClient
}) => {
    const { clients } = useClients();
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filtrar clientes baseado no termo de busca (apenas se houver texto)
    const filteredClients = useMemo(() => {
        // Se não houver termo de busca OU o termo estiver vazio após trim, não mostrar nada
        if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
            return [];
        }
        const search = searchTerm.trim().toLowerCase();
        
        // Filtrar clientes que correspondem ao termo de busca
        const filtered = clients.filter(client => {
            // Buscar no nome completo (obrigatório ter correspondência)
            if (client.fullName) {
                const nameLower = client.fullName.toLowerCase();
                if (nameLower.includes(search)) {
                    return true;
                }
            }
            
            // Buscar no apelido
            if (client.nickname) {
                const nicknameLower = client.nickname.toLowerCase();
                if (nicknameLower.includes(search)) {
                    return true;
                }
            }
            
            // Buscar no WhatsApp (apenas números, mas só se o termo tiver números)
            if (client.whatsapp && /\d/.test(search)) {
                const whatsappNumbers = client.whatsapp.replace(/\D/g, '');
                const searchNumbers = search.replace(/\D/g, '');
                if (searchNumbers.length > 0 && whatsappNumbers.includes(searchNumbers)) {
                    return true;
                }
            }
            
            // Buscar no CPF (apenas números, mas só se o termo tiver números)
            if (client.cpf && /\d/.test(search)) {
                const cpfNumbers = client.cpf.replace(/\D/g, '');
                const searchNumbers = search.replace(/\D/g, '');
                if (searchNumbers.length > 0 && cpfNumbers.includes(searchNumbers)) {
                    return true;
                }
            }
            
            // Se nenhuma correspondência foi encontrada, não incluir
            return false;
        });
        
        // Limitar a 5 resultados
        return filtered.slice(0, 5);
    }, [searchTerm, clients]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Inicializar apenas na primeira montagem
    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current && value) {
            isInitialized.current = true;
            const found = clients.find(c => c.fullName.toLowerCase() === value.toLowerCase());
            if (found && found.fullName === value) {
                setSelectedClient(found);
                setSearchTerm(found.fullName);
            } else {
                setSearchTerm(value);
            }
        }
    }, []); // Apenas na montagem

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        
        // SEMPRE limpar seleção quando o usuário digita (crucial para filtrar)
        if (selectedClient) {
            setSelectedClient(null);
            onSelectClient(null);
        }
        
        // SEMPRE atualizar searchTerm primeiro para permitir filtragem em tempo real
        setSearchTerm(term);
        
        // Notificar o componente pai sobre a mudança do valor
        if (onValueChange) {
            onValueChange(term);
        }
        
        // Se limpar o campo, fechar dropdown
        if (term === '' || !term.trim()) {
            setIsOpen(false);
        } else {
            // Abrir dropdown quando houver texto (para mostrar resultados filtrados)
            setIsOpen(true);
        }
    };

    const handleSelectClient = (client: Client) => {
        // Fechar a lista IMEDIATAMENTE
        setIsOpen(false);
        
        // Atualizar o estado
        setSelectedClient(client);
        setSearchTerm(client.fullName);
        onSelectClient(client);
        
        // Fazer blur para garantir que o foco saia
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.blur();
            }
        }, 10);
    };

    const handleClear = () => {
        setSelectedClient(null);
        setSearchTerm('');
        setIsOpen(false);
        onSelectClient(null);
        inputRef.current?.focus();
    };

    // SEMPRE usar searchTerm como valor do input para permitir edição e filtragem
    // Isso garante que o que o usuário digita é exibido e usado para filtrar
    const displayValue = searchTerm || '';

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <Icon 
                    name="person_search" 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg pointer-events-none z-10" 
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        // Quando focar no campo, abrir dropdown se houver texto
                        if (searchTerm.length > 0) {
                            // Se há cliente selecionado mas o texto não corresponde, limpar seleção
                            if (selectedClient && selectedClient.fullName !== searchTerm) {
                                setSelectedClient(null);
                                onSelectClient(null);
                            }
                            // Abrir dropdown para mostrar resultados filtrados
                            setIsOpen(true);
                        }
                    }}
                    onClick={(e) => {
                        // Quando clicar no input, abrir dropdown se houver texto
                        e.stopPropagation(); // Evitar propagação do evento
                        if (searchTerm.length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full pl-10 ${selectedClient && searchTerm === selectedClient.fullName ? 'pr-10' : 'pr-10'} py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    autoComplete="off"
                />
                {selectedClient && !disabled && searchTerm === selectedClient.fullName && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <Icon name="close" className="text-lg" />
                    </button>
                )}
            </div>

            {/* Dropdown de resultados - SEMPRE usar filteredClients, nunca clients diretamente */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Botão Novo Cliente - aparece quando há texto digitado */}
                    {searchTerm.trim() && onNewClient && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onNewClient) {
                                    onNewClient(searchTerm.trim());
                                }
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 transition-colors border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-left"
                        >
                            <Icon name="person_add" className="text-primary text-xl flex-shrink-0" />
                            <div className="flex-1">
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                    Novo Cliente: "{searchTerm.trim()}"
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Salvar como novo cliente na base de dados
                                </div>
                            </div>
                        </button>
                    )}
                    
                    {/* Lista de clientes encontrados */}
                    {filteredClients.length > 0 && filteredClients.map((client) => (
                        <button
                            key={client.id}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectClient(client);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Icon name="person" className="text-primary text-xl" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                        {client.fullName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {client.whatsapp}
                                        {client.nickname && ` • ${client.nickname}`}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                    
                    {/* Mensagem quando não há resultados E não há texto digitado */}
                    {filteredClients.length === 0 && !searchTerm.trim() && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            Digite para buscar clientes
                        </div>
                    )}
                    
                    {/* Mensagem quando não há resultados mas há texto digitado (aparece abaixo do botão Novo Cliente) */}
                    {filteredClients.length === 0 && searchTerm.trim() && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                            Nenhum cliente encontrado
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
