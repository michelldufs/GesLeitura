import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { adminService } from '../services/adminService';
import { Localidade } from '../types';

interface LocalidadeContextType {
    selectedLocalidade: string | null;
    selectedLocalidadeName: string | null;
    setSelectedLocalidade: (id: string, name: string) => void;
    clearSelectedLocalidade: () => void;
    isFilteredByLocalidade: boolean;
    localidadeSelecionada: boolean;
    localidades: Localidade[]; // Nova propriedade
    loadingLocalidades: boolean;
}

const LocalidadeContext = createContext<LocalidadeContextType | undefined>(undefined);

export const LocalidadeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userProfile } = useAuth();
    const [selectedLocalidade, setSelectedLocalidadeState] = useState<string | null>(null);
    const [selectedLocalidadeName, setSelectedLocalidadeNameState] = useState<string | null>(null);
    const [localidades, setLocalidades] = useState<Localidade[]>([]);
    const [loadingLocalidades, setLoadingLocalidades] = useState(false);

    // Salvar localidade no localStorage para persistência
    useEffect(() => {
        if (selectedLocalidade) {
            localStorage.setItem('selectedLocalidade', selectedLocalidade);
            localStorage.setItem('selectedLocalidadeName', selectedLocalidadeName || '');
        } else {
            localStorage.removeItem('selectedLocalidade');
            localStorage.removeItem('selectedLocalidadeName');
        }
    }, [selectedLocalidade, selectedLocalidadeName]);

    // Restaurar localidade do localStorage ao carregar
    useEffect(() => {
        const savedLocalidade = localStorage.getItem('selectedLocalidade');
        const savedLocalidadeName = localStorage.getItem('selectedLocalidadeName');

        if (savedLocalidade && savedLocalidadeName) {
            setSelectedLocalidadeState(savedLocalidade);
            setSelectedLocalidadeNameState(savedLocalidadeName);
        }
    }, []);

    // Carregar todas as localidades (apenas uma vez)
    useEffect(() => {
        const fetchLocalidades = async () => {
            setLoadingLocalidades(true);
            try {
                const data = await adminService.getLocalidades();
                setLocalidades(data as Localidade[]);
            } catch (error) {
                console.error("Erro ao carregar localidades no contexto", error);
            } finally {
                setLoadingLocalidades(false);
            }
        };
        fetchLocalidades();
    }, []);

    const setSelectedLocalidade = (id: string, name: string) => {
        setSelectedLocalidadeState(id);
        setSelectedLocalidadeNameState(name);
    };

    const clearSelectedLocalidade = () => {
        setSelectedLocalidadeState(null);
        setSelectedLocalidadeNameState(null);
        localStorage.removeItem('selectedLocalidade');
        localStorage.removeItem('selectedLocalidadeName');
    };

    // Limpar se fizer logout
    useEffect(() => {
        if (!userProfile) {
            clearSelectedLocalidade();
        }
    }, [userProfile]);

    const isFilteredByLocalidade = selectedLocalidade !== null && userProfile?.role !== 'coleta';

    const localidadeSelecionada = !!selectedLocalidade || userProfile?.role === 'coleta';

    return (
        <LocalidadeContext.Provider
            value={{
                selectedLocalidade,
                selectedLocalidadeName,
                setSelectedLocalidade,
                clearSelectedLocalidade,
                isFilteredByLocalidade,
                localidadeSelecionada,
                localidades,
                loadingLocalidades
            }}
        >
            {children}
        </LocalidadeContext.Provider>
    );
};

export const useLocalidade = () => {
    const context = useContext(LocalidadeContext);
    if (context === undefined) {
        throw new Error('useLocalidade must be used within a LocalidadeProvider');
    }
    return context;
};
