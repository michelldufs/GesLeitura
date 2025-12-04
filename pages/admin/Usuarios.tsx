import React, { useEffect, useState } from 'react';
import { adminService, CreateUserData } from '../../services/adminService';
import { UserRole, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { Plus, Edit2, Check, X } from 'lucide-react';

type UserProfileWithSerial = UserProfile & { allowedDeviceSerial?: string | null };
type Localidade = { id: string; nome: string; active: boolean };

const Usuarios: React.FC = () => {
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
        active: true
    });

    const fetchUsers = async () => {
        try {
            const fetchedUsers = await adminService.getUsers();
            setUsers(fetchedUsers as UserProfileWithSerial[]);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchLocalidades();
    }, []);

    const fetchLocalidades = async () => {
        try {
            const locs = await adminService.getLocalidades();
            setLocalidades(locs as Localidade[]);
        } catch (error) {
            console.error('Erro ao buscar localidades:', error);
        }
    };

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
            active: user.active !== false
        });
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setEditForm({ name: '', password: '', confirmPassword: '', role: 'coleta', active: true });
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
                active: editForm.active
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
            coleta: 'secondary'
        };
        return colors[role] || 'secondary';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <PageHeader 
                title="Gerenciar Usuários"
                subtitle="Crie e gerencie todos os usuários do sistema"
                action={
                    <button
                        onClick={() => setShowNewUserModal(true)}
                        disabled={!isAdmin}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
                    >
                        <Plus size={20} /> Novo Usuário
                    </button>
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

            {/* Usuários Card */}
            <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-slate-900">Usuários Cadastrados</h2>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                        ↻ Atualizar
                    </button>
                </div>

                {users.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-lg">Nenhum usuário cadastrado ainda.</p>
                        <p className="text-slate-400 text-sm mt-2">Clique em "Novo Usuário" para criar o primeiro usuário.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/50">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-200/50">
                                <tr>
                                    <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                                    <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Email</th>
                                    <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Função</th>
                                    <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Status</th>
                                    <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.uid} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-2.5 font-medium text-slate-900">{user.name}</td>
                                        <td className="px-6 py-2.5 text-slate-600">{user.email}</td>
                                        <td className="px-6 py-2.5">
                                            <Badge variant={getRoleBadgeColor(user.role)}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-2.5">
                                            <Badge variant={user.active !== false ? 'success' : 'error'}>
                                                {user.active !== false ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-2.5 flex gap-3">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
                                            >
                                                <Edit2 size={16} /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                disabled={loading}
                                                className={`font-medium transition-colors flex items-center gap-1 ${
                                                    user.active !== false
                                                        ? 'text-red-500 hover:text-red-700'
                                                        : 'text-green-500 hover:text-green-700'
                                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {user.active !== false ? (
                                                    <>< X size={16} /> Desativar</>
                                                ) : (
                                                    <>< Check size={16} /> Ativar</>
                                                )}
                                            </button>
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
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Usuarios;
