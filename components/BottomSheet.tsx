import React, { useEffect, useRef, useCallback, useState } from 'react';

export interface BottomSheetOption {
    id: string | number;
    label: string;
    icon?: string;
    color?: string;
}

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    options: BottomSheetOption[];
    selectedValue?: string | number;
    onSelect: (value: string | number) => void;
    title?: string;
    emptyMessage?: string;
    triggerRef?: React.RefObject<HTMLElement>; // Referência ao botão que abre o menu
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    options,
    selectedValue,
    onSelect,
    title = 'Selecione uma opção',
    emptyMessage = 'Nenhuma opção disponível',
    triggerRef,
}) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [isDesktop, setIsDesktop] = useState(false);

    // Detectar se é desktop
    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const handleClose = useCallback(() => {
        if (!isDesktop) {
            if (sheetRef.current) {
                sheetRef.current.style.transform = 'translateY(100%)';
            }
            if (overlayRef.current) {
                overlayRef.current.style.opacity = '0';
            }
        }
        setTimeout(() => {
            onClose();
        }, isDesktop ? 0 : 300);
    }, [onClose, isDesktop]);

    useEffect(() => {
        if (isOpen && !isDesktop) {
            // Prevenir scroll do body quando o bottom sheet está aberto (apenas mobile)
            document.body.style.overflow = 'hidden';
            
            // Animar a entrada
            setTimeout(() => {
                if (overlayRef.current) {
                    overlayRef.current.style.opacity = '1';
                }
                if (sheetRef.current) {
                    sheetRef.current.style.transform = 'translateY(0)';
                }
            }, 10);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, isDesktop]);

    // Fechar com a tecla Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, handleClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            handleClose();
        }
    };

    const handleSelect = (value: string | number) => {
        onSelect(value);
        handleClose();
    };

    if (!isOpen) return null;

    // Renderização para desktop (dropdown)
    if (isDesktop) {
        return (
            <>
                {/* Overlay transparente para fechar ao clicar fora */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={handleClose}
                />
                {/* Dropdown */}
                <div
                    ref={sheetRef}
                    className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    style={{
                        animation: 'fadeIn 0.15s ease-out',
                    }}
                >
                    {/* Header do Dropdown */}
                    {title && (
                        <div className="px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                                {title}
                            </h3>
                        </div>
                    )}
                    
                    {/* Lista de Opções */}
                    <div className="py-0.5 max-h-48 overflow-y-auto">
                        {options.length === 0 ? (
                            <div className="px-2.5 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                                {emptyMessage}
                            </div>
                        ) : (
                            options.map((option) => {
                                const isSelected = selectedValue === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect(option.id)}
                                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-left group ${
                                            isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                                        }`}
                                    >
                                        {/* Ícone */}
                                        {option.icon && (
                                            <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                                isSelected 
                                                    ? 'bg-primary/10 dark:bg-primary/20' 
                                                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                                            }`}>
                                                <span 
                                                    className="material-symbols-outlined text-sm"
                                                    style={{ color: isSelected ? 'var(--primary)' : option.color || '#6b7280' }}
                                                >
                                                    {option.icon}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Label */}
                                        <span className={`flex-1 font-medium ${
                                            isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'
                                        }`}>
                                            {option.label}
                                        </span>
                                        
                                        {/* Check icon quando selecionado */}
                                        {isSelected && (
                                            <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white" style={{ fontSize: '10px' }}>
                                                    check
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    /* Scrollbar customizada */
                    .overflow-y-auto::-webkit-scrollbar {
                        width: 6px;
                    }
                    
                    .overflow-y-auto::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    
                    .overflow-y-auto::-webkit-scrollbar-thumb {
                        background: rgba(156, 163, 175, 0.3);
                        border-radius: 3px;
                    }
                    
                    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                        background: rgba(156, 163, 175, 0.5);
                    }
                    
                    .dark .overflow-y-auto::-webkit-scrollbar-thumb {
                        background: rgba(75, 85, 99, 0.5);
                    }
                    
                    .dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                        background: rgba(75, 85, 99, 0.7);
                    }
                `}</style>
            </>
        );
    }

    // Renderização para mobile (bottom sheet)
    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-end justify-center p-0"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: 0,
                transition: 'opacity 0.3s ease-out',
            }}
            onClick={handleOverlayClick}
        >
            <div
                ref={sheetRef}
                className="w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
                style={{
                    transform: 'translateY(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2 sm:pt-4">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 sm:px-6 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                </div>

                {/* Options list */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-3">
                    {options.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {emptyMessage}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {options.map((option) => {
                                const isSelected = selectedValue === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect(option.id)}
                                        className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors text-left group"
                                    >
                                        {/* Icon/Color indicator */}
                                        {option.icon ? (
                                            <span
                                                className="material-symbols-outlined text-xl"
                                                style={{
                                                    color: option.color || '#6b7280',
                                                }}
                                            >
                                                {option.icon}
                                            </span>
                                        ) : option.color ? (
                                            <div
                                                className="w-5 h-5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: option.color }}
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                                        )}

                                        {/* Label */}
                                        <span
                                            className={`flex-1 text-sm font-medium ${
                                                isSelected
                                                    ? 'text-primary dark:text-primary'
                                                    : 'text-gray-900 dark:text-white'
                                            }`}
                                        >
                                            {option.label}
                                        </span>

                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <span className="material-symbols-outlined text-primary text-xl">
                                                check_circle
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bottom padding for safe area */}
                <div className="h-4 sm:h-6" />
            </div>
        </div>
    );
};

