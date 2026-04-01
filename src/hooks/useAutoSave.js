import { useState, useEffect, useRef } from 'react';

/**
 * A custom hook to handle automatic saving of data with a debounce mechanism.
 * @param {any} initialData - The initial data state.
 * @param {Function} saveCallback - The function to call when saving (receives data).
 * @param {number} delay - The debounce delay in milliseconds (default 1000ms).
 * @returns {Array} - [data, setData, isSaving, lastSaved]
 */
export const useAutoSave = (initialData, saveCallback, delay = 1000) => {
  const [data, setData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout for auto-saving
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveCallback(data);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, saveCallback, delay]);

  return [data, setData, isSaving, lastSaved];
};

export default useAutoSave;
