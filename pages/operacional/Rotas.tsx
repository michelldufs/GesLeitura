import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Route as RouteIcon, Plus, Edit2, Trash2 } from 'lucide-react';

interface Rota {
  id: string;
  nome: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}

interface Secao {
  id: string;
  nome: string;
  localidadeId: string;
}

interface Localidade {
  id: string;
  nome: string;
}

const Rotas: React.FC = () => {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [nome, setNome] = useState('');
  const [localidadeId, setLocalidadeId] = useState('');
  const [secaoId, setSecaoId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      setLocalidades(locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade)));

      const secQuery = query(collection(db, 'secoes'), where('active', '==', true));
      const secSnapshot = await getDocs(secQuery);
      setSecoes(secSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Secao)));

      const rotQuery = query(collection(db, 'rotas'), where('active', '==', true));
      const rotSnapshot = await getDocs(rotQuery);
      setRotas(rotSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rota)));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !secaoId || !localidadeId) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'rotas', editingId), { nome, secaoId, localidadeId });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'rotas'), {
          nome,
          secaoId,
          localidadeId,
          active: true
        });
      }
      setNome('');
      setSecaoId('');
      setLocalidadeId('');
      loadData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar rota');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rota: Rota) => {
    setNome(rota.nome);
    setLocalidadeId(rota.localidadeId);
    setSecaoId(rota.secaoId);
    setEditingId(rota.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta rota?')) return;

    try {
      await updateDoc(doc(db, 'rotas', id), { active: false });
      loadData();
    } catch (error) {
      console.error('Erro ao desativar:', error);
    }
  };

  const filteredSecoes = secoes.filter(s => s.localidadeId === localidadeId);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <RouteIcon className="text-green-600" size={28} />
          Gestão de Rotas
        </h1>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <select
              value={localidadeId}
              onChange={(e) => { setLocalidadeId(e.target.value); setSecaoId(''); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Localidade</option>
              {localidades.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.nome}</option>
              ))}
            </select>
            <select
              value={secaoId}
              onChange={(e) => setSecaoId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
              disabled={!localidadeId}
            >
              <option value="">Seção</option>
              {filteredSecoes.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.nome}</option>
              ))}
            </select>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da rota"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setNome(''); setLocalidadeId(''); setSecaoId(''); setEditingId(null); }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {editingId ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-2">
          {rotas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma rota cadastrada</p>
          ) : (
            rotas.map(rota => (
              <div key={rota.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <RouteIcon className="text-green-500" size={20} />
                  <div>
                    <span className="font-medium">{rota.nome}</span>
                    <p className="text-xs text-gray-500">
                      {secoes.find(s => s.id === rota.secaoId)?.nome || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(rota)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(rota.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
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

export default Rotas;
