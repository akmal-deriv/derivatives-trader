import { Button, Div100vhContainer, Text } from '@deriv/components';
import { getBrandHomeUrl } from '@deriv/shared';
import { useTranslations } from '@deriv-com/translations';

const PageUnavailable = () => {
    const { localize } = useTranslations();

    const handleButtonClick = () => {
        window.location.href = getBrandHomeUrl();
    };

    return (
        <Div100vhContainer className='fullscreen-error'>
            <div className='fullscreen-error__content'>
                <Text
                    className='fullscreen-error__title'
                    as='h2'
                    line_height='s'
                    align='center'
                    weight='bold'
                    size='l'
                    color='white'
                >
                    {localize('Platform unavailable')}
                </Text>
                <Text
                    className='fullscreen-error__description page-unavailable__description'
                    as='p'
                    size='s'
                    line_height='m'
                    align='center'
                    color='white'
                >
                    {localize(
                        "This platform isn't supported in your location. Discover our other products by visiting Home."
                    )}
                </Text>
            </div>
            <div className='fullscreen-error__button-container'>
                <Button onClick={handleButtonClick} has_effect primary large>
                    {localize('Explore Home')}
                </Button>
            </div>
        </Div100vhContainer>
    );
};

export default PageUnavailable;
