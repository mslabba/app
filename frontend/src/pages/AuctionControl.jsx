import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  Square, 
  Timer, 
  Users, 
  Trophy, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Gavel,
  RotateCcw,
  X,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuctionControl = () => {
  const { eventId } = useParams();
  const { currentUser, token, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showFinalizeBidModal, setShowFinalizeBidModal] = useState(false);
  const [finalBidAmount, setFinalBidAmount] = useState('');
  const [selectedTeamForSale, setSelectedTeamForSale] = useState('');

  useEffect(() => {
    if (eventId && currentUser && token && !authLoading) {
      fetchData();
      // Set up polling for real-time updates
      const interval = setInterval(fetchAuctionState, 2000);
      return () => clearInterval(interval);
    }
  }, [eventId, currentUser, token, authLoading]);

  useEffect(() => {
    let interval;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            toast.info('Timer expired! Consider finalizing the current bid.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchEvent(),
        fetchAuctionState(),
        fetchPlayers(),
        fetchTeams(),
        fetchSponsors(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load auction data');
    }
  };

  const fetchEvent = async () => {
    try {
      if (!currentUser || !token) {
        console.log('User or token not available');
        return;
      }
      const response = await axios.get(`${API}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvent(response.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    }
  };

  const fetchAuctionState = async () => {
    try {
      if (!currentUser || !token) {
        return;
      }
      const response = await axios.get(`${API}/auction/state/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuctionState(response.data);
    } catch (error) {
      console.error('Failed to fetch auction state:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      if (!currentUser || !token) {
        return;
      }
      const response = await axios.get(`${API}/events/${eventId}/players`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlayers(response.data);
      setAvailablePlayers(response.data.filter(p => p.status === 'available'));
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      if (!currentUser || !token) {
        return;
      }
      const response = await axios.get(`${API}/teams/event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchSponsors = async () => {
    try {
      if (!currentUser || !token) {
        return;
      }
      const response = await axios.get(`${API}/sponsors/event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSponsors(response.data);
    } catch (error) {
      console.error('Failed to fetch sponsors:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      if (!currentUser || !token) {
        return;
      }
      const response = await axios.get(`${API}/events/${eventId}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const startAuction = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/auction/start/${eventId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Auction started successfully!');
      fetchAuctionState();
    } catch (error) {
      console.error('Failed to start auction:', error);
      toast.error('Failed to start auction');
    } finally {
      setLoading(false);
    }
  };

  const pauseAuction = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/auction/pause/${eventId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Auction paused');
      setTimerActive(false);
      fetchAuctionState();
    } catch (error) {
      console.error('Failed to pause auction:', error);
      toast.error('Failed to pause auction');
    } finally {
      setLoading(false);
    }
  };

  const setNextPlayer = async () => {
    if (!selectedPlayer) {
      toast.error('Please select a player first');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/auction/next-player/${eventId}?player_id=${selectedPlayer}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Player set for bidding');
      setSelectedPlayer('');
      setTimer(60); // Reset timer to 60 seconds
      setTimerActive(true);
      fetchAuctionState();
      fetchPlayers(); // Refresh to update player status
    } catch (error) {
      console.error('Failed to set next player:', error);
      toast.error('Failed to set next player');
    } finally {
      setLoading(false);
    }
  };

  const openFinalizeBidModal = () => {
    if (!currentPlayer) {
      toast.error('No player currently selected for bidding');
      return;
    }
    
    // Pre-fill with current bid amount and team
    setFinalBidAmount(auctionState?.current_bid?.toString() || currentPlayer.base_price?.toString() || '');
    setSelectedTeamForSale(auctionState?.current_team_id || '');
    setShowFinalizeBidModal(true);
  };

  const finalizeBid = async () => {
    if (!currentPlayer) {
      toast.error('No player currently selected for bidding');
      return;
    }

    if (!selectedTeamForSale) {
      toast.error('Please select a team to sell the player to');
      return;
    }

    if (!finalBidAmount || parseInt(finalBidAmount) < (currentPlayer.base_price || 0)) {
      toast.error(`Final bid must be at least ₹${currentPlayer.base_price?.toLocaleString()}`);
      return;
    }

    try {
      setLoading(true);
      
      // First place a bid for the selected team with the final amount
      await axios.post(`${API}/bids`, {
        player_id: currentPlayer.id,
        team_id: selectedTeamForSale,
        amount: parseInt(finalBidAmount),
        event_id: eventId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Then finalize the bid
      await axios.post(`${API}/bids/finalize/${currentPlayer.id}?event_id=${eventId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const selectedTeam = teams.find(t => t.id === selectedTeamForSale);
      toast.success(`${currentPlayer.name} sold to ${selectedTeam?.name} for ₹${parseInt(finalBidAmount).toLocaleString()}!`);
      
      setTimerActive(false);
      setTimer(0);
      setShowFinalizeBidModal(false);
      setFinalBidAmount('');
      setSelectedTeamForSale('');
      
      fetchAuctionState();
      fetchPlayers();
      fetchTeams();
    } catch (error) {
      console.error('Failed to finalize bid:', error);
      toast.error('Failed to finalize bid');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setTimer(60);
    setTimerActive(true);
  };

  const resetTimer = () => {
    setTimer(60);
    setTimerActive(false);
  };

  const makePlayerAvailable = async (playerId, playerName) => {
    try {
      setLoading(true);
      await axios.post(`${API}/players/${playerId}/make-available`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${playerName} made available for auction again!`);
      fetchPlayers();
    } catch (error) {
      console.error('Failed to make player available:', error);
      toast.error('Failed to make player available');
    } finally {
      setLoading(false);
    }
  };

  const makeAllUnsoldAvailable = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/events/${eventId}/make-all-unsold-available`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchPlayers();
    } catch (error) {
      console.error('Failed to make all unsold players available:', error);
      toast.error('Failed to make all unsold players available');
    } finally {
      setLoading(false);
    }
  };

  const directFinalizeBid = async () => {
    if (!currentPlayer) {
      toast.error('No player currently selected for bidding');
      return;
    }

    try {
      setLoading(true);
      
      // If there's a current bid, finalize it directly
      if (auctionState?.current_bid && auctionState?.current_team_id) {
        // Direct finalize - the backend will use the current auction state
        await axios.post(`${API}/bids/finalize/${currentPlayer.id}?event_id=${eventId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const currentTeamName = teams.find(t => t.id === auctionState.current_team_id)?.name || 'Unknown Team';
        toast.success(`${currentPlayer.name} sold to ${currentTeamName} for ₹${auctionState.current_bid.toLocaleString()}!`);
      } else {
        // No bids - mark as unsold
        await axios.post(`${API}/bids/finalize/${currentPlayer.id}?event_id=${eventId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`${currentPlayer.name} marked as unsold`);
      }
      
      setTimerActive(false);
      setTimer(0);
      
      fetchAuctionState();
      fetchPlayers();
      fetchTeams();
    } catch (error) {
      console.error('Failed to finalize bid:', error);
      toast.error('Failed to finalize bid');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for fullscreen control panel
  const getRandomGradient = (index) => {
    const gradients = [
      'rgba(255, 0, 110, 0.2), rgba(0, 150, 255, 0.2)',
      'rgba(255, 190, 11, 0.2), rgba(251, 86, 7, 0.2)',
      'rgba(6, 255, 165, 0.2), rgba(5, 150, 105, 0.2)',
      'rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2)',
      'rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.2)',
      'rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2)',
      'rgba(14, 165, 233, 0.2), rgba(3, 105, 161, 0.2)',
      'rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.2)',
      'rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.2)',
      'rgba(34, 197, 94, 0.2), rgba(21, 128, 61, 0.2)',
      'rgba(249, 115, 22, 0.2), rgba(194, 65, 12, 0.2)',
      'rgba(20, 184, 166, 0.2), rgba(13, 148, 136, 0.2)',
      'rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2)',
      'rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.2)',
      'rgba(244, 63, 94, 0.2), rgba(190, 18, 60, 0.2)'
    ];
    return gradients[index % gradients.length];
  };

  const handleSellToTeam = async () => {
    if (!selectedTeamForSale) {
      toast.error('Please select a team first!');
      return;
    }
    if (!finalBidAmount) {
      toast.error('Please add a final price first!');
      return;
    }
    if (!currentPlayer) {
      toast.error('No player currently selected for bidding');
      return;
    }

    try {
      setLoading(true);
      
      // Use direct sale endpoint for super admin
      await axios.post(`${API}/players/${currentPlayer.id}/sell?team_id=${selectedTeamForSale}&price=${parseInt(finalBidAmount)}&event_id=${eventId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const selectedTeam = teams.find(t => t.id === selectedTeamForSale);
      
      // Enhanced celebration toast
      toast.success(
        `🎉 ${currentPlayer.name} SOLD! 🎉\n${selectedTeam?.name} • ₹${parseInt(finalBidAmount).toLocaleString()}`,
        {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            textAlign: 'center'
          }
        }
      );
      
      // Reset states but keep current player visible
      setTimerActive(false);
      setTimer(0);
      setFinalBidAmount('');
      setSelectedTeamForSale('');
      
      // Refresh data to show updated player status
      fetchAuctionState();
      fetchPlayers();
      fetchTeams();
    } catch (error) {
      console.error('Failed to sell player:', error);
      toast.error('Failed to sell player');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFinalPrice = () => {
    if (!finalBidAmount) {
      toast.error('Please enter a valid price!');
      return;
    }
    
    // Update the display price (this could update a state for display)
    const formattedPrice = `₹${parseInt(finalBidAmount).toLocaleString()}`;
    toast.success(`Final price set to ${formattedPrice}`);
  };

  const handleNextPlayer = async () => {
    if (window.confirm('Move to next player? This will reset the current auction state and randomly select the next player.')) {
      try {
        setLoading(true);
        
        // Reset all states
        setFinalBidAmount('');
        setSelectedTeamForSale('');
        setTimerActive(false);
        setTimer(60);
        
        // Get available players (not sold, not unsold, not current)
        const availableForNext = players.filter(p => 
          p.status === 'available' || p.status === 'AVAILABLE'
        );
        
        if (availableForNext.length === 0) {
          toast.error('No available players left for auction!');
          setSelectedPlayer('');
          return;
        }
        
        // Randomly select next player
        const randomIndex = Math.floor(Math.random() * availableForNext.length);
        const nextPlayer = availableForNext[randomIndex];
        
        // Set the randomly selected player as current
        await axios.post(`${API}/auction/next-player/${eventId}?player_id=${nextPlayer.id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update UI states
        setSelectedPlayer('');
        setTimerActive(true);
        
        // Refresh data
        fetchAuctionState();
        fetchPlayers();
        
        toast.success(`${nextPlayer.name} randomly selected for next auction!`);
      } catch (error) {
        console.error('Failed to set next player:', error);
        toast.error('Failed to set next player');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAsUnsold = async () => {
    if (!currentPlayer) {
      toast.error('No player currently selected');
      return;
    }

    if (window.confirm(`Mark ${currentPlayer.name} as UNSOLD?`)) {
      try {
        setLoading(true);
        
        // Mark player as unsold
        await axios.post(`${API}/players/${currentPlayer.id}/mark-unsold?event_id=${eventId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success(`${currentPlayer.name} marked as UNSOLD`);
        
        // Refresh data but don't clear current player yet
        fetchAuctionState();
        fetchPlayers();
        fetchTeams();
      } catch (error) {
        console.error('Failed to mark player as unsold:', error);
        toast.error('Failed to mark player as unsold');
      } finally {
        setLoading(false);
      }
    }
  };

  const fixCurrentPlayers = async () => {
    if (!window.confirm('This will fix any players with incorrect CURRENT status. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/events/${eventId}/fix-current-players`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(response.data.message);
      fetchPlayers(); // Refresh player list
      fetchAuctionState(); // Refresh auction state
    } catch (error) {
      console.error('Failed to fix current players:', error);
      toast.error('Failed to fix current players');
    } finally {
      setLoading(false);
    }
  };

  // Filter players based on search and category
  useEffect(() => {
    let filtered = availablePlayers;
    
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(player => player.category_id === selectedCategory);
    }
    
    setFilteredPlayers(filtered);
  }, [availablePlayers, searchTerm, selectedCategory]);

  const selectRandomPlayer = () => {
    if (filteredPlayers.length === 0) {
      toast.error('No players available for selection');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredPlayers.length);
    const randomPlayer = filteredPlayers[randomIndex];
    setSelectedPlayer(randomPlayer.id);
    toast.success(`Randomly selected: ${randomPlayer.name}`);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getCurrentPlayer = () => {
    if (!auctionState?.current_player_id) return null;
    return players.find(p => p.id === auctionState.current_player_id);
  };

  const getCurrentTeam = () => {
    if (!auctionState?.current_team_id) return null;
    return teams.find(t => t.id === auctionState.current_team_id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not_started': return 'bg-gray-500';
      case 'in_progress': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'in_progress': return 'In Progress';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const currentPlayer = getCurrentPlayer();
  const currentTeam = getCurrentTeam();
  const soldPlayers = players.filter(p => p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  // Show loading state while authentication is being checked
  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading auction control panel...</p>
        </div>
      </div>
    );
  }

  // Fullscreen Auction Control Mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#2a1f3a] overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 opacity-50 animate-pulse">
          <div className="absolute inset-0" style={{
            background: `radial-gradient(circle at 20% 50%, rgba(255, 0, 150, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(0, 150, 255, 0.1) 0%, transparent 50%)`
          }}></div>
        </div>

        <div className="relative z-10 h-full flex flex-col p-5 gap-4">
          {/* Header */}
          <div className="flex justify-between items-center p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-pink-500/50">
                ⚡
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent uppercase tracking-wider">
                {event?.name || 'SPORTS AUCTION 2025'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-5 py-2 bg-red-500/20 border-2 border-red-500 rounded-full">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-bold text-white">LIVE BIDDING</span>
              </div>
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                className="text-white border-white/30 hover:bg-white/10"
              >
                Exit Fullscreen
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 grid grid-rows-[1fr_auto_auto] gap-4">
            {/* Player Display Section */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border-2 border-white/10 p-8 relative overflow-hidden">
              {/* Rotating background effect */}
              <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-pink-500/10 to-transparent animate-spin" style={{animationDuration: '10s'}}></div>
              
              {currentPlayer ? (
                <div className="relative z-10 grid grid-cols-[350px_1fr] gap-8 h-full">
                  {/* Player Image */}
                  <div className="relative">
                    <div className="w-full h-96 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center text-8xl relative overflow-hidden shadow-2xl">
                      {currentPlayer.photo_url ? (
                        <img
                          src={currentPlayer.photo_url}
                          alt={currentPlayer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-32 h-32 text-white/70" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      <div className="absolute top-4 right-4 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full text-sm font-bold text-white uppercase">
                        {currentPlayer.position || 'Player'}
                      </div>
                    </div>
                  </div>

                  {/* Player Details */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 bg-clip-text text-transparent uppercase tracking-wider">
                        {currentPlayer.name}
                      </h1>
                      
                      <div className="flex gap-4 mb-6 text-lg flex-wrap">
                        <span className="px-4 py-2 bg-white/10 rounded-lg">🏏 {currentPlayer.position || 'Player'}</span>
                        <span className="px-4 py-2 bg-white/10 rounded-lg">👤 {currentPlayer.age || 'N/A'} years</span>
                        <span className="px-4 py-2 bg-white/10 rounded-lg">⚡ {currentPlayer.specialty || 'All-rounder'}</span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all">
                          <div className="text-xs text-white/60 uppercase tracking-wider mb-2">Matches</div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.matches || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all">
                          <div className="text-xs text-white/60 uppercase tracking-wider mb-2">Runs</div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.runs || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all">
                          <div className="text-xs text-white/60 uppercase tracking-wider mb-2">Wickets</div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.wickets || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all">
                          <div className="text-xs text-white/60 uppercase tracking-wider mb-2">Strike Rate</div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.strike_rate || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white/5 rounded-xl border-2 border-cyan-500/50 text-center">
                        <div className="text-xs text-white/70 uppercase tracking-wider mb-2">Base Value</div>
                        <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
                          ₹{currentPlayer.base_price?.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-yellow-500/10 to-pink-500/10 rounded-xl border-2 border-yellow-500/50 text-center">
                        <div className="text-xs text-white/70 uppercase tracking-wider mb-2">
                          {finalBidAmount ? 'Final Price' : auctionState?.current_bid ? 'Current Bid' : 'Starting Price'}
                        </div>
                        <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
                          {finalBidAmount ? `₹${parseInt(finalBidAmount).toLocaleString()}` : 
                           auctionState?.current_bid ? `₹${auctionState.current_bid.toLocaleString()}` : '---'}
                        </div>
                        {(currentTeam || selectedTeamForSale) && (
                          <div className="text-sm text-white/80 mt-1">
                            {selectedTeamForSale ? teams.find(t => t.id === selectedTeamForSale)?.name : currentTeam?.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Trophy className="w-16 h-16 text-white/60" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">No Player Selected</h2>
                    <p className="text-white/70 text-xl">Select a player to start the auction</p>
                  </div>
                </div>
              )}
            </div>

            {/* Teams Section */}
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-wider">
                  🏆 Participating Teams
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {teams.map((team, index) => (
                  <div 
                    key={team.id} 
                    className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer group relative"
                    title={team.name}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-full h-full object-cover rounded-lg"
                            title={team.name}
                          />
                        ) : (
                          <div 
                            className="w-full h-full rounded-lg flex items-center justify-center"
                            style={{ 
                              background: `linear-gradient(135deg, ${team.color || '#3B82F6'}, ${team.color ? team.color + '80' : '#1E40AF'})` 
                            }}
                            title={team.name}
                          >
                            {team.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{team.name}</h4>
                        <p className="text-xs text-white/60">Budget: ₹{team.remaining_budget?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsors Section */}
            {sponsors.length > 0 && (
              <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-wider">
                    💎 Official Sponsors
                  </h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
                  {sponsors.filter(s => s.is_active).map((sponsor, index) => (
                    <div 
                      key={sponsor.id} 
                      className="min-w-[140px] h-20 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center text-sm font-bold text-white transition-all hover:scale-105 hover:border-white/30 flex-shrink-0 relative overflow-hidden"
                      style={{
                        background: sponsor.logo_url ? 'rgba(255, 255, 255, 0.1)' : `linear-gradient(135deg, ${getRandomGradient(index)})`
                      }}
                      title={sponsor.name}
                    >
                      {sponsor.logo_url ? (
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.name}
                          className="max-w-full max-h-full object-contain"
                          title={sponsor.name}
                        />
                      ) : (
                        <span title={sponsor.name}>{sponsor.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Control Panel */}
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              {/* Team Selection */}
              <div className="mb-4">
                <h4 className="text-white font-bold mb-3 uppercase tracking-wider">Select Team for Sale</h4>
                <div className="flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamForSale(team.id)}
                      className={`px-4 py-2 rounded-lg border-2 text-white font-bold text-sm transition-all hover:scale-105 flex items-center gap-2 ${
                        selectedTeamForSale === team.id
                          ? 'bg-gradient-to-r from-pink-500 to-orange-500 border-pink-500 shadow-lg shadow-pink-500/50'
                          : 'bg-white/5 border-white/20 hover:border-white/50'
                      }`}
                      title={team.name}
                    >
                      {team.logo_url ? (
                        <>
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-5 h-5 object-cover rounded"
                          />
                          <span className="hidden sm:inline">{team.name}</span>
                        </>
                      ) : (
                        <span>{team.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Input */}
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <label className="text-white font-bold uppercase tracking-wider text-sm">Final Price:</label>
                  <input
                    type="number"
                    value={finalBidAmount}
                    onChange={(e) => setFinalBidAmount(e.target.value)}
                    placeholder="Enter amount (e.g., 850000)"
                    className="flex-1 px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white text-lg font-bold outline-none transition-all focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-400/30"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSellToTeam}
                  disabled={loading || !selectedTeamForSale || !finalBidAmount}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sell to Team
                </button>
                <button
                  onClick={handleAddFinalPrice}
                  disabled={loading || !finalBidAmount}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Final Price
                </button>
                <button
                  onClick={handleNextPlayer}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Player →
                </button>
              </div>
            </div>

            {/* Timer and Quick Actions */}
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <div className="flex items-center justify-between gap-4">
                {/* Timer */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-8 h-8 text-white" />
                    <span className={`text-4xl font-mono font-bold ${timer <= 10 ? 'text-red-400' : 'text-white'}`}>
                      {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <Progress value={(timer / 60) * 100} className="w-48 h-4" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {auctionState?.status === 'not_started' && (
                    <Button
                      onClick={startAuction}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-green-500/25 transition-all"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Start Auction
                    </Button>
                  )}
                  
                  {auctionState?.status === 'in_progress' && (
                    <Button
                      onClick={pauseAuction}
                      disabled={loading}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-yellow-500/25 transition-all"
                    >
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </Button>
                  )}

                  <Button
                    onClick={setNextPlayer}
                    disabled={loading || !selectedPlayer}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-blue-500/25 transition-all"
                  >
                    Set Player
                  </Button>

                  <Button
                    onClick={startTimer}
                    disabled={timerActive}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-purple-500/25 transition-all"
                  >
                    <Timer className="w-5 h-5 mr-2" />
                    Start Timer
                  </Button>

                  <Button
                    onClick={resetTimer}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-gray-500/25 transition-all"
                  >
                    Reset
                  </Button>

                  {currentPlayer && auctionState?.current_bid && (
                    <Button
                      onClick={directFinalizeBid}
                      disabled={loading}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-red-500/25 transition-all"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Sell to {currentTeam?.name}
                    </Button>
                  )}

                  {currentPlayer && !auctionState?.current_bid && (
                    <Button
                      onClick={directFinalizeBid}
                      disabled={loading}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg px-6 py-3 shadow-lg hover:shadow-orange-500/25 transition-all"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Mark Unsold
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Mode
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Auction Control Panel</h1>
            <p className="text-white/80">Manage live auction for {event?.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={toggleFullscreen}
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              🖥️ Fullscreen Mode
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Auction Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Status */}
            <Card className="bg-white/95 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center">
                  <Gavel className="w-5 h-5 mr-2" />
                  Auction Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`${getStatusColor(auctionState?.status)} text-white px-4 py-2 text-lg`}>
                    {getStatusText(auctionState?.status)}
                  </Badge>
                  <div className="flex space-x-2">
                    {auctionState?.status === 'not_started' && (
                      <Button
                        onClick={startAuction}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Auction
                      </Button>
                    )}
                    {auctionState?.status === 'in_progress' && (
                      <Button
                        onClick={pauseAuction}
                        disabled={loading}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Auction
                      </Button>
                    )}
                    <Button
                      onClick={fixCurrentPlayers}
                      disabled={loading}
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-50"
                      title="Fix players with incorrect CURRENT status"
                    >
                      🔧 Fix Status
                    </Button>
                  </div>
                </div>

                {/* Player Selection */}
                {availablePlayers.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-gray-700 font-semibold">Select Player for Bidding</Label>
                    <div className="flex space-x-4">
                      <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a player for bidding" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlayers.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name} - ₹{player.base_price?.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={setNextPlayer}
                        disabled={loading || !selectedPlayer}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Set Player
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Player */}
            {currentPlayer && (
              <Card className={`relative overflow-hidden backdrop-blur-sm border-white/30 ${
                currentPlayer.status === 'sold' ? 'bg-green-50/95 border-green-200' : 
                currentPlayer.status === 'unsold' ? 'bg-red-50/95 border-red-200' : 
                'bg-white/95'
              }`}>
                {/* SOLD Stamp */}
                {currentPlayer.status === 'sold' && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="relative">
                      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-full text-sm font-bold transform rotate-12 shadow-lg animate-bounce border-2 border-white">
                        ✓ SOLD
                      </div>
                      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                )}

                {/* UNSOLD Stamp */}
                {currentPlayer.status === 'unsold' && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="relative">
                      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full text-sm font-bold transform -rotate-12 shadow-lg animate-pulse border-2 border-white">
                        ✗ UNSOLD
                      </div>
                      <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
                    </div>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    Current Player
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {currentPlayer.photo_url ? (
                        <img
                          src={currentPlayer.photo_url}
                          alt={currentPlayer.name}
                          className={`w-20 h-20 rounded-full object-cover ${
                            currentPlayer.status === 'sold' ? 'border-4 border-green-400' : 
                            currentPlayer.status === 'unsold' ? 'border-4 border-red-400' : 
                            'border-2 border-gray-300'
                          }`}
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                          currentPlayer.status === 'sold' ? 'bg-green-200 border-4 border-green-400' : 
                          currentPlayer.status === 'unsold' ? 'bg-red-200 border-4 border-red-400' : 
                          'bg-gray-200 border-2 border-gray-300'
                        }`}>
                          <User className="w-10 h-10 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Team Logo for Sold Players */}
                      {currentPlayer.status === 'sold' && currentPlayer.sold_to_team_id && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-green-400 flex items-center justify-center shadow-lg">
                          <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {teams.find(t => t.id === currentPlayer.sold_to_team_id)?.name?.charAt(0) || 'T'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800">{currentPlayer.name}</h3>
                      <p className="text-gray-600">
                        Base Price: ₹{currentPlayer.base_price?.toLocaleString()}
                      </p>
                      {currentPlayer.position && (
                        <p className="text-gray-600">Position: {currentPlayer.position}</p>
                      )}
                      
                      {/* Sold Details */}
                      {currentPlayer.status === 'sold' && (
                        <div className="mt-2 p-2 bg-green-100 rounded-lg border border-green-200">
                          <p className="text-green-800 font-semibold">
                            Sold to: {teams.find(t => t.id === currentPlayer.sold_to_team_id)?.name || 'Unknown Team'}
                          </p>
                          {currentPlayer.sold_price && (
                            <p className="text-green-700 font-bold">
                              Final Price: ₹{currentPlayer.sold_price?.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Unsold Notice */}
                      {currentPlayer.status === 'unsold' && (
                        <div className="mt-2 p-2 bg-red-100 rounded-lg border border-red-200">
                          <p className="text-red-800 font-semibold">
                            Player was not sold in the auction
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {currentPlayer.status === 'sold' ? (
                        <div className="text-3xl font-bold text-green-600">
                          ₹{currentPlayer.sold_price?.toLocaleString() || 'N/A'}
                        </div>
                      ) : currentPlayer.status === 'unsold' ? (
                        <div className="text-2xl font-bold text-red-600">
                          UNSOLD
                        </div>
                      ) : (
                        <>
                          <div className="text-3xl font-bold text-green-600">
                            ₹{auctionState.current_bid?.toLocaleString()}
                          </div>
                          {currentTeam && (
                            <p className="text-gray-600">{currentTeam.name}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timer and Actions */}
                  {currentPlayer.status === 'sold' || currentPlayer.status === 'unsold' ? (
                    // Actions for sold/unsold players
                    <div className="mt-6 flex items-center justify-center">
                      <Button
                        onClick={handleNextPlayer}
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
                      >
                        Next Player →
                      </Button>
                    </div>
                  ) : (
                    // Normal auction actions
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-gray-600" />
                          <span className={`text-2xl font-mono ${timer <= 10 ? 'text-red-600' : 'text-gray-800'}`}>
                            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <Progress value={(timer / 60) * 100} className="w-32" />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={startTimer}
                          disabled={timerActive}
                          variant="outline"
                          size="sm"
                        >
                          <Timer className="w-4 h-4 mr-2" />
                          Start Timer
                        </Button>
                        <Button
                          onClick={resetTimer}
                          variant="outline"
                          size="sm"
                        >
                          Reset
                        </Button>
                        <Button
                          onClick={handleMarkAsUnsold}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Mark Unsold
                        </Button>
                        <Button
                          onClick={openFinalizeBidModal}
                          disabled={loading || !currentPlayer}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Sell Player
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {auctionState?.bid_history && auctionState.bid_history.length > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-white/30">
                <CardHeader>
                  <CardTitle className="text-gray-800">Recent Bids</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {auctionState.bid_history.slice(-5).reverse().map((bid, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-gray-700">{bid.team_name}</span>
                        <span className="font-semibold text-green-600">₹{bid.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Auction Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Players:</span>
                  <span className="font-semibold">{players.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-semibold text-green-600">{availablePlayers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sold:</span>
                  <span className="font-semibold text-blue-600">{soldPlayers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unsold:</span>
                  <span className="font-semibold text-red-600">{unsoldPlayers.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Teams Overview */}
            <Card className="bg-white/95 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div key={team.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">{team.name}</div>
                        <div className="text-sm text-gray-600">
                          Players: {team.players_count || 0}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          ₹{team.remaining?.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">remaining</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/95 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle className="text-gray-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={fetchData}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh All Data
                </Button>
                <Button
                  onClick={() => window.open(`/team`, '_blank')}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  View Team Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Sold Players Display */}
            {soldPlayers.length > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-white/30">
                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-green-600" />
                    Sold Players ({soldPlayers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {soldPlayers.map((player) => (
                      <div key={player.id} className="relative flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                        {/* Sold Stamp with Enhanced Animation */}
                        <div className="absolute top-2 right-2 z-10">
                          <div className="relative">
                            {/* Main SOLD stamp */}
                            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1 rounded-full text-xs font-bold transform rotate-12 shadow-lg animate-bounce border-2 border-white">
                              ✓ SOLD
                            </div>
                            {/* Pulsing background effect */}
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30"></div>
                            {/* Sparkle effect */}
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse delay-150"></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 flex-1">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-green-300"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center border-2 border-green-300">
                              <User className="w-6 h-6 text-green-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{player.name}</div>
                            <div className="text-sm text-gray-600">
                              {player.position} • Base: ₹{player.base_price?.toLocaleString()}
                            </div>
                            {player.sold_price && (
                              <div className="text-sm font-semibold text-green-700">
                                Sold for: ₹{player.sold_price?.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Team info if available */}
                        {player.sold_to_team_id && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-700">
                              {teams.find(t => t.id === player.sold_to_team_id)?.name || 'Team'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    Players successfully sold in the auction.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unsold Players Management */}
            {unsoldPlayers.length > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-white/30">
                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center justify-between">
                    <div className="flex items-center">
                      <X className="w-5 h-5 mr-2 text-red-600" />
                      Unsold Players ({unsoldPlayers.length})
                    </div>
                    <Button
                      onClick={makeAllUnsoldAvailable}
                      disabled={loading}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Make All Available
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unsoldPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-800">{player.name}</div>
                            <div className="text-sm text-gray-600">
                              {player.position} • Base: ₹{player.base_price?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => makePlayerAvailable(player.id, player.name)}
                          disabled={loading}
                          size="sm"
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Make Available
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    These players were not sold in the auction. You can make them available for bidding again.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={showFinalizeBidModal} onOpenChange={setShowFinalizeBidModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">
                Sell Player
              </DialogTitle>
            </DialogHeader>
            
            {currentPlayer && (
              <div className="space-y-6">
                {/* Player Info */}
                <div className="text-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
                  <h3 className="text-xl font-bold">{currentPlayer.name}</h3>
                  <p className="text-sm opacity-90">{currentPlayer.position}</p>
                  <p className="text-sm">Base Price: ₹{currentPlayer.base_price?.toLocaleString()}</p>
                </div>

                {/* Current Highest Bid */}
                {auctionState?.current_bid && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Current Highest Bid</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-green-600">
                        ₹{auctionState.current_bid.toLocaleString()}
                      </span>
                      {currentTeam && (
                        <span className="text-green-700 font-medium">
                          {currentTeam.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Team Selection */}
                <div>
                  <Label className="text-base font-semibold">Select Buying Team *</Label>
                  <Select value={selectedTeamForSale} onValueChange={setSelectedTeamForSale}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose team to sell to" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: team.color || '#3B82F6' }}
                            />
                            <span>{team.name}</span>
                            <span className="text-sm text-gray-500">
                              (₹{team.remaining_budget?.toLocaleString()} left)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Final Price */}
                <div>
                  <Label className="text-base font-semibold">Final Sale Price *</Label>
                  <Input
                    type="number"
                    value={finalBidAmount}
                    onChange={(e) => setFinalBidAmount(e.target.value)}
                    placeholder="Enter final price"
                    min={currentPlayer.base_price || 0}
                    className="mt-2 text-lg"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Minimum: ₹{currentPlayer.base_price?.toLocaleString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFinalizeBidModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={finalizeBid}
                    disabled={loading || !selectedTeamForSale || !finalBidAmount}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {loading ? 'Selling...' : 'Confirm Sale'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AuctionControl;
