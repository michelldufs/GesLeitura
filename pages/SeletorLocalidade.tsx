import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { adminService } from '../services/adminService';
import { ButtonPrimary, ButtonSecondary, SelectField } from '../components/MacOSDesign';
import { MapPin } from 'lucide-react';

type Localidade = { id: string; nome: string; active: boolean };

const SeletorLocalidade: React.FC = () => {
    const { userProfile, logout } = useAuth();
    const { setSelectedLocalidade } = useLocalidade();
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [selectedValue, setSelectedValue] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadLocalidades();
    }, []);

    const loadLocalidades = async () => {
        try {
            setLoading(true);
            setError(null);
            const locs = await adminService.getLocalidades();
            console.log('Todas as localidades:', locs);
            console.log('Localidades permitidas do usuário:', userProfile?.allowedLocalidades);

            // Filtrar apenas localidades permitidas para este usuário
            const allowed = locs.filter((loc: any) =>
                userProfile?.allowedLocalidades?.includes(loc.id)
            );
            console.log('Localidades filtradas:', allowed);

            setLocalidades(allowed as Localidade[]);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar localidades:', error);
            setError('Erro ao carregar localidades. Tente novamente.');
            setLoading(false);
        }
    };

    const handleSelect = async () => {
        if (!selectedValue) return;

        const localidade = localidades.find(l => l.id === selectedValue);
        if (localidade) {
            setSelectedLocalidade(selectedValue, localidade.nome);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card principal */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="p-3 bg-blue-600/20 rounded-full">
                            <MapPin className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-white">Bem-vindo!</h1>
                            <p className="text-sm text-slate-300">{userProfile?.name}</p>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="mb-8">
                        <p className="text-slate-300 text-center mb-2">
                            Selecione a <span className="font-semibold text-white">localidade</span> que deseja gerenciar:
                        </p>
                    </div>

                    {/* Conteúdo */}
                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto mb-4"></div>
                            <p className="text-slate-300">Carregando localidades...</p>
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                            <p className="text-red-300 mb-4">{error}</p>
                            <button
                                onClick={loadLocalidades}
                                className="text-sm text-red-300 hover:text-red-200 font-medium"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : localidades.length === 0 ? (
                        <div className="py-8 text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                            <p className="text-yellow-300 mb-4">
                                Você não tem acesso a nenhuma localidade. Contate o administrador.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* SelectField customizado para tema escuro */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-slate-200 mb-2">
                                    Localidades Disponíveis
                                </label>
                                <select
                                    value={selectedValue}
                                    onChange={(e) => setSelectedValue(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                                >
                                    <option value="">Selecione uma localidade...</option>
                                    {localidades.map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Botões */}
                            <div className="flex gap-3">
                                <ButtonSecondary
                                    onClick={handleLogout}
                                    className="flex-1"
                                >
                                    Sair
                                </ButtonSecondary>
                                <ButtonPrimary
                                    onClick={handleSelect}
                                    disabled={!selectedValue}
                                    className="flex-1"
                                >
                                    Entrar
                                </ButtonPrimary>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer info */}
                <p className="text-center text-slate-400 text-xs mt-8">
                    © 2025 GesLeitura. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default SeletorLocalidade;
