import Feather from '@expo/vector-icons/Feather';
import { AUTH_ROLES, hasAdminRole, type AuthRole } from '@casa/contracts/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type CreateManagedUserInput,
  type ManagedUser,
  useAdminUsers,
} from '@/features/users/use-admin-users';
import { adminUsersGateway } from '@/infrastructure/auth/admin-users-gateway';
import { authClient } from '@/infrastructure/auth/auth-client';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing, typography } from '@/theme/tokens';

function roleLabel(role: AuthRole): string {
  return role === AUTH_ROLES.admin ? 'Administrador' : 'Morador';
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return `Criado em ${new Intl.DateTimeFormat('pt-BR').format(date)}`;
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.centerState}>
      <View style={[styles.stateIcon, { backgroundColor: colors.glow }]}> 
        <Feather color={colors.primary} name="shield" size={26} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.text }]}>Acesso administrativo</Text>
      <Text style={[styles.stateDescription, { color: colors.textMuted }]}> 
        Somente administradores podem criar usuários ou alterar permissões.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
        <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Voltar ao painel</Text>
      </Pressable>
    </View>
  );
}

function CreateUserModal({
  error,
  onClose,
  onCreate,
  pending,
  visible,
}: {
  error: string | null;
  onClose: () => void;
  onCreate: (input: CreateManagedUserInput) => Promise<boolean>;
  pending: boolean;
  visible: boolean;
}) {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AuthRole>(AUTH_ROLES.user);
  const [validationError, setValidationError] = useState<string | null>(null);

  function close() {
    if (!pending) {
      setValidationError(null);
      onClose();
    }
  }

  async function submit() {
    if (!name.trim() || !email.trim() || password.length < 12) {
      setValidationError('Informe nome, e-mail e uma senha com pelo menos 12 caracteres.');
      return;
    }

    setValidationError(null);
    const created = await onCreate({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password,
      role,
    });

    if (created) {
      setEmail('');
      setName('');
      setPassword('');
      setRole(AUTH_ROLES.user);
      onClose();
    }
  }

  const currentError = validationError ?? error;

  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>NOVA CONTA</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar morador</Text>
            </View>
            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              disabled={pending}
              onPress={close}
              style={styles.iconButton}>
              <Feather color={colors.textMuted} name="x" size={21} />
            </Pressable>
          </View>

          <TextInput
            accessibilityLabel="Nome do usuário"
            onChangeText={setName}
            placeholder="Nome completo"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.text }]}
            value={name}
          />
          <TextInput
            accessibilityLabel="E-mail do usuário"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.text }]}
            value={email}
          />
          <TextInput
            accessibilityLabel="Senha inicial"
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Senha inicial (mínimo 12 caracteres)"
            placeholderTextColor={colors.textSubtle}
            secureTextEntry
            style={[styles.input, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, color: colors.text }]}
            value={password}
          />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Permissão inicial</Text>
          <View style={styles.roleSelector}>
            {[AUTH_ROLES.user, AUTH_ROLES.admin].map((item) => {
              const selected = role === item;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setRole(item)}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: selected ? colors.glow : colors.backgroundElevated,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}>
                  <Feather color={selected ? colors.primary : colors.textMuted} name={item === AUTH_ROLES.admin ? 'shield' : 'home'} size={16} />
                  <Text style={[styles.roleOptionText, { color: selected ? colors.text : colors.textMuted }]}>
                    {roleLabel(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {currentError && (
            <View style={[styles.errorBox, { backgroundColor: colors.backgroundElevated }]}> 
              <Feather color={colors.danger} name="alert-circle" size={16} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{currentError}</Text>
            </View>
          )}

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={close}
              style={[styles.secondaryButton, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void submit()}
              style={[styles.primaryButton, { backgroundColor: colors.primary }, pending && styles.disabled]}>
              {pending ? <ActivityIndicator color={colors.onPrimary} /> : <Feather color={colors.onPrimary} name="user-plus" size={17} />}
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Criar usuário</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function UserCard({
  currentUserId,
  mutationPending,
  onSetRole,
  user,
}: {
  currentUserId: string;
  mutationPending: boolean;
  onSetRole: (userId: string, role: AuthRole) => Promise<boolean>;
  user: ManagedUser;
}) {
  const { colors } = useAppTheme();
  const isCurrentUser = user.id === currentUserId;
  const nextRole = user.role === AUTH_ROLES.admin ? AUTH_ROLES.user : AUTH_ROLES.admin;

  return (
    <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={[styles.userAvatar, { backgroundColor: colors.glow }]}> 
        <Text style={[styles.userAvatarText, { color: colors.primary }]}>
          {user.name.trim().slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userCopy}>
        <View style={styles.userNameRow}>
          <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
          {isCurrentUser && <Text style={[styles.youLabel, { color: colors.textSubtle }]}>VOCÊ</Text>}
        </View>
        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user.email}</Text>
        <Text style={[styles.userDate, { color: colors.textSubtle }]}>{formatCreatedAt(user.createdAt)}</Text>
      </View>
      <View style={styles.userActions}>
        <View style={[styles.rolePill, { backgroundColor: colors.backgroundElevated }]}> 
          <Feather color={user.role === AUTH_ROLES.admin ? colors.primary : colors.success} name={user.role === AUTH_ROLES.admin ? 'shield' : 'home'} size={13} />
          <Text style={[styles.rolePillText, { color: colors.text }]}>{roleLabel(user.role)}</Text>
        </View>
        {!isCurrentUser && (
          <Pressable
            accessibilityLabel={`Alterar ${user.name} para ${roleLabel(nextRole)}`}
            accessibilityRole="button"
            disabled={mutationPending}
            onPress={() => void onSetRole(user.id, nextRole)}
            style={[styles.changeRoleButton, { borderColor: colors.border }]}> 
            <Text style={[styles.changeRoleText, { color: colors.textMuted }]}>Alterar papel</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AdminUsersContent({ currentUserId }: { currentUserId: string }) {
  const { colors } = useAppTheme();
  const [createOpen, setCreateOpen] = useState(false);
  const users = useAdminUsers(adminUsersGateway);

  return (
    <>
      <View style={styles.contentHeader}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>ADMINISTRAÇÃO</Text>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Usuários da casa</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}> 
            Crie acessos individuais e controle quem pode administrar o sistema.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCreateOpen(true)}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}> 
          <Feather color={colors.onPrimary} name="user-plus" size={17} />
          <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Novo usuário</Text>
        </Pressable>
      </View>

      {users.status === 'loading' ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
      ) : users.status === 'error' ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Usuários indisponíveis</Text>
          <Text style={[styles.stateDescription, { color: colors.textMuted }]}>{users.error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void users.refresh()} style={[styles.secondaryButton, { borderColor: colors.border }]}> 
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.userList}>
          {users.users.map((user) => (
            <UserCard
              currentUserId={currentUserId}
              key={user.id}
              mutationPending={users.mutationPending}
              onSetRole={users.setRole}
              user={user}
            />
          ))}
        </View>
      )}

      <CreateUserModal
        error={users.error}
        onClose={() => setCreateOpen(false)}
        onCreate={users.createUser}
        pending={users.mutationPending}
        visible={createOpen}
      />
    </>
  );
}

export default function UsersScreen() {
  const { colors, themeName } = useAppTheme();
  const router = useRouter();
  const session = authClient.useSession();
  const isAdmin = hasAdminRole(session.data?.user.role);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <LinearGradient colors={[colors.background, colors.backgroundElevated, colors.background]} style={StyleSheet.absoluteFill} />
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}> 
        <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Feather color={colors.text} name="arrow-left" size={20} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Casa Matheus</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isAdmin && session.data ? (
          <AdminUsersContent currentUserId={session.data.user.id} />
        ) : (
          <AccessDenied onBack={() => router.back()} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  centerState: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center', maxWidth: 440, minHeight: 360, padding: spacing[6], width: '100%' },
  changeRoleButton: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, minHeight: 34, paddingHorizontal: spacing[3] },
  changeRoleText: { fontFamily: typography.medium, fontSize: 11 },
  contentHeader: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing[6], justifyContent: 'space-between', marginBottom: spacing[8] },
  disabled: { opacity: 0.58 },
  errorBox: { alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', gap: spacing[2], marginTop: spacing[4], padding: spacing[3] },
  errorText: { flex: 1, fontFamily: typography.medium, fontSize: 12 },
  eyebrow: { fontFamily: typography.semibold, fontSize: 10, letterSpacing: 1.6 },
  fieldLabel: { fontFamily: typography.medium, fontSize: 12, marginBottom: spacing[2], marginTop: spacing[1] },
  iconButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  input: { borderRadius: radius.md, borderWidth: 1, fontFamily: typography.regular, fontSize: 14, marginBottom: spacing[3], minHeight: 50, paddingHorizontal: spacing[4] },
  loader: { marginTop: spacing[12] },
  modalActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[6] },
  modalBackdrop: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing[5] },
  modalCard: { borderRadius: radius.xl, borderWidth: 1, maxWidth: 520, padding: spacing[6], width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[5] },
  modalTitle: { fontFamily: typography.semibold, fontSize: 23, marginTop: spacing[1] },
  pageSubtitle: { fontFamily: typography.regular, fontSize: 14, lineHeight: 21, marginTop: spacing[2], maxWidth: 560 },
  pageTitle: { fontFamily: typography.semibold, fontSize: 31, letterSpacing: -0.8, marginTop: spacing[2] },
  primaryButton: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: spacing[2], justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing[5] },
  primaryButtonText: { fontFamily: typography.semibold, fontSize: 13 },
  roleOption: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: 'row', gap: spacing[2], minHeight: 46, paddingHorizontal: spacing[3] },
  roleOptionText: { fontFamily: typography.medium, fontSize: 12 },
  rolePill: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: spacing[2], minHeight: 30, paddingHorizontal: spacing[3] },
  rolePillText: { fontFamily: typography.medium, fontSize: 11 },
  roleSelector: { flexDirection: 'row', gap: spacing[3] },
  safeArea: { flex: 1 },
  scrollContent: { alignSelf: 'center', maxWidth: 1120, padding: spacing[6], paddingBottom: spacing[12], width: '100%' },
  secondaryButton: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing[5] },
  secondaryButtonText: { fontFamily: typography.semibold, fontSize: 13 },
  stateDescription: { fontFamily: typography.regular, fontSize: 14, lineHeight: 21, marginBottom: spacing[5], marginTop: spacing[2], textAlign: 'center' },
  stateIcon: { alignItems: 'center', borderRadius: radius.lg, height: 56, justifyContent: 'center', marginBottom: spacing[4], width: 56 },
  stateTitle: { fontFamily: typography.semibold, fontSize: 21 },
  topBar: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: spacing[2], minHeight: 66, paddingHorizontal: spacing[5] },
  topBarTitle: { fontFamily: typography.semibold, fontSize: 15 },
  userActions: { alignItems: 'flex-end', gap: spacing[2] },
  userAvatar: { alignItems: 'center', borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  userAvatarText: { fontFamily: typography.bold, fontSize: 12 },
  userCard: { alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing[4], minHeight: 104, padding: spacing[5] },
  userCopy: { flex: 1 },
  userDate: { fontFamily: typography.regular, fontSize: 10, marginTop: spacing[2] },
  userEmail: { fontFamily: typography.regular, fontSize: 12, marginTop: spacing[1] },
  userList: { gap: spacing[3] },
  userName: { fontFamily: typography.semibold, fontSize: 15 },
  userNameRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  youLabel: { fontFamily: typography.semibold, fontSize: 9, letterSpacing: 1.1 },
});
