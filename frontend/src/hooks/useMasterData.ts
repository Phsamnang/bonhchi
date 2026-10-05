import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useProducts(supplierId?: string | number | null) {
  return useQuery<Product[]>({
    queryKey: ["products", supplierId || "all"],
    queryFn: async () => {
      const url = supplierId
        ? `/master/products?supplier_id=${supplierId}`
        : "/master/products";
      const { data } = await api.get(url);
      return data;
    },
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
