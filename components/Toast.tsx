import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const Toast: React.FC<ToastProps> = ({ message, type, duration = 4000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    text: 'text-green-800 dark:text-green-200',
                    icon: 'check_circle',
                    iconColor: 'text-green-600 dark:text-green-400',
                };
            case 'error':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-800 dark:text-red-200',
                    icon: 'error',
                    iconColor: 'text-red-600 dark:text-red-400',
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    text: 'text-yellow-800 dark:text-yellow-200',
                    icon: 'warning',
                    iconColor: 'text-yellow-600 dark:text-yellow-400',
                };
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-800 dark:text-blue-200',
                    icon: 'info',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                };
        }
    };

    const styles = getStyles();

    return (
        <div className={`fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up`}>
            <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 shadow-lg flex items-start gap-3`}>
                <Icon name={styles.icon} className={`${styles.iconColor} text-2xl flex-shrink-0 mt-0.5`} />
                
                <div className="flex-1">
                    <p className={`${styles.text} font-medium text-sm`}>{message}</p>
                </div>

                <button
                    onClick={onClose}
                    className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                >
                    <Icon name="close" className="text-xl" />
                </button>
            </div>

            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};
