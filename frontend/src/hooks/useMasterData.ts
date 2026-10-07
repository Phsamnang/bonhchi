import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Product {
  id: string | number;
  name: string;
  unit: string;
  price: number;
  cur: "USD" | "KHR";
  supplier_id?: string | number | null;
  supplier_name?: string | null;
  is_active?: boolean;
}

export interface Shop {
  id: string | number;
  name: string;
  market_location?: string;
  contact_phone?: string;
  note?: string;
  product_count?: number;
  products?: Product[];
}

export interface ProductPage {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  products: Product[];
}

/**
 * One page of products (server-side pagination + name search).
 * `supplierId` null/undefined = all suppliers. Never loads the whole catalog at once.
 */
export function useProductPage(
  supplierId: string | number | null | undefined,
  {
    page = 1,
    limit = 20,
    search = "",
    enabled = true,
  }: { page?: number; limit?: number; search?: string; enabled?: boolean } = {}
) {
  return useQuery<ProductPage>({
    queryKey: ["products", supplierId || "all", "page", page, limit, search],
    queryFn: async () => {
      const { data } = await api.get("/master/products", {
        params: { supplier_id: supplierId || undefined, page, limit, search: search || undefined },
      });
      return data;
    },
    enabled,
    // Keep showing the current page while the next one loads (no flash of "empty")
    placeholderData: keepPreviousData,
  });
}

export function useShops() {
  return useQuery<Shop[]>({
    queryKey: ["shops"],
    queryFn: async () => {
      const { data } = await api.get("/master/shops");
      return data;
    },
  });
}

export function useSupplierDetails(supplierId: string | number | null) {
  return useQuery<Shop>({
    queryKey: ["supplier", supplierId],
    queryFn: async () => {
      if (!supplierId) return null as any;
      const { data } = await api.get(`/master/shops/${supplierId}`);
      return data;
    },
    enabled: !!supplierId,
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      market_location?: string;
      contact_phone?: string;
      note?: string;
    }) => {
      const { data } = await api.post("/master/shops", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
    },
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      unit: string;
      price: number;
      cur: "USD" | "KHR";
      supplier_id?: string | number | null;
    }) => {
      const { data } = await api.post("/master/products", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await api.delete(`/master/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
    },
  });
}
