import React from 'react';
import { Layout } from './Layout.tsx';
import { PageTransitionProvider } from './PageTransitionContext.tsx';

export const PageTransitionWrapper: React.FC = () => {
    return (
        <PageTransitionProvider>
            <Layout />
        </PageTransitionProvider>
    );
};

