import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

const Analytics = () => {
  return (
    <AppShell title="Analytics" subtitle="Auction statistics and reports">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Analytics & Reports</h1>
        <Card className="glass border-white/20">
          <CardContent className="py-12 text-center">
            <BarChart className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <p className="text-white/80 text-lg">Analytics dashboard coming soon</p>
            <p className="text-white/60 text-sm mt-2">View detailed auction statistics and reports</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default Analytics;
