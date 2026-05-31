import { clsx } from 'clsx';
import { resolvePhotoSrc } from '../utils/equipmentPhotos';
import { catalogPhotoForEquipmentId, isCatalogStudioAsset } from '../config/catalogAssets';
import { ImageIcon } from 'lucide-react';

type Props = {
  photoRef?: string;
  equipmentId?: string;
  className?: string;
};

export default function EquipmentPhotoThumb({
  photoRef,
  equipmentId,
  className = 'w-20 h-20',
}: Props) {
  const src = photoRef
    ? resolvePhotoSrc(photoRef) || (photoRef.startsWith('/') ? photoRef : null)
    : equipmentId
      ? catalogPhotoForEquipmentId(equipmentId)
      : null;
  if (!src) {
    return (
      <div
        className={clsx(
          className,
          'catalog-inventory-img flex items-center justify-center shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-canvas)]'
        )}
      >
        <ImageIcon className="w-6 h-6 text-[var(--text-secondary)]" />
      </div>
    );
  }
  const studio = isCatalogStudioAsset(src);
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={clsx(
        className,
        'catalog-inventory-img shrink-0',
        studio ? 'catalog-inventory-img--studio' : ''
      )}
    />
  );
}
