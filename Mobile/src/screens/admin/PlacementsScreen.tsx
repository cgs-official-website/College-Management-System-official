import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Award, Briefcase, Building, Calendar, Plus, Trash2, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { usePlacements } from '../../hooks/usePlacements';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/StatCard';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { fontSize, fontWeight } from '../../theme/typography';

const blank = () => ({ companyName: '', role: '', ctc: '', driveDate: '', eligibilityCriteria: '', studentsPlaced: '0' });

/** Web: pages/admin/placements/PlacementsDashboard.jsx */
export default function PlacementsScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { items, stats, isLoading, isAdding, createItem, deleteItem, refetch } = usePlacements(collegeId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setF = (k: string) => (x: string) => setForm((p: any) => ({ ...p, [k]: x }));

  const handleAddDrive = async () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (form.driveDate.trim() && isNaN(new Date(form.driveDate.trim()).getTime())) e.driveDate = 'Use format YYYY-MM-DD';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await createItem({
        companyName: form.companyName.trim(),
        role: form.role.trim() || 'Software Engineer',
        ctc: form.ctc.trim() ? `${form.ctc.trim()}${form.ctc.includes('LPA') ? '' : ' LPA'}` : '6.5 LPA',
        driveDate: form.driveDate.trim() ? new Date(form.driveDate.trim()).toISOString() : new Date().toISOString(),
        eligibilityCriteria: form.eligibilityCriteria.trim() || 'Min 60% aggregate',
        studentsPlaced: Number(form.studentsPlaced) || 0,
      });
      setIsModalOpen(false);
      setForm(blank());
    } catch {
      // toast handled by the hook
    }
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (await confirm({ title: 'Delete Placement Drive', message: `Are you sure you want to remove the placement drive for "${companyName}"?`, confirmText: 'Delete', isDestructive: true })) {
      await deleteItem(id).catch(() => {});
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Placement Cell</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage placement drives, internships, and student recruitment.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Add Placement Drive" size="sm" fullWidth={false} icon={Plus} onPress={() => { setForm(blank()); setErrors({}); setIsModalOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total Drives" value={isLoading ? '...' : stats.totalDrives} icon={Building} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Students Placed" value={isLoading ? '...' : stats.studentsPlaced} icon={Award} tone="success" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Top CTC" value={isLoading ? '...' : stats.topCtc} icon={TrendingUp} tone="warning" /></View>
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Active & Upcoming Placement Drives</Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Institutional recruitment drives stored in database.</Text>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No placement drives registered yet." message='Tap "Add Placement Drive" to create your first drive.' />
      ) : (
        items.map((drive: any) => {
          const company = drive.company || drive.companyName;
          return (
            <Card key={drive.id} style={styles.card}>
              <View style={styles.top}>
                <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                  <Text style={{ color: colors.primary, fontWeight: fontWeight.extrabold, fontSize: fontSize.sm }}>{company?.charAt(0) || 'C'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{company}</Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>{drive.role}</Text>
                </View>
                <Pressable onPress={() => handleDelete(drive.id, company)} hitSlop={10} style={styles.delBtn}>
                  <Trash2 size={17} color={colors.danger} />
                </Pressable>
              </View>

              <View style={styles.infoRow}>
                <View>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Package (CTC)</Text>
                  <Text style={[styles.ctc, { color: colors.success }]}>{drive.ctc}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Drive Date</Text>
                  <View style={styles.dateRow}><Calendar size={13} color={colors.textSubtle} /><Text style={[styles.date, { color: colors.text }]}>{drive.date}</Text></View>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>Eligibility</Text>
              <Text style={[styles.elig, { color: colors.text }]}>{drive.eligibilityCriteria}</Text>
            </Card>
          );
        })
      )}

      <SheetModal
        visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Placement Drive" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsModalOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Save Placement Drive" loading={isAdding} onPress={handleAddDrive} style={styles.flex} />
          </View>
        }>
        <Input label="Company Name" required placeholder="e.g. Microsoft, Infosys, Deloitte" value={form.companyName} onChangeText={setF('companyName')} error={errors.companyName} />
        <Input label="Designation / Role" placeholder="e.g. Software Engineer" value={form.role} onChangeText={setF('role')} />
        <Input label="Salary Package (CTC)" placeholder="e.g. 14.5 LPA" value={form.ctc} onChangeText={setF('ctc')} />
        <Input label="Drive Date (YYYY-MM-DD)" placeholder="2026-01-31" value={form.driveDate} onChangeText={setF('driveDate')} error={errors.driveDate} />
        <Input label="Students Placed (if completed)" placeholder="e.g. 15" keyboardType="number-pad" value={String(form.studentsPlaced)} onChangeText={(x) => setF('studentsPlaced')(x.replace(/[^0-9]/g, ''))} />
        <Input label="Eligibility Criteria" placeholder="e.g. B.Tech CS/IT with min 65% aggregate" value={form.eligibilityCriteria} onChangeText={setF('eligibilityCriteria')} />
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
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginTop: 8 },
  sectionSub: { fontSize: 11, marginTop: 2, marginBottom: 10 },
  loader: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2, fontWeight: fontWeight.medium },
  delBtn: { padding: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  ctc: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  date: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  elig: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});