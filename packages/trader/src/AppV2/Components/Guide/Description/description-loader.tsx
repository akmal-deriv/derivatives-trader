import { Skeleton, VARIANT } from '@deriv/components';

/**
 * Skeleton placeholder shown while a lazily-loaded trade description chunk is
 * being fetched. It mirrors the shape of the rendered description — a few text
 * lines, the animation (lottie) block, then a couple more lines — so the guide
 * shows a single, consistent skeleton experience for both content and lotties
 * until everything has loaded.
 */
const DescriptionLoader = () => (
    <div className='description-loader' data-testid='dt_description_loader'>
        <Skeleton variant={VARIANT.PARAGRAPH} rows={3} height={14} className='description-loader__line' />
        <Skeleton className='description-loader__video' />
        <Skeleton variant={VARIANT.PARAGRAPH} rows={2} height={14} className='description-loader__line' />
    </div>
);

export default DescriptionLoader;
