import { memo, useMemo } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface DogAvatarProps {
  name: string;
  src?: string | null;
  /** @deprecated use src */
  photoUrl?: string | null;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-11 h-11 text-[15px]',
  lg: 'w-16 h-16 text-[22px]',
};

export const DogAvatar = memo(function DogAvatar({
  name,
  src,
  photoUrl,
  size = 'md',
}: DogAvatarProps) {
  const photo = src ?? photoUrl ?? null;

  const initials = useMemo(
    () =>
      name
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2),
    [name],
  );

  return (
    <div 
      className={`rounded-full border-2 border-sage bg-sage-light grid place-items-center overflow-hidden font-extrabold text-bark shrink-0 shadow-[0_0_0_2px_rgba(143,184,134,0.25)] ${sizeClasses[size]}`} 
      aria-label={`${name} avatar`}
    >
      {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
});
