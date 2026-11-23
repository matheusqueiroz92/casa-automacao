import Feather from '@expo/vector-icons/Feather';
import { hasAdminRole } from '@casa/contracts/auth';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing, typography } from '@/theme/tokens';

type AccountUser = {
  email: string;
  name: string;
};

type AccountMenuProps = {
  onManageUsers: () => void;
  onSignOut: () => Promise<void>;
  role: string | null | undefined;
  user: AccountUser;
};

type AccountCardProps = {
  compact: boolean;
  error: string | null;
  onClose: () => void;
  onManageUsers: (() => void) | undefined;
  onSubmitSignOut: () => void;
  pending: boolean;
  user: AccountUser;
};

function initials(name: string): string {
  const names = name.trim().split(/\s+/).filter(Boolean);
  return names.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CA';
}

function AccountCard({
  compact,
  error,
  onClose,
  onManageUsers,
  onSubmitSignOut,
  pending,
  user,
}: AccountCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        compact ? styles.dropdownCard : styles.modalCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      {compact && (
        <View
          style={[
            styles.dropdownPointer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />
      )}

      <View style={[styles.cardHeader, compact && styles.cardHeaderCompact]}>
        <View
          style={[
            styles.identityIcon,
            compact && styles.identityIconCompact,
            { backgroundColor: colors.glow },
          ]}>
          <Feather color={colors.primary} name="user" size={compact ? 17 : 22} />
        </View>

        {compact && (
          <View style={styles.compactIdentity}>
            <Text numberOfLines={1} style={[styles.compactName, { color: colors.text }]}>
              {user.name}
            </Text>
            <Text numberOfLines={1} style={[styles.compactEmail, { color: colors.textMuted }]}>
              {user.email}
            </Text>
          </View>
        )}

        <Pressable
          accessibilityLabel="Fechar menu da conta"
          accessibilityRole="button"
          disabled={pending}
          onPress={onClose}
          style={styles.closeButton}>
          <Feather color={colors.textMuted} name="x" size={compact ? 18 : 21} />
        </Pressable>
      </View>

      {!compact && (
        <>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>CONTA AUTENTICADA</Text>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user.email}</Text>
        </>
      )}

      <View
        style={[
          styles.securityNote,
          compact && styles.securityNoteCompact,
          { backgroundColor: colors.backgroundElevated },
        ]}>
        <Feather color={colors.primary} name="shield" size={compact ? 15 : 17} />
        <View style={styles.securityCopy}>
          <Text style={[styles.securityTitle, { color: colors.text }]}>Sessão protegida</Text>
          {!compact && (
            <Text style={[styles.securityDescription, { color: colors.textSubtle }]}>
              O acesso será encerrado automaticamente quando a sessão expirar.
            </Text>
          )}
        </View>
        {compact && <View style={[styles.secureDot, { backgroundColor: colors.success }]} />}
      </View>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.backgroundElevated }]}>
          <Feather color={colors.danger} name="alert-circle" size={16} />
          <Text accessibilityLiveRegion="polite" style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      )}

      {onManageUsers && (
        <Pressable
          accessibilityLabel="Gerenciar usuários"
          accessibilityRole="button"
          onPress={onManageUsers}
          style={({ pressed }) => [
            styles.manageButton,
            { borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <Feather color={colors.primary} name="users" size={17} />
          <Text style={[styles.manageButtonText, { color: colors.text }]}>Gerenciar usuários</Text>
          <Feather color={colors.textSubtle} name="chevron-right" size={16} />
        </Pressable>
      )}

      <Pressable
        accessibilityLabel="Sair com segurança"
        accessibilityRole="button"
        disabled={pending}
        onPress={onSubmitSignOut}
        style={({ pressed }) => [
          styles.signOutButton,
          compact && styles.signOutButtonCompact,
          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
          (pressed || pending) && styles.pressed,
        ]}>
        {pending ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <Feather color={colors.danger} name="log-out" size={17} />
        )}
        <Text style={[styles.signOutText, { color: colors.danger }]}>
          {pending ? 'Encerrando sessão…' : 'Sair com segurança'}
        </Text>
      </Pressable>
    </View>
  );
}

