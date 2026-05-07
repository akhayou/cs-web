import { useState, useCallback } from 'react';

export function useToast() {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((type, message) => {
        setToast({ type, message });

        setTimeout(() => {
            setToast(null);
        }, 3500);
    }, []);

    return { toast, showToast };
}

// const [toast, setToast] = useState(null);

// export const showToast = (type, message) => {
//     setToast({ type, message });
//     setTimeout(() => setToast(null), 3500);
// };
