import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { adminService } from '../services/adminService';
import { MapPin, X } from 'lucide-react';

type Localidade = { id: string; nome: string; active: boolean };

interface ModalTrocarLocalidadeProps {
    isOpen: boolean;
    onClose: () => void;
}

const ModalTrocarLocalidade: React.FC<ModalTrocarLocalidadeProps> = ({ isOpen, onClose }) => {
    const { userProfile } = useAuth();
    const { setSelectedLocalidade, selectedLocalidade } = useLocalidade();
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [selectedValue, setSelectedValue] = useState(selectedLocalidade || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userProfile) {
            loadLocalidades();
            setSelectedValue(selectedLocalidade || '');
        }
    }, [isOpen, selectedLocalidade, userProfile]);

    const loadLocalidades = async () => {
        try {
            setLoading(true);
            const locs = await adminService.getLocalidades();

            // Admin vê todas as localidades, outros veem apenas as permitidas
            let allowed;
            if (userProfile?.role === 'admin') {
                allowed = locs; // Admin vê todas
            } else {
                // Filtrar apenas localidades permitidas para este usuário
                allowed = locs.filter((loc: any) =>
                    userProfile?.allowedLocalidades?.includes(loc.id)
                );
            }

            setLocalidades(allowed as Localidade[]);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar localidades:', error);
            setLoading(false);
        }
    };

    const handleSelect = () => {
        if (!selectedValue) return;

        const localidade = localidades.find(l => l.id === selectedValue);
        if (localidade) {
            setSelectedLocalidade(selectedValue, localidade.nome);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/30">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Trocar Localidade</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-slate-600">Carregando localidades...</p>
                        </div>
                    ) : localidades.length === 0 ? (
                        <div className="py-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800">Nenhuma localidade disponível</p>
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Selecione uma localidade:
                            </label>
                            <select
                                value={selectedValue}
                                onChange={(e) => setSelectedValue(e.target.value)}
                                className="w-full px-4 py-3 bg-white/40 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium mb-6"
                            >
                                <option value="">Selecione uma localidade...</option>
                                {localidades.map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.nome}
                                    </option>
                                ))}
                            </select>

                            {/* Botões */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSelect}
                                    disabled={!selectedValue}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Trocar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalTrocarLocalidade;
