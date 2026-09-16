export declare enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN"
}
export interface IUser {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    currency?: string;
    role: UserRole;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface RegisterDto {
    email: string;
    password: string;
    fullName: string;
    currency?: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface AuthResponse {
    user: IUser;
    accessToken: string;
}
