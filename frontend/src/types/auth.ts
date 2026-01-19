export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    age?: number;
    city?: string;
    bio?: string;
    verified?: boolean;
}

export interface AuthResponse {
    access_token: string;
    user: User;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    age: number;
    city: string;
}

export interface RegisterResponse {
    message: string;
    email: string;
}

export interface VerifyEmailResponse {
    message: string;
}

export interface ResendVerificationResponse {
    message: string;
}
