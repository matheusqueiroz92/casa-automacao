import Feather from '@expo/vector-icons/Feather';
import {
  AUTOMATION_LIMITS,
  type AutomationCommand,
} from '@casa/contracts/automation';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentProps, useMemo, useReducer, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/app-logo';
import {
  actionStatesReducer,
  initialActionStates,
  type ActionId,
  type ActionState,
} from '@/domain/action-state';
import { AccountMenu } from '@/features/auth/account-menu';
import { useDashboardGateway } from '@/features/dashboard/use-dashboard-gateway';
import { casaApiClient } from '@/infrastructure/api/casa-api';
import { authClient } from '@/infrastructure/auth/auth-client';
import { useAppTheme } from '@/theme/theme-provider';
import { layout, radius, spacing, typography, type AppColors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Feather>['name'];
type QuickAction = {
  id: ActionId;
  title: string;
  description: string;
  meta: string;
  icon: IconName;
};

type DiagnosticAction = Omit<QuickAction, 'id'> & { id: 'diagnostico' };
type ConfirmableAction = QuickAction | DiagnosticAction;
type ConnectionStatus = 'loading' | 'online' | 'offline' | 'error';
type DiagnosticStatus = 'idle' | 'publishing' | 'published' | 'error';

const quickActions: QuickAction[] = [
  {
    id: 'irrigacao',
    title: 'Irrigação',
    description: 'Regar plantas da varanda',
    meta: `Solicitação: ${AUTOMATION_LIMITS.irrigation.defaultDurationSeconds} s · limite: ${AUTOMATION_LIMITS.irrigation.maxDurationSeconds} s`,
    icon: 'droplet',
  },
  {
    id: 'agua',
    title: 'Água das cachorras',
    description: 'Completar o reservatório',
    meta: `Corte de segurança: ${AUTOMATION_LIMITS.water_refill.defaultMaxDurationSeconds} s · limite: ${AUTOMATION_LIMITS.water_refill.maxDurationSeconds} s`,
    icon: 'heart',
  },
  {
    id: 'racao',
    title: 'Dispensador de ração',
    description: 'Liberar uma porção',
    meta: `Porção: ${AUTOMATION_LIMITS.feeding.defaultGrams} g · limite: ${AUTOMATION_LIMITS.feeding.maxGrams} g`,
    icon: 'package',
  },
  {
    id: 'rele',
    title: 'Relé de bancada',
    description: 'Testar o módulo sem carga conectada',
    meta: `Pulso: ${AUTOMATION_LIMITS.relay_test.defaultDurationSeconds} s · limite: ${AUTOMATION_LIMITS.relay_test.maxDurationSeconds} s`,
    icon: 'zap',
  },
];

const navItems: { label: string; icon: IconName }[] = [
  { label: 'Visão geral', icon: 'home' },
  { label: 'Dispositivos', icon: 'grid' },
  { label: 'Rotinas', icon: 'repeat' },
  { label: 'Histórico', icon: 'activity' },
  { label: 'Configurações', icon: 'settings' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFormattedDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
}

function automationCommandFor(actionId: ActionId): AutomationCommand {
  switch (actionId) {
    case 'irrigacao':
      return {
        type: 'irrigation',
        durationSeconds: AUTOMATION_LIMITS.irrigation.defaultDurationSeconds,
      };
    case 'agua':
      return {
        type: 'water_refill',
        maxDurationSeconds: AUTOMATION_LIMITS.water_refill.defaultMaxDurationSeconds,
      };
    case 'racao':
      return { type: 'feeding', grams: AUTOMATION_LIMITS.feeding.defaultGrams };
    case 'rele':
      return {
        type: 'relay_test',
        durationSeconds: AUTOMATION_LIMITS.relay_test.defaultDurationSeconds,
      };
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Morador';
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <Feather color={colors.text} name={icon} size={18} />
    </Pressable>
  );
}

function StatusPill({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.statusPill, { backgroundColor: colors.surfaceMuted }]}> 
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusPillText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function Sidebar() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <AppLogo style={styles.sidebarLogo} />

      <View style={styles.sidebarHomeLabel}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>AUTOMAÇÃO</Text>
        <Text style={[styles.sidebarTitle, { color: colors.text }]}>Casa Matheus</Text>
      </View>

      <View style={styles.navList}>
        {navItems.map((item, index) => {
          const selected = index === 0;
          return (
            <Pressable
              accessibilityRole="button"
              key={item.label}
              style={({ pressed }) => [
                styles.navItem,
                selected && { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
              ]}>
              <Feather color={selected ? colors.primary : colors.textMuted} name={item.icon} size={18} />
              <Text
                style={[
                  styles.navItemText,
                  { color: selected ? colors.text : colors.textMuted },
                ]}>
                {item.label}
              </Text>
              {selected && <View style={[styles.navMarker, { backgroundColor: colors.primary }]} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.sidebarSafety, { backgroundColor: colors.backgroundElevated }]}> 
        <View style={[styles.safetyIcon, { backgroundColor: colors.glow }]}> 
          <Feather color={colors.primary} name="shield" size={18} />
        </View>
        <Text style={[styles.sidebarSafetyTitle, { color: colors.text }]}>Proteção local ativa</Text>
        <Text style={[styles.sidebarSafetyText, { color: colors.textMuted }]}> 
          O Mega mantém os limites mesmo sem Internet.
        </Text>
      </View>
    </View>
  );
}

function Header({
  compact,
  connectionStatus,
  email,
  name,
  onManageUsers,
  onSignOut,
  role,
}: {
  compact: boolean;
  connectionStatus: ConnectionStatus;
  email: string;
  name: string;
  onManageUsers: () => void;
  onSignOut: () => Promise<void>;
  role: string | null | undefined;
}) {
  const { colors, themeName, toggleTheme } = useAppTheme();
  const online = connectionStatus === 'online';
  const statusLabel =
    connectionStatus === 'loading'
      ? 'Verificando sistema'
      : online
        ? 'Sistema local online'
        : connectionStatus === 'offline'
          ? 'Mega sem sinal'
          : 'API local indisponível';

  return (
    <View style={[styles.header, compact && styles.headerCompact]}> 
      {compact ? (
        <AppLogo style={styles.mobileLogo} />
      ) : (
        <View>
          <Text style={[styles.headerOverline, { color: colors.textMuted }]}>{getFormattedDate()}</Text>
          <Text style={[styles.headerGreeting, { color: colors.text }]}>{getGreeting()}, {firstName(name)}</Text>
        </View>
      )}

      <View style={styles.headerActions}>
        {!compact && (
          <StatusPill
            color={online ? colors.success : connectionStatus === 'loading' ? colors.warning : colors.danger}
            label={statusLabel}
          />
        )}
        <IconButton
          icon={themeName === 'dark' ? 'sun' : 'moon'}
          label="Alternar tema"
          onPress={toggleTheme}
        />
        <AccountMenu
          onManageUsers={onManageUsers}
          onSignOut={onSignOut}
          role={role}
          user={{ email, name }}
        />
      </View>
    </View>
  );
}

function HeroCard({
  compact,
  connectionStatus,
  diagnosticStatus,
  onDiagnostic,
}: {
  compact: boolean;
  connectionStatus: ConnectionStatus;
  diagnosticStatus: DiagnosticStatus;
  onDiagnostic: () => void;
}) {
  const { colors } = useAppTheme();
  const online = connectionStatus === 'online';
  const diagnosticRunning = diagnosticStatus === 'publishing';
  const buttonLabel =
    diagnosticStatus === 'publishing'
      ? 'Publicando diagnóstico…'
      : diagnosticStatus === 'published'
        ? 'Comunicação validada'
        : diagnosticStatus === 'error'
          ? 'Tentar novamente'
          : 'Testar comunicação';

  return (
    <LinearGradient
      colors={[colors.surfaceElevated, colors.backgroundElevated]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.heroCard, compact && styles.heroCardCompact, { borderColor: colors.border }]}> 
      <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
        <View style={[styles.demoBadge, { backgroundColor: colors.surfaceMuted }]}> 
          <Feather color={online ? colors.success : colors.warning} name="radio" size={13} />
          <Text style={[styles.demoBadgeText, { color: colors.textMuted }]}>DADOS DA REDE LOCAL</Text>
        </View>
        <Text style={[styles.heroTitle, compact && styles.heroTitleCompact, { color: colors.text }]}>Sua casa, sob controle.</Text>
        <Text style={[styles.heroDescription, { color: colors.textMuted }]}> 
          {online
            ? 'A API recebeu o estado online do Mega. O diagnóstico abaixo percorre API, MQTT e controlador.'
            : connectionStatus === 'loading'
              ? 'Consultando a API local e o último estado publicado pelo Mega…'
              : 'A API ou o Mega não responderam. A automação essencial continua protegida pelo firmware.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={diagnosticRunning}
          onPress={onDiagnostic}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
            diagnosticRunning && styles.disabled,
          ]}>
          <Feather
            color={colors.onPrimary}
            name={diagnosticStatus === 'published' ? 'check-circle' : 'radio'}
            size={17}
          />
          <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{buttonLabel}</Text>
          {!diagnosticRunning && <Feather color={colors.onPrimary} name="arrow-right" size={17} />}
        </Pressable>
      </View>

      <View
        style={[
          styles.networkOrb,
          compact && styles.networkOrbCompact,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.borderStrong },
        ]}> 
        <View style={[styles.networkOrbInner, compact && styles.networkOrbInnerCompact, { backgroundColor: colors.glow }]}> 
          <Feather color={colors.primary} name="home" size={compact ? 27 : 36} />
        </View>
        <View
          style={[
            styles.orbitDot,
            { backgroundColor: online ? colors.success : connectionStatus === 'loading' ? colors.warning : colors.danger },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

function SystemCard({
  icon,
  label,
  value,
  detail,
  statusColor,
}: {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
  statusColor: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.systemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.systemCardTop}>
        <View style={[styles.cardIcon, { backgroundColor: colors.glow }]}> 
          <Feather color={colors.primary} name={icon} size={19} />
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
      <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.cardDetail, { color: colors.textSubtle }]}>{detail}</Text>
    </View>
  );
}

function QuickActionCard({
  action,
  state,
  onPress,
}: {
  action: QuickAction;
  state: ActionState;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const completed = state === 'done';
  const failed = state === 'error';
  const running = state === 'running';

  return (
    <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.actionCardHeader}>
        <View style={[styles.actionIcon, { backgroundColor: colors.glow }]}> 
          <Feather color={colors.primary} name={action.icon} size={23} />
        </View>
        <StatusPill
          color={running ? colors.warning : completed ? colors.success : failed ? colors.danger : colors.offline}
          label={running ? 'Publicando' : completed ? 'Publicado' : failed ? 'Falha' : 'Pronto'}
        />
      </View>
      <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
      <Text style={[styles.actionDescription, { color: colors.textMuted }]}>{action.description}</Text>
      <Text style={[styles.actionMeta, { color: colors.textSubtle }]}>{action.meta}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={running}
        onPress={onPress}
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: colors.borderStrong, backgroundColor: colors.backgroundElevated },
          pressed && styles.pressed,
          running && styles.disabled,
        ]}>
        <Feather
          color={completed ? colors.success : failed ? colors.danger : colors.text}
          name={completed ? 'check' : running ? 'loader' : failed ? 'refresh-cw' : 'play'}
          size={16}
        />
        <Text style={[styles.secondaryButtonText, { color: colors.text }]}> 
          {completed ? 'Publicar novamente' : running ? 'Publicando…' : failed ? 'Tentar novamente' : 'Publicar comando'}
        </Text>
      </Pressable>
    </View>
  );
}

