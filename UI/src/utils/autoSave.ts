/**
 * Auto-save hook for form data
 * Automatically saves form data to localStorage
 */

import { useEffect } from 'react';

interface AutoSaveOptions {
  key: string;
  delay?: number; // milliseconds
  onSave?: () => void;
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
): void {
  const { key, delay = 30000, onSave } = options;

  useEffect(() => {
    if (!data) return;

    const timer = setInterval(() => {
      try {
        localStorage.setItem(key, JSON.stringify({
          ...data,
          _savedAt: Date.now()
        }));
        
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Failed to auto-save:', error);
      }
    }, delay);

    return () => clearInterval(timer);
  }, [data, key, delay, onSave]);
}

export function loadAutoSaved<T>(key: string, maxAgeHours: number = 24): T | null {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    const savedAt = parsed._savedAt || 0;
    const ageHours = (Date.now() - savedAt) / (1000 * 60 * 60);

    if (ageHours > maxAgeHours) {
      // Too old, remove it
      localStorage.removeItem(key);
      return null;
    }

    // Remove metadata
    delete parsed._savedAt;
    return parsed as T;
  } catch (error) {
    console.error('Failed to load auto-saved data:', error);
    return null;
  }
}

export function clearAutoSaved(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear auto-saved data:', error);
  }
}

