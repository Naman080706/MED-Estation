const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
    params?: Record<string, string | number>;
}

/**
 * Standardized fetch wrapper to handle JSON and errors seamlessly for our backend.
 */
export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    // Construct Search Params
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
        const query = new URLSearchParams(
            Object.entries(params).map(([key, val]) => [key, String(val)])
        ).toString();
        url += `?${query}`;
    }

    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...fetchOptions.headers,
        },
        ...fetchOptions,
    });

    if (!res.ok) {
        let errorMsg = "API Error";
        try {
            const errorData = await res.json();
            errorMsg = errorData.detail || errorMsg;
        } catch {
            errorMsg = res.statusText || errorMsg;
        }
        throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
}
