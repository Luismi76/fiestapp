'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
            setUser(response.user);
            router.push('/experiences');
        } catch (error) {
            const axiosError = error as AxiosError<ApiErrorResponse>;
            throw new Error(axiosError.response?.data?.message || 'Error al iniciar sesión');
        }
    }, [router]);

    const register = useCallback(async (data: RegisterData): Promise<string> => {
        try {
            const response = await authApi.register(data);
            return response.email;
        } catch (error) {
            const axiosError = error as AxiosError<ApiErrorResponse>;
            throw new Error(axiosError.response?.data?.message || 'Error al registrarse');
        }
    }, []);

    // Used after Google OAuth callback - cookie is already set by backend
    const loginWithToken = useCallback(async () => {
        try {
            const userData = await authApi.getProfile();
            setUser(userData);
            router.push('/experiences');
        } catch {
            // Cookie invalid
        }
    }, [router]);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Ignore errors on logout
        }
        setUser(null);
        router.push('/');
    }, [router]);

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
