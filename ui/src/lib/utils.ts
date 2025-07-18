import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePath(path: string): string {
  return path
    .replace(/\/+/g, '/') // Replace double slashes
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/^\/+/, '') // Remove leading slashes
} 