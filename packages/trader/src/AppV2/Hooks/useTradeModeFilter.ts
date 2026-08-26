import { useModulesStore } from 'Stores/useModulesStores';

const useTradeModeFilter = () => {
    const { positions } = useModulesStore();
    const { tradeModeFilter, setTradeModeFilter } = positions;

    return { tradeModeFilter, setTradeModeFilter };
};

export default useTradeModeFilter;
