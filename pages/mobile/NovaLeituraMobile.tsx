import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebaseConfig';
import { Camera, Upload, CheckCircle } from 'lucide-react';

const NovaLeituraMobile: React.FC = () => {
  const { userProfile } = useAuth();
  
  // Estados do formulário
  const [operadorId, setOperadorId] = useState('');
  const [pontoId, setPontoId] = useState('');
  const [rotaId, setRotaId] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  
  const [entradaAnterior, setEntradaAnterior] = useState('');
  const [entradaAtual, setEntradaAtual] = useState('');
  const [saidaAnterior, setSaidaAnterior] = useState('');
  const [saidaAtual, setSaidaAtual] = useState('');
  const [despesa, setDespesa] = useState('');
  const [comissaoPorcentagem, setComissaoPorcentagem] = useState('10');
  
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Cálculos automáticos
  const totalEntrada = Number(entradaAtual) - Number(entradaAnterior);
  const totalSaida = Number(saidaAtual) - Number(saidaAnterior);
  const totalGeral = totalEntrada - totalSaida;
  const valorComissao = (totalGeral * Number(comissaoPorcentagem)) / 100;
  const totalFinal = totalGeral - valorComissao - Number(despesa || 0);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem('');

    try {
      // Validações
      if (!foto) {
        setMensagem('❌ A foto é obrigatória!');
        setLoading(false);
        return;
      }

      if (!operadorId || !pontoId || !rotaId) {
        setMensagem('❌ Preencha todos os campos obrigatórios!');
        setLoading(false);
        return;
      }

      // Upload da foto para Firebase Storage
      const fotoRef = ref(storage, `leituras/${Date.now()}_${foto.name}`);
      await uploadBytes(fotoRef, foto);
      const fotoUrl = await getDownloadURL(fotoRef);

      // Salvar leitura no Firestore
      const vendaData = {
        data,
        timestamp: Timestamp.now(),
        operadorId,
        pontoId,
        rotaId,
        localidadeId: userProfile?.allowedLocalidades[0] || '',
        entradaAnterior: Number(entradaAnterior),
        entradaAtual: Number(entradaAtual),
        totalEntrada,
        saidaAnterior: Number(saidaAnterior),
        saidaAtual: Number(saidaAtual),
        totalSaida,
        totalGeral,
        comissaoPorcentagem: Number(comissaoPorcentagem),
        valorComissao,
        despesa: Number(despesa || 0),
        totalFinal,
        status_conferencia: 'pendente' as const,
        fotoUrl,
        userId: userProfile?.uid || '',
        active: true,
      };

      await addDoc(collection(db, 'vendas'), vendaData);

      setMensagem('✅ Leitura salva com sucesso!');
      
      // Limpar formulário após 2 segundos
      setTimeout(() => {
        setEntradaAnterior('');
        setEntradaAtual('');
        setSaidaAnterior('');
        setSaidaAtual('');
        setDespesa('');
        setFoto(null);
        setFotoPreview('');
        setMensagem('');
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar leitura:', error);
      setMensagem('❌ Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-b-3xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">📊 Nova Leitura</h1>
        <p className="text-sm text-gray-300">Registre a coleta da máquina</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-6">
        {/* Identificação */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <h2 className="font-bold text-lg mb-4 text-gray-800">📍 Identificação</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operador ID</label>
              <input
                type="text"
                value={operadorId}
                onChange={(e) => setOperadorId(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="ID do Operador"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ponto ID</label>
              <input
                type="text"
                value={pontoId}
                onChange={(e) => setPontoId(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="ID do Ponto"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rota ID</label>
              <input
                type="text"
                value={rotaId}
                onChange={(e) => setRotaId(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="ID da Rota"
                required
              />
            </div>
          </div>
        </div>

        {/* Leituras */}
        <div className="bg-blue-50 p-4 rounded-xl">
          <h2 className="font-bold text-lg mb-4 text-blue-900">🔢 Leituras</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrada Anterior</label>
              <input
                type="number"
                value={entradaAnterior}
                onChange={(e) => setEntradaAnterior(e.target.value)}
                className="w-full p-3 border-2 border-blue-300 rounded-lg text-lg font-mono"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrada Atual</label>
              <input
                type="number"
                value={entradaAtual}
                onChange={(e) => setEntradaAtual(e.target.value)}
                className="w-full p-3 border-2 border-blue-300 rounded-lg text-lg font-mono"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Saída Anterior</label>
              <input
                type="number"
                value={saidaAnterior}
                onChange={(e) => setSaidaAnterior(e.target.value)}
                className="w-full p-3 border-2 border-blue-300 rounded-lg text-lg font-mono"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Saída Atual</label>
              <input
                type="number"
                value={saidaAtual}
                onChange={(e) => setSaidaAtual(e.target.value)}
                className="w-full p-3 border-2 border-blue-300 rounded-lg text-lg font-mono"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Totais Calculados */}
          <div className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Total Entrada:</span>
              <span className="font-bold text-green-600">R$ {totalEntrada.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Total Saída:</span>
              <span className="font-bold text-red-600">R$ {totalSaida.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t-2 pt-2 mt-2">
              <span className="text-gray-800">Saldo Máquina:</span>
              <span className="text-blue-600">R$ {totalGeral.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-green-50 p-4 rounded-xl">
          <h2 className="font-bold text-lg mb-4 text-green-900">💰 Financeiro</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
              <input
                type="number"
                value={comissaoPorcentagem}
                onChange={(e) => setComissaoPorcentagem(e.target.value)}
                className="w-full p-3 border-2 border-green-300 rounded-lg text-lg"
                step="0.1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Despesas (R$)</label>
              <input
                type="number"
                value={despesa}
                onChange={(e) => setDespesa(e.target.value)}
                className="w-full p-3 border-2 border-green-300 rounded-lg text-lg"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="p-3 bg-white rounded-lg border-2 border-green-200">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Valor Comissão:</span>
                <span className="font-bold text-orange-600">- R$ {valorComissao.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Despesas:</span>
                <span className="font-bold text-orange-600">- R$ {Number(despesa || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 pt-2 mt-2">
                <span className="text-gray-800">Total Final:</span>
                <span className="text-green-600">R$ {totalFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload de Foto */}
        <div className="bg-purple-50 p-4 rounded-xl">
          <h2 className="font-bold text-lg mb-4 text-purple-900">📸 Foto Obrigatória</h2>
          
          <label className="block w-full cursor-pointer">
            <div className={`border-4 border-dashed rounded-xl p-6 text-center ${
              fotoPreview ? 'border-green-400 bg-green-50' : 'border-purple-300 bg-white'
            }`}>
              {fotoPreview ? (
                <div>
                  <img src={fotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-2" />
                  <p className="text-green-600 font-medium flex items-center justify-center gap-2">
                    <CheckCircle size={20} /> Foto Carregada
                  </p>
                </div>
              ) : (
                <div className="text-purple-600">
                  <Camera size={48} className="mx-auto mb-2" />
                  <p className="font-medium">Toque para tirar foto</p>
                  <p className="text-xs text-gray-500 mt-1">ou selecionar da galeria</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              className="hidden"
              required
            />
          </label>
        </div>

        {/* Mensagem de Status */}
        {mensagem && (
          <div className={`p-4 rounded-xl text-center font-bold ${
            mensagem.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {mensagem}
          </div>
        )}

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl text-white text-lg font-bold shadow-lg ${
            loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          {loading ? 'Salvando...' : '💾 Salvar Leitura'}
        </button>
      </form>
    </div>
  );
};

export default NovaLeituraMobile;
