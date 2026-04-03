import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, STREAMING_SERVICES } from '../constants/theme';
import { useApp } from '../context/AppContext';

const GENRES = ['Thriller', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Documentary', 'Action', 'Animation'];

export default function ProfileScreen() {
  const { user, logout, updateStreamingServices, updateTasteProfile, watchlist } = useApp();
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [tempServices, setTempServices] = useState<string[]>(user?.streaming_services || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const toggleService = (service: string) => {
    setTempServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const saveServices = async () => {
    setIsSaving(true);
    try {
      await updateStreamingServices(tempServices);
      setIsEditingServices(false);
    } catch {
      Alert.alert('Error', 'Failed to save services');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePacePreference = async (pref: 'slow-burn' | 'fast-paced' | 'balanced') => {
    try {
      await updateTasteProfile({ pacePreference: pref });
    } catch { /* silent */ }
  };

  const togglePopularityPref = async (pref: 'mainstream' | 'hidden-gems' | 'mixed') => {
    try {
      await updateTasteProfile({ popularityPreference: pref });
    } catch { /* silent */ }
  };

  const tasteProfile = user?.taste_profile;
  const watchedCount = watchlist.filter(i => i.watched).length;
  const savedCount = watchlist.length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.background, COLORS.backgroundSecondary]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={[styles.tierBadge, user?.tier === 'pro' ? styles.tierBadgePro : styles.tierBadgeFree]}>
              <Text style={[styles.tierText, user?.tier === 'pro' ? styles.tierTextPro : styles.tierTextFree]}>
                {user?.tier === 'pro' ? '7 PICKS PRO' : 'FREE TIER'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{savedCount}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{watchedCount}</Text>
            <Text style={styles.statLabel}>Watched</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{tasteProfile?.likedIds?.length || 0}</Text>
            <Text style={styles.statLabel}>Liked</Text>
          </View>
        </View>

        {/* Upgrade CTA (free only) */}
        {user?.tier === 'free' && (
          <TouchableOpacity style={styles.upgradeBanner}>
            <LinearGradient
              colors={[COLORS.accent + '30', COLORS.accent + '10']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View>
              <Text style={styles.upgradeTitle}>Upgrade to 7 Picks Pro</Text>
              <Text style={styles.upgradeSubtitle}>Unlimited picks · TV shows · Hidden gems mode</Text>
            </View>
            <Text style={styles.upgradePrice}>$4.99/mo</Text>
          </TouchableOpacity>
        )}

        {/* Streaming Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Streaming Services</Text>
            <TouchableOpacity
              onPress={() => isEditingServices ? saveServices() : setIsEditingServices(true)}
              disabled={isSaving}
            >
              <Text style={styles.sectionAction}>
                {isEditingServices ? (isSaving ? 'Saving...' : 'Done') : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipGrid}>
            {STREAMING_SERVICES.map(service => {
              const active = isEditingServices
                ? tempServices.includes(service)
                : user?.streaming_services.includes(service);
              return (
                <TouchableOpacity
                  key={service}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => isEditingServices && toggleService(service)}
                  disabled={!isEditingServices}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {service}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Taste Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taste Preferences</Text>

          <Text style={styles.prefLabel}>Pace</Text>
          <View style={styles.optRow}>
            {(['slow-burn', 'balanced', 'fast-paced'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optChip, tasteProfile?.pacePreference === opt && styles.optChipActive]}
                onPress={() => togglePacePreference(opt)}
              >
                <Text style={[styles.optChipText, tasteProfile?.pacePreference === opt && styles.optChipTextActive]}>
                  {opt === 'slow-burn' ? 'Slow Burn' : opt === 'fast-paced' ? 'Fast Paced' : 'Balanced'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.prefLabel}>Discovery</Text>
          <View style={styles.optRow}>
            {(['mainstream', 'mixed', 'hidden-gems'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optChip, tasteProfile?.popularityPreference === opt && styles.optChipActive]}
                onPress={() => togglePopularityPref(opt)}
              >
                <Text style={[styles.optChipText, tasteProfile?.popularityPreference === opt && styles.optChipTextActive]}>
                  {opt === 'hidden-gems' ? 'Hidden Gems' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.accountRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={[styles.accountRowText, { color: COLORS.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>7 Picks v1.0 • Streaming Edition</Text>
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
    paddingBottom: 100,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  email: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tierBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  tierBadgeFree: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tierBadgePro: {
    backgroundColor: COLORS.accentGlow,
    borderWidth: 1,
    borderColor: COLORS.accent + '60',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tierTextFree: {
    color: COLORS.textMuted,
  },
  tierTextPro: {
    color: COLORS.accent,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  upgradeBanner: {
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    overflow: 'hidden',
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 2,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  upgradePrice: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.accent,
  },
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  optRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  optChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  optChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  optChipTextActive: {
    color: COLORS.accent,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountRowText: {
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
});
