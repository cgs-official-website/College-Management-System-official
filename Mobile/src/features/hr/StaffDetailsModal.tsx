import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Briefcase, Building, Calendar, Mail, Phone, Shield, User } from 'lucide-react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/admin/hr/StaffDetailsModal.jsx */
export function StaffDetailsModal({ isOpen, onClose, staff }: any) {
  const { colors } = useTheme();
  if (!staff) return null;
  const name = `${staff.firstName || staff.name || ''} ${staff.lastName || ''}`.trim() || 'Staff Member';
  const initials = `${staff.firstName?.charAt(0) || staff.name?.charAt(0) || 'U'}${staff.lastName?.charAt(0) || ''}`.toUpperCase();
  const st = String(staff.status || staff.accountStatus || 'Unknown');
  const active = st === 'active';
  const joined = staff.joinDate || staff.createdAt ? new Date(staff.joinDate || staff.createdAt).toLocaleDateString() : 'N/A';

  const Field = ({ icon: Icon, label, value, mono }: any) => (
    <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.fieldHead}>
        <Icon size={14} color={colors.textMuted} />
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.fieldValue, { color: colors.text }, mono && styles.mono]}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title="Staff Profile" footer={<Button title="Close" variant="outline" onPress={onClose} />}>
      <View style={[styles.hero, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{name}</Text>
          <View style={styles.row}><Briefcase size={14} color={colors.primary} /><Text style={[styles.sub, { color: colors.textMuted }]}>{staff.designation || staff.role || 'Staff Member'}</Text></View>
          <View style={styles.row}><Building size={14} color={colors.primary} /><Text style={[styles.sub, { color: colors.textMuted }]}>{staff.department || 'No Department'}</Text></View>
          <View style={[styles.statusPill, { backgroundColor: active ? colors.successSoft : colors.card, borderColor: colors.border }]}>
            <View style={[styles.dot, { backgroundColor: active ? colors.success : colors.textSubtle }]} />
            <Text style={{ color: active ? colors.success : colors.textMuted, fontSize: 11, fontWeight: fontWeight.bold, textTransform: 'uppercase' }}>{st.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>
      <Field icon={Mail} label="Email Address" value={staff.email} />
      <Field icon={Phone} label="Phone Number" value={staff.phone || staff.mobileNumber} />
      <Field icon={Calendar} label="Joined Date" value={joined} />
      <Field icon={User} label="Staff / Teacher ID" value={staff.teacherId || 'Not assigned'} mono />
      <Field icon={Shield} label="System Role" value={String(staff.role || 'Staff').replace(/^./, (c: string) => c.toUpperCase())} />
    </SheetModal>
  );
}

export default StaffDetailsModal;

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: fontWeight.extrabold },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sub: { fontSize: fontSize.sm, marginLeft: 6, flexShrink: 1 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  field: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  fieldLabel: { fontSize: fontSize.xs, marginLeft: 6 },
  fieldValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  mono: { fontFamily: 'monospace', letterSpacing: 1 },
});