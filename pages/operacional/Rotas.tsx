import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Route as RouteIcon, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  const { userProfile } = useAuth();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    nome: '',
    localidadeId: '',
    secaoId: ''
  });

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

  const handleOpenModal = () => {
    setFormData({ nome: '', localidadeId: '', secaoId: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', localidadeId: '', secaoId: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.secaoId || !formData.localidadeId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'rotas', editingId), {
          nome: formData.nome,
          secaoId: formData.secaoId,
          localidadeId: formData.localidadeId
        });
        setMessageType('success');
        setMessage('Rota atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'rotas'), {
          nome: formData.nome,
          secaoId: formData.secaoId,
          localidadeId: formData.localidadeId,
          active: true
        });
        setMessageType('success');
        setMessage('Rota criada com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar rota');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rota: Rota) => {
    setFormData({ nome: rota.nome, localidadeId: rota.localidadeId, secaoId: rota.secaoId });
    setEditingId(rota.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta rota?')) return;

    try {
      await updateDoc(doc(db, 'rotas', id), { active: false });
      setMessageType('success');
      setMessage('Rota desativada com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar rota');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const filteredSecoes = secoes.filter(s => s.localidadeId === formData.localidadeId);
  const getLocalidadeNome = (id: string) => localidades.find(l => l.id === id)?.nome || 'N/A';
  const getSecaoNome = (id: string) => secoes.find(s => s.id === id)?.nome || 'N/A';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <RouteIcon className="text-green-600" size={28} />
          Gestão de Rotas
        </h1>
        <button
          onClick={handleOpenModal}
          disabled={!isAuthorized}
          className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
            isAuthorized
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          + Nova Rota
        </button>
      </div>

      {!isAuthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
          Seu perfil ({userProfile?.role}) não possui permissão para gerenciar rotas.
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Rotas Cadastradas</h2>

        {rotas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma rota cadastrada ainda.</p>
            <p className="text-sm">Clique em "+ Nova Rota" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Localidade</th>
                  <th className="px-4 py-3">Seção</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rotas.map((rota) => (
                  <tr key={rota.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <RouteIcon className="text-green-500" size={18} />
                      {rota.nome}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{getLocalidadeNome(rota.localidadeId)}</td>
                    <td className="px-4 py-3 text-gray-600">{getSecaoNome(rota.secaoId)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(rota)}
                        disabled={!isAuthorized}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(rota.id)}
                        disabled={!isAuthorized}
                        className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                      >
                        Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                {editingId ? 'Editar Rota' : 'Nova Rota'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localidade</label>
                  <select
                    value={formData.localidadeId}
                    onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value, secaoId: '' })}
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="">Selecione a localidade</option>
                    {localidades.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seção</label>
                  <select
                    value={formData.secaoId}
                    onChange={(e) => setFormData({ ...formData, secaoId: e.target.value })}
                    required
                    disabled={!formData.localidadeId}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
                  >
                    <option value="">Selecione a seção</option>
                    {filteredSecoes.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Ex: Rota 01"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded text-white font-bold transition-colors ${
                      loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2 px-4 rounded border border-gray-300 font-bold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rotas;
