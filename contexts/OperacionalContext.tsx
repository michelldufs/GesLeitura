import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useLocalidade } from './LocalidadeContext';
import { Ponto, Rota, Secao, Operador, CentroCusto, Cota } from '../types';

interface OperacionalContextType {
    pontos: Ponto[];
    rotas: Rota[];
    secoes: Secao[];
    operadores: Operador[];
    centrosCusto: CentroCusto[];
    cotas: Cota[];
    loading: boolean;
    refreshData: () => Promise<void>;

    // Helpers
    pontosMap: Record<string, Ponto>;
    rotasMap: Record<string, Rota>;
    secoesMap: Record<string, Secao>;
    operadoresMap: Record<string, Operador>;
    centrosCustoMap: Record<string, CentroCusto>;
}

const OperacionalContext = createContext<OperacionalContextType | undefined>(undefined);

export const OperacionalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { selectedLocalidade } = useLocalidade();
    const [pontos, setPontos] = useState<Ponto[]>([]);
    const [rotas, setRotas] = useState<Rota[]>([]);
    const [secoes, setSecoes] = useState<Secao[]>([]);
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
    const [cotas, setCotas] = useState<Cota[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshData = async () => {
        if (!selectedLocalidade) return;

        setLoading(true);
        try {
            const qParams = [where('localidadeId', '==', selectedLocalidade)];

            const [pSnap, rSnap, sSnap, oSnap, cSnap, cotSnap] = await Promise.all([
                getDocs(query(collection(db, 'pontos'), ...qParams)),
                getDocs(query(collection(db, 'rotas'), ...qParams)),
                getDocs(query(collection(db, 'secoes'), ...qParams)),
                getDocs(query(collection(db, 'operadores'), ...qParams)),
                getDocs(query(collection(db, 'centros_custo'), ...qParams)),
                getDocs(query(collection(db, 'cotas'), ...qParams))
            ]);

            setPontos(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ponto)));
            setRotas(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Rota)));
            setSecoes(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Secao)));
            setOperadores(oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Operador)));
            setCentrosCusto(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as CentroCusto)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
            setCotas(cotSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cota)).filter(c => c.active !== false));
        } catch (error) {
            console.error("Erro ao carregar dados operacionais:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedLocalidade) {
            refreshData();

            // Opt-in for real-time updates for better fluidity (optional, can be expensive)
            // For now, let's keep it simple with manual refresh or trigger on change.
        } else {
            setPontos([]);
            setRotas([]);
            setSecoes([]);
            setOperadores([]);
            setCentrosCusto([]);
        }
    }, [selectedLocalidade]);

    const pontosMap = useMemo(() => {
        const map: Record<string, Ponto> = {};
        pontos.forEach(p => map[p.id] = p);
        return map;
    }, [pontos]);

    const rotasMap = useMemo(() => {
        const map: Record<string, Rota> = {};
        rotas.forEach(r => map[r.id] = r);
        return map;
    }, [rotas]);

    const secoesMap = useMemo(() => {
        const map: Record<string, Secao> = {};
        secoes.forEach(s => map[s.id] = s);
        return map;
    }, [secoes]);

    const operadoresMap = useMemo(() => {
        const map: Record<string, Operador> = {};
        operadores.forEach(o => map[o.id] = o);
        return map;
    }, [operadores]);

    const centrosCustoMap = useMemo(() => {
        const map: Record<string, CentroCusto> = {};
        centrosCusto.forEach(c => map[c.id!] = c);
        return map;
    }, [centrosCusto]);

    return (
        <OperacionalContext.Provider value={{
            pontos, rotas, secoes, operadores, centrosCusto, cotas, loading, refreshData,
            pontosMap, rotasMap, secoesMap, operadoresMap, centrosCustoMap
        }}>
            {children}
        </OperacionalContext.Provider>
    );
};

export const useOperacional = () => {
    const context = useContext(OperacionalContext);
    if (context === undefined) {
        throw new Error('useOperacional must be used within an OperacionalProvider');
    }
    return context;
};
