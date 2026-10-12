import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { MessageCircle, MessageSquare, Save } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useApiIntegrations } from '../../hooks/useApiIntegrations';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { fontSize, fontWeight } from '../../theme/typography';

const WA_BLANK = {
  apiKey: '', apiSecret: '', webhookUrl: '', feeReceivedTemplate: '', examTemplate: '',
  leaveTemplate: '', noticeTemplate: '', templateLanguage: 'en', isActive: true,
};
const SMS_BLANK = { authKey: '', senderId: '', absentTemplateId: '', feeDueTemplateId: '', isActive: false };

/** Web: pages/admin/integrations/ApiIntegrations.jsx */
export default function ApiIntegrationsScreen() {
  const { colors } = useTheme();
  const { integrations, isLoading, isSaving, saveIntegration, refetch } = useApiIntegrations();
  const [whatsappData, setWhatsappData] = useState<any>(WA_BLANK);
  const [smsData, setSmsData] = useState<any>(SMS_BLANK);
  const [savingWhich, setSavingWhich] = useState<'whatsapp' | 'sms' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const smsSaved = integrations?.find((i: any) => i.provider === 'sms');
  const hasSmsAuthKey = Boolean(smsSaved?.apiKey);

  useEffect(() => {
    if (!integrations?.length) return;
    const wa = integrations.find((i: any) => i.provider === 'whatsapp');
    if (wa) {
      setWhatsappData({
        apiKey: wa.apiKey || '',
        apiSecret: wa.apiSecret || '',
        webhookUrl: wa.webhookUrl || '',
        feeReceivedTemplate: wa.config?.templates?.fee_received || '',
        examTemplate: wa.config?.templates?.exam_timetable || '',
        leaveTemplate: wa.config?.templates?.leave_status || '',
        noticeTemplate: wa.config?.templates?.notice_board || '',
        templateLanguage: wa.config?.language || 'en',
        isActive: wa.isActive,
      });
    }
    const sms = integrations.find((i: any) => i.provider === 'sms');
    if (sms) {
      setSmsData({
        authKey: '',
        senderId: sms.apiSecret || '',
        absentTemplateId: sms.config?.templates?.absent_alert || '',
        feeDueTemplateId: sms.config?.templates?.fee_due || '',
        isActive: sms.isActive,
      });
    }
  }, [integrations]);

  const setWa = (k: string) => (x: string) => setWhatsappData((p: any) => ({ ...p, [k]: x }));
  const setSms = (k: string) => (x: string) => setSmsData((p: any) => ({ ...p, [k]: x }));

  const handleSaveWhatsApp = async () => {
    setSavingWhich('whatsapp');
    try {
      await saveIntegration({
        provider: 'whatsapp',
        apiKey: whatsappData.apiKey,
        apiSecret: whatsappData.apiSecret,
        webhookUrl: whatsappData.webhookUrl,
        config: {
          language: whatsappData.templateLanguage.trim() || 'en',
          templates: {
            fee_received: whatsappData.feeReceivedTemplate.trim(),
            exam_timetable: whatsappData.examTemplate.trim(),
            leave_status: whatsappData.leaveTemplate.trim(),
            notice_board: whatsappData.noticeTemplate.trim(),
          },
        },
        isActive: whatsappData.isActive,
      });
    } catch {
      // toast handled by the hook
    } finally {
      setSavingWhich(null);
    }
  };

  const handleSaveSms = async () => {
    setSavingWhich('sms');
    try {
      const payload: any = {
        provider: 'sms',
        apiSecret: smsData.senderId.trim().toUpperCase(),
        config: { templates: { absent_alert: smsData.absentTemplateId.trim(), fee_due: smsData.feeDueTemplateId.trim() } },
        isActive: smsData.isActive,
      };
      if (smsData.authKey.trim()) payload.apiKey = smsData.authKey.trim();
      await saveIntegration(payload);
      setSmsData((prev: any) => ({ ...prev, authKey: '' }));
    } catch {
      // toast handled by the hook
    } finally {
      setSavingWhich(null);
    }
  };

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
    </View>
  );

  const Loading = () => <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>API Integrations</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage external API keys and webhooks (e.g. WhatsApp, SMS).</Text>
        </View>
      </View>

      {/* WhatsApp */}
      <Card style={styles.card}>
        <View style={[styles.cardHead, { borderBottomColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.successSoft }]}><MessageCircle size={20} color={colors.success} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.section, { color: colors.text }]}>WhatsApp Integration</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Configure your WhatsApp Business API credentials</Text>
          </View>
        </View>
        {isLoading ? <Loading /> : (
          <View style={{ marginTop: 16 }}>
            <Input label="API Key / Token" placeholder="Enter your WhatsApp API Key" autoCapitalize="none" value={whatsappData.apiKey} onChangeText={setWa('apiKey')} />
            <Input label="API Secret / Phone Number ID" placeholder="Enter Secret or Phone ID" autoCapitalize="none" value={whatsappData.apiSecret} onChangeText={setWa('apiSecret')} />
            <Input label="Webhook URL (Optional)" placeholder="https://yourdomain.com/webhook/whatsapp" autoCapitalize="none" keyboardType="url" value={whatsappData.webhookUrl} onChangeText={setWa('webhookUrl')} />

            <Text style={[styles.subHead, { color: colors.text }]}>Message Templates</Text>
            <Text style={[styles.meta, { color: colors.textMuted, marginBottom: 12 }]}>Enter the exact template names approved in your Meta WhatsApp Manager.</Text>
            <Input label="Fee Payment Received" placeholder="e.g. fee_received" autoCapitalize="none" value={whatsappData.feeReceivedTemplate} onChangeText={setWa('feeReceivedTemplate')} />
            <Input label="Exam Timetable" placeholder="e.g. exam_timetable" autoCapitalize="none" value={whatsappData.examTemplate} onChangeText={setWa('examTemplate')} />
            <Input label="Leave Approved / Rejected" placeholder="e.g. leave_status" autoCapitalize="none" value={whatsappData.leaveTemplate} onChangeText={setWa('leaveTemplate')} />
            <Input label="Notice Board" placeholder="e.g. notice_board" autoCapitalize="none" value={whatsappData.noticeTemplate} onChangeText={setWa('noticeTemplate')} />
            <Input label="Template Language Code" placeholder="en" autoCapitalize="none" value={whatsappData.templateLanguage} onChangeText={setWa('templateLanguage')} />

            <Toggle label="Enable WhatsApp Integration" value={!!whatsappData.isActive} onChange={(v) => setWhatsappData((p: any) => ({ ...p, isActive: v }))} />
            <View style={styles.saveRow}>
              <Button title="Save Settings" icon={Save} fullWidth={false} loading={isSaving && savingWhich === 'whatsapp'} disabled={isSaving} onPress={handleSaveWhatsApp} />
            </View>
          </View>
        )}
      </Card>

      {/* SMS */}
      <Card style={styles.card}>
        <View style={[styles.cardHead, { borderBottomColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.infoSoft }]}><MessageSquare size={20} color={colors.info} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.section, { color: colors.text }]}>SMS Integration</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Configure your MSG91 SMS credentials</Text>
          </View>
        </View>
        {isLoading ? <Loading /> : (
          <View style={{ marginTop: 16 }}>
            <Input
              label="MSG91 Auth Key" isPassword autoCapitalize="none" autoComplete="off"
              placeholder={hasSmsAuthKey ? 'Saved (leave blank to keep it)' : 'Enter your MSG91 Auth Key'}
              value={smsData.authKey} onChangeText={setSms('authKey')}
            />
            <Input label="Sender ID" placeholder="e.g. EXCELC (6 characters)" maxLength={6} autoCapitalize="characters" value={smsData.senderId} onChangeText={(x) => setSms('senderId')(x.toUpperCase())} />
            <Input label="Absent Alert Template ID" placeholder="Template ID from your MSG91 account" autoCapitalize="none" value={smsData.absentTemplateId} onChangeText={setSms('absentTemplateId')} />
            <Input label="Fee Due Template ID" placeholder="Template ID from your MSG91 account" autoCapitalize="none" value={smsData.feeDueTemplateId} onChangeText={setSms('feeDueTemplateId')} />

            <Toggle label="Enable SMS Integration" value={!!smsData.isActive} onChange={(v) => setSmsData((p: any) => ({ ...p, isActive: v }))} />
            <View style={styles.saveRow}>
              <Button title="Save Settings" icon={Save} fullWidth={false} loading={isSaving && savingWhich === 'sms'} disabled={isSaving} onPress={handleSaveSms} />
            </View>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  card: { marginTop: 10, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  subHead: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, marginTop: 4 },
  loader: { height: 100, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  toggleLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginRight: 12 },
  saveRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
});