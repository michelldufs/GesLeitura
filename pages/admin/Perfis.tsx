import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader, GlassCard, AlertBox } from '../../components/MacOSDesign';
import { Check, X, Shield, Users, Smartphone, Lock, Unlock, Eye } from 'lucide-react';

const Perfis: React.FC = () => {
    const { userProfile } = useAuth();
    const isAuthorized = userProfile?.role === 'admin';

    // Definição das funcionalidades e permissões baseada na imagem
    const permissoes = [
        {
            funcionalidade: 'Acesso ao Painel Web',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: true, label: 'Sim' },
            coletor: { permitido: false, label: 'Não (Bloqueado)' },
            socio: { permitido: true, label: 'Sim' }
        },
        {
            funcionalidade: 'Acesso ao App Mobile',
            admin: { permitido: false, label: 'Não' },
            gerente: { permitido: false, label: 'Não' },
            coletor: { permitido: true, label: 'Sim' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Ver Dashboard (Totais)',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: true, label: 'Sim' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: true, label: 'Sim' }
        },
        {
            funcionalidade: 'Lançar Leitura (Hoje)',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: true, label: 'Sim' },
            coletor: { permitido: true, label: 'Sim' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Editar Leitura (Passado)',
            admin: { permitido: false, label: 'Não' },
            gerente: { permitido: false, label: 'Não' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Cadastrar Pontos/Rotas',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: true, label: 'Sim' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Arquivar (Soft Delete)',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: true, label: 'Sim' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Fechar Mês (Operacional)',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: true, label: 'Sim' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Configurar Cotas',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: false, label: 'Não' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Autorizar Dispositivo',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: false, label: 'Não' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
        {
            funcionalidade: 'Ver Logs de Auditoria',
            admin: { permitido: true, label: 'Sim' },
            gerente: { permitido: false, label: 'Não' },
            coletor: { permitido: false, label: 'Não' },
            socio: { permitido: false, label: 'Não' }
        },
    ];

    // Componente para renderizar célula de permissão
    const PermissaoCell = ({ data }: { data: { permitido: boolean, label: string } }) => (
        <div className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-all ${data.permitido
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
            {data.permitido ? <Check size={14} /> : <X size={14} />}
            <span>{data.label}</span>
            {data.label.includes('View-Only') && <Eye size={12} className="ml-1 opacity-70" />}
            {data.label.includes('Bloqueado') && <Lock size={12} className="ml-1 opacity-70" />}
        </div>
    );

    return (
        <div className="w-full">
            <PageHeader
                title="Matriz de Permissões"
                subtitle="Entenda o que cada perfil pode acessar e executar no sistema"
                action={
                    <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <Shield size={14} className="text-purple-600" />
                        <span>Segurança baseada em cargos (RBAC)</span>
                    </div>
                }
            />

            {!isAuthorized && (
                <AlertBox
                    type="warning"
                    message={`Seu perfil (${userProfile?.role}) não possui permissão para visualizar esta página.`}
                />
            )}

            {isAuthorized && (
                <GlassCard className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="text-purple-600" size={20} />
                            Perfis de Acesso
                        </h2>
                        <p className="text-gray-500 text-xs mt-0.5">Comparativo detalhado de funcionalidades por cargo</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-100/80 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-2 font-semibold text-gray-700 uppercase tracking-wide">Funcionalidade / Ação</th>
                                    <th className="px-2 py-2 font-semibold text-amber-600 uppercase tracking-wide text-center w-32">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="flex items-center gap-1"><Shield size={14} /> Admin</span>
                                            <span className="text-[9px] opacity-70 normal-case">(Dono)</span>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 font-semibold text-blue-600 uppercase tracking-wide text-center w-32">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="flex items-center gap-1"><Users size={14} /> Gerente</span>
                                            <span className="text-[9px] opacity-70 normal-case">(Braço Direito)</span>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 font-semibold text-rose-600 uppercase tracking-wide text-center w-32">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="flex items-center gap-1"><Smartphone size={14} /> Coletor</span>
                                            <span className="text-[9px] opacity-70 normal-case">(Operacional)</span>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 font-semibold text-purple-600 uppercase tracking-wide text-center w-32">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="flex items-center gap-1"><Users size={14} /> Sócio</span>
                                            <span className="text-[9px] opacity-70 normal-case">(Investidor)</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {permissoes.map((item, index) => (
                                    <tr
                                        key={index}
                                        className={`hover:bg-gray-50/80 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                    >
                                        <td className="px-4 py-1.5 font-medium text-gray-900 border-r border-gray-100">
                                            {item.funcionalidade}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <PermissaoCell data={item.admin} />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <PermissaoCell data={item.gerente} />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <PermissaoCell data={item.coletor} />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <PermissaoCell data={item.socio} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                            <Lock size={12} />
                            As permissões são controladas automaticamente pelo sistema baseado no cargo (token de autenticação).
                        </p>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

export default Perfis;