function ActivityPanel() {
  const { colors } = useAppTheme();
  const items = [
    { icon: 'wifi' as IconName, title: 'Mega conectado ao broker local', time: 'agora', color: colors.success },
    { icon: 'database' as IconName, title: 'Estado sincronizado com a API local', time: 'há 2 min', color: colors.primary },
    { icon: 'shield' as IconName, title: 'Limites do firmware verificados', time: 'há 8 min', color: colors.success },
  ];

  return (
    <View style={[styles.activityPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.panelHeader}>
        <View>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Atividade recente</Text>
          <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>Eventos demonstrativos do sistema</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: colors.primary }]}>Ver histórico</Text>
          <Feather color={colors.primary} name="chevron-right" size={16} />
        </Pressable>
      </View>
      <View style={styles.activityList}>
        {items.map((item, index) => (
          <View
            key={item.title}
            style={[
              styles.activityItem,
              index < items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
            ]}>
            <View style={[styles.activityIcon, { backgroundColor: colors.backgroundElevated }]}> 
              <Feather color={item.color} name={item.icon} size={17} />
            </View>
            <View style={styles.activityCopy}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.activityTime, { color: colors.textSubtle }]}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SafetyPanel() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.safetyPanel, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}> 
      <View style={[styles.safetyPanelIcon, { backgroundColor: colors.glow }]}> 
        <Feather color={colors.primary} name="shield" size={25} />
      </View>
      <Text style={[styles.safetyPanelTitle, { color: colors.text }]}>Segurança em primeiro lugar</Text>
      <Text style={[styles.safetyPanelDescription, { color: colors.textMuted }]}> 
        Nenhum comando remoto ultrapassa os limites gravados no Mega. A automação essencial continua local.
      </Text>
      <View style={styles.safetyChecks}>
        {['Execução autônoma', 'Limites no firmware', 'Sem portas residenciais abertas'].map((item) => (
          <View key={item} style={styles.safetyCheckRow}>
            <Feather color={colors.success} name="check-circle" size={16} />
            <Text style={[styles.safetyCheckText, { color: colors.text }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BottomNavigation() {
  const { colors } = useAppTheme();
  const items: { label: string; icon: IconName }[] = [
    { label: 'Início', icon: 'home' },
    { label: 'Dispositivos', icon: 'grid' },
    { label: 'Rotinas', icon: 'repeat' },
    { label: 'Ajustes', icon: 'settings' },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      {items.map((item, index) => (
        <Pressable accessibilityRole="button" key={item.label} style={styles.bottomNavItem}>
          <Feather color={index === 0 ? colors.primary : colors.textSubtle} name={item.icon} size={20} />
          <Text style={[styles.bottomNavLabel, { color: index === 0 ? colors.primary : colors.textSubtle }]}> 
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ConfirmationModal({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmableAction | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={Boolean(action)}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}> 
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: colors.glow }]}> 
              <Feather color={colors.primary} name={action?.icon ?? 'play'} size={24} />
            </View>
            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.modalClose}>
              <Feather color={colors.textMuted} name="x" size={21} />
            </Pressable>
          </View>
          <Text style={[styles.modalEyebrow, { color: colors.primary }]}>CONFIRMAR COMANDO</Text>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{action?.title}</Text>
          <Text style={[styles.modalDescription, { color: colors.textMuted }]}> 
            {action?.id === 'diagnostico'
              ? 'Este comando real será enviado pela API ao broker MQTT. Nenhum atuador físico será acionado.'
              : 'A solicitação será validada pela API e novamente pelo Mega. Enquanto o hardware não estiver configurado, o firmware recusará a execução física com segurança.'}
          </Text>
          <View style={[styles.modalNotice, { backgroundColor: colors.backgroundElevated }]}> 
            <Feather color={colors.warning} name="alert-triangle" size={17} />
            <Text style={[styles.modalNoticeText, { color: colors.textMuted }]}>{action?.meta}</Text>
          </View>
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.modalSecondaryButton,
                { borderColor: colors.borderStrong },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.modalSecondaryText, { color: colors.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.modalPrimaryText, { color: colors.onPrimary }]}> 
                {action?.id === 'diagnostico' ? 'Enviar diagnóstico' : 'Publicar comando'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const { colors, themeName } = useAppTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const tablet = width >= layout.tabletBreakpoint;
  const gateway = useDashboardGateway(casaApiClient);
  const router = useRouter();
  const session = authClient.useSession();
  const userName = session.data?.user.name ?? 'Morador';
  const userEmail = session.data?.user.email ?? '';
  const [selectedAction, setSelectedAction] = useState<ConfirmableAction | null>(null);
  const [actionStates, dispatchActionState] = useReducer(
    actionStatesReducer,
    initialActionStates,
  );

  const screenStyles = useMemo(() => createScreenStyles(colors), [colors]);

  async function runAction(action: ConfirmableAction) {
    setSelectedAction(null);

    if (action.id === 'diagnostico') {
      await gateway.runDiagnostic();
      return;
    }

    dispatchActionState({ type: 'started', actionId: action.id });
    const published = await gateway.runAutomation(automationCommandFor(action.id));
    dispatchActionState({
      type: published ? 'completed' : 'failed',
      actionId: action.id,
    });
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safeArea}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[colors.background, colors.backgroundElevated, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.appFrame}>
        {desktop && <Sidebar />}

        <View style={styles.mainColumn}>
          <View style={[styles.mainInner, desktop && styles.mainInnerDesktop]}>
            <Header
              compact={!desktop}
              connectionStatus={gateway.connection.status}
              email={userEmail}
              name={userName}
              onManageUsers={() => router.push('/users')}
              onSignOut={async () => {
                const result = await authClient.signOut();
                if (result.error) throw new Error(result.error.message);
              }}
              role={session.data?.user.role}
            />

            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                !desktop && styles.scrollContentMobile,
              ]}
              showsVerticalScrollIndicator={false}>
              {!desktop && (
                <View style={styles.mobileWelcome}>
                  <Text style={[styles.headerOverline, { color: colors.textMuted }]}>{getFormattedDate()}</Text>
                  <Text style={[styles.mobileGreeting, { color: colors.text }]}>{getGreeting()}, {firstName(userName)}</Text>
                </View>
              )}

              <HeroCard
                compact={!tablet}
                connectionStatus={gateway.connection.status}
                diagnosticStatus={gateway.diagnostic.status}
                onDiagnostic={() =>
                  setSelectedAction({
                    id: 'diagnostico',
                    title: 'Teste de comunicação',
                    description: 'Publicar comando MQTT de diagnóstico',
                    meta: 'Nenhum atuador físico será acionado',
                    icon: 'radio',
                  })
                }
              />

              <View style={[styles.systemGrid, tablet && styles.rowGrid]}>
                <SystemCard
                  detail={
                    gateway.connection.errorCode
                      ? `Falha: ${gateway.connection.errorCode}`
                      : 'API local · porta 3001'
                  }
                  icon="wifi"
                  label="Rede local"
                  statusColor={gateway.connection.status === 'error' ? colors.danger : colors.success}
                  value={gateway.connection.status === 'error' ? 'Indisponível' : 'Conectada'}
                />
                <SystemCard
                  detail={formatLastContact(gateway.connection.lastContact)}
                  icon="cpu"
                  label="Controlador Mega"
                  statusColor={
                    gateway.connection.status === 'online'
                      ? colors.success
                      : gateway.connection.status === 'loading'
                        ? colors.warning
                        : colors.danger
                  }
                  value={
                    gateway.connection.status === 'online'
                      ? 'Online'
                      : gateway.connection.status === 'loading'
                        ? 'Verificando'
                        : gateway.connection.status === 'offline'
                          ? 'Offline'
                          : 'Sem resposta'
                  }
                />
                <SystemCard
                  detail="Bridge ainda não implantada"
                  icon="cloud"
                  label="Acesso remoto"
                  statusColor={colors.warning}
                  value="Local somente"
                />
              </View>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Controles rápidos</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}> 
                    Comandos reais com validação redundante de limites
                  </Text>
                </View>
                <View style={[styles.demoInline, { backgroundColor: colors.surfaceMuted }]}> 
                  <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.demoInlineText, { color: colors.textMuted }]}>Hardware protegido</Text>
                </View>
              </View>

              <View style={[styles.actionsGrid, tablet && styles.rowGrid]}>
                {quickActions.map((action) => (
                  <QuickActionCard
                    action={action}
                    key={action.id}
                    onPress={() => setSelectedAction(action)}
                    state={actionStates[action.id]}
                  />
                ))}
              </View>

              <View style={[styles.detailGrid, tablet && styles.rowGrid]}>
                <ActivityPanel />
                <SafetyPanel />
              </View>

              <Text style={[styles.footerText, { color: colors.textSubtle }]}> 
                Casa Automação · operação local por padrão
              </Text>
            </ScrollView>
          </View>

          {!desktop && <BottomNavigation />}
        </View>
      </View>

      <ConfirmationModal
        action={selectedAction}
        onCancel={() => setSelectedAction(null)}
        onConfirm={() => selectedAction && void runAction(selectedAction)}
      />
    </SafeAreaView>
  );
}

