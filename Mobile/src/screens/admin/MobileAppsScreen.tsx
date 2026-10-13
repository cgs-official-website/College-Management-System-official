import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Apple, BellRing, Download, Paintbrush, Settings, Smartphone, Star } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SheetModal } from '../../components/ui/SheetModal';
import { StatCard } from '../../components/ui/StatCard';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const APP_OPTIONS = ['i-Genius (Students & Parents)', 'ZenoxERP (Staff)', 'All Apps'].map((x) => ({ value: x, label: x }));
const PRIORITY_OPTIONS = ['Standard', 'High Priority (Sound Alert)'].map((x) => ({ value: x, label: x }));
const blank = () => ({ title: '', body: '', app: APP_OPTIONS[0].value, priority: 'Standard' });

/** Web: pages/admin/apps/MobileAppsDashboard.jsx  (client-side only on web too - no backend endpoints) */
export default function MobileAppsScreen() {
  const { colors } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (x: string) => { setForm((p: any) => ({ ...p, [k]: x })); setErrors((p) => ({ ...p, [k]: '' })); };

  const handleSendNotification = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Notification title is required';
    if (!form.body.trim()) e.body = 'Message body is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    toast.success('Push notification sent to queue!');
    setIsModalOpen(false);
    setForm(blank());
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Mobile Apps Center</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage i-Genius (Students/Parents) and ZenoxERP (Staff) apps.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Send Push Notification" size="sm" fullWidth={false} icon={BellRing} onPress={() => { setForm(blank()); setErrors({}); setIsModalOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total Downloads" value="0" icon={Download} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Active Students" value="0" icon={Smartphone} tone="primary" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="App Rating" value="0.0" icon={Star} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Notifications Sent" value="0" icon={BellRing} tone="primary" /></View>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={[styles.section, { color: colors.text }]}>White-label Branding</Text>
          <Settings size={20} color={colors.textMuted} />
        </View>

        <View style={[styles.iconRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>App Icon</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Recommended size: 1024x1024px PNG</Text>
            <Text style={[styles.link, { color: colors.primary }]}>Update Icon</Text>
          </View>
        </View>

        <Text style={[styles.name, { color: colors.text, marginTop: 18, marginBottom: 12 }]}>Theme Colors</Text>
        <View style={styles.swatches}>
          <View style={styles.swatchCell}>
            <View style={[styles.swatch, { backgroundColor: '#0ea5e9', borderColor: colors.card }]} />
            <Text style={[styles.swatchLabel, { color: colors.textMuted }]}>Primary</Text>
          </View>
          <View style={styles.swatchCell}>
            <View style={[styles.swatch, { backgroundColor: '#10b981', borderColor: colors.card }]} />
            <Text style={[styles.swatchLabel, { color: colors.textMuted }]}>Secondary</Text>
          </View>
          <View style={styles.swatchCell}>
            <View style={[styles.swatch, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderStyle: 'dashed' }]}><Paintbrush size={16} color={colors.textSubtle} /></View>
            <Text style={[styles.swatchLabel, { color: colors.textMuted }]}>Custom</Text>
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <Button title="Save App Configuration" onPress={() => toast.success('App configuration saved')} />
        </View>
      </Card>

      {/* Live preview mockup */}
      <View style={styles.previewWrap}>
        <View style={styles.phone}>
          <View style={styles.screen}>
            <View style={styles.notch}><View style={styles.notchInner} /></View>
            <View style={styles.appHeader}>
              <Text style={styles.appHeaderTitle}>i-Genius</Text>
              <View style={styles.appHeaderDot} />
            </View>
            <View style={styles.appBody}>
              <View style={[styles.block, { height: 70 }]} />
              <View style={styles.blocks}>
                {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.block, styles.blockHalf]} />)}
              </View>
            </View>
            <View style={styles.tabBar}>
              {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.tabItem, { backgroundColor: i === 0 ? '#e2e8f0' : '#f1f5f9' }]} />)}
            </View>
          </View>
        </View>
        <View style={styles.storeIcons}>
          <View style={styles.storeIcon}><Apple size={18} color="#fff" /></View>
          <View style={styles.storeIcon}><Smartphone size={18} color="#fff" /></View>
        </View>
      </View>

      <SheetModal
        visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Send Push Notification" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsModalOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Send Now" onPress={handleSendNotification} style={styles.flex} />
          </View>
        }>
        <Input label="Notification Title" required placeholder="e.g. Tomorrow is a Holiday" value={form.title} onChangeText={set('title')} error={errors.title} />
        <Input label="Message Body" required multiline placeholder="Enter the full notification message here..." value={form.body} onChangeText={set('body')} error={errors.body} />
        <Select label="Target App" value={form.app} onChange={set('app')} options={APP_OPTIONS} />
        <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  statCell: { flex: 1 },
  card: { marginTop: 8, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  iconRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 },
  iconBox: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 38, height: 38 },
  name: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  link: { fontSize: 11, fontWeight: fontWeight.bold, marginTop: 6 },
  swatches: { flexDirection: 'row', gap: 16 },
  swatchCell: { alignItems: 'center', gap: 4 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchLabel: { fontSize: 10, fontWeight: fontWeight.bold },
  previewWrap: { marginTop: 14, backgroundColor: '#0f172a', borderRadius: 20, paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  phone: { width: 220, height: 440, backgroundColor: '#000', borderRadius: 44, padding: 8, borderWidth: 4, borderColor: '#1e293b' },
  screen: { flex: 1, backgroundColor: '#fff', borderRadius: 34, overflow: 'hidden' },
  notch: { position: 'absolute', top: 0, left: 0, right: 0, height: 24, alignItems: 'center', zIndex: 2 },
  notchInner: { width: 90, height: 16, backgroundColor: '#000', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  appHeader: { backgroundColor: '#10b981', paddingTop: 30, paddingBottom: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appHeaderTitle: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.md },
  appHeaderDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)' },
  appBody: { flex: 1, backgroundColor: '#f8fafc', padding: 12, gap: 10 },
  block: { backgroundColor: '#fff', borderRadius: 12 },
  blocks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  blockHalf: { width: '48%', height: 84 },
  tabBar: { height: 52, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  tabItem: { width: 30, height: 30, borderRadius: 6 },
  storeIcons: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 },
  storeIcon: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});