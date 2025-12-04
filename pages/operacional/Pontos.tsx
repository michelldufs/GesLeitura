import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';

interface Ponto {
  id: string;
  codigo: string;
  nome: string;
  rotaId: string;
  localidadeId: string;
  comissao: number;
  endereco?: string;
  telefone?: string;
  qtdEquipamentos: number;
  active: boolean;
}

interface Rota {
  id: string;
  codigo: string;
  nome: string;
  secaoId: string;
  localidadeId: string;
}

interface Secao {
  id: string;
  codigo: string;
  nome: string;
  localidadeId: string;
}

interface Localidade {
  id: string;
  codigo: string;
  nome: string;
}

const Pontos: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [pontos, setPontos] = useState<Ponto[]>([]);
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
    rotaId: '',
    comissao: 0,
    endereco: '',
    telefone: ''
  });

  const [filterRotaId, setFilterRotaId] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedLocalidade]);

  const loadData = async () => {
    try {
      // Carregar localidades
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      const locData = locSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome
        } as Localidade;
      });
      setLocalidades(locData);

      // Todos os usuários (inclusive admin) veem apenas dados da localidade logada
      if (!selectedLocalidade) {
        setPontos([]);
        setRotas([]);
        setSecoes([]);
        return;
      }

      // Carregar seções
      const secQuery = query(
        collection(db, 'secoes'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const secSnapshot = await getDocs(secQuery);
      const secoesData = secSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          localidadeId: data.localidadeId
        } as Secao;
      });
      setSecoes(secoesData);

      // Carregar rotas
      const rotQuery = query(
        collection(db, 'rotas'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const rotSnapshot = await getDocs(rotQuery);
      const rotasData = rotSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          secaoId: data.secaoId,
          localidadeId: data.localidadeId
        } as Rota;
      });
      setRotas(rotasData);

      // Carregar pontos
      const pontosQuery = query(
        collection(db, 'pontos'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const pontosSnapshot = await getDocs(pontosQuery);
      const pontosData = pontosSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          rotaId: data.rotaId,
          localidadeId: data.localidadeId,
          comissao: data.comissao,
          endereco: data.endereco,
          telefone: data.telefone,
          qtdEquipamentos: data.qtdEquipamentos || 0,
          active: data.active
        } as Ponto;
      });
      setPontos(pontosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const gerarCodigoPonto = (): string => {
    if (!formData.rotaId) return '';
    
    const rota = rotas.find(r => r.id === formData.rotaId);
    if (!rota) return '';

    // Encontrar próximo ID de ponto para esta rota
    const pontosRota = pontos.filter(p => p.rotaId === formData.rotaId);
    const proximoId = String(pontosRota.length + 1).padStart(2, '0');
    
    return `${rota.codigo}${proximoId}`;
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', rotaId: '', comissao: 0, endereco: '', telefone: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', rotaId: '', comissao: 0, endereco: '', telefone: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.rotaId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const codigo = gerarCodigoPonto();
      
      if (editingId) {
        await updateDoc(doc(db, 'pontos', editingId), {
          nome: formData.nome.toUpperCase(),
          rotaId: formData.rotaId,
          comissao: formData.comissao,
          endereco: formData.endereco.toUpperCase(),
          telefone: formData.telefone
        });
        setMessageType('success');
        setMessage('Ponto atualizado com sucesso!');
      } else {
        const rota = rotas.find(r => r.id === formData.rotaId);
        if (!rota) throw new Error('Rota não encontrada');

        await addDoc(collection(db, 'pontos'), {
          codigo,
          nome: formData.nome.toUpperCase(),
          rotaId: formData.rotaId,
          localidadeId: rota.localidadeId,
          comissao: formData.comissao,
          endereco: (formData.endereco || '').toUpperCase(),
          telefone: formData.telefone || '',
          qtdEquipamentos: 0,
          active: true
        });
        setMessageType('success');
        setMessage('Ponto criado com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar ponto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ponto: Ponto) => {
    setFormData({
      nome: ponto.nome,
      rotaId: ponto.rotaId,
      comissao: ponto.comissao,
      endereco: ponto.endereco || '',
      telefone: ponto.telefone || ''
    });
    setEditingId(ponto.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar este ponto?')) return;

    try {
      await updateDoc(doc(db, 'pontos', id), { active: false });
      setMessageType('success');
      setMessage('Ponto desativado com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar ponto');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getRotaNome = (id: string) => rotas.find(r => r.id === id)?.nome || 'N/A';
  const getRotaCodigo = (id: string) => rotas.find(r => r.id === id)?.codigo || '';

  const rotasFiltradas = filterRotaId 
    ? rotas.filter(r => r.id === filterRotaId)
    : rotas;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Pontos"
        subtitle="Crie e gerencie todos os pontos de venda do sistema"
        action={
          <button
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
          >
            <Plus size={20} /> Novo Ponto
          </button>
        }
      />

      {!isAuthorized && (
        <AlertBox 
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar pontos.`}
        />
      )}

      {message && (
        <div className="mb-6">
          <AlertBox 
            type={messageType as 'success' | 'error' | 'warning' | 'info'}
            message={message}
          />
        </div>
      )}

      <GlassCard className="p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Pontos Cadastrados</h2>

        {pontos.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhum ponto cadastrado ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Novo Ponto" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Rota</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Comissão</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Equipamentos</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((ponto) => (
                  <tr key={ponto.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-2.5 font-mono font-semibold text-slate-900">{ponto.codigo}</td>
                    <td className="px-6 py-2.5 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-orange-100/50 rounded-lg">
                        <MapPin className="text-orange-600" size={18} />
                      </div>
                      {ponto.nome}
                    </td>
                    <td className="px-6 py-2.5 text-slate-600">{getRotaNome(ponto.rotaId)}</td>
                    <td className="px-6 py-2.5 text-slate-600 font-medium">{ponto.comissao}%</td>
                    <td className="px-6 py-2.5 text-slate-600 font-medium">{ponto.qtdEquipamentos}</td>
                    <td className="px-6 py-2.5 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(ponto)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(ponto.id)}
                        disabled={!isAuthorized}
                        className="text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      <Modal 
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Ponto' : 'Novo Ponto'}
        actions={
          <div className="flex gap-3">
            <ButtonPrimary onClick={handleSubmit} disabled={loading} type="submit">
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseModal}>
              Cancelar
            </ButtonSecondary>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectField
            label="Rota"
            value={formData.rotaId}
            onChange={(e) => setFormData({ ...formData, rotaId: e.target.value })}
            disabled={!isAuthorized}
            required
          >
            <option value="">Selecione a rota</option>
            {rotas.map(rota => (
              <option key={rota.id} value={rota.id}>{rota.nome}</option>
            ))}
          </SelectField>

          {formData.rotaId && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Código gerado:</span> {gerarCodigoPonto()}
              </p>
            </div>
          )}

          <InputField
            label="Nome do Ponto"
            placeholder="Ex: SENADOR CANEDO"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
          />

          <InputField
            label="Comissão (%)"
            type="number"
            placeholder="Ex: 5"
            value={formData.comissao}
            onChange={(e) => setFormData({ ...formData, comissao: parseFloat(e.target.value) || 0 })}
            disabled={!isAuthorized}
            min="0"
            max="100"
            step="0.1"
          />

          <InputField
            label="Endereço (opcional)"
            placeholder="Ex: RUA X, 123"
            value={formData.endereco}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
          />

          <InputField
            label="Telefone (opcional)"
            placeholder="Ex: (62) 1234-5678"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            disabled={!isAuthorized}
          />
        </form>
      </Modal>
    </div>
  );
};

export default Pontos;
