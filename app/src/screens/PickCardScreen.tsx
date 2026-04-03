import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, RADIUS, SHADOWS, STREAMING_COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { picksAPI, userAPI } from '../api/client';
import { Pick, RootStackParamList, GeneratePicksResponse } from '../types';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.42;

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PickCards'>;
type RouteType = RouteProp<RootStackParamList, 'PickCards'>;

function StreamingBadge({ service }: { service: string }) {
  const color = STREAMING_COLORS[service] || COLORS.card;
  return (
    <View style={[styles.streamingBadge, { borderColor: color + '60', backgroundColor: color + '20' }]}>
      <View style={[styles.streamingDot, { backgroundColor: color }]} />
      <Text style={[styles.streamingText, { color }]}>{service}</Text>
    </View>
  );
}

function DotPagination({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7.5 ? '#4CAF50' : score >= 6.0 ? '#E8C547' : '#F44336';
  return (
    <View style={[styles.scoreBadge, { borderColor: color + '60' }]}>
      <View style={[styles.scoreCircle, { backgroundColor: color }]} />
      <Text style={styles.scoreLabel}>Score:</Text>
      <Text style={[styles.scoreValue, { color }]}>{Math.round(score * 10)}</Text>
    </View>
  );
}

export default function PickCardScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { mood, genre } = route.params;
  const {
    currentPicks, currentPickIndex, advancePick, setCurrentSession,
    addToWatchlist, isInWatchlist, user,
  } = useApp();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<'save' | 'skip' | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const pick = currentPicks[currentPickIndex];
  const isLast = currentPickIndex >= currentPicks.length - 1;
  const inWatchlist = pick ? isInWatchlist(pick.tmdb_id) : false;

  const animateTransition = useCallback((action: 'save' | 'skip', onComplete: () => void) => {
    setActionFeedback(action);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActionFeedback(null);
      fadeAnim.setValue(1);
      onComplete();
    });
  }, [fadeAnim]);

  const handleSave = async () => {
    if (!pick || isSaving || inWatchlist) return;
    setIsSaving(true);
    try {
      await addToWatchlist(pick);
      await userAPI.recordHistory({
        tmdb_id: pick.tmdb_id,
        media_type: pick.media_type,
        title: pick.title,
        action: 'save',
        mood,
        genre,
      });
      animateTransition('save', () => {
        if (!isLast) advancePick();
      });
    } catch {
      Alert.alert('Error', 'Failed to save pick');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!pick) return;
    try {
      await userAPI.recordHistory({
        tmdb_id: pick.tmdb_id,
        media_type: pick.media_type,
        title: pick.title,
        action: 'skip',
        mood,
        genre,
      });
    } catch { /* silent */ }

    animateTransition('skip', () => {
      if (!isLast) advancePick();
    });
  };

  const handleSeenIt = async () => {
    if (!pick) return;
    try {
      await userAPI.recordHistory({
        tmdb_id: pick.tmdb_id,
        media_type: pick.media_type,
        title: pick.title,
        action: 'seen',
        mood,
        genre,
      });
      animateTransition('skip', () => {
        if (!isLast) advancePick();
      });
    } catch {
      Alert.alert('Error', 'Failed to record');
    }
  };

  const handleSevenMore = async () => {
    setIsLoadingMore(true);
    try {
      const res = await picksAPI.generate(mood, genre || undefined);
      const data = res.data as GeneratePicksResponse;
      setCurrentSession(data.picks, data.mood, data.genre || undefined, data.batches_used, data.batches_limit);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string }; status?: number } };
      if (apiErr.response?.status === 429) {
        Alert.alert('Limit Reached', apiErr.response?.data?.message || 'Daily limit reached');
      } else {
        Alert.alert('Error', 'Failed to get more picks');
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (!pick) {
    // All 7 cycled through
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={[COLORS.background, COLORS.backgroundSecondary]} style={StyleSheet.absoluteFill} />
        <View style={styles.endState}>
          <Text style={styles.endTitle}>That's your 7!</Text>
          <Text style={styles.endSubtitle}>You've seen all your picks for this mood.</Text>
          <TouchableOpacity style={styles.endButton} onPress={handleSevenMore} disabled={isLoadingMore}>
            {isLoadingMore ? <ActivityIndicator color="#000" /> : <Text style={styles.endButtonText}>↻ Refresh 7</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.endButtonOutline}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.endButtonOutlineText}>Change Mood</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const runtime = pick.runtime
    ? `${Math.floor(pick.runtime / 60)}h ${pick.runtime % 60}m`
    : null;
  const year = pick.release_date?.split('-')[0];
  const genreStr = pick.genres.slice(0, 2).join(' · ');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.background, COLORS.backgroundSecondary]} style={StyleSheet.absoluteFill} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBack}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          <Text style={styles.navBackText}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.navLogo}>
          <Text style={styles.navLogoNum}>7</Text>
          <Text style={styles.navLogoText}>PICKS</Text>
        </View>
        <TouchableOpacity style={styles.navRight}>
          <Ionicons name="person-circle-outline" size={26} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <Text style={styles.progress}>{currentPickIndex + 1} OF 7 PICKS</Text>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }, SHADOWS.card]}>
          {/* Poster Image */}
          <View style={styles.cardImageContainer}>
            {pick.backdrop_path || pick.poster_path ? (
              <Image
                source={{ uri: pick.backdrop_path || pick.poster_path || '' }}
                style={styles.cardImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Text style={styles.cardImagePlaceholderText}>{pick.title[0]}</Text>
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(13,13,26,0.5)', COLORS.background]}
              style={styles.cardGradient}
            />
            {/* Title overlay */}
            <View style={styles.cardTitleOverlay}>
              <Text style={styles.cardTitle}>{pick.title}</Text>
              {pick.tagline && (
                <Text style={styles.cardTagline}>{pick.tagline.toUpperCase()}</Text>
              )}
            </View>

            {/* Action feedback overlay */}
            {actionFeedback && (
              <View style={[
                styles.actionFeedback,
                actionFeedback === 'save' ? styles.actionFeedbackSave : styles.actionFeedbackSkip
              ]}>
                <Text style={styles.actionFeedbackText}>
                  {actionFeedback === 'save' ? '♥ SAVED' : '✕ SKIPPED'}
                </Text>
              </View>
            )}
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Meta row */}
            <View style={styles.metaRow}>
              {genreStr ? <Text style={styles.metaText}>{genreStr}</Text> : null}
              {(genreStr && runtime) && <Text style={styles.metaDivider}>·</Text>}
              {runtime ? <Text style={styles.metaText}>{runtime}</Text> : null}
              {year && <Text style={styles.metaDivider}>·</Text>}
              {year ? <Text style={styles.metaText}>{year}</Text> : null}
            </View>

            {/* Score */}
            {pick.vote_average > 0 && (
              <View style={styles.scoreRow}>
                <ScoreBadge score={pick.vote_average} />
                <View style={styles.scoreSpacer} />
              </View>
            )}

            {/* Streaming */}
            {pick.streaming_services.length > 0 && (
              <View style={styles.streamingRow}>
                <Text style={styles.streamingLabel}>Streaming on</Text>
                <View style={styles.streamingBadges}>
                  {pick.streaming_services.slice(0, 3).map(s => (
                    <StreamingBadge key={s} service={s} />
                  ))}
                </View>
              </View>
            )}

            {/* Why picked */}
            <View style={styles.whyBox}>
              <Text style={styles.whyLabel}>Why you got this pick:</Text>
              <Text style={styles.whyText}>{pick.why_picked}</Text>
            </View>

            {/* Dot pagination */}
            <DotPagination total={Math.min(currentPicks.length, 7)} current={currentPickIndex} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton, inWatchlist && styles.savedButton]}
          onPress={handleSave}
          disabled={isSaving || inWatchlist}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={inWatchlist ? 'heart' : 'heart-outline'} size={18} color="#fff" />
              <Text style={styles.actionButtonText}>{inWatchlist ? 'SAVED' : 'SAVE'}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.skipButton]} onPress={handleSkip}>
          <Ionicons name="close" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>SKIP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.sevenMoreButton]}
          onPress={handleSevenMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator color={COLORS.accent} size="small" />
          ) : (
            <>
              <Text style={styles.sevenMoreNum}>7</Text>
              <Text style={[styles.actionButtonText, { color: COLORS.accent }]}>MORE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom progress */}
      <Text style={styles.bottomProgress}>{currentPickIndex + 1} OF 7 PICKS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  navLogo: {
    alignItems: 'center',
  },
  navLogoNum: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  navLogoText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 4,
    marginTop: -2,
  },
  navRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  scroll: {
    paddingBottom: 160,
  },
  progress: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  card: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImageContainer: {
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: COLORS.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 80,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  cardTitleOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardTagline: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginTop: 2,
  },
  actionFeedback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionFeedbackSave: {
    backgroundColor: COLORS.save + '60',
  },
  actionFeedbackSkip: {
    backgroundColor: COLORS.skip + '60',
  },
  actionFeedbackText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
  },
  cardContent: {
    padding: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaDivider: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scoreCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  scoreSpacer: { flex: 1 },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  streamingLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  streamingBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  streamingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  streamingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  whyBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  whyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  whyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.textPrimary,
    width: 16,
  },
  dotDone: {
    backgroundColor: COLORS.textMuted,
  },
  actionBar: {
    position: 'absolute',
    bottom: 40,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.pill,
    gap: SPACING.xs,
    borderWidth: 1.5,
    ...SHADOWS.button,
  },
  saveButton: {
    backgroundColor: COLORS.save,
    borderColor: COLORS.save,
  },
  savedButton: {
    backgroundColor: COLORS.saveDim,
    borderColor: COLORS.saveDim,
    opacity: 0.7,
  },
  skipButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  sevenMoreButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.accent + '60',
  },
  sevenMoreNum: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.accent,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  bottomProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
    paddingBottom: 12,
  },
  // End state
  endState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  endTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  endSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  endButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    minWidth: 200,
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  endButtonOutline: {
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 200,
    alignItems: 'center',
  },
  endButtonOutlineText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
