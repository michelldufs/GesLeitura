import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Layers, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  const { userProfile } = useAuth();
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [filterLocalidadeId, setFilterLocalidadeId] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    localidadeId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      const locData = locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade));
      setLocalidades(locData);

      const secQuery = query(collection(db, 'secoes'), where('active', '==', true));
      const secSnapshot = await getDocs(secQuery);
      const secData = secSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Secao));
      setSecoes(secData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', localidadeId: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', localidadeId: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.localidadeId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'secoes', editingId), { nome: formData.nome, localidadeId: formData.localidadeId });
        setMessageType('success');
        setMessage('Seção atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'secoes'), {
          nome: formData.nome,
          localidadeId: formData.localidadeId,
          active: true
        });
        setMessageType('success');
        setMessage('Seção criada com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar seção');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (secao: Secao) => {
    setFormData({ nome: secao.nome, localidadeId: secao.localidadeId });
    setEditingId(secao.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta seção?')) return;

    try {
      await updateDoc(doc(db, 'secoes', id), { active: false });
      setMessageType('success');
      setMessage('Seção desativada com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar seção');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getLocalidadeNome = (id: string) => localidades.find(l => l.id === id)?.nome || 'N/A';

  const visibleSecoes =
    filterLocalidadeId === '' ? [] :
    filterLocalidadeId === 'ALL' ? secoes :
    secoes.filter(s => s.localidadeId === filterLocalidadeId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Layers className="text-purple-600" size={28} />
          Gestão de Seções
        </h1>
        <button
          onClick={handleOpenModal}
          disabled={!isAuthorized}
          className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
            isAuthorized
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          + Nova Seção
        </button>
      </div>

      {!isAuthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
          Seu perfil ({userProfile?.role}) não possui permissão para gerenciar seções.
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-gray-700">Filtrar por localidade:</label>
          <select
            value={filterLocalidadeId}
            onChange={(e) => setFilterLocalidadeId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">Selecione</option>
            <option value="ALL">Todas</option>
            {localidades.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.nome}</option>
            ))}
          </select>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-4">Seções Cadastradas</h2>

        {filterLocalidadeId === '' ? (
          <div className="text-center py-8 text-gray-500">
            Selecione uma localidade para listar as seções.
          </div>
        ) : visibleSecoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma seção cadastrada.</p>
            <p className="text-sm">Clique em "+ Nova Seção" para criar uma.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Localidade</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleSecoes.map((secao) => (
                  <tr key={secao.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <Layers className="text-purple-500" size={18} />
                      {secao.nome}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{getLocalidadeNome(secao.localidadeId)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(secao)}
                        disabled={!isAuthorized}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(secao.id)}
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
                {editingId ? 'Editar Seção' : 'Nova Seção'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localidade</label>
                  <select
                    value={formData.localidadeId}
                    onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value })}
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Selecione a localidade</option>
                    {localidades.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
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
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Ex: Seção A"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded text-white font-bold transition-colors ${
                      loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
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

export default Secoes;
