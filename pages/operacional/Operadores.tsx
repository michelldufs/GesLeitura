import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { Cpu, Plus, Edit2, Trash2, Ban } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { gerarProximoCodigoOperador, validarCodigoOperador } from '../../services/codigoValidator';
import { Operador, Ponto, Rota, Secao } from '../../types';

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

      // Carregar operadores da localidade selecionada (ativos e inativos)
      const opQuery = query(
        collection(db, 'operadores'),
        where('localidadeId', '==', selectedLocalidade)
      );

      const opSnapshot = await getDocs(opQuery);
      const operadoresData = opSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          fatorConversao: data.fatorConversao || 0.01,
          pontoId: data.pontoId,
          localidadeId: data.localidadeId,
          active: data.active
        } as Operador;
      });
      // Ordenar por código crescente
      operadoresData.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      setOperadores(operadoresData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const gerarCodigoOperador = (): string => {
    if (!formData.pontoId) return '';

    const ponto = pontos.find(p => p.id === formData.pontoId);
    if (!ponto) return '';

    // Filtrar operadores do mesmo ponto para gerar sequência correta
    const opPonto = operadores.filter(op => op.pontoId === formData.pontoId);
    return gerarProximoCodigoOperador(ponto.codigo || '', opPonto);
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

        // Validar se o código não é duplicado
        const validacao = validarCodigoOperador(codigo, operadores);
        if (!validacao.valido) {
          setMessageType('error');
          setMessage(validacao.erro || 'Código inválido');
          setLoading(false);
          return;
        }

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
      fatorConversao: operador.fatorConversao || 0.01
    });
    setEditingId(operador.id);
    setShowModal(true);
  };

  const handleToggleStatus = async (operador: Operador) => {
    const novoStatus = !operador.active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    if (!confirm(`Deseja realmente ${acao} este operador?`)) return;

    try {
      await updateDoc(doc(db, 'operadores', operador.id), { active: novoStatus });
      setMessageType('success');
      setMessage(`Operador ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
      loadData();
    } catch (error: any) {
      console.error(`Erro ao ${acao}:`, error);
      setMessageType('error');
      setMessage(error?.message || `Erro ao ${acao} operador`);
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getPontoNome = (id: string) => pontos.find(p => p.id === id)?.nome || 'N/A';
  const getPontoCodigo = (id: string) => pontos.find(p => p.id === id)?.codigo || '';

  const formatFator = (fator?: number) => {
    return `${((fator || 0) * 100).toFixed(0)}%`;
  };

  const getFatorColor = (fator?: number) => {
    // Cores distintas para cada fator de conversão
    if (fator === 0.01) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (fator === 0.10) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (fator === 0.25) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (fator === 1) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-gray-100 text-gray-800 border-gray-300'; // Outros valores
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Operadores"
        subtitle="Crie e gerencie equipamentos e operadores do sistema"
        action={
          <ButtonPrimary
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Novo Operador
          </ButtonPrimary>
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

      {/* Tabela de Operadores */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700">Operadores Cadastrados</h2>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
            {operadores.length} registros
          </span>
        </div>

        {operadores.length === 0 ? (
          <div className="text-center py-12">
            <Cpu className="mx-auto text-gray-300 mb-4" size={32} />
            <p className="text-gray-500 text-sm">Nenhum operador cadastrado ainda.</p>
            <p className="text-gray-400 text-xs mt-2">Clique em "Novo Operador" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Ponto</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Fator</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-center">Status</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {operadores.map((operador) => {
                  const pontoNome = getPontoNome(operador.pontoId);
                  const pontoCodigo = getPontoCodigo(operador.pontoId);

                  return (
                    <tr key={operador.id} className={`hover:bg-gray-50 transition-colors ${!operador.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-700 text-xs">{operador.codigo}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-gray-800 text-xs">{operador.nome}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-700">{pontoNome}</span>
                          <span className="text-[10px] text-gray-400">{pontoCodigo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getFatorColor(operador.fatorConversao)}`}>
                          {formatFator(operador.fatorConversao)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleToggleStatus(operador)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${operador.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                            }`}
                          title={operador.active ? 'Desativar' : 'Ativar'}
                        >
                          {operador.active ? 'ATIVO' : 'INATIVO'}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleEdit(operador)}
                          className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      < Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Operador' : 'Novo Operador'}
        actions={
          < div className="flex gap-3" >
            <ButtonPrimary onClick={handleSubmit} disabled={loading} type="submit">
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseModal}>
              Cancelar
            </ButtonSecondary>
          </div >
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectField
            label="Ponto"
            value={formData.pontoId}
            onChange={(e) => setFormData({ ...formData, pontoId: e.target.value })}
            disabled={!isAuthorized}
            required
            options={[
              { value: '', label: 'Selecione o ponto' },
              ...pontos.map(ponto => ({ value: ponto.id, label: ponto.nome }))
            ]}
          />

          {formData.pontoId && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                <span className="font-semibold">Código gerado:</span> {gerarCodigoOperador()}
              </p>
              <p className="text-xs text-purple-800 mt-1">
                📋 Este código é gerado automaticamente e nunca será duplicado.
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

          <SelectField
            label="Fator de Conversão"
            value={formData.fatorConversao.toString()}
            onChange={(e) => setFormData({ ...formData, fatorConversao: parseFloat(e.target.value) })}
            disabled={!isAuthorized}
            required
            options={[
              { value: '', label: 'Selecione o fator' },
              ...factoresConversao.map(fator => ({ value: fator.toString(), label: formatFator(fator) }))
            ]}
          />
        </form>
      </Modal >
    </div >
  );
};

export default Operadores;
