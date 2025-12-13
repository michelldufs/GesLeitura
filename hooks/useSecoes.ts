import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Secao } from '../types';

// Hook para buscar seções
export const useSecoes = (localidadeId: string | null) => {
  return useQuery({
    queryKey: ['secoes', localidadeId],
    queryFn: async () => {
      if (!localidadeId) return [];

      const secQuery = query(
        collection(db, 'secoes'),
        where('active', '==', true),
        where('localidadeId', '==', localidadeId)
      );

      const snapshot = await getDocs(secQuery);
      const secoes = snapshot.docs.map(doc => ({
        id: doc.id,
        codigo: doc.data().codigo || '',
        nome: doc.data().nome || '',
        localidadeId: doc.data().localidadeId || '',
        active: doc.data().active !== false
      } as Secao));

      // Ordenar por código crescente
      secoes.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      return secoes;
    },
    enabled: !!localidadeId, // Só executa se tiver localidade
  });
};

// Hook para criar seção
export const useCreateSecao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Secao, 'id'>) => {
      const docRef = await addDoc(collection(db, 'secoes'), data);
      return docRef.id;
    },
    onSuccess: (_, variables) => {
      // Invalida o cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['secoes', variables.localidadeId] });
    },
  });
};

// Hook para atualizar seção
export const useUpdateSecao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Secao> }) => {
      await updateDoc(doc(db, 'secoes', id), data);
    },
    onSuccess: (_, variables) => {
      // Invalida o cache
      if (variables.data.localidadeId) {
        queryClient.invalidateQueries({ queryKey: ['secoes', variables.data.localidadeId] });
      }
    },
  });
};

// Hook para desativar seção
export const useDeleteSecao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, localidadeId }: { id: string; localidadeId: string }) => {
      await updateDoc(doc(db, 'secoes', id), { active: false });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['secoes', variables.localidadeId] });
    },
  });
};
