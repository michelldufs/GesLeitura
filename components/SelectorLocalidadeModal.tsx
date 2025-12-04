import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { adminService } from '../services/adminService';
import { ButtonPrimary, ButtonSecondary, SelectField } from '../components/MacOSDesign';
import { MapPin } from 'lucide-react';

type Localidade = { id: string; nome: string; active: boolean };

const SelectorLocalidadeModal: React.FC = () => {
    const { userProfile } = useAuth();
    const { selectedLocalidade, setSelectedLocalidade } = useLocalidade();
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [selectedValue, setSelectedValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Mostrar modal apenas se:
        // 1. Usuário está logado
        // 2. Não é "coleta"
        // 3. Ainda não selecionou uma localidade
        if (userProfile && userProfile.role !== 'coleta' && !selectedLocalidade) {
            loadLocalidades();
            setShowModal(true);
        }
    }, [userProfile, selectedLocalidade]);

    const loadLocalidades = async () => {
        try {
            const locs = await adminService.getLocalidades();
            // Filtrar apenas localidades permitidas para este usuário
            const allowed = locs.filter((loc: any) =>
                userProfile?.allowedLocalidades?.includes(loc.id)
            );
            setLocalidades(allowed as Localidade[]);
        } catch (error) {
            console.error('Erro ao buscar localidades:', error);
        }
    };

    const handleSelect = () => {
        if (!selectedValue) return;

        const localidade = localidades.find(l => l.id === selectedValue);
        if (localidade) {
            setSelectedLocalidade(selectedValue, localidade.nome);
            setShowModal(false);
        }
    };

    if (!showModal) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-200/50">
                <div className="flex items-center gap-3 mb-6">
                    <MapPin className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-semibold text-slate-900">Selecione a Localidade</h2>
                </div>

                <p className="text-slate-600 mb-6">
                    Qual localidade você deseja gerenciar?
                </p>

                <SelectField
                    label="Localidades Disponíveis"
                    options={[
                        { value: '', label: 'Selecione' },
                        ...localidades.map(loc => ({
                            value: loc.id,
                            label: loc.nome
                        }))
                    ]}
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                />

                <div className="flex gap-3 mt-8">
                    <ButtonSecondary
                        onClick={() => setShowModal(false)}
                        className="flex-1"
                    >
                        Cancelar
                    </ButtonSecondary>
                    <ButtonPrimary
                        onClick={handleSelect}
                        disabled={!selectedValue || loading}
                        className="flex-1"
                    >
                        {loading ? 'Selecionando...' : 'Selecionar'}
                    </ButtonPrimary>
                </div>
            </div>
        </div>
    );
};

export default SelectorLocalidadeModal;
