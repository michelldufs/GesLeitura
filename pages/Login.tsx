import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, MapPin } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

type Localidade = { id: string; nome: string };

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'credentials' | 'localidade'>('credentials');
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [selectedLoc, setSelectedLoc] = useState('');
    const { login, setSelectedLocalidade } = useAuth();
    const navigate = useNavigate();

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const email = `${username}@sistema.local`;
            await login(email, password);
            
            // Fetch user profile to check allowedLocalidades
            const userDoc = await getDoc(doc(db, "users", email.replace('@sistema.local', '')));
            if (!userDoc.exists()) {
                // Try with UID - need to get current auth user
                const { auth } = await import('../services/firebaseConfig');
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const profileDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (profileDoc.exists()) {
                        const allowedLocs = profileDoc.data().allowedLocalidades || [];
                        if (allowedLocs.length === 0) {
                            // No localidades configured - proceed directly
                            navigate('/');
                            return;
                        }
                        // Fetch localidade names
                        const locPromises = allowedLocs.map(async (locId: string) => {
                            const locDoc = await getDoc(doc(db, "localidades", locId));
                            return locDoc.exists() ? { id: locId, nome: locDoc.data().nome } : null;
                        });
                        const locs = (await Promise.all(locPromises)).filter(Boolean) as Localidade[];
                        setLocalidades(locs);
                        if (locs.length === 1) {
                            // Auto-select if only one
                            setSelectedLocalidade(locs[0].id);
                            navigate('/');
                        } else {
                            setStep('localidade');
                        }
                    } else {
                        navigate('/');
                    }
                }
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Falha ao entrar. Verifique suas credenciais.');
        }
    };

    const handleLocalidadeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoc) {
            setError('Selecione uma localidade.');
            return;
        }
        setSelectedLocalidade(selectedLoc);
        navigate('/');
    };

    if (step === 'localidade') {
        return (
            <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4 font-sans">
                <div className="bg-gray-100 p-8 rounded-2xl shadow-xl w-full max-w-sm flex flex-col items-center">
                    <div className="mb-8 text-gray-500">
                        <MapPin size={80} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Selecione a Localidade</h2>
                    <form onSubmit={handleLocalidadeSubmit} className="w-full space-y-4">
                        <select
                            value={selectedLoc}
                            onChange={(e) => setSelectedLoc(e.target.value)}
                            className="w-full p-3 bg-blue-50/50 border-none rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                            required
                        >
                            <option value="">Escolha uma localidade...</option>
                            {localidades.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.nome}</option>
                            ))}
                        </select>
                        {error && (
                            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-slate-500 hover:bg-slate-600 text-white font-bold py-3 rounded-lg shadow-md transition-colors uppercase tracking-wider"
                        >
                            CONTINUAR
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4 font-sans">
            <div className="bg-gray-100 p-8 rounded-2xl shadow-xl w-full max-w-sm flex flex-col items-center">

                {/* Avatar Icon */}
                <div className="mb-8 text-gray-500">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-20 h-20"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
                    </svg>
                </div>

                <form onSubmit={handleCredentialsSubmit} className="w-full space-y-4">

                    {/* Username Input */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Usuário (ex: daniel)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border-none rounded-lg text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Lock size={20} />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-blue-50/50 border-none rounded-lg text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Options */}
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span>Lembrar-me</span>
                        </label>
                        <button type="button" className="hover:underline">Esqueceu a senha?</button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-slate-500 hover:bg-slate-600 text-white font-bold py-3 rounded-lg shadow-md transition-colors uppercase tracking-wider mt-6"
                    >
                        ENTRAR
                    </button>

                </form>
            </div>
        </div>
    );
};

export default Login;
