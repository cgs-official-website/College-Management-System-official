import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, Mail, MessageCircle, PhoneCall, Target, TrendingUp, Users } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SheetModal } from '../../components/ui/SheetModal';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const STATS = [
  { title: 'Total Leads (30d)', value: '450', trend: '+15%', icon: Users },
  { title: 'Email Open Rate', value: '42%', trend: '+5%', icon: Mail },
  { title: 'WhatsApp Reads', value: '85%', trend: '+12%', icon: MessageCircle },
  { title: 'Conversion Rate', value: '12%', trend: '+2%', icon: TrendingUp },
];
const LEADS = [
  { name: 'Rohan Sharma', interest: 'B.Tech CSE', phone: '+91 98765 43210' },
  { name: 'Priya Patel', interest: 'MBA Finance', phone: '+91 87654 32109' },
  { name: 'Amit Kumar', interest: 'B.Tech Mech', phone: '+91 76543 21098' },
];
const CHANNELS = ['Email', 'WhatsApp', 'SMS'].map((x) => ({ value: x, label: x }));
const AUDIENCES = ['All Leads', 'Hot Leads Only', 'Current Students'].map((x) => ({ value: x, label: x }));
const blank = () => ({ name: '', channel: 'Email', audience: 'All Leads', message: '' });

/** Web: pages/admin/marketing/MarketingDashboard.jsx  (client-side only on web too - no backend endpoints) */
export default function MarketingScreen() {
  const { colors } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([
    { name: 'Fall Admission Push', type: 'Email', status: 'Running', performance: '45% Open' },
    { name: 'Campus Tour Invites', type: 'WhatsApp', status: 'Running', performance: '80% Read' },
    { name: 'B.Tech Promo', type: 'SMS', status: 'Completed', performance: '15% Clicked' },
  ]);
  const [form, setForm] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (x: string) => { setForm((p: any) => ({ ...p, [k]: x })); setErrors((p) => ({ ...p, [k]: '' })); };

  const handleCreateCampaign = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Campaign name is required';
    if (!form.message.trim()) e.message = 'Message content is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setCampaigns([{ name: form.name.trim(), type: form.channel, status: 'Running', performance: '0% Sent' }, ...campaigns]);
    toast.success('Campaign created successfully!');
    setIsModalOpen(false);
    setForm(blank());
  };

  const callLead = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => toast.error('Could not open the dialer'));

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Marketing & Leads</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage campaigns, lead capturing, and communications.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Create Campaign" size="sm" fullWidth={false} icon={Target} onPress={() => { setForm(blank()); setErrors({}); setIsModalOpen(true); }} />
      </View>

      <View style={styles.grid}>
        {STATS.map((s) => (
          <View key={s.title} style={styles.gridCell}>
            <Card style={styles.statCard}>
              <View style={styles.statTop}>
                <Text style={[styles.statTitle, { color: colors.textMuted }]} numberOfLines={1}>{s.title}</Text>
                <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}><s.icon size={14} color={colors.primary} /></View>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <View style={styles.trendRow}>
                <ArrowUpRight size={12} color={colors.success} />
                <Text style={{ color: colors.success, fontSize: 11, fontWeight: fontWeight.bold }}> {s.trend} </Text>
                <Text style={{ color: colors.textSubtle, fontSize: 11 }}>vs last month</Text>
              </View>
            </Card>
          </View>
        ))}
      </View>

      <Card style={styles.card}>
        <Text style={[styles.section, { color: colors.text }]}>Active Campaigns</Text>
        {campaigns.map((camp, i) => (
          <View key={i} style={[styles.row, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              {camp.type === 'Email' ? <Mail size={18} color={colors.primary} /> : <MessageCircle size={18} color={colors.primary} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{camp.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{camp.type} • {camp.performance}</Text>
            </View>
            <Badge label={camp.status} tone={camp.status === 'Running' ? 'success' : 'neutral'} />
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.section, { color: colors.text }]}>Hot Leads to Call</Text>
        {LEADS.map((lead, i) => (
          <View key={i} style={[styles.row, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{lead.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{lead.interest}</Text>
              <Text style={[styles.meta, { color: colors.textSubtle }]}>{lead.phone}</Text>
            </View>
            <Pressable onPress={() => callLead(lead.phone)} hitSlop={10} style={[styles.callBtn, { backgroundColor: colors.primarySoft }]}>
              <PhoneCall size={16} color={colors.primary} />
            </Pressable>
          </View>
        ))}
      </Card>

      <SheetModal
        visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Campaign" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsModalOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Launch Campaign" onPress={handleCreateCampaign} style={styles.flex} />
          </View>
        }>
        <Input label="Campaign Name" required placeholder="e.g. Summer Admissions Push" value={form.name} onChangeText={set('name')} error={errors.name} />
        <Select label="Channel" value={form.channel} onChange={set('channel')} options={CHANNELS} />
        <Select label="Target Audience" value={form.audience} onChange={set('audience')} options={AUDIENCES} />
        <Input label="Message Content" required multiline placeholder="Type your campaign message here..." value={form.message} onChangeText={set('message')} error={errors.message} style={{ minHeight: 110 }} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  gridCell: { width: '50%', padding: 4 },
  statCard: { padding: 10 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statTitle: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  statValue: { fontSize: 20, fontWeight: fontWeight.extrabold, marginTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  card: { marginTop: 10, padding: 14 },
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  callBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});