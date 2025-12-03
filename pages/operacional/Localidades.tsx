import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import { Localidade } from '../../types';

const Localidades: React.FC = () => {
  const { userProfile } = useAuth();
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [nome, setNome] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLocalidades();
  }, []);

  const loadLocalidades = async () => {
    try {
      const q = query(collection(db, 'localidades'), where('active', '==', true));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade));
      setLocalidades(data);
    } catch (error) {
      console.error('Erro ao carregar localidades:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setLoading(true);
    try {
      if (editingId) {
        // Update
        await updateDoc(doc(db, 'localidades', editingId), { nome });
        setEditingId(null);
      } else {
        // Create
        await addDoc(collection(db, 'localidades'), {
          nome,
          active: true
        });
      }
      setNome('');
      loadLocalidades();
    } catch (error: any) {
      console.error('Erro ao salvar localidade:', error);
      const message = error?.message || 'Erro ao salvar localidade';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (localidade: Localidade) => {
    setNome(localidade.nome);
    setEditingId(localidade.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta localidade?')) return;

    try {
      await updateDoc(doc(db, 'localidades', id), { active: false });
      loadLocalidades();
    } catch (error: any) {
      console.error('Erro ao desativar localidade:', error);
      const message = error?.message || 'Erro ao desativar localidade';
      alert(message);
    }
  };

  const handleCancel = () => {
    setNome('');
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MapPin className="text-blue-600" size={28} />
          Gestão de Localidades
        </h1>

        {/* Aviso de permissão */}
        {userProfile && !['admin','gerente'].includes(userProfile.role) && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
            Seu perfil ({userProfile.role}) não possui permissão para cadastrar localidades.
            Solicite a um administrador ou ajuste as regras do Firestore conforme o arquivo FIRESTORE_STRUCTURE.md.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da localidade"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !userProfile || !['admin','gerente'].includes(userProfile.role)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
            >
              <Plus size={20} />
              {editingId ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {localidades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma localidade cadastrada</p>
          ) : (
            localidades.map(localidade => (
              <div
                key={localidade.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="text-blue-500" size={20} />
                  <span className="font-medium">{localidade.nome}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(localidade)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(localidade.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Desativar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Localidades;
