'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { User, LoginData, RegisterData } from '@/types/auth';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
    message?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginData) => Promise<void>;
    loginWithToken: () => Promise<void>;
    register: (data: RegisterData) => Promise<string>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const routerRef = useRef(router);
    useEffect(() => { routerRef.current = router; }, [router]);

    // Check if user is logged in on mount (cookie is sent automatically)
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await authApi.getProfile();
                setUser(userData);
            } catch {
                // Not authenticated - cookie invalid or missing
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = useCallback(async (data: LoginData) => {
        try {
            const response = await authApi.login(data);
            // Comprobar si requiere 2FA
            if ('requiresTwoFactor' in response && (response as { requiresTwoFactor: boolean }).requiresTwoFactor) {
                throw new Error('Se requiere verificación en dos pasos. Contacta al administrador.');
            }
            setUser(response.user);
            const isNewUser = !response.user.avatar && !response.user.bio;
            routerRef.current.push(isNewUser ? '/dashboard' : '/experiences');
        } catch (error) {
            if (error instanceof Error && error.message.includes('verificación en dos pasos')) {
                throw error;
            }
            const axiosError = error as AxiosError<ApiErrorResponse>;
            const status = axiosError.response?.status;
            const message = axiosError.response?.data?.message || '';
            const err = new Error(message || 'Error al iniciar sesión');
            (err as Error & { status?: number }).status = status;
            throw err;
        }
    }, []);

    const register = useCallback(async (data: RegisterData): Promise<string> => {
        try {
            const response = await authApi.register(data);
            return response.email;
        } catch (error) {
            const axiosError = error as AxiosError<ApiErrorResponse>;
            const status = axiosError.response?.status;
            const message = axiosError.response?.data?.message || '';
            const err = new Error(message || 'Error al registrarse');
            (err as Error & { status?: number }).status = status;
            throw err;
        }
    }, []);

    // Used after Google OAuth callback - cookie is already set by backend
    const loginWithToken = useCallback(async () => {
        try {
            const userData = await authApi.getProfile();
            setUser(userData);
            const isNewUser = !userData.avatar && !userData.bio;
            routerRef.current.push(isNewUser ? '/dashboard' : '/experiences');
        } catch {
            // Cookie invalid
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Ignore errors on logout
        }
        setUser(null);
        // Limpiar datos de sesión del localStorage
        try {
            localStorage.removeItem('eval_code');
            localStorage.removeItem('eval_name');
            localStorage.removeItem('experience_draft');
        } catch {
            // localStorage puede no estar disponible
        }
        routerRef.current.push('/');
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const userData = await authApi.getProfile();
            setUser(userData);
        } catch {
            // Si falla, no hacer nada
        }
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        login,
        loginWithToken,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
    }), [user, loading, login, loginWithToken, register, logout, refreshUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
