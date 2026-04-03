import { memo, useMemo } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface DogAvatarProps {
  name: string;
  src?: string | null;
  /** @deprecated use src */
  photoUrl?: string | null;
  size?: AvatarSize;
}

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
    <div className={`dog-avatar dog-avatar--${size}`} aria-label={`${name} avatar`}>
      {photo ? <img src={photo} alt={name} /> : initials}
    </div>
  );
});
