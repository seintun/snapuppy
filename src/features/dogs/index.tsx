import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';

export function DogsScreen() {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>Dogs</h1>
      <Card className="p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DogAvatar name="Sample Pup" />
          <div>
            <strong>Sample Pup</strong>
            <p style={{ margin: 0, color: 'var(--bark-light)' }}>Dog profiles land in Step 4.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
