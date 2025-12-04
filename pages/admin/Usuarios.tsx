import React, { useEffect, useState } from 'react';
import { adminService, CreateUserData } from '../../services/adminService';
import { UserRole, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type UserProfileWithSerial = UserProfile & { allowedDeviceSerial?: string | null };
type Localidade = { id: string; nome: string; active: boolean };

const Usuarios: React.FC = () => {
    const { userProfile } = useAuth();

    // Modal de criar novo usuário
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

    // Criar novo usuário
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

            // TODO: Implementar mudança de senha via Cloud Function
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

    const toggleLocalidade = (localidadeId: string) => {
        setEditForm(prev => {
            const locs = prev.role === 'admin' ? [] : prev.allowedLocalidades || [];
            return {
                ...prev
            };
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h1>
                <button
                    onClick={() => setShowNewUserModal(true)}
                    disabled={!isAdmin}
                    className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
                        isAdmin
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    + Novo Usuário
                </button>
            </div>

            {!isAdmin && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
                    Apenas administradores podem gerenciar usuários. Solicite acesso ao administrador do sistema.
                </div>
            )}

            {message && (
                <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* Card de Usuários Cadastrados */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">Usuários Cadastrados</h2>
                        <button
                            onClick={fetchUsers}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                        >
                            Atualizar
                        </button>
                    </div>

                    {users.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Nenhum usuário cadastrado ainda.</p>
                            <p className="text-sm">Clique em "+ Novo Usuário" para criar o primeiro usuário.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Função</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.uid} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    user.role === 'gerente' ? 'bg-blue-100 text-blue-800' :
                                                    user.role === 'socio' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    user.active !== false
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {user.active !== false ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 space-x-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    disabled={loading}
                                                    className={`font-medium text-sm ${
                                                        user.active !== false
                                                            ? 'text-red-600 hover:text-red-800'
                                                            : 'text-green-600 hover:text-green-800'
                                                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {user.active !== false ? 'Desativar' : 'Ativar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Novo Usuário */}
            {showNewUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Criar Novo Usuário</h2>
                            <form onSubmit={handleCreateNewUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={newUserForm.name}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                        required
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Usuário (Login)</label>
                                    <input
                                        type="text"
                                        value={newUserForm.username}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                                        required
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: joao"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                    <input
                                        type="password"
                                        value={newUserForm.password}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                        required
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                                    <input
                                        type="password"
                                        value={newUserForm.confirmPassword}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })}
                                        required
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Repita a senha"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                                    <select
                                        value={newUserForm.role}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="coleta">Coleta (Operacional)</option>
                                        <option value="gerente">Gerente</option>
                                        <option value="socio">Sócio</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex-1 py-2 px-4 rounded text-white font-bold transition-colors ${
                                            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {loading ? 'Criando...' : 'Criar Usuário'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewUserModal(false)}
                                        className="flex-1 py-2 px-4 rounded border border-gray-300 font-bold hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Usuário */}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Editar Usuário</h2>
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        required
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (somente leitura)</label>
                                    <input
                                        type="text"
                                        value={editingUser.email}
                                        disabled
                                        className="w-full p-2 border rounded bg-gray-100 text-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="coleta">Coleta (Operacional)</option>
                                        <option value="gerente">Gerente</option>
                                        <option value="socio">Sócio</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex-1 py-2 px-4 rounded text-white font-bold transition-colors ${
                                            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {loading ? 'Salvando...' : 'Salvar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="flex-1 py-2 px-4 rounded border border-gray-300 font-bold hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;
