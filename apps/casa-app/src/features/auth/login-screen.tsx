import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/app-logo';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing, typography } from '@/theme/tokens';

type Credentials = { email: string; password: string };

export function LoginScreen({ signIn }: { signIn: (credentials: Credentials) => Promise<void> }) {
  const { colors, themeName } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha para continuar.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
    } catch {
      setError('Não foi possível entrar. Confira os dados e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[colors.background, colors.backgroundElevated, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbTop, { backgroundColor: colors.glow }]} />
      <View style={[styles.orb, styles.orbBottom, { backgroundColor: colors.glow }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <View style={styles.shell}>
          <View style={styles.intro}>
            <AppLogo style={styles.logo} />
            <View style={[styles.privatePill, { backgroundColor: colors.surfaceMuted }]}> 
              <Feather color={colors.primary} name="shield" size={14} />
              <Text style={[styles.privatePillText, { color: colors.textMuted }]}>ACESSO PRIVADO</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Sua casa, sob o seu controle.</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}> 
              Entre para acompanhar o Mega e executar comandos dentro dos limites seguros do firmware.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <Text style={[styles.cardEyebrow, { color: colors.primary }]}>IDENTIFICAÇÃO</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Acessar automação</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>E-mail</Text>
              <View style={[styles.inputFrame, { borderColor: colors.borderStrong, backgroundColor: colors.backgroundElevated }]}> 
                <Feather color={colors.textSubtle} name="mail" size={18} />
                <TextInput
                  accessibilityLabel="E-mail"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="voce@exemplo.com"
                  placeholderTextColor={colors.textSubtle}
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Senha</Text>
              <View style={[styles.inputFrame, { borderColor: colors.borderStrong, backgroundColor: colors.backgroundElevated }]}> 
                <Feather color={colors.textSubtle} name="lock" size={18} />
                <TextInput
                  accessibilityLabel="Senha"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  onChangeText={setPassword}
                  onSubmitEditing={() => void submit()}
                  placeholder="Sua senha"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry={!passwordVisible}
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setPasswordVisible((current) => !current)}>
                  <Feather color={colors.textSubtle} name={passwordVisible ? 'eye-off' : 'eye'} size={18} />
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.backgroundElevated }]}> 
                <Feather color={colors.danger} name="alert-circle" size={17} />
                <Text accessibilityLiveRegion="polite" style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            )}

            <Pressable
              accessibilityLabel="Entrar"
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: colors.primary },
                (pressed || pending) && styles.submitPressed,
              ]}>
              {pending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={[styles.submitText, { color: colors.onPrimary }]}>Entrar</Text>
                  <Feather color={colors.onPrimary} name="arrow-right" size={18} />
                </>
              )}
            </Pressable>

            <View style={styles.securityNote}>
              <Feather color={colors.success} name="check-circle" size={15} />
              <Text style={[styles.securityText, { color: colors.textSubtle }]}>Sessão protegida e armazenada com segurança neste aparelho</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center' },
  shell: { alignSelf: 'center', maxWidth: 520, padding: spacing[6], width: '100%' },
  intro: { marginBottom: spacing[8] },
  logo: { height: 34, marginBottom: spacing[8], width: 190 },
  privatePill: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4], paddingHorizontal: spacing[3], paddingVertical: 7 },
  privatePillText: { fontFamily: typography.semibold, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: typography.bold, fontSize: 38, letterSpacing: -1.5, lineHeight: 42, maxWidth: 440 },
  subtitle: { fontFamily: typography.regular, fontSize: 16, lineHeight: 24, marginTop: spacing[3], maxWidth: 450 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing[6] },
  cardHeader: { marginBottom: spacing[6] },
  cardEyebrow: { fontFamily: typography.semibold, fontSize: 11, letterSpacing: 1.5, marginBottom: spacing[2] },
  cardTitle: { fontFamily: typography.semibold, fontSize: 24, letterSpacing: -0.5 },
  fieldGroup: { gap: spacing[2], marginBottom: spacing[4] },
  label: { fontFamily: typography.medium, fontSize: 13 },
  inputFrame: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing[3], minHeight: 54, paddingHorizontal: spacing[4] },
  input: { flex: 1, fontFamily: typography.regular, fontSize: 16, minHeight: 52 },
  errorBox: { alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4], padding: spacing[3] },
  errorText: { flex: 1, fontFamily: typography.medium, fontSize: 13, lineHeight: 18 },
  submit: { alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', gap: spacing[3], justifyContent: 'center', minHeight: 54 },
  submitPressed: { opacity: 0.76 },
  submitText: { fontFamily: typography.semibold, fontSize: 15 },
  securityNote: { alignItems: 'center', flexDirection: 'row', gap: spacing[2], justifyContent: 'center', marginTop: spacing[4] },
  securityText: { fontFamily: typography.regular, fontSize: 11, textAlign: 'center' },
  orb: { borderRadius: 999, position: 'absolute' },
  orbTop: { height: 320, right: -130, top: -140, width: 320 },
  orbBottom: { bottom: -170, height: 360, left: -180, width: 360 },
});
