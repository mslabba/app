import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Edit, Trash2, User, Unlock, RotateCcw, Search, Filter, Download } from 'lucide-react';
import { reauctionPlayer, reauctionPlayers } from '@/lib/reauction';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import DocumentUpload from '@/components/DocumentUpload';
import { convertGoogleDriveUrl } from '@/utils/imageUtils';
import jsPDF from 'jspdf';
import {
  buildAdminPlayerPayload,
  enabledFields,
  emptyAdminPlayerFormValues,
  playerToAdminFormValues,
  resolveRegistrationFormConfig,
  validateRegistrationValues,
  COLUMN_KEYS,
  KERALA_DISTRICTS,
  STATS_KEYS,
} from '@/lib/registrationFormConfig';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [event, setEvent] = useState(null);
  const [formConfig, setFormConfig] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [formData, setFormData] = useState(() =>
    emptyAdminPlayerFormValues(resolveRegistrationFormConfig(null))
  );

  const activeFormFields = useMemo(
    () => enabledFields(formConfig || resolveRegistrationFormConfig(event)),
    [formConfig, event]
  );

  useEffect(() => {
    fetchEvent();
    fetchPlayers();
    fetchCategories();
    fetchTeams();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}`);
      setEvent(response.data);
      const cfg = resolveRegistrationFormConfig(response.data);
      setFormConfig(cfg);
      setFormData((prev) => {
        // Keep auction fields if dialog open; else reset shape to config
        if (editingPlayer) return prev;
        return {
          ...emptyAdminPlayerFormValues(cfg),
          category_id: prev.category_id || '',
          base_price: prev.base_price || '',
        };
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to fetch event details');
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      toast.error('Failed to load players');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API}/teams/event/${eventId}`);
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.base_price || parseInt(formData.base_price, 10) <= 0) {
      toast.error('Please enter a valid base price');
      return;
    }

    const cfg = formConfig || resolveRegistrationFormConfig(event);
    const validationError = validateRegistrationValues(formData, cfg);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const playerData = buildAdminPlayerPayload(formData, cfg);

      if (editingPlayer) {
        await axios.put(`${API}/players/${editingPlayer.id}`, playerData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Player updated successfully!');
      } else {
        await axios.post(`${API}/players`, playerData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Player added successfully!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    const cfg = formConfig || resolveRegistrationFormConfig(event);
    setFormData(playerToAdminFormValues(player, cfg));
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      await axios.delete(`${API}/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Player deleted successfully!');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const handleReleasePlayer = async (player) => {
    const teamName = getTeamName(player.sold_to_team_id);
    if (!confirm(`Are you sure you want to release ${player.name} from ${teamName}? This will refund ₹${player.sold_price?.toLocaleString()} to the team.`)) return;

    try {
      await axios.post(`${API}/players/${player.id}/release`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${player.name} released successfully! Budget refunded to ${teamName}.`);
      fetchPlayers();
      fetchTeams(); // Refresh teams to update budgets
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release player');
    }
  };

  const handleMakeAvailable = async (player) => {
    if (!confirm(`Are you sure you want to make ${player.name} available for bidding? This will remove them from the current auction slot.`)) return;

    try {
      await axios.post(`${API}/players/${player.id}/make-available`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${player.name} is now available for bidding again!`);
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to make player available');
    }
  };

  const handleReauction = async (player) => {
    if (!confirm(`Put ${player.name} back into the auction? They will appear in the available pool again.`)) return;
    try {
      await reauctionPlayer(player.id, token);
      toast.success(`${player.name} is back in the auction pool`);
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to re-auction player');
    }
  };

  const handleReauctionAllUnsold = async () => {
    const unsold = players.filter((p) => p.status === 'unsold');
    if (!unsold.length) return;
    if (!confirm(`Put all ${unsold.length} unsold players back into the auction pool?`)) return;
    const { ok, failed } = await reauctionPlayers(unsold, token);
    if (ok) toast.success(`${ok} unsold player${ok === 1 ? '' : 's'} back in the auction pool`);
    if (failed.length) toast.error(`${failed.length} could not be updated: ${failed.map((p) => p.name).join(', ')}`);
    fetchPlayers();
  };

  const resetForm = () => {
    setEditingPlayer(null);
    const cfg = formConfig || resolveRegistrationFormConfig(event);
    setFormData(emptyAdminPlayerFormValues(cfg));
  };

  const handleChange = (field, value) => {
    if (field === 'category_id') {
      const selectedCat = categories.find((c) => c.id === value);
      const basePrice = selectedCat ? selectedCat.base_price : '';
      setFormData((prev) => ({
        ...prev,
        category_id: value,
        base_price: basePrice !== '' && basePrice != null ? String(basePrice) : prev.base_price,
      }));
      if (selectedCat) {
        toast.info(
          `Base price auto-filled to ₹${Number(basePrice).toLocaleString()} (category base price)`
        );
      }
      return;
    }

    if (STATS_KEYS.has(field) || field.startsWith('stats.')) {
      const statField = field.startsWith('stats.') ? field.split('.')[1] : field;
      setFormData((prev) => ({
        ...prev,
        stats: { ...(prev.stats || {}), [statField]: value },
      }));
      return;
    }

    if (COLUMN_KEYS.has(field) || field === 'base_price' || field === 'category_id' || field === 'is_priority') {
      setFormData((prev) => ({ ...prev, [field]: value }));
      return;
    }

    // Custom / extra fields
    setFormData((prev) => ({
      ...prev,
      extra_fields: { ...(prev.extra_fields || {}), [field]: value },
    }));
  };

  const getFieldValue = (fieldKey) => {
    if (STATS_KEYS.has(fieldKey)) return formData.stats?.[fieldKey] ?? '';
    if (COLUMN_KEYS.has(fieldKey) || fieldKey === 'base_price' || fieldKey === 'category_id') {
      return formData[fieldKey] ?? '';
    }
    return formData.extra_fields?.[fieldKey] ?? formData[fieldKey] ?? '';
  };

  const renderConfiguredField = (field) => {
    const label = `${field.label}${field.required ? ' *' : ''}`;
    const value = getFieldValue(field.key);

    if (field.type === 'image') {
      return (
        <div key={field.id} className="col-span-2">
          <ImageUpload
            label={label}
            value={value}
            onChange={(url) => handleChange(field.key, url)}
            placeholder={field.placeholder || 'Upload image or enter URL'}
            sampleType={{ type: 'players', subtype: 'photos' }}
          />
        </div>
      );
    }
    if (field.type === 'file') {
      return (
        <div key={field.id} className="col-span-2">
          <DocumentUpload
            label={label}
            value={value}
            onChange={(url) => handleChange(field.key, url)}
            placeholder={field.placeholder || 'Upload file or enter URL'}
            accept="image/*,application/pdf"
            maxSize={5 * 1000 * 1000}
          />
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="col-span-2">
          <Label>{label}</Label>
          <Textarea
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            required={!!field.required}
            rows={3}
          />
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <div key={field.id}>
          <Label>{label}</Label>
          <Select value={value || undefined} onValueChange={(v) => handleChange(field.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select…'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // District is a combobox: Kerala districts as suggestions, free text
    // still allowed. Stored value stays a plain district string.
    if (field.key === 'district') {
      return (
        <div key={field.id}>
          <Label>{label}</Label>
          <Input
            type="text"
            list="kerala-districts-admin"
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || 'District'}
            required={!!field.required}
          />
          <datalist id="kerala-districts-admin">
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
      );
    }

    const inputType =
      field.type === 'number'
        ? 'number'
        : field.type === 'email'
          ? 'email'
          : field.type === 'tel'
            ? 'tel'
            : field.type === 'date'
              ? 'date'
              : 'text';

    return (
      <div key={field.id}>
        <Label>{label}</Label>
        <Input
          type={inputType}
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          placeholder={field.placeholder || ''}
          required={!!field.required}
        />
      </div>
    );
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getCategoryBasePrice = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    return `₹${category.base_price?.toLocaleString()}`;
  };

  // Filter and search players
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.previous_team?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || player.category_id === selectedCategory;

    const matchesStatus = selectedStatus === 'all' || player.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const generatePlayerCardsPDF = async () => {
    try {
      const playersToExport = filteredPlayers.length > 0 ? filteredPlayers : players;
      // Serial number = position in the event's full player list (issue #85).
      // A filtered export must not renumber players.
      const serialById = new Map(players.map((p, idx) => [p.id, idx + 1]));
      toast.info(`Loading ${playersToExport.length} player images...`);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Card dimensions - portrait cards, 4 across x 3 per A4 page (issue #85)
      const cardsPerRow = 4;
      const rowsPerPage = 3;
      const gap = 3;
      const margin = 10;
      const cardPadding = 3;
      const headerHeight = 25; // Space for logo and title
      const marginTop = headerHeight + 5; // Top margin after header
      const cardWidth = (pageWidth - margin * 2 - (cardsPerRow - 1) * gap) / cardsPerRow;
      const cardHeight =
        (pageHeight - marginTop - margin - (rowsPerPage - 1) * gap) / rowsPerPage;

      // Helper function to load logo
      const loadLogo = () => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const base64 = canvas.toDataURL('image/png');
              resolve(base64);
            } catch (e) {
              console.error('Error converting logo:', e);
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = '/images/sports/logo-transparent.png'; // Use transparent logo
        });
      };

      // Helper function to load event logo
      const loadEventLogo = (logoUrl) => {
        if (!logoUrl) return Promise.resolve(null);

        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const base64 = canvas.toDataURL('image/png', 0.8);
              resolve(base64);
            } catch (e) {
              console.error('Error converting event logo:', e);
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = logoUrl;
        });
      };

      // Load logos
      const logoData = await loadLogo();
      const eventLogoData = event?.logo_url ? await loadEventLogo(event.logo_url) : null;

      // Helper function to sleep/delay
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // Helper function to load image as base64 with timeout
      const loadImageAsBase64 = (url, timeout = 5000) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          const timeoutId = setTimeout(() => {
            img.src = ''; // Cancel loading
            resolve(null);
          }, timeout);

          img.onload = () => {
            clearTimeout(timeoutId);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const base64 = canvas.toDataURL('image/jpeg', 0.6);
              resolve(base64);
            } catch (e) {
              console.error('Error converting image:', e);
              resolve(null);
            }
          };

          img.onerror = () => {
            clearTimeout(timeoutId);
            resolve(null);
          };

          img.src = url;
        });
      };

      // Pre-load all images with delays to avoid rate limiting
      const imageCache = {};
      for (let i = 0; i < playersToExport.length; i++) {
        const player = playersToExport[i];
        if (player.photo_url) {
          try {
            // Use smaller image size to reduce load
            const convertedUrl = convertGoogleDriveUrl(player.photo_url).replace('=w400', '=w200');
            const imageData = await loadImageAsBase64(convertedUrl);
            imageCache[player.id] = imageData;

            // Add delay after each image to avoid rate limiting (except last one)
            if (i < playersToExport.length - 1) {
              await sleep(1000); // 1 second delay between each image
            }
          } catch (error) {
            console.error('Error loading image for', player.name, error);
            imageCache[player.id] = null;
          }
        }
      }

      toast.info('Generating PDF...');

      // Function to draw header on each page
      const drawHeader = () => {
        let currentX = margin;

        // Add PowerAuction logo (left side)
        if (logoData) {
          const logoWidth = 18;
          const logoHeight = 14;
          doc.addImage(logoData, 'PNG', currentX, 5, logoWidth, logoHeight);
          currentX += logoWidth + 3;
        }

        // Add event logo (after PowerAuction logo)
        if (eventLogoData) {
          const eventLogoWidth = 16;
          const eventLogoHeight = 14;
          doc.addImage(eventLogoData, 'PNG', currentX, 5, eventLogoWidth, eventLogoHeight);
          currentX += eventLogoWidth + 5;
        }

        // Add titles
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(102, 45, 145); // Purple color
        const mainTitle = event?.name || 'PowerAuction';
        doc.text(mainTitle, currentX, 10, { align: 'left' });

        // Add subtitle
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Player Cards', currentX, 15, { align: 'left' });

        // Add date on the right side
        const dateText = new Date().toLocaleDateString();
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(dateText, pageWidth - margin, 12, { align: 'right' });

        // Add horizontal line below header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, headerHeight - 2, pageWidth - margin, headerHeight - 2);
      };

      // Draw header on first page
      drawHeader();

      for (let i = 0; i < playersToExport.length; i++) {
        const player = playersToExport[i];

        // Calculate position on page
        const cardIndex = i % (cardsPerRow * rowsPerPage);
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;

        // Add new page if needed
        if (i > 0 && cardIndex === 0) {
          doc.addPage();
          drawHeader(); // Add header to new page
        }

        const x = margin + col * (cardWidth + gap);
        const y = marginTop + row * (cardHeight + gap);

        // Card face: dark navy, like the broadcast board (issue #85)
        doc.setFillColor(13, 27, 62);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
        doc.setDrawColor(251, 191, 36);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2);

        // Serial badge, top-left (two digits, e.g. 08)
        const serial = String(serialById.get(player.id) ?? i + 1).padStart(2, '0');
        doc.setFillColor(251, 191, 36);
        doc.roundedRect(x + 2.5, y + 2.5, 11, 6.5, 1.5, 1.5, 'F');
        doc.setTextColor(13, 27, 62);
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'bold');
        doc.text(serial, x + 8, y + 7.2, { align: 'center' });

        // Event label, top-right
        const eventLabel = doc.splitTextToSize(event?.name || 'PowerAuction', 24)[0] || '';
        doc.setTextColor(180, 190, 210);
        doc.setFontSize(6);
        doc.setFont(undefined, 'bold');
        doc.text(eventLabel, x + cardWidth - 2.5, y + 7, { align: 'right' });

        // Player photo
        const photoSize = 26;
        const photoY = y + 11;
        const photoX = x + (cardWidth - photoSize) / 2;

        // Use cached image or draw placeholder
        const imageData = imageCache[player.id];
        if (imageData) {
          doc.addImage(imageData, 'JPEG', photoX, photoY, photoSize, photoSize);
        } else {
          // Draw placeholder circle with initial
          doc.setFillColor(225, 29, 46); // PowerAuction red
          doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text((player.name || '?').charAt(0).toUpperCase(), photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: 'center' });
        }

        // Player name
        let currentY = photoY + photoSize + 5;
        doc.setTextColor(251, 191, 36);
        doc.setFontSize(9.5);
        doc.setFont(undefined, 'bold');
        const nameLines = doc.splitTextToSize(player.name, cardWidth - 2 * cardPadding).slice(0, 2);
        doc.text(nameLines, x + cardWidth / 2, currentY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });
        currentY += nameLines.length * 3.4;

        // Playing role
        if (player.position) {
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(255, 255, 255);
          doc.text(player.position, x + cardWidth / 2, currentY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });
          currentY += 3.2;
        }

        // Batting / bowling style
        if (player.specialty) {
          doc.setFontSize(7);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(180, 190, 210);
          const specialtyLines = doc.splitTextToSize(player.specialty, cardWidth - 2 * cardPadding).slice(0, 2);
          doc.text(specialtyLines, x + cardWidth / 2, currentY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });
          currentY += specialtyLines.length * 2.8;
        }

        // Stats box at the bottom of the card (no phone number on a handout)
        const stats = player.stats || {};
        const statPairs = [];
        if (stats.runs != null || stats.wickets != null) {
          if (stats.runs != null) statPairs.push({ value: String(stats.runs), label: 'RUNS' });
          if (stats.wickets != null) statPairs.push({ value: String(stats.wickets), label: 'WICKETS' });
        } else if (stats.goals != null || stats.assists != null) {
          if (stats.goals != null) statPairs.push({ value: String(stats.goals), label: 'GOALS' });
          if (stats.assists != null) statPairs.push({ value: String(stats.assists), label: 'ASSISTS' });
        }
        const boxH = 13;
        const boxY = y + cardHeight - boxH - 3;
        doc.setFillColor(30, 58, 95);
        doc.roundedRect(x + 3, boxY, cardWidth - 6, boxH, 1.5, 1.5, 'F');
        if (statPairs.length > 0) {
          statPairs.forEach((s, idx) => {
            const cx = x + 3 + ((cardWidth - 6) * (idx + 0.5)) / statPairs.length;
            doc.setTextColor(251, 191, 36);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(s.value, cx, boxY + 5.5, { align: 'center' });
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.setFont(undefined, 'normal');
            doc.text(s.label, cx, boxY + 10, { align: 'center' });
          });
        } else {
          // No stats: show the category instead
          const categoryName = categories.find((c) => c.id === player.category_id)?.name || '';
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont(undefined, 'normal');
          doc.text(categoryName, x + cardWidth / 2, boxY + 8, { align: 'center', maxWidth: cardWidth - 8 });
        }
      }

      // Save the PDF
      const isFiltered = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all';
      const statusText = selectedStatus !== 'all' ? `-${selectedStatus}` : '';
      const fileName = `players${statusText}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      const filterMessage = isFiltered ? ' (filtered results)' : '';
      toast.success(`PDF generated with ${playersToExport.length} players${filterMessage}!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <AppShell title="Players" subtitle={event?.name}>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Players"
          description={event ? `Pool for ${event.name}` : 'Add, edit, and export auction players'}
          actions={
            <>
            <Button
              onClick={generatePlayerCardsPDF}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={players.length === 0}
              title={filteredPlayers.length < players.length ? `Export ${filteredPlayers.length} filtered players` : `Export all ${players.length} players`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF {filteredPlayers.length < players.length && `(${filteredPlayers.length})`}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
              <DialogTrigger asChild>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add player
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlayer ? 'Edit Player' : 'Add New Player'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Fields match this auction’s registration form settings. Category and base price are always required for the auction pool.
                  </p>

                  {/* Auction-only fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category_id || undefined}
                        onValueChange={(value) => handleChange('category_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="base_price">Base price (₹) *</Label>
                      <Input
                        id="base_price"
                        type="number"
                        value={formData.base_price}
                        onChange={(e) => handleChange('base_price', e.target.value)}
                        required
                      />
                      {formData.category_id && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Category base: {getCategoryBasePrice(formData.category_id)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Configured registration fields */}
                  <div className="grid grid-cols-2 gap-4">
                    {activeFormFields.map((field) => renderConfiguredField(field))}
                  </div>

                  {activeFormFields.length === 0 && (
                    <p className="text-sm text-amber-700">
                      No registration fields enabled. Configure them under Auction settings → Registration form.
                    </p>
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </>
          }
        />

        {/* Search and Filter Section */}
        <Card className="glass border-white/15 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                  <Input
                    type="text"
                    placeholder="Search by name, position, or previous team..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="md:w-64">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="md:w-48">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="unsold">Unsold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Results Count */}
            {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <div className="mt-3 text-white/80 text-sm">
                Showing {filteredPlayers.length} of {players.length} players
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Players ({filteredPlayers.length})</span>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
                  Available: {filteredPlayers.filter(p => p.status === 'available').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
                  Current: {filteredPlayers.filter(p => p.status === 'current').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                  On hold: {filteredPlayers.filter(p => p.status === 'on_hold').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                  Sold: {filteredPlayers.filter(p => p.status === 'sold').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span>
                  Unsold: {filteredPlayers.filter(p => p.status === 'unsold').length}
                </div>
                {players.some((p) => p.status === 'unsold') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30"
                    onClick={handleReauctionAllUnsold}
                    title="Put every unsold player back into the auction pool"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Re-auction all unsold
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No players added yet</p>
                <p className="text-white/40 text-sm mt-2">Add players to start the auction</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No players found</p>
                <p className="text-white/40 text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlayers.map((player) => (
                  <Card key={player.id} className="bg-white/10 border-white/20">
                    <CardContent className="p-4">
                      {player.photo_url ? (
                        <div className="flex justify-center mb-4">
                          <div className="relative w-20 h-20">
                            <img
                              src={convertGoogleDriveUrl(player.photo_url)}
                              alt={`${player.name} photo`}
                              className="w-20 h-20 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-white/10 p-1"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Try alternative URL format
                                const fileIdMatch = player.photo_url.match(/id=([a-zA-Z0-9_-]+)/);
                                if (fileIdMatch && !e.target.dataset.retried) {
                                  e.target.dataset.retried = 'true';
                                  e.target.src = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
                                } else if (fileIdMatch && !e.target.dataset.retriedSecond) {
                                  e.target.dataset.retriedSecond = 'true';
                                  e.target.src = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
                                } else {
                                  // Show placeholder
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }
                              }}
                            />
                            <div
                              className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shadow-lg"
                              style={{ display: 'none' }}
                            >
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center mb-4">
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shadow-lg">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className="mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-center flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">{player.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryName(player.category_id)}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              onClick={() => handleEdit(player)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                              onClick={() => handleDelete(player.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-white/80">
                        <div>Base Price: ₹{player.base_price?.toLocaleString()}</div>
                        {player.position && <div>Position: {player.position}</div>}
                        {player.age && <div>Age: {player.age}</div>}
                        {player.previous_team && <div>Previous: {player.previous_team}</div>}
                        {player.contact_number && <div>Mobile: {player.contact_number}</div>}

                        {/* Player Status */}
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            player.status === 'available' ? 'bg-green-400' :
                            player.status === 'sold' ? 'bg-blue-400' :
                            player.status === 'current' ? 'bg-yellow-400' :
                            player.status === 'on_hold' ? 'bg-amber-400' :
                            player.status === 'unsold' ? 'bg-red-400' :
                            'bg-gray-400'
                          }`}></span>
                          {player.status?.replace(/_/g, ' ').toUpperCase()}
                        </div>

                        {/* Current Player Information */}
                        {player.status === 'current' && (
                          <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                            <div className="font-semibold text-yellow-300 mb-2">Currently in Auction:</div>
                            <div>This player is currently being auctioned</div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30"
                                onClick={() => handleMakeAvailable(player)}
                                title="Make player available for future bidding"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Make Available
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* On Hold — skipped without sale */}
                        {player.status === 'on_hold' && (
                          <div className="mt-3 p-3 bg-amber-500/20 border border-amber-400/30 rounded-lg">
                            <div className="font-semibold text-amber-200 mb-2">On Hold</div>
                            <div className="text-white/75 text-xs">
                              Skipped from the block without sale. Can be put back on the block from auction control.
                            </div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30"
                                onClick={() => handleMakeAvailable(player)}
                                title="Mark as available"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Make Available
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Unsold — can be put back into the auction */}
                        {player.status === 'unsold' && (
                          <div className="mt-3 p-3 bg-red-500/15 border border-red-400/30 rounded-lg">
                            <div className="font-semibold text-red-200 mb-2">Unsold</div>
                            <div className="text-white/75 text-xs">
                              No team bought this player. Put them back into the pool to auction again.
                            </div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30"
                                onClick={() => handleReauction(player)}
                                title="Put player back into the auction pool"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Re-auction Player
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Sold Player Information */}
                        {player.status === 'sold' && (
                          <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                            <div className="font-semibold text-blue-300 mb-2">Sold Details:</div>
                            <div>Team: {getTeamName(player.sold_to_team_id)}</div>
                            <div>Sold Price: ₹{player.sold_price?.toLocaleString()}</div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-yellow-500/20 border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/30"
                                onClick={() => handleReleasePlayer(player)}
                                title="Release player back to auction pool"
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Release Player
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default PlayerManagement;
