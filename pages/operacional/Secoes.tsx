import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Layers, Plus, Edit2, Trash2 } from 'lucide-react';

interface Secao {
  id: string;
  nome: string;
  localidadeId: string;
  active: boolean;
}

interface Localidade {
  id: string;
  nome: string;
}

const Secoes: React.FC = () => {
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [nome, setNome] = useState('');
  const [localidadeId, setLocalidadeId] = useState('');
  const [filterLocalidadeId, setFilterLocalidadeId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load localidades
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      const locData = locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade));
      setLocalidades(locData);

      // Load secoes
      const secQuery = query(collection(db, 'secoes'), where('active', '==', true));
      const secSnapshot = await getDocs(secQuery);
      const secData = secSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Secao));
      setSecoes(secData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !localidadeId) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'secoes', editingId), { nome, localidadeId });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'secoes'), {
          nome,
          localidadeId,
          active: true
        });
      }
      setNome('');
      setLocalidadeId('');
      loadData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar seção');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (secao: Secao) => {
    setNome(secao.nome);
    setLocalidadeId(secao.localidadeId);
    setEditingId(secao.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta seção?')) return;

    try {
      await updateDoc(doc(db, 'secoes', id), { active: false });
      loadData();
    } catch (error) {
      console.error('Erro ao desativar:', error);
      alert('Erro ao desativar seção');
    }
  };

  const getLocalidadeNome = (id: string) => {
    return localidades.find(l => l.id === id)?.nome || 'N/A';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Layers className="text-purple-600" size={28} />
          Gestão de Seções
        </h1>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              value={localidadeId}
              onChange={(e) => setLocalidadeId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Selecione a localidade</option>
              {localidades.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.nome}</option>
              ))}
            </select>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da seção"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setNome(''); setLocalidadeId(''); setEditingId(null); }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {editingId ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </form>

        {/* Filtro por localidade para a listagem */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-gray-600">Filtrar por localidade:</label>
          <select
            value={filterLocalidadeId}
            onChange={(e) => setFilterLocalidadeId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Todas</option>
            {localidades.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.nome}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {(filterLocalidadeId ? secoes.filter(s => s.localidadeId === filterLocalidadeId) : secoes).length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma seção cadastrada</p>
          ) : (
            (filterLocalidadeId ? secoes.filter(s => s.localidadeId === filterLocalidadeId) : secoes).map(secao => (
              <div
                key={secao.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Layers className="text-purple-500" size={20} />
                  <div>
                    <span className="font-medium">{secao.nome}</span>
                    <p className="text-xs text-gray-500">Localidade: {getLocalidadeNome(secao.localidadeId)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(secao)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(secao.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

export default Secoes;
