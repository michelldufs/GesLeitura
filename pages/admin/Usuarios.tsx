import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, CreateUserData } from '../../services/adminService';
import { UserRole, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { Plus, Edit2, Check, X, MapPin, Search } from 'lucide-react';

type UserProfileWithSerial = UserProfile & { allowedDeviceSerial?: string | null; missingProfile?: boolean; authOnly?: boolean };
type Localidade = { id: string; nome: string; active: boolean };

const Usuarios: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();

    const [showNewUserModal, setShowNewUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        name: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'coleta' as UserRole
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
    const [users, setUsers] = useState<UserProfileWithSerial[]>([]);
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [editingUser, setEditingUser] = useState<UserProfileWithSerial | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        password: '',
        confirmPassword: '',
        role: 'coleta' as UserRole,
        active: true,
        allowedLocalidades: [] as string[]
    });

    // Novos estados de Filtro/Busca
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'todos' | UserRole>('todos');

    // Lógica de filtragem
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === 'todos' || user.role === filterRole;

        return matchesSearch && matchesRole;
    });

    const filterOptions = [
        { id: 'todos', label: 'Todos' },
        { id: 'admin', label: 'Admins' },
        { id: 'coleta', label: 'Coleta' },
        { id: 'gerente', label: 'Gerentes' },
        { id: 'socio', label: 'Sócios' },
        { id: 'financeiro', label: 'Financeiro' },
    ];

    const fetchUsers = async () => {
        try {
            // Busca apenas usuários do Firestore (coleção "users")
            const firestoreUsers = await adminService.getUsers();
            console.log('Usuários do Firestore:', firestoreUsers);
            // Ordenar por nome crescente
            (firestoreUsers as UserProfileWithSerial[]).sort((a, b) => (a.displayName || a.name || a.email || '').localeCompare(b.displayName || b.name || b.email || ''));
            setUsers(firestoreUsers as UserProfileWithSerial[]);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            setUsers([]);
        }
    };

    const handleSyncMissingProfiles = async () => {
        // Descontinuado: Usuários inativos foram desativados no Firebase
        console.log('Sincronização de perfis descontinuada');
    };

    const fetchLocalidades = async () => {
        try {
            const locs = await adminService.getLocalidades();
            console.log('Localidades carregadas:', locs);
            setLocalidades(locs as Localidade[]);
        } catch (error) {
            console.error('Erro ao buscar localidades:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchLocalidades();
    }, []);

    const handleCreateNewUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        try {
            if (newUserForm.password !== newUserForm.confirmPassword) {
                throw new Error('Senhas não conferem');
            }
            if (newUserForm.password.length < 6) {
                throw new Error('Senha deve ter no mínimo 6 caracteres');
            }

            const email = `${newUserForm.username}@sistema.local`;
            const allowedLocalidades = userProfile?.allowedLocalidades || [];

            const createData: CreateUserData = {
                name: newUserForm.name,
                email,
                password: newUserForm.password,
                role: newUserForm.role,
                allowedDeviceSerial: '',
                allowedLocalidades
            };

            await adminService.createUser(createData);
            setMessageType('success');
            setMessage('Usuário criado com sucesso!');
            setNewUserForm({ name: '', username: '', password: '', confirmPassword: '', role: 'coleta' });
            setShowNewUserModal(false);
            fetchUsers();
        } catch (error: any) {
            console.error(error);
            setMessageType('error');
            if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('email-already-in-use'))) {
                setMessage('Erro: Este nome de usuário já está em uso. Tente outro.');
            } else {
                setMessage('Erro: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = userProfile?.role === 'admin';

    const openEditModal = (user: UserProfileWithSerial) => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            password: '',
            confirmPassword: '',
            role: user.role,
            active: user.active !== false,
            allowedLocalidades: user.allowedLocalidades || []
        });
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setEditForm({ name: '', password: '', confirmPassword: '', role: 'coleta', active: true, allowedLocalidades: [] });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setLoading(true);
        try {
            if (editForm.password && editForm.password !== editForm.confirmPassword) {
                throw new Error('Senhas não conferem');
            }

            await adminService.updateUser(editingUser.uid, {
                name: editForm.name,
                role: editForm.role,
                active: editForm.active,
                allowedLocalidades: editForm.allowedLocalidades
            });

            if (editForm.password && editForm.password.length >= 6) {
                console.log('Mudança de senha será implementada via Cloud Function');
            }

            setMessageType('success');
            setMessage('Usuário atualizado com sucesso!');
            closeEditModal();
            fetchUsers();
        } catch (error: any) {
            setMessageType('error');
            setMessage('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (user: UserProfileWithSerial) => {
        setLoading(true);
        try {
            await adminService.updateUser(user.uid, {
                active: !(user.active !== false)
            });
            setMessageType('success');
            setMessage(user.active ? 'Usuário desativado!' : 'Usuário ativado!');
            fetchUsers();
        } catch (error: any) {
            setMessageType('error');
            setMessage('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        const colors: Record<UserRole, 'primary' | 'success' | 'warning' | 'secondary'> = {
            admin: 'primary',
            gerente: 'warning',
            socio: 'success',
            coleta: 'secondary',
            financeiro: 'primary',
            operacional: 'warning',
            supervisor: 'warning'
        };
        return colors[role] || 'secondary';
    };

    return (
        <div className="w-full">
            <PageHeader
                title="Gerenciar Usuários"
                subtitle="Crie e gerencie todos os usuários do sistema"
                action={
                    <ButtonPrimary
                        onClick={() => setShowNewUserModal(true)}
                        disabled={!isAdmin}
                    >
                        <Plus size={20} /> Novo Usuário
                    </ButtonPrimary>
                }
            />

            {!isAdmin && (
                <AlertBox
                    type="warning"
                    message="Apenas administradores podem gerenciar usuários. Solicite acesso ao administrador do sistema."
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

            {/* Usuários Card com Design WhatsApp */}
            <GlassCard className="p-0 overflow-hidden">
                {/* Header da Lista com Busca e Filtros */}
                <div className="p-6 pb-2 border-b border-slate-100 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Usuários</h2>
                        <button
                            onClick={fetchUsers}
                            className="px-4 py-2 text-sm text-[#008069] font-semibold bg-[#e7fce3] hover:bg-[#dcf8c6] rounded-full transition-colors"
                        >
                            ↻ Atualizar Lista
                        </button>
                    </div>

                    {/* Barra de Busca Estilo WhatsApp */}
                    <div className="mb-4">
                        <InputField
                            placeholder="Pesquisar usuário por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={<Search size={20} />}
                            className="w-full"
                        />
                    </div>

                    {/* Chips de Filtro Estilo WhatsApp */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {filterOptions.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterRole(opt.id as any)}
                                className={`
                                    whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                                    ${filterRole === opt.id
                                        ? 'bg-[#e7fce3] text-[#008069]'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-slate-400" />
                        </div>
                        <p className="text-slate-600 text-lg font-medium">Nenhum usuário encontrado</p>
                        <p className="text-slate-400 text-sm mt-1">Tente ajustar seus filtros de pesquisa</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#f0f2f5] border-b border-slate-200">
                                <tr>
                                    <th className="px-2 py-1 font-semibold text-slate-600 text-xs uppercase tracking-wider">Nome / Email</th>
                                    <th className="px-2 py-1 font-semibold text-slate-600 text-xs uppercase tracking-wider">Função</th>
                                    <th className="px-2 py-1 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-2 py-1 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-2 py-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{user.name}</p>
                                                    <p className="text-slate-500 text-xs">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1">
                                            <Badge variant={getRoleBadgeColor(user.role)}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-2 py-1">
                                            <Badge variant={user.active !== false ? 'success' : 'error'}>
                                                {user.active !== false ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </td>
                                        <td className="px-2 py-1 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    disabled={loading}
                                                    className={`p-1 rounded-full transition-colors ${user.active !== false
                                                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                        : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={user.active !== false ? 'Desativar' : 'Ativar'}
                                                >
                                                    {user.active !== false ? <X size={16} /> : <Check size={16} />}
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

            {/* Modal Novo Usuário */}
            <Modal
                isOpen={showNewUserModal}
                onClose={() => setShowNewUserModal(false)}
                title="Criar Novo Usuário"
                actions={
                    <div className="flex gap-3">
                        <ButtonPrimary onClick={handleCreateNewUser} disabled={loading} type="submit">
                            {loading ? 'Criando...' : 'Criar'}
                        </ButtonPrimary>
                        <ButtonSecondary onClick={() => setShowNewUserModal(false)}>
                            Cancelar
                        </ButtonSecondary>
                    </div>
                }
            >
                <form onSubmit={handleCreateNewUser} className="space-y-5">
                    <InputField
                        label="Nome Completo"
                        placeholder="Ex: João Silva"
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        required
                    />
                    <InputField
                        label="Nome de Usuário (Login)"
                        placeholder="Ex: joao"
                        value={newUserForm.username}
                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                        required
                    />
                    <InputField
                        label="Senha"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        required
                    />
                    <InputField
                        label="Confirmar Senha"
                        type="password"
                        placeholder="Repita a senha"
                        value={newUserForm.confirmPassword}
                        onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })}
                        required
                    />
                    <SelectField
                        label="Perfil"
                        options={[
                            { value: 'coleta', label: 'Coleta (Operacional)' },
                            { value: 'gerente', label: 'Gerente' },
                            { value: 'socio', label: 'Sócio' },
                            { value: 'admin', label: 'Administrador' }
                        ]}
                        value={newUserForm.role}
                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    />
                </form>
            </Modal>

            {/* Modal Editar Usuário */}
            <Modal
                isOpen={!!editingUser}
                onClose={closeEditModal}
                title={`Editar: ${editingUser?.name || ''}`}
                actions={
                    <div className="flex gap-3">
                        <ButtonPrimary onClick={handleEditSubmit} disabled={loading} type="submit">
                            {loading ? 'Salvando...' : 'Salvar'}
                        </ButtonPrimary>
                        <ButtonSecondary onClick={closeEditModal}>
                            Cancelar
                        </ButtonSecondary>
                    </div>
                }
            >
                {editingUser && (
                    <form onSubmit={handleEditSubmit} className="space-y-5">
                        <InputField
                            label="Nome Completo"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            required
                        />
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email (somente leitura)</label>
                            <div className="px-4 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-600 font-medium">
                                {editingUser.email}
                            </div>
                        </div>
                        <SelectField
                            label="Perfil"
                            options={[
                                { value: 'coleta', label: 'Coleta (Operacional)' },
                                { value: 'gerente', label: 'Gerente' },
                                { value: 'socio', label: 'Sócio' },
                                { value: 'admin', label: 'Administrador' }
                            ]}
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                        />

                        <div className="flex gap-2 pt-2">
                            <ButtonSecondary
                                type="button"
                                onClick={() => {
                                    closeEditModal();
                                    navigate('/admin/editar-usuario-localidades', { state: { user: editingUser } });
                                }}
                                icon={<MapPin className="h-4 w-4" />}
                                className="flex-1"
                            >
                                Editar Localidades
                            </ButtonSecondary>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Usuarios;
