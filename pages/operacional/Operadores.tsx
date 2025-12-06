import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { Cpu, Plus, Edit2, Trash2, Ban } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { gerarProximoCodigoOperador, validarCodigoOperador } from '../../services/codigoValidator';

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
    return gerarProximoCodigoOperador(ponto.codigo, opPonto);
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

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getPontoNome = (id: string) => pontos.find(p => p.id === id)?.nome || 'N/A';
  const getPontoCodigo = (id: string) => pontos.find(p => p.id === id)?.codigo || '';

  const formatFator = (fator: number) => {
    return `${(fator * 100).toFixed(0)}%`;
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
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Ponto</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Fator</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide text-center">Status</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operadores.map((operador) => (
                  <tr key={operador.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-2 py-1 text-slate-600 font-medium">{operador.codigo}</td>
                    <td className="px-2 py-1 text-slate-600">{operador.nome}</td>
                    <td className="px-2 py-1 text-slate-600">
                      <Badge variant="secondary">{getPontoNome(operador.pontoId)}</Badge>
                    </td>
                    <td className="px-2 py-1 text-slate-600">
                      <Badge variant="secondary">{formatFator(operador.fatorConversao)}</Badge>
                    </td>
                    <td className="px-2 py-1 text-center ">
                      <Badge variant={operador.active ? 'success' : 'error'}>
                        {operador.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(operador)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(operador.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desativar"
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

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
