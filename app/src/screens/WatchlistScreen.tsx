import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, STREAMING_COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { WatchlistItem } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.xl * 2 - SPACING.md) / 2;

function WatchlistCard({ item, onRemove, onToggleWatched }: {
  item: WatchlistItem;
  onRemove: () => void;
  onToggleWatched: () => void;
}) {
  return (
    <View style={[styles.card, SHADOWS.card, item.watched && styles.cardWatched]}>
      {item.poster_path ? (
        <Image
          source={{ uri: item.poster_path }}
          style={styles.cardPoster}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.cardPoster, styles.cardPosterPlaceholder]}>
          <Text style={styles.cardPosterInitial}>{item.title[0]}</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(13,13,26,0.95)']}
        style={styles.cardGradient}
      />

      {/* Watched badge */}
      {item.watched && (
        <View style={styles.watchedBadge}>
          <Ionicons name="checkmark" size={10} color="#fff" />
          <Text style={styles.watchedText}>SEEN</Text>
        </View>
      )}

      {/* Streaming badge */}
      {item.streaming_services.length > 0 && (
        <View style={[
          styles.streamingBadge,
          { borderColor: (STREAMING_COLORS[item.streaming_services[0]] || COLORS.accent) + '80' }
        ]}>
          <Text style={[
            styles.streamingText,
            { color: STREAMING_COLORS[item.streaming_services[0]] || COLORS.accent }
          ]}>
            {item.streaming_services[0]}
          </Text>
        </View>
      )}

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.vote_average ? (
          <Text style={styles.cardScore}>★ {item.vote_average.toFixed(1)}</Text>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardAction} onPress={onToggleWatched}>
          <Ionicons
            name={item.watched ? 'eye' : 'eye-outline'}
            size={16}
            color={item.watched ? COLORS.accent : COLORS.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardAction} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WatchlistScreen() {
  const { watchlist, removeFromWatchlist, markWatched, refreshWatchlist } = useApp();
  const [filter, setFilter] = useState<'all' | 'unwatched' | 'watched'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = watchlist.filter(item => {
    if (filter === 'unwatched') return !item.watched;
    if (filter === 'watched') return item.watched;
    return true;
  });

  const handleRemove = (item: WatchlistItem) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromWatchlist(item.id) },
      ]
    );
  };

  const handleToggleWatched = async (item: WatchlistItem) => {
    await markWatched(item.id, !item.watched);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWatchlist();
    setIsRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.background, COLORS.backgroundSecondary]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SAVED</Text>
        <Text style={styles.headerCount}>{watchlist.length} picks</Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'unwatched', 'watched'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'unwatched' ? 'To Watch' : 'Watched'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>
            {filter === 'all' ? 'No saves yet' : filter === 'watched' ? 'Nothing watched yet' : 'Nothing to watch'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all' ? 'Save picks from your sessions here' : 'Mark items as watched to see them here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
          renderItem={({ item }) => (
            <WatchlistCard
              item={item}
              onRemove={() => handleRemove(item)}
              onToggleWatched={() => handleToggleWatched(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  headerCount: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.accent,
  },
  grid: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 100,
  },
  gridRow: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    position: 'relative',
  },
  cardWatched: {
    opacity: 0.6,
  },
  cardPoster: {
    width: '100%',
    height: '100%',
  },
  cardPosterPlaceholder: {
    backgroundColor: COLORS.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPosterInitial: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  watchedBadge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  watchedText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  streamingBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  streamingText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 32,
    left: SPACING.sm,
    right: SPACING.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  cardScore: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  cardActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(13,13,26,0.8)',
  },
  cardAction: {
    padding: SPACING.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
