import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { CheckCircle2, Save, Settings } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

const TIMEZONES = [
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata (IST)' },
  { label: 'America/New_York (EST)', value: 'America/New_York (EST)' },
  { label: 'Europe/London (GMT)', value: 'Europe/London (GMT)' },
  { label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney (AEST)' },
];

/**
 * Web: SuperSettings.jsx - "System Settings".
 * NOTE: the web page has no backend endpoint yet (the save is local only), so this screen behaves the same.
 */
export default function SuperSettingsScreen() {
  const { colors } = useTheme();
  const [platformName, setPlatformName] = useState('Zuna Core ERP');
  const [supportEmail, setSupportEmail] = useState('support@zuna.app');
  const [maintenance, setMaintenance] = useState(false);
  const [timezone, setTimezone] = useState(TIMEZONES[0].value);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <PageHeader title="System Settings" subtitle="Manage global configurations for the Zuna ecosystem." />

      <Card>
        <View style={styles.head}>
          <Settings size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>General Configuration</Text>
        </View>

        <Input label="Platform Name" value={platformName} onChangeText={setPlatformName} />
        <Input
          label="Support Email"
          value={supportEmail}
          onChangeText={setSupportEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.label, { color: colors.text }]}>Platform Maintenance Mode</Text>
        <View style={[styles.switchBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Enable Maintenance</Text>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Lock down the system for all users except SuperAdmins.</Text>
          </View>
          <Switch
            value={maintenance}
            onValueChange={setMaintenance}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={{ height: 16 }} />
        <Select label="Default Region / Timezone" value={timezone} options={TIMEZONES} onChange={setTimezone} />

        <Button
          title={isSaved ? 'Saved Successfully' : 'Save Changes'}
          icon={isSaved ? CheckCircle2 : Save}
          onPress={handleSave}
          style={isSaved ? { backgroundColor: colors.success, borderColor: colors.success } : undefined}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  title: { marginLeft: 8, fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  switchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14 },
  switchTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  switchSub: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
});
