import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Building2, DoorClosed, Percent, Phone, Plus, Trash2, Users } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useHostel } from '../../hooks/useHostel';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExcelUploadButton, ExcelField } from '../../components/ui/ExcelUploadButton';
import { fontSize, fontWeight } from '../../theme/typography';

const IMPORT_FIELDS: ExcelField[] = [
  { name: 'Hostel_Block', required: true, example: 'Ganga Block' },
  { name: 'Room_No', required: true, example: '101-A' },
  { name: 'Room_Type', example: 'Double' },
  { name: 'Capacity', type: 'number', example: '2' },
  { name: 'Floor', example: '1' },
  { name: 'Warden_Name', example: 'Dr. Meena Iyer' },
  { name: 'Warden_Contact', example: '+91 98765 43210' },
];

const TYPE_OPTIONS = ['Boys', 'Girls', 'Co-Ed', 'Staff'].map((x) => ({ value: x, label: x }));
const STATUS_OPTIONS = ['Active', 'Full', 'Renovation'].map((x) => ({ value: x, label: x }));

const blankBlock = () => ({ name: '', type: 'Boys', totalRooms: '100', occupied: '0', wardenName: '', wardenPhone: '', status: 'Active' });
const digits = (x: string) => x.replace(/[^0-9]/g, '');

