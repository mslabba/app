import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

const AuctionControl = () => {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Auction Control</h1>
        <Card className="glass border-white/20">
          <CardContent className="py-12 text-center">
            <Play className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <p className="text-white/80 text-lg">Auction control panel coming soon</p>
            <p className="text-white/60 text-sm mt-2">Start, pause, and manage live auctions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuctionControl;
