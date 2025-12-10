import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, MapPin, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { InputField, ButtonPrimary, SelectField, AlertBox } from '../components/MacOSDesign';

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
            <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 font-system">
                <div className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-emerald-50 rounded-full">
                            <MapPin size={32} className="text-[#008069]" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Selecione a Unidade</h2>
                    <p className="text-center text-slate-500 text-sm mb-8">Escolha a localidade para continuar</p>

                    <form onSubmit={handleLocalidadeSubmit} className="space-y-6">
                        <SelectField
                            options={[
                                { value: '', label: 'Escolha uma localidade...' },
                                ...localidades.map(l => ({ value: l.id, label: l.nome }))
                            ]}
                            value={selectedLoc}
                            onChange={(e) => setSelectedLoc(e.target.value)}
                            required
                        />

                        {error && <AlertBox type="error" message={error} />}

                        <ButtonPrimary type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2">
                            {loading ? 'Carregando...' : 'Continuar'} {!loading && <ArrowRight size={18} />}
                        </ButtonPrimary>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">

                {/* Logo/Icon */}
                <div className="flex justify-center mb-8">
                    <div className="p-5 bg-emerald-50 rounded-full">
                        <User size={40} className="text-[#008069]" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">Bem-vindo</h1>
                <p className="text-center text-slate-500 text-sm mb-8 font-medium">Faça login para continuar</p>

                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                    <InputField
                        label="Usuário"
                        placeholder="Ex: daniel"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        icon={<User size={18} />}
                        disabled={loading}
                        required
                    />

                    <InputField
                        label="Senha"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<Lock size={18} />}
                        endIcon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        onEndIconClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        required
                    />

                    {/* Remember Me */}
                    <div className="flex items-center pl-1">
                        <input
                            type="checkbox"
                            id="remember"
                            className="rounded-full border-slate-300 text-[#008069] focus:ring-emerald-500 w-4 h-4"
                        />
                        <label htmlFor="remember" className="ml-2 text-sm text-slate-600 font-medium">
                            Lembrar-me neste computador
                        </label>
                    </div>

                    {error && <AlertBox type="error" message={error} />}

                    <ButtonPrimary type="submit" disabled={loading} className="w-full mt-4 flex justify-center items-center gap-2">
                        {loading ? 'Entrando...' : 'Entrar'} {!loading && <ArrowRight size={18} />}
                    </ButtonPrimary>
                </form>

                <p className="text-center text-sm text-slate-400 mt-8 font-medium">
                    GesLeitura © 2024
                </p>
            </div>
        </div>
    );
};

export default Login;
