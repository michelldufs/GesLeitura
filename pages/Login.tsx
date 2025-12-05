import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, MapPin, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

type Localidade = { id: string; nome: string };

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'credentials' | 'localidade'>('credentials');
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [selectedLoc, setSelectedLoc] = useState('');
    const { login } = useAuth();
    const { setSelectedLocalidade } = useLocalidade();
    const navigate = useNavigate();

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const email = `${username}@sistema.local`;
            await login(email, password);
            
            const { auth } = await import('../services/firebaseConfig');
            const currentUser = auth.currentUser;
            if (currentUser) {
                const profileDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (profileDoc.exists()) {
                    const allowedLocs = profileDoc.data().allowedLocalidades || [];
                    if (allowedLocs.length === 0) {
                        navigate('/');
                        return;
                    }
                    const locPromises = allowedLocs.map(async (locId: string) => {
                        const locDoc = await getDoc(doc(db, "localidades", locId));
                        return locDoc.exists() ? { id: locId, nome: locDoc.data().nome } : null;
                    });
                    const locs = (await Promise.all(locPromises)).filter(Boolean) as Localidade[];
                    setLocalidades(locs);
                    if (locs.length === 1) {
                        setSelectedLocalidade(locs[0].id, locs[0].nome);
                        navigate('/');
                    } else {
                        setStep('localidade');
                    }
                } else {
                    navigate('/');
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Falha ao entrar. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    const handleLocalidadeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoc) {
            setError('Selecione uma localidade.');
            return;
        }
        const selectedName = localidades.find(l => l.id === selectedLoc)?.nome || '';
        setSelectedLocalidade(selectedLoc, selectedName);
        navigate('/');
    };

    if (step === 'localidade') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4 font-system">
                <div className="w-full max-w-sm">
                    {/* Glass Card */}
                    <div className="backdrop-blur-xl bg-white/80 p-8 rounded-2xl shadow-2xl border border-white/30">
                        <div className="flex justify-center mb-8">
                            <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full">
                                <MapPin size={40} className="text-slate-600" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-semibold text-slate-900 text-center mb-2">Selecione a Unidade</h2>
                        <p className="text-center text-slate-500 text-sm mb-8">Escolha a localidade para continuar</p>

                        <form onSubmit={handleLocalidadeSubmit} className="space-y-5">
                            <div>
                                <select
                                    value={selectedLoc}
                                    onChange={(e) => setSelectedLoc(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium"
                                    required
                                >
                                    <option value="">Escolha uma localidade...</option>
                                    {localidades.map((loc) => (
                                        <option key={loc.id} value={loc.id}>{loc.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div className="text-red-600 text-sm text-center bg-red-50/80 p-3 rounded-lg border border-red-200/50">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {loading ? 'Carregando...' : 'Continuar'} {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4 font-system">
            <div className="w-full max-w-sm">
                {/* Main Glass Card */}
                <div className="backdrop-blur-xl bg-white/80 p-10 rounded-3xl shadow-2xl border border-white/30">

                    {/* Logo/Icon */}
                    <div className="flex justify-center mb-10">
                        <div className="p-5 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full">
                            <User size={44} className="text-slate-600" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-semibold text-slate-900 text-center mb-2">Bem-vindo</h1>
                    <p className="text-center text-slate-500 text-sm mb-10">Faça login para continuar</p>

                    <form onSubmit={handleCredentialsSubmit} className="space-y-5">

                        {/* Username Input */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="daniel"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all disabled:opacity-50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all disabled:opacity-50"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                id="remember"
                                className="rounded border-slate-300 text-blue-500 focus:ring-blue-400 w-4 h-4"
                            />
                            <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                                Lembrar-me neste computador
                            </label>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="text-red-600 text-sm text-center bg-red-50/80 p-3 rounded-lg border border-red-200/50">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 mt-8 flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {loading ? 'Entrando...' : 'Entrar'} {!loading && <ArrowRight size={18} />}
                        </button>

                    </form>

                    {/* Footer Link */}
                    <p className="text-center text-sm text-slate-500 mt-8">
                        Problemas para entrar?{' '}
                        <button type="button" className="text-blue-500 hover:text-blue-600 font-medium transition-colors">
                            Obter ajuda
                        </button>
                    </p>
                </div>

                {/* Decorative Element */}
                <div className="mt-8 text-center text-slate-400 text-xs">
                    <p>GesLeitura © 2024</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
