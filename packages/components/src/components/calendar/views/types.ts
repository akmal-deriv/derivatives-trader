import { type ConfigType, type Dayjs } from '@deriv/shared';

import { type TCalendarUnit } from '../helpers/constants';

export type CommonPropTypes = {
    calendar_date: ConfigType;
    isPeriodDisabled: (date: Dayjs, unit: TCalendarUnit) => boolean;
    selected_date: ConfigType;
    updateSelected: (e: React.MouseEvent<HTMLSpanElement>, type: TCalendarUnit) => void;
};
