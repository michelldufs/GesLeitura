import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Rota } from '../types';

// Hook para buscar rotas
export const useRotas = (localidadeId: string | null) => {
  return useQuery({
    queryKey: ['rotas', localidadeId],
    queryFn: async () => {
      if (!localidadeId) return [];

      const rotQuery = query(
        collection(db, 'rotas'),
        where('active', '==', true),
        where('localidadeId', '==', localidadeId)
      );

      const snapshot = await getDocs(rotQuery);
      const rotas = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          secaoId: data.secaoId,
          localidadeId: data.localidadeId,
          active: data.active
        } as Rota;
      });

      // Ordenar por código crescente
      rotas.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      return rotas;
    },
    enabled: !!localidadeId,
  });
};

// Hook para criar rota
export const useCreateRota = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Rota, 'id'>) => {
      const docRef = await addDoc(collection(db, 'rotas'), data);
      return docRef.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rotas', variables.localidadeId] });
    },
  });
};

// Hook para atualizar rota
export const useUpdateRota = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Rota> }) => {
      await updateDoc(doc(db, 'rotas', id), data);
    },
    onSuccess: (_, variables) => {
      if (variables.data.localidadeId) {
        queryClient.invalidateQueries({ queryKey: ['rotas', variables.data.localidadeId] });
      }
    },
  });
};

// Hook para desativar rota
export const useDeleteRota = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, localidadeId }: { id: string; localidadeId: string }) => {
      await updateDoc(doc(db, 'rotas', id), { active: false });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rotas', variables.localidadeId] });
    },
  });
};
