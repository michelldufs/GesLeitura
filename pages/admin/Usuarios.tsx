import React, { useState, useEffect } from 'react';
import { adminService, CreateUserData } from '../../services/adminService';
import { UserRole, UserProfile } from '../../types';

const Usuarios: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        role: 'coleta' as UserRole,
        allowedDeviceSerial: '',
        existsInAuth: false,
        existingUid: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [bulkText, setBulkText] = useState('');
    const [bulkResult, setBulkResult] = useState<string>('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const fetchedUsers = await adminService.getUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Construct email from username
            const email = `${formData.username}@sistema.local`;

            if (formData.existsInAuth) {
                // Create only Firestore profile for an existing Auth user
                if (!formData.existingUid) {
                    throw new Error('Informe o UID do usuário já existente no Auth.');
                }
                await adminService.createUserProfileOnly({
                    name: formData.name,
                    email: email,
                    role: formData.role,
                    allowedDeviceSerial: formData.allowedDeviceSerial,
                    uid: formData.existingUid
                });
                setMessage('Perfil no Firestore sincronizado com sucesso para usuário existente.');
            } else {
                const createData: CreateUserData = {
                    name: formData.name,
                    email: email,
                    password: formData.password,
                    role: formData.role,
                    allowedDeviceSerial: formData.allowedDeviceSerial
                };
                await adminService.createUser(createData);
                setMessage('Usuário criado com sucesso! (Atenção: Você foi logado como o novo usuário)');
            }
            setFormData({
                name: '',
                username: '',
                password: '',
                role: 'coleta',
                allowedDeviceSerial: '',
                existsInAuth: false,
                existingUid: ''
            });
            fetchUsers(); // Refresh list
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('email-already-in-use'))) {
                setMessage('Erro: Este nome de usuário já está em uso. Tente outro.');
            } else {
                setMessage('Erro ao criar usuário: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Usuários</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Novo Usuário</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Usuário (Login)</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    placeholder="ex: coleta"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={!formData.existsInAuth}
                                    disabled={formData.existsInAuth}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    id="existsInAuth"
                                    type="checkbox"
                                    name="existsInAuth"
                                    checked={formData.existsInAuth}
                                    onChange={(e) => setFormData({ ...formData, existsInAuth: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <label htmlFor="existsInAuth" className="text-sm text-gray-700">Usuário já existe no Auth</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">UID (Auth)</label>
                                <input
                                    type="text"
                                    name="existingUid"
                                    value={formData.existingUid}
                                    onChange={handleChange}
                                    placeholder="Cole o UID do usuário do Auth"
                                    disabled={!formData.existsInAuth}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Use para sincronizar perfis já criados em Authentication.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Função (Role)</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="admin">Administrador</option>
                                    <option value="gerente">Gerente</option>
                                    <option value="socio">Sócio</option>
                                    <option value="coleta">Coleta (Operacional)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Serial do Dispositivo
                                    <span className="text-xs text-gray-500 ml-1">(Opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    name="allowedDeviceSerial"
                                    value={formData.allowedDeviceSerial}
                                    onChange={handleChange}
                                    placeholder="UUID do aparelho"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Para vincular login a um aparelho específico.</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-2 px-4 rounded text-white font-bold transition-colors ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {loading ? 'Criando...' : 'Cadastrar Usuário'}
                            </button>
                        </div>

                        {message && (
                            <div className={`mt-4 p-3 rounded text-sm ${message.includes('sucesso') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                </div>

                {/* List Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Usuários Cadastrados</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Email / Usuário</th>
                                    <th className="px-4 py-3">Função</th>
                                    <th className="px-4 py-3">Serial</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-center">Nenhum usuário encontrado.</td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.uid} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                                            <td className="px-4 py-3">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold 
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                        user.role === 'gerente' ? 'bg-blue-100 text-blue-800' :
                                                            user.role === 'socio' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-gray-400">
                                                {user.allowedDeviceSerial ? user.allowedDeviceSerial.substring(0, 8) + '...' : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 border-t pt-4">
                        <h3 className="text-md font-semibold mb-2 text-gray-700">Sincronização em Massa (Usuarios já no Auth)</h3>
                        <p className="text-xs text-gray-500 mb-2">Formato por linha: <code>uid;username;name;role;serial</code> — role: admin|gerente|socio|coleta; serial opcional.</p>
                        <textarea
                            className="w-full p-2 border rounded min-h-[120px] font-mono text-xs"
                            placeholder="Exemplo:\nYJdExxlRIONPG...;daniel;Daniel Silva;gerente;ABC-UUID\nCT4p2fVPbbt...;coleta1;Coleta 1;coleta;"
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                className="py-2 px-4 rounded text-white font-bold bg-indigo-600 hover:bg-indigo-700"
                                onClick={async () => {
                                    setBulkResult('');
                                    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                                    const items: Array<{ uid: string; email: string; name: string; role: UserRole; allowedDeviceSerial?: string }> = [];
                                    for (const line of lines) {
                                        const parts = line.split(';');
                                        const [uid, username, name, role, serial] = parts.map(p => (p || '').trim());
                                        if (!uid || !username || !name || !role) {
                                            items.push({ uid: uid || 'N/A', email: 'N/A', name: name || 'N/A', role: 'coleta', allowedDeviceSerial: undefined });
                                            continue;
                                        }
                                        const email = `${username}@sistema.local`;
                                        const finalRole = (['admin','gerente','socio','coleta'] as UserRole[]).includes(role as UserRole) ? role as UserRole : 'coleta';
                                        items.push({ uid, email, name, role: finalRole, allowedDeviceSerial: serial || undefined });
                                    }
                                    const res = await adminService.bulkSyncProfiles(items);
                                    const okCount = res.filter(r => r.ok).length;
                                    const fail = res.filter(r => !r.ok);
                                    let summary = `Sincronizados: ${okCount}/${res.length}`;
                                    if (fail.length) {
                                        summary += `\nFalhas (${fail.length}):\n` + fail.map(f => `- ${f.uid}: ${f.error}`).join('\n');
                                    }
                                    setBulkResult(summary);
                                    fetchUsers();
                                }}
                            >Sincronizar</button>
                            <button className="py-2 px-4 rounded border" onClick={() => { setBulkText(''); setBulkResult(''); }}>Limpar</button>
                        </div>
                        {bulkResult && (
                            <pre className="mt-2 p-2 bg-gray-50 border rounded text-xs whitespace-pre-wrap">{bulkResult}</pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Usuarios;
