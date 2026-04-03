import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, RADIUS, MOODS, GENRES } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { picksAPI } from '../api/client';
import { RootStackParamList, GeneratePicksResponse } from '../types';

const { width } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const MOOD_DESCRIPTIONS: Record<string, string> = {
  'Thrilling': 'Edge of your seat',
  'Fun': 'Pure entertainment',
  'Emotional': 'Feel everything',
  'Chill': 'Easy viewing',
  'Mind-Bending': 'Challenge your mind',
  'Feel-Good': 'Lift your spirits',
};

export default function MoodSelectionScreen() {
  const navigation = useNavigation<NavProp>();
  const { setCurrentSession, batchesUsed, batchesLimit, user } = useApp();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedMood) {
      Alert.alert('Pick a Mood', 'Choose how you\'re feeling tonight');
      return;
    }

    setIsLoading(true);
    try {
      const res = await picksAPI.generate(selectedMood, selectedGenre || undefined);
      const data = res.data as GeneratePicksResponse;

      setCurrentSession(
        data.picks,
        data.mood,
        data.genre || undefined,
        data.batches_used,
        data.batches_limit,
      );

      navigation.navigate('PickCards', {
        mood: data.mood,
        genre: data.genre || undefined,
      });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string; message?: string }; status?: number } };
      if (apiErr.response?.status === 429) {
        Alert.alert(
          'Daily Limit Reached',
          apiErr.response?.data?.message || 'You\'ve used all your daily picks. Upgrade to Pro for unlimited.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', apiErr.response?.data?.error || 'Failed to generate picks. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const batches_remaining = batchesLimit ? Math.max(0, batchesLimit - batchesUsed) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundSecondary, COLORS.background]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerNumber}>7</Text>
          <Text style={styles.headerTitle}>PICKS</Text>
        </View>

        {/* Mood Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodScroll}
          >
            {MOODS.map(mood => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodChip,
                  selectedMood === mood.id && styles.moodChipSelected,
                ]}
                onPress={() => setSelectedMood(mood.id)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  selectedMood === mood.id && styles.moodLabelSelected,
                ]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedMood && (
            <Text style={styles.moodDescription}>
              {MOOD_DESCRIPTIONS[selectedMood]}
            </Text>
          )}
        </View>

        {/* Genre Refinement */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NARROW BY GENRE (OPTIONAL)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreScroll}
          >
            {GENRES.map(genre => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.genreChip,
                  selectedGenre === genre && styles.genreChipSelected,
                ]}
                onPress={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
              >
                <Text style={[
                  styles.genreLabel,
                  selectedGenre === genre && styles.genreLabelSelected,
                ]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Streaming info */}
        {user?.streaming_services && user.streaming_services.length > 0 && (
          <View style={styles.servicesInfo}>
            <Text style={styles.servicesInfoText}>
              Searching across: {user.streaming_services.slice(0, 3).join(', ')}
              {user.streaming_services.length > 3 ? ` +${user.streaming_services.length - 3} more` : ''}
            </Text>
          </View>
        )}

        {/* Daily limit indicator */}
        {batches_remaining !== null && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>
              {batches_remaining} {batches_remaining === 1 ? 'batch' : 'batches'} remaining today
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.generateButton, !selectedMood && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isLoading || !selectedMood}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Text style={styles.generateButtonNumber}>7</Text>
              <Text style={styles.generateButtonText}>
                {selectedMood ? `${selectedMood} Picks` : 'Get My 7 Picks'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.tagline}>7 curated picks. No more scrolling.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 32,
  },
  headerNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -3,
    lineHeight: 72,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 10,
    marginTop: -2,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  moodScroll: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  moodChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    minWidth: 90,
  },
  moodChipSelected: {
    borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.textPrimary,
  },
  moodEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  moodLabelSelected: {
    color: COLORS.background,
  },
  moodDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  genreScroll: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  genreChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  genreChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  genreLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  genreLabelSelected: {
    color: COLORS.accent,
  },
  servicesInfo: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  servicesInfoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  limitBadge: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  limitText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  generateButton: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  generateButtonDisabled: {
    opacity: 0.4,
  },
  generateButtonNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
});
