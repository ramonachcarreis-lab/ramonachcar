import type { AppEvent } from '../context/EventsContext';
import type { Equipment } from '../types/inventory';
import { getDealPhotoUrls } from '../utils/dealVisual';
import { ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  deal: AppEvent;
  catalog: Equipment[];
  layout: 'grid' | 'list';
};

export default function CrmDealCardVisual({ deal, catalog, layout }: Props) {
  const photos = getDealPhotoUrls(deal, catalog, layout === 'list' ? 2 : 3);

  if (layout === 'list') {
    return (
      <div className="flex gap-1.5 shrink-0">
        {photos.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            className="w-14 h-14 rounded-xl object-cover border-2 border-amber-400/40 bg-slate-900"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex gap-1 mb-3 -mx-1',
        photos.length === 1 ? 'justify-start' : 'justify-between'
      )}
    >
      {photos.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={clsx(
            'relative rounded-xl overflow-hidden border-2 border-amber-400/50 bg-black shrink-0',
            photos.length === 1 ? 'w-full h-24' : 'w-[31%] h-20'
          )}
        >
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {photos.length === 0 && (
        <div className="w-full h-20 rounded-xl bg-slate-100 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-300" />
        </div>
      )}
    </div>
  );
}