export function AccountMenu({ onManageUsers, onSignOut, role, user }: AccountMenuProps) {
  const { colors } = useAppTheme();
  const menuRef = useRef<ComponentRef<typeof View>>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  function close() {
    if (!pending) {
      setError(null);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!isWeb || !open || pending || typeof document === 'undefined') return;

    function closeWhenClickingOutside(event: PointerEvent) {
      const root = menuRef.current as unknown as HTMLElement | null;
      if (event.target instanceof Node && root && !root.contains(event.target)) {
        setError(null);
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeWhenClickingOutside);
    return () => document.removeEventListener('pointerdown', closeWhenClickingOutside);
  }, [isWeb, open, pending]);

  async function signOut() {
    setPending(true);
    setError(null);

    try {
      await onSignOut();
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  const accountCard = (
    <AccountCard
      compact={isWeb}
      error={error}
      onClose={close}
      onManageUsers={
        hasAdminRole(role) && onManageUsers
          ? () => {
              close();
              onManageUsers();
            }
          : undefined
      }
      onSubmitSignOut={() => void signOut()}
      pending={pending}
      user={user}
    />
  );

  return (
    <View ref={menuRef} style={styles.menuRoot}>
      <Pressable
        accessibilityLabel="Abrir menu da conta"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.avatar,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{initials(user.name)}</Text>
      </Pressable>

      {isWeb && open && (
        <View accessibilityRole="menu" style={styles.dropdown} testID="account-dropdown">
          {accountCard}
        </View>
      )}

      {!isWeb && (
        <Modal animationType="fade" onRequestClose={close} transparent visible={open}>
          <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>{accountCard}</View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: { fontFamily: typography.bold, fontSize: 12 },
  backdrop: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing[5] },
  card: { borderWidth: 1 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardHeaderCompact: { gap: spacing[3] },
  closeButton: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  compactEmail: { fontFamily: typography.regular, fontSize: 11, marginTop: 2 },
  compactIdentity: { flex: 1, minWidth: 0 },
  compactName: { fontFamily: typography.semibold, fontSize: 14 },
  dropdown: { position: 'absolute', right: 0, top: 52, width: 330, zIndex: 100 },
  dropdownCard: { borderRadius: radius.lg, padding: spacing[4] },
  dropdownPointer: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    height: 12,
    position: 'absolute',
    right: 15,
    top: -7,
    transform: [{ rotate: '45deg' }],
    width: 12,
  },
  email: { fontFamily: typography.regular, fontSize: 13, marginTop: spacing[1] },
  errorBox: { alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', gap: spacing[2], marginTop: spacing[4], padding: spacing[3] },
  errorText: { flex: 1, fontFamily: typography.medium, fontSize: 12, lineHeight: 17 },
  eyebrow: { fontFamily: typography.semibold, fontSize: 10, letterSpacing: 1.5, marginTop: spacing[5] },
  identityIcon: { alignItems: 'center', borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  identityIconCompact: { height: 38, width: 38 },
  manageButton: { alignItems: 'center', borderBottomWidth: 1, borderTopWidth: 1, flexDirection: 'row', gap: spacing[3], marginTop: spacing[4], minHeight: 46, paddingHorizontal: spacing[2] },
  manageButtonText: { flex: 1, fontFamily: typography.medium, fontSize: 13 },
  menuRoot: { position: 'relative', zIndex: 100 },
  modalCard: { borderRadius: radius.xl, maxWidth: 420, padding: spacing[6], width: '100%' },
  name: { fontFamily: typography.semibold, fontSize: 24, marginTop: spacing[2] },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  secureDot: { borderRadius: radius.pill, height: 7, width: 7 },
  securityCopy: { flex: 1 },
  securityDescription: { fontFamily: typography.regular, fontSize: 11, lineHeight: 17, marginTop: spacing[1] },
  securityNote: { alignItems: 'flex-start', borderRadius: radius.md, flexDirection: 'row', gap: spacing[3], marginTop: spacing[5], padding: spacing[4] },
  securityNoteCompact: { alignItems: 'center', marginTop: spacing[4], paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  securityTitle: { fontFamily: typography.semibold, fontSize: 13 },
  signOutButton: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing[2], justifyContent: 'center', marginTop: spacing[5], minHeight: 48, paddingHorizontal: spacing[5] },
  signOutButtonCompact: { borderRadius: radius.md, marginTop: spacing[3], minHeight: 44 },
  signOutText: { fontFamily: typography.semibold, fontSize: 13 },
});
