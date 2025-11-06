import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Users,
  DollarSign,
  Target,
  Clock,
  User,
  RefreshCw,
  Share2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublicTeamStats = () => {
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [event, setEvent] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [maxSafeBid, setMaxSafeBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh every 5 seconds for real-time updates
  useEffect(() => {
    console.log('PublicTeamStats useEffect:', { teamId, token, API: process.env.REACT_APP_BACKEND_URL });

    if (!teamId) {
      setError('Team ID is missing from the URL.');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Access token is missing from the URL.');
      setLoading(false);
      return;
    }

    if (!process.env.REACT_APP_BACKEND_URL) {
      setError('Backend URL is not configured. Please contact support.');
      setLoading(false);
      return;
    }

    if (teamId && token) {
      fetchTeamData();
      const interval = setInterval(fetchTeamData, 5000);
      return () => clearInterval(interval);
    }
  }, [teamId, token]);

  const fetchTeamData = async () => {
    try {
      console.log('Fetching team data for:', { teamId, token, API });

      const [teamResponse, playersResponse, auctionResponse] = await Promise.all([
        axios.get(`${API}/public/team/${teamId}/stats?token=${token}`),
        axios.get(`${API}/public/team/${teamId}/players?token=${token}`),
        axios.get(`${API}/public/team/${teamId}/auction-state?token=${token}`)
      ]);

      console.log('Successful API responses:', { teamResponse: teamResponse.data, playersResponse: playersResponse.data });

      setTeam(teamResponse.data.team);
      setEvent(teamResponse.data.event);
      setCategories(teamResponse.data.categories);
      setPlayers(playersResponse.data);
      setAuctionState(auctionResponse.data);
      setLastUpdated(new Date());
      setError(null);

      // Fetch max safe bid for the team
      try {
        const currentPlayerCategory = auctionResponse.data?.current_player?.category;
        const safeBidUrl = currentPlayerCategory
          ? `${API}/teams/${teamId}/max-safe-bid/${teamResponse.data.event.id}?player_category=${encodeURIComponent(currentPlayerCategory)}`
          : `${API}/teams/${teamId}/max-safe-bid/${teamResponse.data.event.id}`;

        const safeBidResponse = await axios.get(safeBidUrl);
        setMaxSafeBid(safeBidResponse.data);
      } catch (safeBidError) {
        console.error('Failed to fetch safe bid data:', safeBidError);
        // Don't set error state for safe bid failure, just log it
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        teamId,
        token,
        API
      });

      let errorMessage = 'Failed to load team statistics. Please check your link.';

      if (error.response?.status === 403) {
        errorMessage = 'Invalid or expired access token. Please request a new link from the admin.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Team not found. Please verify the team ID in the link.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const groupPlayersByCategory = () => {
    if (!players.length || !categories.length) return {};

    const groupedPlayers = {};

    // Initialize groups with categories
    categories.forEach(category => {
      groupedPlayers[category.id] = {
        category,
        players: [],
        count: 0,
        totalSpent: 0,
        minRequired: category.min_players,
        maxAllowed: category.max_players
      };
    });

    // Group players by category
    players.forEach(player => {
      if (player.category_id && groupedPlayers[player.category_id]) {
        groupedPlayers[player.category_id].players.push(player);
        groupedPlayers[player.category_id].count++;
        groupedPlayers[player.category_id].totalSpent += (player.sold_price || 0);
      }
    });

    return groupedPlayers;
  };

  const getCategoryStatus = (count, minRequired, maxAllowed) => {
    if (count < minRequired) {
      return {
        status: 'insufficient',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        message: `Need ${minRequired - count} more`
      };
    } else if (count > maxAllowed) {
      return {
        status: 'exceeded',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        message: `${count - maxAllowed} over limit`
      };
    } else {
      return {
        status: 'optimal',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        message: 'Requirement met'
      };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team statistics...</p>
        </div>
      </div>
    );
  }

  const testPublicEndpoints = async () => {
    try {
      console.log('Testing public endpoints...');

      // Test basic public endpoint
      const testResponse = await axios.get(`${API}/public/test`);
      console.log('Test endpoint response:', testResponse.data);

      // Test list teams endpoint
      const teamsResponse = await axios.get(`${API}/public/debug/teams`);
      console.log('Available teams:', teamsResponse.data);

      // Test debug endpoint
      const debugResponse = await axios.get(`${API}/public/debug/team/${teamId}?token=${token}`);
      console.log('Debug endpoint response:', debugResponse.data);

      // Show results in alert for easy viewing
      alert(`Debug Results:
        
Team Exists: ${debugResponse.data.team_exists}
Token Valid: ${debugResponse.data.token_valid}
Team Name: ${debugResponse.data.team_name || 'N/A'}
${debugResponse.data.demo_token_info}

Available Teams: ${teamsResponse.data.teams?.length || 0}
Check console for full details.`);

      toast.success('Debug information displayed - check console for full details');
    } catch (error) {
      console.error('Test failed:', error);
      alert(`Test failed: ${error.response?.data?.detail || error.message}`);
      toast.error('Test failed - check console');
    }
  }; if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>

          <div className="space-y-3">
            <button
              onClick={testPublicEndpoints}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔍 Debug Connection
            </button>

            <button
              onClick={() => {
                // Generate a proper demo token
                const demoString = `${teamId}-${Date.now()}`;
                const validDemoToken = btoa(demoString);
                const newUrl = `${window.location.origin}/public/team/${teamId}/stats?token=${validDemoToken}`;

                console.log('Generated valid demo token:', {
                  demoString,
                  validDemoToken,
                  newUrl
                });

                // Redirect to the new URL with valid demo token
                window.location.href = newUrl;
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔧 Generate Valid Demo Token
            </button>

            <div className="text-left bg-gray-100 p-4 rounded-lg text-sm space-y-1">
              <div><strong>Team ID:</strong> {teamId}</div>
              <div><strong>Token:</strong> {token?.substring(0, 20)}...</div>
              <div><strong>API URL:</strong> {API}</div>
              <div><strong>Full URL:</strong> {window.location.href}</div>

              {/* Try to decode the token */}
              {(() => {
                try {
                  const decoded = atob(token);
                  return <div><strong>Decoded Token:</strong> {decoded}</div>;
                } catch (e) {
                  return <div><strong>Token Type:</strong> Not a demo token</div>;
                }
              })()}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ml-2"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const budgetUsedPercentage = team ? Math.round(((team.budget - team.remaining) / team.budget) * 100) : 0;
  const squadCompletionPercentage = team ? Math.round((players.length / team.max_squad_size) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Team Logo */}
              {team?.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team?.name}
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg"
                  style={{ backgroundColor: team?.color || '#3B82F6' }}
                >
                  {team?.name?.charAt(0)}
                </div>
              )}

              {/* Team Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{team?.name}</h1>
                <p className="text-gray-600">{event?.name} - Live Statistics</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-600 font-medium">Live</span>
                </div>
              </div>
            </div>

            {/* Share Button */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span>Public View</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Key Stats */}
          <div className="space-y-6">
            {/* Budget Overview */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span>Budget Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {formatCurrency(team?.remaining || 0)}
                  </div>
                  <p className="text-gray-600">Remaining Balance</p>
                </div>

                <Progress value={budgetUsedPercentage} className="h-3" />

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(team?.spent || 0)}
                    </div>
                    <p className="text-sm text-gray-600">Spent</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {budgetUsedPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">Used</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safe Bidding Capacity */}
            {maxSafeBid && (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span>Safe Bidding Capacity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(maxSafeBid.max_safe_bid_with_buffer || 0)}
                    </div>
                    <p className="text-gray-600">Safe Bidding Limit</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {maxSafeBid.recommendation?.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(maxSafeBid.max_safe_bid || 0)}
                      </div>
                      <p className="text-xs text-gray-600">Maximum Possible</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(maxSafeBid.base_price_obligations || 0)}
                      </div>
                      <p className="text-xs text-gray-600">Reserved for Squad</p>
                    </div>
                  </div>

                  {maxSafeBid.can_bid_safely && (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
                      <p className="text-green-800 font-medium text-sm">
                        ✅ Team can bid safely up to the limit shown above
                      </p>
                    </div>
                  )}

                  {!maxSafeBid.can_bid_safely && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-center">
                      <p className="text-red-800 font-medium text-sm">
                        ⚠️ Limited bidding capacity - consider squad requirements
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Squad Status */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Squad Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {players.length}
                  </div>
                  <p className="text-gray-600">Players Bought</p>
                </div>

                <Progress value={squadCompletionPercentage} className="h-3" />

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {team?.max_squad_size - players.length}
                    </div>
                    <p className="text-sm text-gray-600">Slots Left</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {squadCompletionPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">Complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Status Overview */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span>Category Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(groupPlayersByCategory()).map((categoryGroup) => {
                    const statusInfo = getCategoryStatus(
                      categoryGroup.count,
                      categoryGroup.minRequired,
                      categoryGroup.maxAllowed
                    );
                    return (
                      <div
                        key={categoryGroup.category.id}
                        className={`p-3 rounded-lg border-2 ${statusInfo.bgColor} ${statusInfo.borderColor}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categoryGroup.category.color }}
                            />
                            <span className="font-medium text-gray-900">
                              {categoryGroup.category.name}
                            </span>
                          </div>
                          <span className={`text-sm font-medium ${statusInfo.color}`}>
                            {categoryGroup.count}/{categoryGroup.minRequired}-{categoryGroup.maxAllowed}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {statusInfo.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Player List */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span>Bought Players ({players.length})</span>
                  </div>
                  <button
                    onClick={fetchTeamData}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm">Refresh</span>
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No players bought yet</p>
                    <p className="text-gray-400">Your team hasn't purchased any players during the auction.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Players grouped by category */}
                    {Object.values(groupPlayersByCategory()).map((categoryGroup) => (
                      categoryGroup.players.length > 0 && (
                        <div key={categoryGroup.category.id} className="space-y-3">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: categoryGroup.category.color }}
                            />
                            <h4 className="font-semibold text-gray-900">
                              {categoryGroup.category.name} ({categoryGroup.players.length})
                            </h4>
                            <span className="text-sm text-gray-500">
                              Total spent: {formatCurrency(categoryGroup.totalSpent)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categoryGroup.players.map((player) => (
                              <div key={player.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start space-x-3">
                                  {player.photo_url ? (
                                    <img
                                      src={player.photo_url}
                                      alt={player.name}
                                      className="w-12 h-12 rounded-full object-cover border-2"
                                      style={{ borderColor: categoryGroup.category.color }}
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2"
                                      style={{
                                        backgroundColor: categoryGroup.category.color,
                                        borderColor: categoryGroup.category.color
                                      }}
                                    >
                                      {player.name.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{player.name}</h3>
                                    <p className="text-sm text-gray-600">{player.position}</p>
                                    <div className="mt-2 flex items-center justify-between">
                                      <div className="text-sm">
                                        <span className="text-gray-500">Base: </span>
                                        <span className="font-medium">{formatCurrency(player.base_price)}</span>
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-gray-500">Bought: </span>
                                        <span className="font-bold text-green-600">
                                          {formatCurrency(player.sold_price || player.base_price)}
                                        </span>
                                      </div>
                                    </div>
                                    {player.age && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Age: {player.age}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}

                    {/* Uncategorized players */}
                    {players.filter(p => !p.category_id).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 pb-2 border-b">
                          Other Players ({players.filter(p => !p.category_id).length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {players.filter(p => !p.category_id).map((player) => (
                            <div key={player.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-start space-x-3">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                                    {player.name.charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{player.name}</h3>
                                  <p className="text-sm text-gray-600">{player.position}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="text-sm">
                                      <span className="text-gray-500">Base: </span>
                                      <span className="font-medium">{formatCurrency(player.base_price)}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-500">Bought: </span>
                                      <span className="font-bold text-green-600">
                                        {formatCurrency(player.sold_price || player.base_price)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTeamStats;