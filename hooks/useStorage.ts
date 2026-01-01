import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, useRef } from 'react';

export function useStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const currentValueRef = useRef<T>(initialValue);

  const loadValue = useCallback(async (): Promise<T | null> => {
    try {
      const item = await AsyncStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
        currentValueRef.current = parsed;
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error loading from storage:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    loadValue();
  }, [loadValue]);

  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(currentValueRef.current) : value;
        setStoredValue(valueToStore);
        currentValueRef.current = valueToStore;
        setVersion(v => v + 1);
        await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error saving to storage:', error);
      }
    },
    [key]
  );

  // Reload function to refresh data from storage
  // Returns the loaded value so callers can use it immediately
  const reload = useCallback(async (): Promise<T | null> => {
    const result = await loadValue();
    setVersion(v => v + 1);
    return result;
  }, [loadValue]);

  return [storedValue, setValue, loading, reload, version] as const;
}
