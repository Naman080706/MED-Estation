const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getInventory: () =>
    request<any[]>("/api/v1/inventory/"),
  getAlerts: () =>
    request<any[]>("/api/v1/alerts/"),
  getDashboardSummary: () =>
    request<any>("/api/v1/reports/dashboard-summary"),
  getSalesTrends: (days = 30) =>
    request<any[]>(`/api/v1/reports/sales-trends?days=${days}`),
  getWasteAnalytics: () =>
    request<any[]>("/api/v1/reports/waste-heatmap"),
  getSuppliers: () =>
    request<any[]>("/api/v1/suppliers/"),
  createSupplier: (body: any) =>
    request<any>("/api/v1/suppliers/", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  chatWithAgent: (message: string) =>
    request<any>("/api/v1/chatbot/query", {
      method: "POST",
      body: JSON.stringify({ message })
    })
};

