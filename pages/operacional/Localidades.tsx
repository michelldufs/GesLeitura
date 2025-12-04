import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Plus } from 'lucide-react';
import { Localidade } from '../../types';

const Localidades: React.FC = () => {
  const { userProfile } = useAuth();
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const [formData, setFormData] = useState({
    nome: ''
  });

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

  const handleOpenModal = () => {
    setFormData({ nome: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'localidades', editingId), { nome: formData.nome });
        setMessageType('success');
        setMessage('Localidade atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'localidades'), {
          nome: formData.nome,
          active: true
        });
        setMessageType('success');
        setMessage('Localidade criada com sucesso!');
      }
      handleCloseModal();
      loadLocalidades();
    } catch (error: any) {
      console.error('Erro ao salvar localidade:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar localidade');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (localidade: Localidade) => {
    setFormData({ nome: localidade.nome });
    setEditingId(localidade.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta localidade?')) return;

    try {
      await updateDoc(doc(db, 'localidades', id), { active: false });
      setMessageType('success');
      setMessage('Localidade desativada com sucesso!');
      loadLocalidades();
    } catch (error: any) {
      console.error('Erro ao desativar localidade:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar localidade');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MapPin className="text-blue-600" size={28} />
          Gestão de Localidades
        </h1>
        <button
          onClick={handleOpenModal}
          disabled={!isAuthorized}
          className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
            isAuthorized
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          + Nova Localidade
        </button>
      </div>

      {!isAuthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
          Seu perfil ({userProfile?.role}) não possui permissão para gerenciar localidades.
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Localidades Cadastradas</h2>

        {localidades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma localidade cadastrada ainda.</p>
            <p className="text-sm">Clique em "+ Nova Localidade" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {localidades.map((localidade) => (
                  <tr key={localidade.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <MapPin className="text-blue-500" size={18} />
                      {localidade.nome}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(localidade)}
                        disabled={!isAuthorized}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(localidade.id)}
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
                {editingId ? 'Editar Localidade' : 'Nova Localidade'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ nome: e.target.value })}
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Matriz"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded text-white font-bold transition-colors ${
                      loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
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

export default Localidades;
