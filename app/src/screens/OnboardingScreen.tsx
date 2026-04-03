import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, RADIUS, STREAMING_SERVICES } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { userAPI } from '../api/client';

const { width } = Dimensions.get('window');

type Step = 'auth' | 'services' | 'taste';

export default function OnboardingScreen() {
  const { login, register, updateStreamingServices, updateTasteProfile } = useApp();

  const [step, setStep] = useState<Step>('auth');
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [pacePreference, setPacePreference] = useState<'slow-burn' | 'fast-paced' | 'balanced'>('balanced');
  const [popularityPref, setPopularityPref] = useState<'mainstream' | 'hidden-gems' | 'mixed'>('mixed');
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);

  const GENRES = ['Thriller', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Documentary', 'Action', 'Animation'];

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
        setStep('services');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServicesNext = async () => {
    setIsLoading(true);
    try {
      await updateStreamingServices(selectedServices);
      setStep('taste');
    } catch {
      Alert.alert('Error', 'Failed to save services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTasteFinish = async () => {
    setIsLoading(true);
    try {
      await updateTasteProfile({
        pacePreference,
        popularityPreference: popularityPref,
        favoriteGenres,
        likedIds: [],
        skippedIds: [],
        seenIds: [],
      });
      // Auth context will navigate automatically
    } catch {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const toggleGenre = (genre: string) => {
    setFavoriteGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0D0D1A', '#141428', '#0D0D1A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo */}
      <View style={styles.logo}>
        <Text style={styles.logoNumber}>7</Text>
        <Text style={styles.logoText}>PICKS</Text>
      </View>

      {step === 'auth' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.authContainer}
        >
          <Text style={styles.stepTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.stepSubtitle}>
            {isLogin ? 'Sign in to your picks' : 'Start your cinematic journey'}
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchAuth}>
            <Text style={styles.switchAuthText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchAuthLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

      {step === 'services' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Where do you stream?</Text>
          <Text style={styles.stepSubtitle}>Select all your services</Text>

          <ScrollView contentContainerStyle={styles.servicesGrid} showsVerticalScrollIndicator={false}>
            {STREAMING_SERVICES.map(service => (
              <TouchableOpacity
                key={service}
                style={[styles.serviceChip, selectedServices.includes(service) && styles.serviceChipSelected]}
                onPress={() => toggleService(service)}
              >
                <Text style={[styles.serviceChipText, selectedServices.includes(service) && styles.serviceChipTextSelected]}>
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.primaryButton} onPress={handleServicesNext} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === 'taste' && (
        <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Your Taste</Text>
          <Text style={styles.stepSubtitle}>Help us curate your picks</Text>

          <Text style={styles.questionLabel}>What's your pace?</Text>
          <View style={styles.optionRow}>
            {(['slow-burn', 'balanced', 'fast-paced'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionChip, pacePreference === opt && styles.optionChipSelected]}
                onPress={() => setPacePreference(opt)}
              >
                <Text style={[styles.optionChipText, pacePreference === opt && styles.optionChipTextSelected]}>
                  {opt === 'slow-burn' ? 'Slow Burn' : opt === 'fast-paced' ? 'Fast Paced' : 'Balanced'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.questionLabel}>Mainstream or hidden gems?</Text>
          <View style={styles.optionRow}>
            {(['mainstream', 'mixed', 'hidden-gems'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionChip, popularityPref === opt && styles.optionChipSelected]}
                onPress={() => setPopularityPref(opt)}
              >
                <Text style={[styles.optionChipText, popularityPref === opt && styles.optionChipTextSelected]}>
                  {opt === 'hidden-gems' ? 'Hidden Gems' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.questionLabel}>Favorite genres (pick any)</Text>
          <View style={styles.genreGrid}>
            {GENRES.map(genre => (
              <TouchableOpacity
                key={genre}
                style={[styles.genreChip, favoriteGenres.includes(genre) && styles.genreChipSelected]}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={[styles.genreChipText, favoriteGenres.includes(genre) && styles.genreChipTextSelected]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleTasteFinish} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Let's Go →</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  logo: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 24,
  },
  logoNumber: {
    fontSize: 80,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -4,
    lineHeight: 80,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 10,
    marginTop: -4,
  },
  authContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  switchAuthText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  switchAuthLink: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  serviceChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  serviceChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  serviceChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  serviceChipTextSelected: {
    color: COLORS.accent,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  optionChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  optionChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: COLORS.accent,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  genreChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  genreChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentGlow,
  },
  genreChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  genreChipTextSelected: {
    color: COLORS.accent,
  },
});
