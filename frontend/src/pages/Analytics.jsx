import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <AppShell title="Analytics" subtitle="Auction statistics and reports">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Analytics"
          description="Detailed auction statistics and exportable reports"
        />
        <Card className="glass border-white/15">
          <CardContent className="rounded-xl border border-dashed border-white/15 bg-white/5 py-16 text-center">
            <BarChart3 className="mx-auto mb-4 h-14 w-14 text-white/35" />
            <p className="text-lg text-white/80">Analytics dashboard coming soon</p>
            <p className="mt-2 text-sm text-white/50">
              Charts for sold prices, team spend, and category distribution will land here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default Analytics;
