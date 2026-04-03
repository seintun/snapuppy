interface DogAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
}

export function DogAvatar({ name, photoUrl, size = 44 }: DogAvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <div
      aria-label={`${name} avatar`}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: '2px solid var(--sage)',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        background: 'var(--sage-light)',
        fontWeight: 800,
        color: 'var(--bark)',
      }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}