/** Web: pages/admin/hostel/HostelDashboard.jsx */
export default function HostelScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const {
    items: blocks, stats, isLoading, isAdding, createItem, deleteItem, students, isLoadingStudents,
    assignRoom, isAssigningRoom, isImporting, bulkImport, refetch,
  } = useHostel(collegeId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [assignForm, setAssignForm] = useState({ hostelBlockId: '', hostelRoom: '' });
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<any>(blankBlock());
  const [nameError, setNameError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setF = (k: string) => (x: string) => setForm((p: any) => ({ ...p, [k]: x }));

  const openAdd = () => { setForm(blankBlock()); setNameError(''); setIsModalOpen(true); };

  const handleAddBlock = async () => {
    if (!form.name.trim()) { setNameError('Block name is required'); return; }
    try {
      await createItem({
        name: form.name.trim(),
        type: form.type,
        totalRooms: Number(form.totalRooms) || 100,
        occupied: Number(form.occupied) || 0,
        wardenName: form.wardenName.trim() || 'Chief Warden',
        wardenPhone: form.wardenPhone.trim() || '+91 98765 43210',
        status: form.status,
      });
      setIsModalOpen(false);
      setForm(blankBlock());
    } catch {
      // toast handled by the hook
    }
  };

  const openAssign = (student: any) => {
    setSelectedStudent(student);
    setAssignForm({ hostelBlockId: student.hostelBlockId || '', hostelRoom: student.hostelRoom || '' });
    setAssignErrors({});
    setIsAssignModalOpen(true);
  };
  const closeAssign = () => { setIsAssignModalOpen(false); setSelectedStudent(null); };

  const handleAssignRoom = async () => {
    if (!selectedStudent) return;
    const e: Record<string, string> = {};
    if (!assignForm.hostelBlockId) e.hostelBlockId = 'Select a hostel block';
    if (!assignForm.hostelRoom.trim()) e.hostelRoom = 'Room number is required';
    setAssignErrors(e);
    if (Object.keys(e).length) return;
    try {
      await assignRoom({ id: selectedStudent.id, hostelBlockId: assignForm.hostelBlockId, hostelRoom: assignForm.hostelRoom.trim() });
      closeAssign();
      setAssignForm({ hostelBlockId: '', hostelRoom: '' });
    } catch {
      // toast handled by the hook
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (await confirm({ title: 'Delete Hostel Block', message: `Are you sure you want to remove "${name}"?`, confirmText: 'Delete', isDestructive: true })) {
      await deleteItem(id).catch(() => {});
    }
  };

  const blockOptions = blocks.map((b: any) => ({ value: b.id, label: `${b.name} (${b.type})` }));

  const statusColors = (s: string) =>
    s === 'Full' ? { fg: colors.danger, bg: colors.dangerSoft } : s === 'Renovation' ? { fg: colors.warning, bg: colors.warningSoft } : { fg: colors.success, bg: colors.successSoft };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Hostel & Accommodation</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage residential blocks, room allocations, and student occupancy.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <ExcelUploadButton
          label="Import Excel" title="Import Hostel Rooms" description="Upload an Excel (.xlsx, .xls) or CSV file of hostel rooms."
          fields={IMPORT_FIELDS} sampleFileName="hostel_import_template.xlsx" onUpload={bulkImport} isLoading={isImporting}
        />
        <View style={{ width: 8 }} />
        <Button title="Add Hostel Block" size="sm" fullWidth={false} icon={Plus} onPress={openAdd} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total Blocks" value={isLoading ? '...' : stats.totalBlocks} icon={Building2} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Capacity" value={isLoading ? '...' : `${stats.totalCapacity} Beds`} icon={DoorClosed} tone="info" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Occupied Beds" value={isLoading ? '...' : stats.occupiedBeds} icon={Users} tone="success" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Occupancy Rate" value={isLoading ? '...' : stats.occupancyRate} icon={Percent} tone="warning" /></View>
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Hostel Blocks & Residency</Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Manage room inventory and residential student capacity.</Text>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : blocks.length === 0 ? (
        <EmptyState icon={Building2} title="No hostel blocks registered yet." message='Tap "Add Hostel Block" to add your campus residential facility.' />
      ) : (
        blocks.map((block: any) => {
          const pct = block.totalRooms > 0 ? Math.min(100, Math.round((block.occupied / block.totalRooms) * 100)) : 0;
          const barColor = pct >= 95 ? colors.danger : pct >= 75 ? colors.warning : colors.primary;
          const sc = statusColors(block.status);
          return (
            <Card key={block.id} style={styles.card}>
              <View style={styles.top}>
                <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}><Building2 size={18} color={colors.primary} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{block.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSubtle }]}>{block.totalRooms} Total Beds</Text>
                </View>
                <Pressable onPress={() => handleDelete(block.id, block.name)} hitSlop={10} style={styles.delBtn}>
                  <Trash2 size={17} color={colors.danger} />
                </Pressable>
              </View>

              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: colors.cardAlt }]}><Text style={[styles.chipText, { color: colors.textMuted }]}>{block.type}</Text></View>
                <View style={[styles.chip, { backgroundColor: sc.bg }]}><Text style={[styles.chipText, { color: sc.fg }]}>{block.status}</Text></View>
              </View>

              <View style={styles.progressHead}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{block.occupied} / {block.totalRooms} Beds</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{pct}%</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
                <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: barColor }} />
              </View>

              <View style={styles.warden}>
                <Text style={[styles.wardenName, { color: colors.text }]}>{block.wardenName}</Text>
                <View style={styles.phoneRow}><Phone size={12} color={colors.textSubtle} /><Text style={[styles.meta, { color: colors.textSubtle, marginTop: 0, marginLeft: 4 }]}>{block.wardenPhone}</Text></View>
              </View>
            </Card>
          );
        })
      )}

      <Text style={[styles.section, { color: colors.text, marginTop: 18 }]}>Hosteller Students</Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Assign rooms to students marked as Hostellers.</Text>

      {isLoadingStudents ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No hosteller students found." />
      ) : (
        students.map((s: any) => (
          <Card key={s.id} style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{s.admissionNo || '-'}  •  {s.department || '-'}</Text>
              </View>
              <Button title="Assign Room" variant="secondary" size="sm" fullWidth={false} onPress={() => openAssign(s)} />
            </View>
            <View style={styles.roomRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Hostel Block</Text>
                <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{s.hostelBlockName || '-'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Room No.</Text>
                <Text style={[styles.value, { color: colors.text }]}>{s.hostelRoom || '-'}</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Add Block */}
      <SheetModal
        visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Hostel Block" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsModalOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Save Hostel Block" loading={isAdding} onPress={handleAddBlock} style={styles.flex} />
          </View>
        }>
        <Input label="Block Name" required placeholder="e.g. Ganga Block (Girls Hostel)" value={form.name} onChangeText={(x) => { setF('name')(x); setNameError(''); }} error={nameError} />
        <Select label="Category / Type" value={form.type} onChange={setF('type')} options={TYPE_OPTIONS} />
        <Select label="Current Status" value={form.status} onChange={setF('status')} options={STATUS_OPTIONS} />
        <Input label="Total Capacity (Beds)" keyboardType="number-pad" value={String(form.totalRooms)} onChangeText={(x) => setF('totalRooms')(digits(x))} />
        <Input label="Currently Occupied" keyboardType="number-pad" value={String(form.occupied)} onChangeText={(x) => setF('occupied')(digits(x))} />
        <Input label="Warden / Caretaker Name" placeholder="e.g. Dr. Meena Iyer" value={form.wardenName} onChangeText={setF('wardenName')} />
        <Input label="Warden Contact Phone" placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" value={form.wardenPhone} onChangeText={setF('wardenPhone')} />
      </SheetModal>

      {/* Assign Room */}
      <SheetModal
        visible={isAssignModalOpen} onClose={closeAssign} title="Assign Hostel Room"
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={closeAssign} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Assign Room" loading={isAssigningRoom} onPress={handleAssignRoom} style={styles.flex} />
          </View>
        }>
        {selectedStudent ? <Text style={[styles.assignFor, { color: colors.textMuted }]}>Student: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{selectedStudent.name}</Text></Text> : null}
        <Select label="Select Hostel Block" required value={assignForm.hostelBlockId} onChange={(v) => setAssignForm((p) => ({ ...p, hostelBlockId: v }))} options={blockOptions} placeholder="-- Select Block --" error={assignErrors.hostelBlockId} />
        <Input label="Room Number" required placeholder="e.g. 101-A" value={assignForm.hostelRoom} onChangeText={(x) => setAssignForm((p) => ({ ...p, hostelRoom: x }))} error={assignErrors.hostelRoom} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  statCell: { flex: 1 },
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginTop: 8 },
  sectionSub: { fontSize: 11, marginTop: 2, marginBottom: 10 },
  loader: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  delBtn: { padding: 6 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: fontWeight.bold },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  warden: { marginTop: 12 },
  wardenName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  roomRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
  assignFor: { fontSize: fontSize.sm, marginBottom: 14 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});