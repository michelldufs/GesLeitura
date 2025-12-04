import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { Cpu, Plus, Edit2, Trash2 } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';

interface Operador {
  id: string;
  codigo: string;
  nome: string;
  fatorConversao: number;
  pontoId: string;
  localidadeId: string;
  active: boolean;
}

interface Ponto {
  id: string;
  codigo: string;
  nome: string;
  rotaId: string;
  localidadeId: string;
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

const Operadores: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    nome: '',
    pontoId: '',
    fatorConversao: 0.01
  });

  const factoresConversao = [0.01, 0.10, 0.25];

  useEffect(() => {
    loadData();
  }, [selectedLocalidade]);

  const loadData = async () => {
    try {
      // Carregar seções da localidade selecionada
      if (!selectedLocalidade) {
        setOperadores([]);
        setPontos([]);
        setRotas([]);
        setSecoes([]);
        return;
      }

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

      // Carregar rotas da localidade selecionada
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

      // Carregar pontos da localidade selecionada
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
          localidadeId: data.localidadeId
        } as Ponto;
      });
      setPontos(pontosData);

      // Carregar operadores da localidade selecionada
      const opQuery = query(
        collection(db, 'operadores'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const opSnapshot = await getDocs(opQuery);
      const operadoresData = opSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          fatorConversao: data.fatorConversao,
          pontoId: data.pontoId,
          localidadeId: data.localidadeId,
          active: data.active
        } as Operador;
      });
      setOperadores(operadoresData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const gerarCodigoOperador = (): string => {
    if (!formData.pontoId) return '';
    
    const ponto = pontos.find(p => p.id === formData.pontoId);
    if (!ponto) return '';

    // Encontrar próximo ID de operador para este ponto
    const opPonto = operadores.filter(op => op.pontoId === formData.pontoId);
    const proximoId = String(opPonto.length + 1).padStart(2, '0');
    
    return `${ponto.codigo}${proximoId}`;
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', pontoId: '', fatorConversao: 0.01 });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', pontoId: '', fatorConversao: 0.01 });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.pontoId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const codigo = gerarCodigoOperador();
      
      if (editingId) {
        await updateDoc(doc(db, 'operadores', editingId), {
          nome: formData.nome.toUpperCase(),
          pontoId: formData.pontoId,
          fatorConversao: formData.fatorConversao
        });
        setMessageType('success');
        setMessage('Operador atualizado com sucesso!');
      } else {
        const ponto = pontos.find(p => p.id === formData.pontoId);
        if (!ponto) throw new Error('Ponto não encontrado');

        await addDoc(collection(db, 'operadores'), {
          codigo,
          nome: formData.nome.toUpperCase(),
          pontoId: formData.pontoId,
          localidadeId: ponto.localidadeId,
          fatorConversao: formData.fatorConversao,
          active: true
        });
        setMessageType('success');
        setMessage('Operador criado com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar operador');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (operador: Operador) => {
    setFormData({
      nome: operador.nome,
      pontoId: operador.pontoId,
      fatorConversao: operador.fatorConversao
    });
    setEditingId(operador.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar este operador?')) return;

    try {
      await updateDoc(doc(db, 'operadores', id), { active: false });
      setMessageType('success');
      setMessage('Operador desativado com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar operador');
    }
  };

  const isAuthorized = userProfile && ['admin', 'operacional'].includes(userProfile.role);
  const getPontoNome = (id: string) => pontos.find(p => p.id === id)?.nome || 'N/A';
  const getPontoCodigo = (id: string) => pontos.find(p => p.id === id)?.codigo || '';

  const formatFator = (fator: number) => {
    return `${(fator * 100).toFixed(0)}%`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Operadores"
        subtitle="Crie e gerencie equipamentos e operadores do sistema"
        action={
          <button
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
          >
            <Plus size={20} /> Novo Operador
          </button>
        }
      />

      {!isAuthorized && (
        <AlertBox 
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar operadores.`}
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
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Operadores Cadastrados</h2>

        {operadores.length === 0 ? (
          <div className="text-center py-12">
            <Cpu className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhum operador cadastrado ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Novo Operador" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Ponto</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Fator de Conversão</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {operadores.map((operador) => (
                  <tr key={operador.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-2.5 font-mono font-semibold text-slate-900">{operador.codigo}</td>
                    <td className="px-6 py-2.5 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-purple-100/50 rounded-lg">
                        <Cpu className="text-purple-600" size={18} />
                      </div>
                      {operador.nome}
                    </td>
                    <td className="px-6 py-2.5 text-slate-600">{getPontoNome(operador.pontoId)}</td>
                    <td className="px-6 py-2.5 text-slate-600 font-medium">{formatFator(operador.fatorConversao)}</td>
                    <td className="px-6 py-2.5 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(operador)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(operador.id)}
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
        title={editingId ? 'Editar Operador' : 'Novo Operador'}
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
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Ponto</label>
            <select
              value={formData.pontoId}
              onChange={(e) => setFormData({ ...formData, pontoId: e.target.value })}
              disabled={!isAuthorized}
              required
              className="w-full px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione o ponto</option>
              {pontos.map(ponto => (
                <option key={ponto.id} value={ponto.id}>{ponto.nome}</option>
              ))}
            </select>
          </div>

          {formData.pontoId && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                <span className="font-semibold">Código gerado:</span> {gerarCodigoOperador()}
              </p>
            </div>
          )}

          <InputField
            label="Nome do Operador"
            placeholder="Ex: POS-01"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Fator de Conversão</label>
            <select
              value={formData.fatorConversao}
              onChange={(e) => setFormData({ ...formData, fatorConversao: parseFloat(e.target.value) })}
              disabled={!isAuthorized}
              required
              className="w-full px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione o fator</option>
              {factoresConversao.map(fator => (
                <option key={fator} value={fator}>{formatFator(fator)}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Operadores;
