import React, { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

const ConfiguracaoTerminal: React.FC = () => {
    const [deviceId, setDeviceId] = useState<string>('');
    const [localidadeId, setLocalidadeId] = useState<string>('');
    const [senhaTecnica, setSenhaTecnica] = useState<string>('');
    const [mensagem, setMensagem] = useState<string>('');

    useEffect(() => {
        const fetchDeviceId = async () => {
            try {
                const id = await Device.getId();
                const uuid = (id as any).uuid || (id as any).identifier || '';
                setDeviceId(uuid);
            } catch (error) {
                console.error("Erro ao obter ID do dispositivo:", error);
                setDeviceId("Web-" + Date.now());
            }
        };
        fetchDeviceId();
    }, []);

    const handleSalvar = async () => {
        if (senhaTecnica !== 'admin123') {
            setMensagem('Senha técnica incorreta.');
            return;
        }

        if (!localidadeId) {
            setMensagem('Informe o ID da Localidade.');
            return;
        }

        try {
            await Preferences.set({
                key: 'localidadeId',
                value: localidadeId,
            });
            setMensagem('Configuração salva com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar:", error);
            setMensagem('Erro ao salvar configuração.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-green-400 p-6 font-mono flex flex-col items-center justify-center">
            <div className="w-full max-w-md border border-green-800 p-6 rounded shadow-lg bg-black/50">
                <h1 className="text-2xl font-bold mb-6 text-center border-b border-green-800 pb-2">TERMINAL CONFIG</h1>

                <div className="mb-4">
                    <label className="block text-xs uppercase tracking-wide mb-1 opacity-70">Device UUID</label>
                    <input
                        type="text"
                        value={deviceId}
                        readOnly
                        className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-xs text-gray-300 focus:outline-none"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-xs uppercase tracking-wide mb-1 opacity-70">ID Localidade</label>
                    <input
                        type="text"
                        value={localidadeId}
                        onChange={(e) => setLocalidadeId(e.target.value)}
                        className="w-full bg-slate-800 border border-green-900 p-2 rounded text-green-400 focus:outline-none focus:border-green-500 transition-colors"
                        placeholder="Digite o ID..."
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-xs uppercase tracking-wide mb-1 opacity-70">Senha Técnica</label>
                    <input
                        type="password"
                        value={senhaTecnica}
                        onChange={(e) => setSenhaTecnica(e.target.value)}
                        className="w-full bg-slate-800 border border-green-900 p-2 rounded text-green-400 focus:outline-none focus:border-green-500 transition-colors"
                        placeholder="******"
                    />
                </div>

                <button
                    onClick={handleSalvar}
                    className="w-full bg-green-900 hover:bg-green-800 text-white font-bold py-3 px-4 rounded transition-colors uppercase tracking-wider"
                >
                    Vincular Terminal
                </button>

                {mensagem && (
                    <div className={`mt-4 text-center text-sm p-2 rounded ${mensagem.includes('sucesso') ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                        {mensagem}
                    </div>
                )}
            </div>
            <div className="mt-8 text-xs text-slate-600">
                v1.0.0 - Secure Boot
            </div>
        </div>
    );
};

export default ConfiguracaoTerminal;
