/**
 * Draws - Page principale des Lectures Oracle (MVP)
 * 
 * LOGIQUE MVP:
 * - Niveau 1 (Initié): GRATUIT (0€), PDF uniquement
 * - Niveau 2 (Mystique): 47€, PDF + Audio
 * - Niveau 3 (Profond): 67€, PDF + Audio + Mandala
 * - Niveau 4 (Intégral): GRISÉ "Bientôt disponible"
 * 
 * FEATURES:
 * - Grille d'assets avec états (Disponible/Verrouillé/En cours)
 * - Cartes d'upgrade contextuelles (N1→2/3, N2→3, N3→aucune)
 * - Messages clairs pour chaque état
 * - Zero friction, zero pression commerciale
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Headphones, Image as ImageIcon, Lock, Download, 
  Play, Eye, Calendar, Sparkles, Star, ArrowRight, Check,
  Clock, AlertCircle, Crown, Zap, Award, Home, Menu, ChevronRight, User
} from 'lucide-react';
import { useSanctuaire } from '../../contexts/SanctuaireContext';
import GlassCard from '../ui/GlassCard';
import DrawsWaiting from '../sanctuaire/DrawsWaiting';
import { AudioPlayerProvider, useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { sanctuaireService } from '../../services/sanctuaire';
import AssetsModal from '../sanctuaire/AssetsModal';
import { getLevelNameSafely } from '../../utils/orderUtils';

// =================== TYPES ===================

interface Lecture {
  id: string;
  orderNumber: string;
  title: string;
  createdAt: string;
  deliveredAt?: string;
  level: number;
  levelName: string;
  pdfUrl?: string;
  audioUrl?: string;
  mandalaSvg?: string;
  reading?: string;
}

interface Asset {
  id: string;
  name: string;
  icon: React.ReactNode;
  available: boolean;
  url?: string;
  type: 'pdf' | 'audio' | 'mandala' | 'ritual';
  lockedMessage?: string;
  requiredLevel?: number;
}

interface UpgradeOption {
  level: number;
  name: string;
  price: string;
  features: string[];
  ctaText: string;
  isComingSoon?: boolean;
}

// =================== CONFIGURATION NIVEAUX ===================

const LEVEL_CONFIG = {
  1: {
    name: 'Initié',
    color: { bg: 'from-blue-400/10 to-blue-500/5', text: 'text-blue-400', border: 'border-blue-400/30' },
    assets: ['pdf'],
    upgrades: [2, 3], // Peut upgrader vers 2 et 3
  },
  2: {
    name: 'Mystique',
    color: { bg: 'from-purple-400/10 to-purple-500/5', text: 'text-purple-400', border: 'border-purple-400/30' },
    assets: ['pdf', 'audio'],
    upgrades: [3], // Peut upgrader vers 3 uniquement
  },
  3: {
    name: 'Profond',
    color: { bg: 'from-amber-400/10 to-amber-500/5', text: 'text-amber-400', border: 'border-amber-400/30' },
    assets: ['pdf', 'audio', 'mandala'],
    upgrades: [], // Aucun upgrade (niveau 4 bientôt disponible)
  },
  4: {
    name: 'Intégral',
    color: { bg: 'from-emerald-400/10 to-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-400/30' },
    assets: ['pdf', 'audio', 'mandala', 'ritual'],
    upgrades: [],
  },
};

const UPGRADE_OPTIONS: Record<number, UpgradeOption> = {
  2: {
    level: 2,
    name: 'Niveau Mystique',
    price: '47€',
    features: [
      'Lecture PDF complète',
      'Lecture Audio (voix sacrée)',
      'Guidance approfondie',
      'Support prioritaire',
    ],
    ctaText: 'Débloquer le niveau Mystique',
  },
  3: {
    level: 3,
    name: 'Niveau Profond',
    price: '67€',
    features: [
      'Tout le contenu Mystique',
      'Mandala personnalisé HD',
      'Support visuel pour méditation',
      'Guide d\'activation du Mandala',
    ],
    ctaText: 'Débloquer le niveau Profond',
  },
  4: {
    level: 4,
    name: 'Niveau Intégral',
    price: 'Bientôt',
    features: [
      'Tout le contenu Profond',
      'Rituels personnalisés audio/vidéo',
      'Protocoles d\'activation',
      'Suivi personnalisé 30 jours',
    ],
    ctaText: 'Bientôt disponible',
    isComingSoon: true,
  },
};

// =================== COMPOSANT PRINCIPAL ===================

const DrawsContent: React.FC = () => {
  const navigate = useNavigate();
  const { orders, isLoading, user, levelMetadata } = useSanctuaire();
  const { play, setTrack } = useAudioPlayer();
  
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<{ 
    open: boolean; 
    pdfUrl?: string; 
    mandalaSvg?: string; 
    title?: string 
  }>({ open: false });
  
  // PHASE 2 - P2 : Récupération dynamique des formats disponibles depuis le backend
  const [orderContent, setOrderContent] = useState<{
    availableFormats?: {
      hasPdf: boolean;
      hasAudio: boolean;
      hasMandala: boolean;
      hasRitual: boolean;
    };
  }>({});

  // Mapper les orders vers le format Lecture
  useEffect(() => {
    if (orders && orders.length > 0) {
      const mapped: Lecture[] = orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        title: order.formData?.specificQuestion || order.formData?.firstName || 'Lecture spirituelle',
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        level: order.level,
        levelName: getLevelNameSafely(order.level),
        pdfUrl: order.generatedContent?.pdfUrl,
        audioUrl: order.generatedContent?.audioUrl,
        mandalaSvg: order.generatedContent?.mandalaSvg,
        reading: order.generatedContent?.reading,
      }));
      
      // Trier par date de livraison (plus récent en premier)
      const sorted = mapped.sort((a, b) => {
        const dateA = new Date(a.deliveredAt || a.createdAt).getTime();
        const dateB = new Date(b.deliveredAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setLectures(sorted);
      
      // Sélectionner la première lecture par défaut
      if (sorted.length > 0 && !selectedLecture) {
        setSelectedLecture(sorted[0]);
      }
    }
  }, [orders]);
  
  // PHASE 2 - P2 : Charger les formats disponibles de la lecture sélectionnée
  useEffect(() => {
    const loadOrderContent = async () => {
      if (!selectedLecture || !selectedLecture.deliveredAt) {
        // Si la lecture n'est pas encore livrée, on ne récupère pas le contenu
        setOrderContent({});
        return;
      }
      
      try {
        const content = await sanctuaireService.getOrderContent(selectedLecture.id);
        setOrderContent({ availableFormats: content.availableFormats });
      } catch (err) {
        console.error('[Draws] Erreur chargement contenu:', err);
        // Fallback sur les données locales de l'order
        setOrderContent({});
      }
    };
    
    loadOrderContent();
  }, [selectedLecture]);

  // =================== SKELETON LOADING ===================

  const levelName = (levelMetadata?.name as string) || 'Initié';
  const levelColor = (levelMetadata?.color as string) || 'amber';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mystical-950 via-mystical-900 to-mystical-950">
        <div className="space-y-6 max-w-6xl mx-auto p-6">
        <div className="h-8 w-48 bg-amber-400/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GlassCard className="p-6">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white/10 rounded-lg animate-pulse" />
                ))}
              </div>
            </GlassCard>
          </div>
          <div>
            <GlassCard className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-white/10 rounded-lg animate-pulse" />
                ))}
              </div>
            </GlassCard>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // =================== EMPTY STATE ===================

  if (!lectures || lectures.length === 0) {
    return (
      <DrawsWaiting
        userEmail={user?.email}
        userPhone={user?.phone}
        estimatedTime="24 heures"
      />
    );
  }

  // =================== RENDU PRINCIPAL ===================

  return (
    <div className="min-h-screen bg-gradient-to-br from-mystical-950 via-mystical-900 to-mystical-950">
      {/* Bouton Menu Mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all shadow-xl"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(sidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-screen w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 z-40 overflow-y-auto"
          >
            {/* Header Sidebar */}
            <div className="p-6 border-b border-white/10">
              <button
                onClick={() => navigate('/sanctuaire')}
                className="flex items-center gap-3 text-white/80 hover:text-white transition-all group w-full"
              >
                <div className="p-2 bg-amber-400/10 rounded-lg group-hover:bg-amber-400/20 transition-all">
                  <Home className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Retour au</p>
                  <p className="text-xs text-white/60">Sanctuaire</p>
                </div>
              </button>
            </div>

            {/* Profil Résumé */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-amber-400/20 to-purple-400/20 rounded-full">
                  <User className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {user?.firstName || 'Client'} {user?.lastName || 'Oracle'}
                  </p>
                  <p className="text-xs text-white/60 truncate">{user?.email}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-${levelColor}-400/10 to-purple-400/10 rounded-lg border border-${levelColor}-400/20`}>
                <Award className={`w-4 h-4 text-${levelColor}-400`} />
                <span className="text-sm text-white/80">{levelName}</span>
              </div>
            </div>

            {/* Liste des lectures */}
            <div className="p-4">
              <p className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Mes Lectures
              </p>
              <div className="space-y-2 mt-2">
                {lectures.map((lecture) => (
                  <button
                    key={lecture.id}
                    onClick={() => {
                      setSelectedLecture(lecture);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedLecture?.id === lecture.id
                        ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">
                          {lecture.title}
                        </div>
                        <div className="text-xs text-white/60 mt-1 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(lecture.deliveredAt || lecture.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      {selectedLecture?.id === lecture.id && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Quick */}
            <div className="p-4 mt-auto border-t border-white/10">
              <button
                onClick={() => navigate('/commande')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Nouvelle lecture</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}

      {/* Contenu Principal */}
      <div className="lg:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header aligné Profil */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className={`w-6 h-6 text-${levelColor}-400`} />
              <h1 className="text-3xl font-bold text-white">Mes Lectures</h1>
            </div>
            <p className="text-white/60">
              Niveau actuel : <span className={`text-${levelColor}-400 font-medium`}>{levelName}</span>
            </p>
          </div>

          {/* Layout principal - Changement: une seule colonne car sidebar gère la liste */}
          <div className="space-y-6">
            {/* Assets de la lecture sélectionnée - Maintenant en pleine largeur */}
            {selectedLecture && (
            <LectureAssets
              lecture={selectedLecture}
              availableFormats={orderContent.availableFormats}
              onOpenPdf={async (pdfUrl: string, title: string) => {
                try {
                  const signed = await sanctuaireService.getPresignedUrl(pdfUrl);
                  setModal({ open: true, pdfUrl: signed, title });
                } catch (err) {
                  console.error('[Draws] Erreur PDF:', err);
                }
              }}
              onPlayAudio={async (audioUrl: string, title: string) => {
                try {
                  const signed = await sanctuaireService.getPresignedUrl(audioUrl);
                  setTrack({ url: signed, title });
                  play({ url: signed, title });
                } catch (err) {
                  console.error('[Draws] Erreur Audio:', err);
                }
              }}
              onOpenMandala={async (mandalaSvg: string, title: string) => {
                try {
                  const signed = await sanctuaireService.getPresignedUrl(mandalaSvg);
                  setModal({ open: true, mandalaSvg: signed, title });
                } catch (err) {
                  console.error('[Draws] Erreur Mandala:', err);
                }
              }}
            />
            )}

            {/* Section Upgrades */}
            {selectedLecture && (
              <UpgradeSection level={selectedLecture.level} />
            )}

            {/* Modal pour PDF et Mandala */}
            {modal.open && (
              <AssetsModal
                open={modal.open}
                onClose={() => setModal({ open: false })}
                pdfUrl={modal.pdfUrl}
                mandalaSvg={modal.mandalaSvg}
                title={modal.title}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== COMPOSANT: ASSETS D'UNE LECTURE ===================

interface LectureAssetsProps {
  lecture: Lecture;
  onOpenPdf: (pdfUrl: string, title: string) => void;
  onPlayAudio: (audioUrl: string, title: string) => void;
  onOpenMandala: (mandalaSvg: string, title: string) => void;
}

interface LectureAssetsPropsEnhanced extends LectureAssetsProps {
  availableFormats?: {
    hasPdf: boolean;
    hasAudio: boolean;
    hasMandala: boolean;
    hasRitual: boolean;
  };
}

const LectureAssets: React.FC<LectureAssetsPropsEnhanced> = ({
  lecture,
  onOpenPdf,
  onPlayAudio,
  onOpenMandala,
  availableFormats
}) => {
  const levelConfig = LEVEL_CONFIG[lecture.level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];
  const availableAssets = levelConfig.assets;

  // PHASE 2 - P2 : Logique hybride - utiliser availableFormats du backend si disponible, sinon fallback sur levelConfig
  const isPdfAvailable = availableFormats?.hasPdf ?? (availableAssets.includes('pdf') && !!lecture.pdfUrl);
  const isAudioAvailable = availableFormats?.hasAudio ?? (availableAssets.includes('audio') && !!lecture.audioUrl);
  const isMandalaAvailable = availableFormats?.hasMandala ?? (availableAssets.includes('mandala') && !!lecture.mandalaSvg);
  const isRitualAvailable = availableFormats?.hasRitual ?? false;

  // Construire la liste des assets
  const assets: Asset[] = [
    {
      id: 'pdf',
      name: 'Lecture PDF',
      icon: <FileText className="w-5 h-5" />,
      available: isPdfAvailable,
      url: lecture.pdfUrl,
      type: 'pdf',
      lockedMessage: 'Disponible dès le niveau Initié',
      requiredLevel: 1,
    },
    {
      id: 'audio',
      name: 'Lecture Audio',
      icon: <Headphones className="w-5 h-5" />,
      available: isAudioAvailable,
      url: lecture.audioUrl,
      type: 'audio',
      lockedMessage: 'Débloqué au niveau Mystique',
      requiredLevel: 2,
    },
    {
      id: 'mandala',
      name: 'Mandala HD',
      icon: <ImageIcon className="w-5 h-5" />,
      available: isMandalaAvailable,
      url: lecture.mandalaSvg,
      type: 'mandala',
      lockedMessage: 'Débloqué au niveau Profond',
      requiredLevel: 3,
    },
    {
      id: 'ritual',
      name: 'Rituels personnalisés',
      icon: <Sparkles className="w-5 h-5" />,
      available: isRitualAvailable,
      url: undefined,
      type: 'ritual',
      lockedMessage: 'Bientôt disponible (Niveau Intégral)',
      requiredLevel: 4,
    },
  ];

  return (
    <GlassCard className={`bg-gradient-to-br ${levelConfig.color.bg} border ${levelConfig.color.border}`}>
      <div className="p-6 space-y-6">
        
        {/* En-tête */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`text-xl font-semibold ${levelConfig.color.text} mb-2`}>
              {lecture.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(lecture.deliveredAt || lecture.createdAt).toLocaleDateString('fr-FR')}
              </div>
              <div className="text-xs text-white/40">
                #{lecture.orderNumber}
              </div>
            </div>
          </div>

          {/* Badge niveau */}
          <div className={`px-3 py-1 rounded-full ${levelConfig.color.bg} border ${levelConfig.color.border}`}>
            <div className="flex items-center gap-1">
              <Star className={`w-4 h-4 ${levelConfig.color.text}`} />
              <span className={`text-sm font-medium ${levelConfig.color.text}`}>
                {levelConfig.name}
              </span>
            </div>
          </div>
        </div>

        {/* Grille d'assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              onOpen={() => {
                if (!asset.available || !asset.url) return;
                
                if (asset.type === 'pdf') onOpenPdf(asset.url, lecture.title);
                if (asset.type === 'audio') onPlayAudio(asset.url, lecture.title);
                if (asset.type === 'mandala') onOpenMandala(asset.url, lecture.title);
              }}
            />
          ))}
        </div>

        {/* Statut de la lecture */}
        {lecture.deliveredAt ? (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/30 rounded-lg p-3">
            <Check className="w-4 h-4" />
            <span>Lecture livrée le {new Date(lecture.deliveredAt).toLocaleDateString('fr-FR')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg p-3">
            <Clock className="w-4 h-4 animate-spin" />
            <div>
              <div>Lecture en cours de préparation</div>
              <div className="text-xs text-white/60 mt-1">
                Vous serez notifié par email dès qu'elle sera prête
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// =================== COMPOSANT: TUILE ASSET ===================

interface AssetTileProps {
  asset: Asset;
  onOpen: () => void;
}

const AssetTile: React.FC<AssetTileProps> = ({ asset, onOpen }) => {
  const isReady = asset.available && asset.url;
  const isLocked = !asset.available;
  const isInProgress = asset.available && !asset.url;

  return (
    <motion.button
      whileHover={isReady ? { scale: 1.02 } : {}}
      whileTap={isReady ? { scale: 0.98 } : {}}
      onClick={isReady ? onOpen : undefined}
      disabled={!isReady}
      className={`p-4 rounded-xl border transition-all text-left ${
        isReady
          ? 'bg-white/10 border-white/20 hover:bg-white/20 cursor-pointer'
          : isLocked
          ? 'bg-gray-600/20 border-gray-600/30 cursor-not-allowed'
          : 'bg-amber-400/10 border-amber-400/30 cursor-wait'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          isReady ? 'bg-amber-400/20 text-amber-400' :
          isLocked ? 'bg-gray-600/20 text-gray-400' :
          'bg-amber-400/20 text-amber-400'
        }`}>
          {isLocked ? <Lock className="w-5 h-5" /> : asset.icon}
        </div>

        <div className="flex-1">
          <div className={`font-medium ${isLocked ? 'text-gray-400' : 'text-white'}`}>
            {asset.name}
          </div>
          
          {isReady && (
            <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
              <Check className="w-3 h-3" />
              Disponible
            </div>
          )}
          
          {isLocked && (
            <div className="text-xs text-gray-400 mt-1">
              {asset.lockedMessage}
            </div>
          )}
          
          {isInProgress && (
            <div className="text-xs text-amber-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 animate-spin" />
              En cours...
            </div>
          )}
        </div>

        {isReady && (
          <div className="text-amber-400">
            {asset.type === 'pdf' && <Eye className="w-5 h-5" />}
            {asset.type === 'audio' && <Play className="w-5 h-5" />}
            {asset.type === 'mandala' && <Eye className="w-5 h-5" />}
          </div>
        )}
      </div>
    </motion.button>
  );
};

// =================== COMPOSANT: SECTION UPGRADES ===================

interface UpgradeSectionProps {
  level: number;
}

const UpgradeSection: React.FC<UpgradeSectionProps> = ({ level }) => {
  const navigate = useNavigate();
  const levelConfig = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];
  const availableUpgrades = levelConfig.upgrades;

  // Toujours afficher niveau 4 (grisé)
  const upgradeOptions = [...availableUpgrades, 4];

  if (upgradeOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white/80">Débloquez plus de ressources</h3>
      
      {upgradeOptions.map((upgradeLevel) => {
        const option = UPGRADE_OPTIONS[upgradeLevel];
        if (!option) return null;

        const isComingSoon = option.isComingSoon;

        return (
          <motion.div
            key={upgradeLevel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: upgradeLevel * 0.1 }}
          >
            <GlassCard className={`${
              isComingSoon 
                ? 'bg-gray-600/20 border-gray-600/30' 
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-400/30 transition-all'
            }`}>
              <div className="p-4 space-y-3">
                
                {/* En-tête */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isComingSoon ? (
                      <div className="p-2 rounded-lg bg-gray-600/20">
                        <Crown className="w-4 h-4 text-gray-400" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-500/10">
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <div className={`font-semibold ${isComingSoon ? 'text-gray-400' : 'text-white'}`}>
                        {option.name}
                      </div>
                      <div className={`text-xs ${isComingSoon ? 'text-gray-500' : 'text-white/60'}`}>
                        {option.price}
                      </div>
                    </div>
                  </div>

                  {isComingSoon && (
                    <div className="px-2 py-1 rounded-full bg-gray-600/30 border border-gray-600/50">
                      <span className="text-xs text-gray-400">Bientôt</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-1">
                  {option.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className={`text-xs flex items-start gap-2 ${isComingSoon ? 'text-gray-500' : 'text-white/70'}`}>
                      <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => !isComingSoon && navigate('/commande')}
                  disabled={isComingSoon}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    isComingSoon
                      ? 'bg-gray-600/30 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-400/20 to-amber-500/10 text-amber-400 border border-amber-400/30 hover:from-amber-400/30 hover:to-amber-500/20'
                  }`}
                >
                  {option.ctaText}
                  {!isComingSoon && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
};

// =================== WRAPPER AVEC AUDIO PROVIDER ===================

const Draws: React.FC = () => (
  <AudioPlayerProvider>
    <DrawsContent />
  </AudioPlayerProvider>
);

export default Draws;