function formatLastContact(value: string | undefined): string {
  if (!value) return 'Nenhum estado recebido';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Horário de contato indisponível';

  return `Último contato: ${new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)}`;
}

const styles = StyleSheet.create({
  appFrame: { flex: 1, flexDirection: 'row' },
  mainColumn: { flex: 1 },
  mainInner: { flex: 1, width: '100%', alignSelf: 'center' },
  mainInnerDesktop: { maxWidth: layout.maxContentWidth },
  scrollContent: { paddingHorizontal: spacing[8], paddingBottom: spacing[10], gap: spacing[6] },
  scrollContentMobile: { paddingHorizontal: spacing[4], paddingBottom: 108, gap: spacing[5] },
  sidebar: {
    width: layout.sidebarWidth,
    borderRightWidth: 1,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
  },
  sidebarLogo: { width: 154, height: 54 },
  sidebarHomeLabel: { marginTop: spacing[8], marginBottom: spacing[5] },
  eyebrow: { fontFamily: typography.semibold, fontSize: 11, letterSpacing: 1.8 },
  sidebarTitle: { fontFamily: typography.semibold, fontSize: 19, marginTop: spacing[2] },
  navList: { gap: spacing[1] },
  navItem: {
    minHeight: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    position: 'relative',
    overflow: 'hidden',
  },
  navItemText: { fontFamily: typography.medium, fontSize: 14 },
  navMarker: { position: 'absolute', left: 0, width: 3, height: 22, borderRadius: radius.pill },
  sidebarSafety: { marginTop: 'auto', padding: spacing[4], borderRadius: radius.lg },
  safetyIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  sidebarSafetyTitle: { fontFamily: typography.semibold, fontSize: 14 },
  sidebarSafetyText: { fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: spacing[2] },
  header: {
    minHeight: 86,
    paddingHorizontal: spacing[8],
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 200,
  },
  headerCompact: { minHeight: 72, paddingHorizontal: spacing[4] },
  headerOverline: { fontFamily: typography.regular, fontSize: 12, textTransform: 'capitalize' },
  headerGreeting: { fontFamily: typography.semibold, fontSize: 20, marginTop: spacing[1] },
  mobileGreeting: { fontFamily: typography.semibold, fontSize: 24, marginTop: spacing[1] },
  mobileWelcome: { marginBottom: spacing[1] },
  mobileLogo: { width: 124, height: 44 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
  notificationWrap: { position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    right: 3,
    top: 3,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  statusPill: {
    minHeight: 30,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: { width: 7, height: 7, borderRadius: radius.pill },
  statusPillText: { fontFamily: typography.medium, fontSize: 11 },
  heroCard: {
    minHeight: 260,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[8],
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  heroCardCompact: {
    minHeight: 390,
    padding: spacing[6],
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  heroCopy: { flex: 1, maxWidth: 650, zIndex: 1 },
  heroCopyCompact: { maxWidth: '100%', paddingRight: 0 },
  demoBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  demoBadgeText: { fontFamily: typography.semibold, fontSize: 10, letterSpacing: 1.2 },
  heroTitle: { fontFamily: typography.semibold, fontSize: 35, lineHeight: 42, letterSpacing: -1.2 },
  heroTitleCompact: { fontSize: 33, lineHeight: 39, maxWidth: 260 },
  heroDescription: { fontFamily: typography.regular, fontSize: 15, lineHeight: 23, marginTop: spacing[3], maxWidth: 570 },
  primaryButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[5],
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  primaryButtonText: { fontFamily: typography.semibold, fontSize: 14 },
  networkOrb: {
    width: 150,
    height: 150,
    borderRadius: 46,
    borderWidth: 1,
    transform: [{ rotate: '30deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[5],
  },
  networkOrbCompact: {
    position: 'absolute',
    right: -20,
    bottom: -28,
    width: 132,
    height: 132,
    borderRadius: 42,
    marginRight: 0,
    opacity: 0.82,
  },
  networkOrbInner: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-30deg' }],
  },
  networkOrbInnerCompact: { width: 72, height: 72, borderRadius: 24 },
  orbitDot: { position: 'absolute', right: 12, top: 22, width: 13, height: 13, borderRadius: radius.pill },
  systemGrid: { gap: spacing[4] },
  rowGrid: { flexDirection: 'row' },
  systemCard: { flex: 1, minHeight: 170, borderWidth: 1, borderRadius: radius.lg, padding: spacing[5] },
  systemCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  cardIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontFamily: typography.regular, fontSize: 12 },
  cardValue: { fontFamily: typography.semibold, fontSize: 21, marginTop: spacing[1] },
  cardDetail: { fontFamily: typography.regular, fontSize: 11, marginTop: 'auto' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing[2] },
  sectionTitle: { fontFamily: typography.semibold, fontSize: 22 },
  sectionSubtitle: { fontFamily: typography.regular, fontSize: 13, marginTop: spacing[1] },
  demoInline: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.pill },
  demoInlineText: { fontFamily: typography.medium, fontSize: 11 },
  actionsGrid: { gap: spacing[4] },
  actionCard: { flex: 1, minHeight: 264, borderWidth: 1, borderRadius: radius.lg, padding: spacing[5] },
  actionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  actionIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: typography.semibold, fontSize: 17 },
  actionDescription: { fontFamily: typography.regular, fontSize: 13, marginTop: spacing[2] },
  actionMeta: { fontFamily: typography.regular, fontSize: 11, marginTop: spacing[2] },
  secondaryButton: { minHeight: 42, marginTop: 'auto', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  secondaryButtonText: { fontFamily: typography.semibold, fontSize: 12 },
  detailGrid: { gap: spacing[4] },
  activityPanel: { flex: 1.6, borderWidth: 1, borderRadius: radius.lg, padding: spacing[5] },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  panelTitle: { fontFamily: typography.semibold, fontSize: 17 },
  panelSubtitle: { fontFamily: typography.regular, fontSize: 11, marginTop: spacing[1] },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  textButtonLabel: { fontFamily: typography.semibold, fontSize: 11 },
  activityList: { gap: 0 },
  activityItem: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  activityIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1 },
  activityTitle: { fontFamily: typography.medium, fontSize: 12 },
  activityTime: { fontFamily: typography.regular, fontSize: 10, marginTop: spacing[1] },
  safetyPanel: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing[5] },
  safetyPanelIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  safetyPanelTitle: { fontFamily: typography.semibold, fontSize: 17 },
  safetyPanelDescription: { fontFamily: typography.regular, fontSize: 12, lineHeight: 19, marginTop: spacing[2] },
  safetyChecks: { gap: spacing[3], marginTop: spacing[5] },
  safetyCheckRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  safetyCheckText: { fontFamily: typography.medium, fontSize: 11 },
  footerText: { fontFamily: typography.regular, fontSize: 11, textAlign: 'center', marginTop: spacing[2] },
  bottomNav: { position: 'absolute', left: spacing[3], right: spacing[3], bottom: spacing[3], minHeight: 68, borderWidth: 1, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[2] },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[1] },
  bottomNavLabel: { fontFamily: typography.medium, fontSize: 10 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
  modalCard: { width: '100%', maxWidth: 470, borderWidth: 1, borderRadius: radius.xl, padding: spacing[6] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  modalIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  modalEyebrow: { fontFamily: typography.semibold, fontSize: 10, letterSpacing: 1.5 },
  modalTitle: { fontFamily: typography.semibold, fontSize: 25, marginTop: spacing[2] },
  modalDescription: { fontFamily: typography.regular, fontSize: 13, lineHeight: 21, marginTop: spacing[3] },
  modalNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderRadius: radius.md, padding: spacing[4], marginTop: spacing[5] },
  modalNoticeText: { flex: 1, fontFamily: typography.medium, fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[6] },
  modalSecondaryButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryText: { fontFamily: typography.semibold, fontSize: 13 },
  modalPrimaryButton: { flex: 1.4, minHeight: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryText: { fontFamily: typography.semibold, fontSize: 13 },
});

function createScreenStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
  });
}
