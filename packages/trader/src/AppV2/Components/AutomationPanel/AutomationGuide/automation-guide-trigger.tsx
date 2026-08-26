import { LabelPairedChevronRightSmRegularIcon } from '@deriv/quill-icons';
import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

type TAutomationGuideTriggerProps = {
    title: string;
    onClick: () => void;
};

const AutomationGuideTrigger = ({ title, onClick }: TAutomationGuideTriggerProps) => (
    <button type='button' className='automation-guide__trigger' onClick={onClick}>
        <Text size='sm' color='quill-typography__color--prominent'>
            <Localize i18n_default_text='Automate {{trade_type}}' values={{ trade_type: title }} />
        </Text>
        <LabelPairedChevronRightSmRegularIcon />
    </button>
);

export default AutomationGuideTrigger;
