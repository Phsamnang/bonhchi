import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RestaurantTable {
  id: number;
  name: string;
  code?: string | null;
  capacity?: number | null;
  status: string;
  sort_order: number;
  is_active: boolean;
}

export function useTables() {
  return useQuery<RestaurantTable[]>({
    queryKey: ["tables"],
    queryFn: async () => {
      const { data } = await api.get("/tables");
      return data;
    },
    staleTime: 60000,
  });
}

export function useCreateTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      code?: string;
      capacity?: number;
      status?: string;
      sort_order?: number;
    }) => {
      const { data } = await api.post("/tables", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useUpdateTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
      name?: string;
      code?: string;
      capacity?: number;
      status?: string;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      const { data } = await api.put(`/tables/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useDeleteTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/tables/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}
