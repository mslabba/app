import { useState, useEffect, useCallback, useMemo } from 'react';
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
  User,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuctionControl = () => {
  const { eventId } = useParams();
  const { currentUser, token, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamsSafeBidSummary, setTeamsSafeBidSummary] = useState(null);
  const [safeBidCache, setSafeBidCache] = useState({}); // Cache for safe bid calculations
  const [lastCacheUpdate, setLastCacheUpdate] = useState(null);
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [finalBidAmount, setFinalBidAmount] = useState('');
  const [selectedTeamForSale, setSelectedTeamForSale] = useState('');
  const [showSoldStamp, setShowSoldStamp] = useState(false);
  const [soldStampData, setSoldStampData] = useState({ teamName: '', price: '' });
  const [preventDataRefresh, setPreventDataRefresh] = useState(false);
  const [tempCurrentPlayer, setTempCurrentPlayer] = useState(null);

  // Debounced team selection to prevent lag
  const debouncedTeamSelection = useCallback((teamId) => {
    const timeoutId = setTimeout(() => {
      setSelectedTeamForSale(teamId);
    }, 150); // 150ms debounce

    return () => clearTimeout(timeoutId);
  }, []);

  // Optimized team selection handler
  const handleTeamSelect = useCallback((teamId) => {
    // Immediate visual feedback
    setSelectedTeamForSale(teamId);
  }, []);

  // Initial data fetch - runs once on mount
  useEffect(() => {
    if (eventId && currentUser && token && !authLoading) {
      fetchData();
    }
  }, [eventId, currentUser, token, authLoading]);

  // Separate polling effect with proper cleanup
  useEffect(() => {
    if (!eventId || !currentUser || !token || authLoading) return;

    const interval = setInterval(() => {
      if (!preventDataRefresh) {
        fetchAuctionState();
      }
    }, 10000); // Increased to 10 seconds - reduces API calls by 50%

    return () => clearInterval(interval);
  }, [eventId, currentUser, token, authLoading, preventDataRefresh]);

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
      setLoading(true);
      // Fetch critical data in parallel
      await Promise.all([
        fetchEvent(),
        fetchAuctionState(),
        fetchTeams(),
        fetchCategories()
      ]);

      // Fetch players separately (only available ones)
      await fetchPlayers();

      // Fetch less critical data
      await fetchSponsors();

      // Fetch safe bid summary after auction state is loaded
      const auctionResponse = await axios.get(`${API}/auction/state/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentPlayerCategory = auctionResponse.data?.current_player?.category;
      await fetchTeamsSafeBidSummary(currentPlayerCategory);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load auction data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvent = async () => {
    try {
      if (!currentUser || !token) {
        console.log('User or token not available');
        return;
      }
      const response = await axios.get(`${API}/auctions/${eventId}`, {
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
      // Fetch ALL players without limit to ensure we get all 300+ players
      // Backend pagination will handle performance
      const response = await axios.get(
        `${API}/auctions/${eventId}/players`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const fetchedPlayers = response.data;
      console.log(`Fetched ${fetchedPlayers.length} total players`);
      setPlayers(fetchedPlayers);
      // Filter for only available players in the dropdown
      const available = fetchedPlayers.filter(p => p.status === 'available');
      console.log(`${available.length} players are available`);
      setAvailablePlayers(available);
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

  const fetchTeamsSafeBidSummary = async (currentPlayerCategory = null) => {
    try {
      if (!currentUser || !token) {
        console.log('Debug - fetchTeamsSafeBidSummary: Missing currentUser or token', { currentUser: !!currentUser, token: !!token });
        return;
      }

      const cacheKey = currentPlayerCategory || 'default';
      const now = Date.now();
      const CACHE_DURATION = 30000; // 30 seconds cache

      // Check if we have cached data that's still fresh
      if (safeBidCache[cacheKey] && lastCacheUpdate && (now - lastCacheUpdate) < CACHE_DURATION) {
        console.log('Debug - Using cached safe bid data for:', cacheKey);
        setTeamsSafeBidSummary(safeBidCache[cacheKey]);
        return;
      }

      const url = currentPlayerCategory
        ? `${API}/auctions/${eventId}/teams-safe-bid-summary?player_category=${encodeURIComponent(currentPlayerCategory)}`
        : `${API}/auctions/${eventId}/teams-safe-bid-summary`;

      console.log('Debug - fetchTeamsSafeBidSummary: Making API call to:', url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Debug - fetchTeamsSafeBidSummary: Response received:', response.data);

      // Update cache
      setSafeBidCache(prevCache => ({
        ...prevCache,
        [cacheKey]: response.data
      }));
      setLastCacheUpdate(now);
      setTeamsSafeBidSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch teams safe bid summary:', error);
      console.error('Debug - Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
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
      const response = await axios.get(`${API}/auctions/${eventId}/categories`, {
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
      // Start the timer when auction starts
      if (currentPlayer) {
        setTimer(60);
        setTimerActive(true);
      }
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
      toast.success('Player set for bidding - Click "Start Auction" to begin timer');
      setSelectedPlayer('');
      setTimer(60); // Reset timer to 60 seconds
      setTimerActive(false); // Don't auto-start timer
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
      const selectedTeam = teams.find(t => t.id === selectedTeamForSale);
      const finalPrice = parseInt(finalBidAmount);

      // Optimistic UI updates for immediate feedback
      setTimerActive(false);
      setTimer(0);
      setShowFinalizeBidModal(false);

      // Show SOLD stamp immediately
      showSoldStampAnimation(selectedTeam?.name || 'Unknown Team', `₹${finalPrice.toLocaleString()}`, currentPlayer);

      // Single API call for complete transaction
      await axios.post(`${API}/bids/complete-transaction`, {
        player_id: currentPlayer.id,
        team_id: selectedTeamForSale,
        amount: finalPrice,
        event_id: eventId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${currentPlayer.name} sold to ${selectedTeam?.name} for ₹${finalPrice.toLocaleString()}!`);

      // Clear form state
      setFinalBidAmount('');
      setSelectedTeamForSale('');

      // Clear cache to ensure fresh data on next load
      setSafeBidCache({});
      setLastCacheUpdate(null);

      // Single refresh call instead of multiple
      setTimeout(() => {
        fetchAuctionState();
        fetchTeams(); // Only fetch essential data
      }, 1000); // Delay to let animation play

    } catch (error) {
      console.error('Failed to finalize bid:', error);
      toast.error('Failed to finalize bid');

      // Revert optimistic updates on error
      setShowFinalizeBidModal(true);
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

  const toggleTimer = () => {
    if (timer > 0) {
      setTimerActive(!timerActive);
      toast.info(timerActive ? 'Timer paused' : 'Timer resumed');
    } else {
      toast.error('Timer has expired. Reset it to continue.');
    }
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
      const response = await axios.post(`${API}/auctions/${eventId}/make-all-unsold-available`, {}, {
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

        // Show SOLD stamp animation
        showSoldStampAnimation(currentTeamName, `₹${auctionState.current_bid.toLocaleString()}`, currentPlayer);

        toast.success(`${currentPlayer.name} sold to ${currentTeamName} for ₹${auctionState.current_bid.toLocaleString()}!`);

        setTimerActive(false);
        setTimer(0);

        // Refresh data immediately since we're using tempCurrentPlayer to keep display stable
        fetchAuctionState();
        fetchPlayers();
        fetchTeams();
      } else {
        // No bids - mark as unsold
        await axios.post(`${API}/bids/finalize/${currentPlayer.id}?event_id=${eventId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`${currentPlayer.name} marked as unsold`);

        setTimerActive(false);
        setTimer(0);

        fetchAuctionState();
        fetchPlayers();
        fetchTeams();
      }
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

  const showSoldStampAnimation = (teamName, price, playerToKeep) => {
    console.log('🎉 SHOWING SOLD STAMP:', { teamName, price, playerToKeep });

    // Store the current player temporarily to keep it visible during animation
    if (playerToKeep) {
      setTempCurrentPlayer(playerToKeep);
    }

    setSoldStampData({ teamName, price });
    setShowSoldStamp(true);
    setPreventDataRefresh(true);

    // Hide the stamp after 4 seconds
    setTimeout(() => {
      console.log('⏰ HIDING SOLD STAMP after 4 seconds');
      setShowSoldStamp(false);
      setPreventDataRefresh(false);
      setTempCurrentPlayer(null); // Clear the temporary player
    }, 4000);
  }; const handleSellToTeam = async () => {
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

      // Show SOLD stamp animation
      showSoldStampAnimation(selectedTeam?.name || 'Unknown Team', `₹${parseInt(finalBidAmount).toLocaleString()}`, currentPlayer);

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

      // Refresh data immediately since we're using tempCurrentPlayer to keep display stable
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
        setTimerActive(false); // Don't auto-start timer

        // Refresh data
        fetchAuctionState();
        fetchPlayers();

        toast.success(`${nextPlayer.name} randomly selected - Click "Start Auction" to begin`);
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
      const response = await axios.post(`${API}/auctions/${eventId}/fix-current-players`, {}, {
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
    // Fetch safe bid data when entering fullscreen mode
    if (!isFullscreen) {
      fetchTeamsSafeBidSummary();
    }
  };

  const getCurrentPlayer = () => {
    // During SOLD stamp animation, use the temporary current player
    if (showSoldStamp && tempCurrentPlayer) {
      return tempCurrentPlayer;
    }

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

  // Memoized calculations to reduce re-renders
  const currentPlayer = useMemo(() => getCurrentPlayer(), [players, auctionState]);
  const currentTeam = useMemo(() => getCurrentTeam(), [teams, auctionState]);
  const soldPlayers = useMemo(() => players.filter(p => p.status === 'sold'), [players]);
  const unsoldPlayers = useMemo(() => players.filter(p => p.status === 'unsold'), [players]);
  const availableTeams = useMemo(() =>
    teams.filter(team => team.remaining >= (currentPlayer?.base_price || 0)),
    [teams, currentPlayer]
  );

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

  // Fullscreen Auction Control Mode - Optimized for Projector Display
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#2a1f3a] overflow-hidden">
        {/* Dynamic Animated Background */}
        <div className="fixed inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(0, 255, 150, 0.08) 0%, transparent 50%), 
              radial-gradient(circle at 80% 70%, rgba(255, 0, 150, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(0, 150, 255, 0.05) 0%, transparent 70%)
            `
          }}></div>
          {/* Floating particles effect */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 h-screen flex flex-col">
          {/* 1️⃣ HEADER SECTION - 15% height */}
          <div className="h-[15vh] flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-xl border-b border-white/10">
            {/* Left side: Event Logo and Name */}
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-pulse overflow-hidden">
                {event?.logo_url ? (
                  <img
                    src={event.logo_url}
                    alt={event.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-3xl font-bold">⚡</span>
                )}
              </div>
              <div>
                <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent uppercase tracking-wider">
                  {event?.name || 'SPORTS AUCTION 2025'}
                </div>
                <div className="text-sm text-cyan-300/80 uppercase tracking-widest font-medium">
                  Live Auction Control
                </div>
              </div>
            </div>

            {/* Center: PowerAuction Branding & Timer */}
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <div className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent uppercase tracking-wider">
                  PowerAuction
                </div>
                <div className="text-sm text-cyan-300/80 uppercase tracking-widest font-medium">
                  Powered by Turgut
                </div>
              </div>
              {/* Countdown Timer - Clickable to pause/resume */}
              <div
                onClick={toggleTimer}
                className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 cursor-pointer transition-all hover:scale-105 ${timer <= 10 && timerActive ?
                  'bg-red-500/20 border-red-500 animate-pulse hover:bg-red-500/30' :
                  'bg-white/10 border-white/30 hover:bg-white/20'
                  }`}
                title={timerActive ? 'Click to pause timer' : 'Click to resume timer'}
              >
                <Clock className="w-6 h-6 text-white" />
                <span className={`text-2xl font-mono font-bold ${timer <= 10 && timerActive ? 'text-red-300' : 'text-white'
                  }`}>
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </span>
                {!timerActive && timer > 0 && (
                  <span className="text-xs text-yellow-300 ml-2 uppercase font-bold">Paused</span>
                )}
              </div>
            </div>

            {/* Right side: Sponsor Carousel & Live Status */}
            <div className="flex items-center gap-6">
              {/* Live Status */}
              <div className="flex items-center gap-3 px-6 py-3 bg-red-500/20 border-2 border-red-500 rounded-full">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-bold text-white uppercase tracking-wider">LIVE AUCTION</span>
              </div>

              {/* Sponsor Carousel */}
              {sponsors.length > 0 && (
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="flex animate-marquee gap-4">
                    {sponsors.filter(s => s.is_active).concat(sponsors.filter(s => s.is_active)).map((sponsor, index) => (
                      <div
                        key={`${sponsor.id}-${index}`}
                        className="flex-shrink-0 w-20 h-12 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 flex items-center justify-center overflow-hidden"
                      >
                        {sponsor.logo_url ? (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs font-bold text-white/80">{sponsor.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                Exit
              </Button>
            </div>
          </div>

          {/* 2️⃣ MIDDLE SECTION - Main Focus Area - 70% height */}
          <div className="h-[70vh] flex gap-6 px-8">
            {/* Left 70%: Player Info Panel */}
            <div className="w-[70%] bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 p-8 relative overflow-hidden">
              {/* Dynamic background effects */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
              </div>

              {currentPlayer ? (
                <div className="relative z-10 grid grid-cols-[280px_1fr] gap-8 h-full">
                  {/* Enhanced SOLD Animation - Covers Full Player Card */}
                  {showSoldStamp && (
                    <>
                      {console.log('🖼️ RENDERING ENHANCED SOLD ANIMATION:', soldStampData)}

                      {/* Very Light Transparent Overlay Background */}
                      <div className="absolute inset-0 bg-black/20 rounded-3xl pointer-events-none" style={{ zIndex: 95 }} />

                      {/* Confetti Particles */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" style={{ zIndex: 100 }}>
                        {[...Array(50)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: '-10px',
                              animationDelay: `${Math.random() * 1}s`,
                              animationDuration: `${2.5 + Math.random() * 2}s`
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded-full shadow-lg"
                              style={{
                                backgroundColor: ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f97316', '#ec4899'][i % 7]
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Subtle Flash Effect - No White Background */}
                      <div className="absolute inset-0 bg-yellow-200/30 animate-flash rounded-3xl pointer-events-none" style={{ zIndex: 101 }} />

                      {/* Celebration Rings */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 102 }}>
                        <div className="absolute w-40 h-40 border-4 border-yellow-400 rounded-full animate-ping" />
                        <div
                          className="absolute w-60 h-60 border-4 border-green-400 rounded-full animate-ping"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <div
                          className="absolute w-80 h-80 border-4 border-blue-400 rounded-full animate-ping"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </div>

                      {/* Main SOLD Stamp */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 103 }}>
                        <div className="animate-stamp">
                          <div className="relative">
                            {/* Stamp Border and Background */}
                            <div className="bg-red-600 text-white font-black text-8xl px-16 py-10 border-8 border-red-600 rounded-2xl transform -rotate-12 shadow-2xl">
                              <div className="relative">
                                <div className="absolute inset-0 bg-white opacity-20 rounded-xl" />
                                <div className="relative flex items-center gap-6">
                                  <Trophy className="w-20 h-20" />
                                  <span>SOLD!</span>
                                </div>
                              </div>
                            </div>

                            {/* Shine Effect */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl -rotate-12">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 animate-shine transform -skew-x-12" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team and Price Info - Positioned below stamp */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 104 }}>
                        <div className="mt-48 text-center">
                          <div className="bg-black/90 backdrop-blur-sm rounded-3xl px-12 py-8 animate-slide-up border-2 border-yellow-400/50">
                            <div className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4 drop-shadow-lg">
                              {soldStampData.teamName}
                            </div>
                            <div className="text-4xl font-bold text-green-300 drop-shadow-lg">
                              {soldStampData.price}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Player Image with Team Color Frame */}
                  <div className="relative">
                    <div
                      className={`w-full h-80 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-2xl cursor-pointer transition-transform hover:scale-105 ${currentPlayer.status === 'sold' && currentTeam ?
                        'ring-4 ring-green-400 shadow-green-400/50' :
                        'bg-gradient-to-br from-purple-500 to-blue-600'
                        }`}
                      onClick={() => setShowImageModal(true)}
                      title="Click to view full image"
                    >
                      {currentPlayer.photo_url ? (
                        <img
                          src={currentPlayer.photo_url}
                          alt={currentPlayer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-24 h-24 text-white/70" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                      {/* Role Badge */}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-full text-sm font-bold text-white uppercase flex items-center gap-2">
                        {currentPlayer.position === 'Batsman' && '🏏'}
                        {currentPlayer.position === 'Bowler' && '⚾'}
                        {currentPlayer.position === 'All-rounder' && '⚡'}
                        {currentPlayer.position === 'Wicketkeeper' && '🥅'}
                        {currentPlayer.position || 'Player'}
                      </div>

                      {/* Status Overlay - Only show when not showing stamp animation */}
                      {currentPlayer.status === 'sold' && !showSoldStamp && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg animate-bounce">
                            SOLD!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player Details */}
                  <div className="flex flex-col justify-between">
                    <div>
                      {/* Player Name */}
                      <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent uppercase tracking-wider leading-tight">
                        {currentPlayer.name}
                      </h1>

                      {/* Player Info Pills */}
                      <div className="flex gap-3 mb-6 flex-wrap">
                        <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-xl text-cyan-300 font-semibold">
                          🏏 {currentPlayer.position || 'All-rounder'}
                        </div>
                        <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-xl text-blue-300 font-semibold">
                          👤 {currentPlayer.age || 'N/A'} years
                        </div>
                        {currentPlayer.category_id && categories.find(cat => cat.id === currentPlayer.category_id) && (
                          <div
                            className="px-4 py-2 border rounded-xl font-semibold"
                            style={{
                              backgroundColor: `${categories.find(cat => cat.id === currentPlayer.category_id)?.color}20`,
                              borderColor: `${categories.find(cat => cat.id === currentPlayer.category_id)?.color}80`,
                              color: categories.find(cat => cat.id === currentPlayer.category_id)?.color
                            }}
                          >
                            🏷️ {categories.find(cat => cat.id === currentPlayer.category_id)?.name}
                          </div>
                        )}
                        <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-xl text-purple-300 font-semibold">
                          ⚡ {currentPlayer.specialty || 'Versatile'}
                        </div>
                      </div>

                      {/* Stylish Stats Grid with Icons */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                              🏏
                            </div>
                            <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Matches</div>
                          </div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.matches || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                              🎯
                            </div>
                            <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Runs</div>
                          </div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.runs || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg flex items-center justify-center">
                              ⚾
                            </div>
                            <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Wickets</div>
                          </div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-red-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.wickets || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                              ⚡
                            </div>
                            <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Strike Rate</div>
                          </div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-white bg-clip-text text-transparent">
                            {currentPlayer.stats?.strike_rate || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Highlight Bar: Base Price → Current Bid - Made more visible in fullscreen */}
                    <div className="bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-pink-500/30 p-8 rounded-3xl border-2 border-yellow-500/50 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="text-lg text-yellow-200 uppercase tracking-wider font-bold mb-2">Base Price</div>
                          <div className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                            ₹{currentPlayer.base_price?.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex-1 mx-8 flex items-center justify-center">
                          <div className="w-full h-2 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full shadow-lg"></div>
                        </div>
                        <div className="text-center flex-1">
                          <div className="text-lg text-pink-200 uppercase tracking-wider font-bold mb-2">
                            {finalBidAmount ? 'Final Price' : auctionState?.current_bid ? 'Current Bid' : 'Starting Price'}
                          </div>
                          <div className="text-4xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                            {finalBidAmount ? `₹${parseInt(finalBidAmount).toLocaleString()}` :
                              auctionState?.current_bid ? `₹${auctionState.current_bid.toLocaleString()}` : '---'}
                          </div>
                          {(currentTeam || selectedTeamForSale) && (
                            <div className="text-lg text-white mt-2 font-bold">
                              {selectedTeamForSale ? teams.find(t => t.id === selectedTeamForSale)?.name : currentTeam?.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                      <Trophy className="w-16 h-16 text-white/60" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">No Player Selected</h2>
                    <p className="text-white/70 text-xl">Select a player to start the auction</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right 30%: Bidding Activity Panel */}
            <div className="w-[30%] bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 p-6 flex flex-col h-full">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent uppercase tracking-wider">
                  Bidding Control
                </h3>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Auction Status Indicator */}
                <div className={`p-4 rounded-xl border-2 text-center transition-all duration-500 ${auctionState?.status === 'in_progress' ?
                  'bg-green-500/30 border-green-500 animate-pulse' :
                  'bg-white/10 border-white/30'
                  }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full ${auctionState?.status === 'in_progress' ?
                      'bg-green-500 animate-pulse' :
                      'bg-gray-500'
                      }`}></div>
                    <span className="text-white font-bold uppercase tracking-wider text-sm">
                      {auctionState?.status === 'in_progress' ? 'Bidding Active' : 'Waiting for Bids'}
                    </span>
                  </div>
                </div>

                {/* Team Selection for Direct Sale - Grid Layout */}
                <div className="space-y-3">
                  <h4 className="text-white font-bold uppercase tracking-wider text-sm">Select Team</h4>
                  <div className={`grid gap-2 max-h-48 overflow-y-auto ${teams.length <= 4 ? 'grid-cols-2' : teams.length <= 6 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    {teams.map((team) => {
                      // Find team safe bid data - backend returns 'teams' array with different field names
                      const teamSafeBid = Array.isArray(teamsSafeBidSummary?.teams) ?
                        teamsSafeBidSummary.teams.find(t => t.team_id === team.id) : null;
                      const safeBidAmount = teamSafeBid?.max_safe_bid || 0;
                      const riskLevel = teamSafeBid?.risk_level || 'unknown';

                      // Debug log for first team to check data
                      if (team === teams[0] && teamsSafeBidSummary) {
                        console.log('Debug - First team safe bid data:', {
                          teamId: team.id,
                          teamName: team.name,
                          teamSafeBid,
                          safeBidAmount,
                          riskLevel,
                          fullSummary: teamsSafeBidSummary
                        });
                      } return (
                        <div key={team.id} className="relative group">
                          <button
                            onClick={() => handleTeamSelect(team.id)}
                            className={`w-full p-2 rounded-lg border-2 text-white font-bold text-xs transition-all hover:scale-105 flex flex-col items-center gap-1 ${selectedTeamForSale === team.id
                              ? 'bg-gradient-to-r from-green-500/40 to-emerald-500/40 border-green-400'
                              : 'bg-white/10 border-white/30 hover:border-white/60 hover:bg-white/20'
                              }`}
                          >
                            {team.logo_url ? (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="w-5 h-5 object-cover rounded-full"
                              />
                            ) : (
                              <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                                {team.name.charAt(0)}
                              </div>
                            )}
                            <span className="truncate text-center leading-tight text-xs">{team.name}</span>
                            <span className="text-xs text-white/70">
                              ₹{team.remaining?.toLocaleString() || 'N/A'}
                            </span>
                          </button>

                          {/* Safe Bid Tooltip - positioned below to avoid cutoff */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                            <div className="bg-gray-900/95 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-white/20">
                              <div className="flex flex-col items-center gap-1">
                                <div className="font-semibold">Safe Bid Amount</div>
                                <div className={`text-sm font-bold ${riskLevel === 'low' ? 'text-green-400' :
                                  riskLevel === 'medium' ? 'text-yellow-400' :
                                    riskLevel === 'high' ? 'text-red-400' : 'text-gray-400'
                                  }`}>
                                  ₹{safeBidAmount.toLocaleString()}
                                </div>
                                <div className={`text-xs capitalize ${riskLevel === 'low' ? 'text-green-300' :
                                  riskLevel === 'medium' ? 'text-yellow-300' :
                                    riskLevel === 'high' ? 'text-red-300' : 'text-gray-300'
                                  }`}>
                                  {riskLevel} risk
                                </div>
                              </div>
                              {/* Tooltip arrow pointing up */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
                                <div className="border-4 border-transparent border-b-gray-900/95"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price Input */}
                <div className="space-y-2">
                  <label className="text-white font-bold uppercase tracking-wider text-sm">Final Price:</label>
                  <input
                    type="number"
                    value={finalBidAmount}
                    onChange={(e) => setFinalBidAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 bg-white/10 border-2 border-white/20 rounded-lg text-white text-lg font-bold outline-none transition-all focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-400/20"
                  />
                </div>
              </div>

              {/* Fixed Bottom Button */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <button
                  onClick={handleSellToTeam}
                  disabled={loading || !selectedTeamForSale || !finalBidAmount}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold uppercase tracking-wider rounded-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400 text-sm flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Processing Sale...
                    </>
                  ) : (
                    <>🏆 Sell to Team</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 3️⃣ BOTTOM SECTION - Control Panel - 15% height */}
          <div className="h-[15vh] px-8 pb-4">
            <div className="h-full bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center justify-center">
              {/* Control Panel - Quick Actions */}
              <div className="flex justify-center gap-6">
                <button
                  onClick={startTimer}
                  disabled={timerActive || loading}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold uppercase tracking-wider rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-400 text-lg"
                >
                  <Timer className="w-5 h-5 mr-2 inline" />
                  Start Timer
                </button>

                <button
                  onClick={handleNextPlayer}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold uppercase tracking-wider rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-400 text-lg"
                >
                  <ArrowRight className="w-5 h-5 mr-2 inline" />
                  Next Player
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal for Fullscreen Photo View */}
        {showImageModal && currentPlayer?.photo_url && (
          <div
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-6xl max-h-full">
              {/* Close Button */}
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-4 -right-4 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-2xl transition-all hover:scale-110 z-10"
                title="Close"
              >
                ×
              </button>

              {/* Full Image */}
              <img
                src={currentPlayer.photo_url}
                alt={currentPlayer.name}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Player Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-2xl">
                <h2 className="text-4xl font-bold text-white text-center">
                  {currentPlayer.name}
                </h2>
                {currentPlayer.position && (
                  <p className="text-xl text-cyan-300 text-center mt-2">
                    {currentPlayer.position}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Menu */}
        <FloatingMenu />
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
                    {auctionState?.status === 'paused' && (
                      <Button
                        onClick={startAuction}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume Auction
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
              <Card className={`relative overflow-hidden backdrop-blur-sm border-white/30 ${currentPlayer.status === 'sold' ? 'bg-green-50/95 border-green-200' :
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
                          className={`w-20 h-20 rounded-full object-cover ${currentPlayer.status === 'sold' ? 'border-4 border-green-400' :
                            currentPlayer.status === 'unsold' ? 'border-4 border-red-400' :
                              'border-2 border-gray-300'
                            }`}
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${currentPlayer.status === 'sold' ? 'bg-green-200 border-4 border-green-400' :
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
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                  {teams.map((team, index) => (
                    <div
                      key={team.id}
                      className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-gradient-to-r p-4 shadow-sm hover:shadow-md transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${team.color || '#3B82F6'}15, ${team.color || '#3B82F6'}08)`,
                        borderColor: `${team.color || '#3B82F6'}40`
                      }}
                    >
                      {/* Team Logo and Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Team Logo */}
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-12 h-12 object-cover rounded-full border-2 border-white shadow-lg"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white"
                              style={{ backgroundColor: team.color || '#3B82F6' }}
                            >
                              {team.name.charAt(0)}
                            </div>
                          )}

                          {/* Team Details */}
                          <div>
                            <div className="font-bold text-gray-800 text-lg">{team.name}</div>
                            <div className="text-sm text-gray-600 flex items-center space-x-3">
                              <span className="flex items-center">
                                👥 {team.players_count || 0} players
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="flex items-center">
                                🎯 {team.max_squad_size} max
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Budget Info with Safe Bid */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            ₹{team.remaining?.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            remaining budget
                          </div>

                          {/* Safe Bid Information */}
                          {teamsSafeBidSummary && (() => {
                            const safeBidInfo = teamsSafeBidSummary.teams.find(t => t.team_id === team.id);
                            if (safeBidInfo) {
                              return (
                                <div className="mt-2 p-2 bg-white/50 rounded-lg border">
                                  <div className="text-xs font-semibold text-blue-600 mb-1">
                                    Safe Bid Capacity
                                  </div>
                                  <div className="text-lg font-bold text-blue-700">
                                    ₹{safeBidInfo.max_safe_bid_with_buffer.toLocaleString()}
                                  </div>
                                  <div className={`text-xs font-medium ${safeBidInfo.risk_level === 'low' ? 'text-green-600' :
                                    safeBidInfo.risk_level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {safeBidInfo.risk_level === 'low' ? '🟢 Low Risk' :
                                      safeBidInfo.risk_level === 'medium' ? '🟡 Medium Risk' : '🔴 High Risk'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Reserved: ₹{safeBidInfo.base_price_obligations.toLocaleString()}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="text-xs text-gray-400 mt-1">
                                of ₹{team.budget?.toLocaleString()} total
                              </div>
                            );
                          })()}</div>
                      </div>

                      {/* Progress Bar for Budget Usage */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Budget Used</span>
                          <span>{Math.round(((team.budget - team.remaining) / team.budget) * 100) || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(((team.budget - team.remaining) / team.budget) * 100, 100) || 0}%`,
                              backgroundColor: team.color || '#3B82F6'
                            }}
                          />
                        </div>
                      </div>

                      {/* Team Color Accent */}
                      <div
                        className="absolute top-0 right-0 w-1 h-full opacity-60"
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
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
                              (₹{team.remaining?.toLocaleString()} left)
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

        {/* Enhanced SOLD Animation CSS */}
        <style>{`
          @keyframes stamp {
            0% {
              transform: scale(0) rotate(-12deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotate(-12deg);
            }
            100% {
              transform: scale(1) rotate(-12deg);
              opacity: 1;
            }
          }

          @keyframes flash {
            0% {
              opacity: 0;
            }
            50% {
              opacity: 0.3;
            }
            100% {
              opacity: 0;
            }
          }

          @keyframes confetti {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(600px) rotate(720deg);
              opacity: 0;
            }
          }

          @keyframes shine {
            0% {
              transform: translateX(-100%) skewX(-15deg);
            }
            100% {
              transform: translateX(200%) skewX(-15deg);
            }
          }

          @keyframes slide-up {
            0% {
              transform: translateY(50px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .animate-stamp {
            animation: stamp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          .animate-flash {
            animation: flash 0.6s ease-out;
          }

          .animate-confetti {
            animation: confetti linear forwards;
          }

          .animate-shine {
            animation: shine 2.5s infinite;
          }

          .animate-slide-up {
            animation: slide-up 0.8s ease-out 0.3s both;
          }
        `}</style>
      </div>

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default AuctionControl;
