import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionContextType {
    transitionStage: 'entering' | 'entered';
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export const usePageTransition = () => {
    const context = useContext(PageTransitionContext);
    if (!context) throw new Error('usePageTransition must be used within a PageTransitionProvider');
    return context;
};

export const PageTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const [transitionStage, setTransitionStage] = useState<'entering' | 'entered'>('entered');

    useEffect(() => {
        setTransitionStage('entering');
        const timer = setTimeout(() => {
            setTransitionStage('entered');
        }, 500); // Match animation duration
        return () => clearTimeout(timer);
    }, [location.pathname, location.search]);

    return (
        <PageTransitionContext.Provider value={{ transitionStage }}>
            {children}
        </PageTransitionContext.Provider>
    );
};

