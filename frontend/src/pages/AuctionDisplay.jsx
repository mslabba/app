import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

const AuctionDisplay = () => {
  const { eventId } = useParams();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7e22ce 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Live Auction Display</h1>
          <p className="text-white/80">Event ID: {eventId}</p>
        </div>
        <Card className="glass border-white/20">
          <CardContent className="py-20 text-center">
            <Trophy className="w-24 h-24 text-white/40 mx-auto mb-6" />
            <p className="text-white/80 text-2xl mb-4">Public auction display screen</p>
            <p className="text-white/60">Real-time bidding updates and player information</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuctionDisplay;
