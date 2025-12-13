import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { DespesaGeral, CentroCusto } from '../types';

// Hook para buscar despesas
export const useDespesas = (localidadeId: string | null) => {
  return useQuery({
    queryKey: ['despesas', localidadeId],
    queryFn: async () => {
      if (!localidadeId) return [];

      const despesasQuery = query(
        collection(db, 'despesasGerais'),
        where('active', '==', true),
        where('localidadeId', '==', localidadeId)
      );

      const snapshot = await getDocs(despesasQuery);
      const despesas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DespesaGeral));

      // Ordenar por data decrescente
      despesas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      return despesas;
    },
    enabled: !!localidadeId,
  });
};

// Hook para buscar centros de custo
export const useCentrosCusto = (localidadeId: string | null) => {
  return useQuery({
    queryKey: ['centrosCusto', localidadeId],
    queryFn: async () => {
      if (!localidadeId) return [];

      const ccQuery = query(
        collection(db, 'centrosCusto'),
        where('active', '==', true),
        where('localidadeId', '==', localidadeId)
      );

      const snapshot = await getDocs(ccQuery);
      const centros = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CentroCusto));

      // Ordenar por nome crescente
      centros.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      return centros;
    },
    enabled: !!localidadeId,
  });
};

// Hook para criar despesa
export const useCreateDespesa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DespesaGeral, 'id'>) => {
      const docRef = await addDoc(collection(db, 'despesasGerais'), data);
      return docRef.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['despesas', variables.localidadeId] });
    },
  });
};

// Hook para atualizar despesa
export const useUpdateDespesa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DespesaGeral> }) => {
      await updateDoc(doc(db, 'despesasGerais', id), data);
    },
    onSuccess: (_, variables) => {
      if (variables.data.localidadeId) {
        queryClient.invalidateQueries({ queryKey: ['despesas', variables.data.localidadeId] });
      }
    },
  });
};

// Hook para desativar despesa
export const useDeleteDespesa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, localidadeId }: { id: string; localidadeId: string }) => {
      await updateDoc(doc(db, 'despesasGerais', id), { active: false });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['despesas', variables.localidadeId] });
    },
  });
};

// Hook para criar centro de custo
export const useCreateCentroCusto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CentroCusto, 'id'>) => {
      const docRef = await addDoc(collection(db, 'centrosCusto'), data);
      return docRef.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['centrosCusto', variables.localidadeId] });
    },
  });
};

// Hook para atualizar centro de custo
export const useUpdateCentroCusto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CentroCusto> }) => {
      await updateDoc(doc(db, 'centrosCusto', id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centrosCusto'] });
    },
  });
};

// Hook para desativar centro de custo
export const useDeleteCentroCusto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, localidadeId }: { id: string; localidadeId: string }) => {
      await updateDoc(doc(db, 'centrosCusto', id), { active: false });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['centrosCusto', variables.localidadeId] });
    },
  });
};
