import { ContractType } from 'Stores/Modules/Trading/Helpers/contract-type';
import { TTradeStore } from 'Types';

export const onChangeContractType = (store: TTradeStore) => {
    return ContractType.getContractValues(store);
};
