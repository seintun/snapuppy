import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export function ProfileScreen() {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>Profile</h1>
      <Card className="p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Business settings</strong>
            <p style={{ margin: 0, color: 'var(--bark-light)' }}>
              Rate settings and auth controls land in Step 2.
            </p>
          </div>
          <Badge>Coming soon</Badge>
        </div>
      </Card>
    </>
  );
}
