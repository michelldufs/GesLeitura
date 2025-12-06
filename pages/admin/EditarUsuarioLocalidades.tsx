import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { UserRole, UserProfile, Localidade } from '../../types';
import { GlassCard, ButtonPrimary, ButtonSecondary, PageHeader, Badge, AlertBox } from '../../components/MacOSDesign';
import { ArrowLeft, MapPin, CheckCircle2, Circle } from 'lucide-react';

type UserProfileWithSerial = UserProfile & { allowedDeviceSerial?: string | null };

const EditarUsuarioLocalidades: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state?.user as UserProfileWithSerial | null;

    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [allowedLocalidades, setAllowedLocalidades] = useState<string[]>(user?.allowedLocalidades || []);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

    useEffect(() => {
        fetchLocalidades();
    }, []);

    const fetchLocalidades = async () => {
        try {
            const locs = await adminService.getLocalidades();
            console.log('Localidades carregadas:', locs);
            setLocalidades(locs as Localidade[]);
        } catch (error) {
            console.error('Erro ao buscar localidades:', error);
        }
    };

    const handleToggleLocalidade = (localidadeId: string) => {
        setAllowedLocalidades(prev => {
            const isSelected = prev.includes(localidadeId);
            return isSelected
                ? prev.filter(id => id !== localidadeId)
                : [...prev, localidadeId];
        });
    };

    const handleSelectAll = () => {
        const allIds = localidades.filter(loc => loc.active).map(loc => loc.id);
        setAllowedLocalidades(allIds);
    };

    const handleDeselectAll = () => {
        setAllowedLocalidades([]);
    };

    const handleSave = async () => {
        if (!user) {
            setMessage('Erro: Usuário não definido');
            setMessageType('error');
            return;
        }

        setLoading(true);
        setMessage('');
        setMessageType('');

        try {
            await adminService.updateUser(user.uid, {
                allowedLocalidades
            });
            setMessage('Localidades atualizadas com sucesso!');
            setMessageType('success');
            setTimeout(() => {
                navigate(-1);
            }, 1500);
        } catch (error: any) {
            setMessage('Erro: ' + error.message);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <PageHeader
                    title="Erro"
                    subtitle="Usuário não encontrado"
                    action={
                        <ButtonSecondary onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-4 w-4" /> Voltar
                        </ButtonSecondary>
                    }
                />
            </div>
        );
    }

    const activeLocalidades = localidades.filter(loc => loc.active);
    const selectedCount = allowedLocalidades.length;
    const totalCount = activeLocalidades.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <PageHeader
                title={`Localidades de ${user.name}`}
                subtitle={`Configure as localidades que ${user.name} tem permissão de acessar`}
                action={
                    <ButtonSecondary onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </ButtonSecondary>
                }
            />

            {message && (
                <div className="mb-6">
                    <AlertBox type={messageType === 'success' ? 'success' : 'error'} message={message} />
                </div>
            )}

            {/* ... */}
            {/* ... */}
            <div className="w-full space-y-4">
                {/* Informações do usuário */}
                <GlassCard className="p-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Nome</p>
                            <p className="text-sm font-semibold text-slate-900 mt-1">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Email</p>
                            <p className="text-sm text-slate-700 mt-1 truncate">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Função</p>
                            <p className="mt-1">
                                <Badge variant="primary">{user.role}</Badge>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Status</p>
                            <p className="mt-1">
                                <Badge variant={user.active !== false ? 'success' : 'error'}>
                                    {user.active !== false ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Seleção de localidades */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-blue-600" />
                                Localidades Permitidas
                            </h2>
                            <p className="text-xs text-slate-600 mt-1">
                                {selectedCount} de {totalCount} localidade(s) selecionada(s)
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                Selecionar Todas
                            </button>
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="text-xs text-slate-600 hover:text-slate-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                Limpar
                            </button>
                        </div>
                    </div>

                    {activeLocalidades.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="font-medium text-base">Nenhuma localidade cadastrada</p>
                            <p className="text-xs mt-1">Crie localidades para atribuir aos usuários</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {activeLocalidades.map((localidade) => {
                                const isSelected = allowedLocalidades.includes(localidade.id);
                                return (
                                    <label
                                        key={localidade.id}
                                        className={`
                                            relative p-3 rounded-xl border cursor-pointer transition-all duration-200
                                            ${isSelected
                                                ? 'bg-blue-50 border-blue-300 shadow-sm'
                                                : 'bg-white border-slate-200/50 hover:border-slate-300 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {isSelected ? (
                                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleLocalidade(localidade.id)}
                                                    className="sr-only"
                                                />
                                                <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-900'
                                                    }`}>
                                                    {localidade.codigo ? `${localidade.codigo} - ${localidade.nome}` : localidade.nome}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                    {localidade.id}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </GlassCard>

                {/* Botões de ação */}
                <div className="flex gap-4 justify-end">
                    <ButtonSecondary
                        onClick={() => navigate(-1)}
                        disabled={loading}
                    >
                        Cancelar
                    </ButtonSecondary>
                    <ButtonPrimary
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </ButtonPrimary>
                </div>
            </div>
        </div>
    );
};

export default EditarUsuarioLocalidades;
