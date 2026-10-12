import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bus, MapPin, Phone, Plus, QrCode, Trash2, Users } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useTransport } from '../../hooks/useTransport';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExcelUploadButton, ExcelField } from '../../components/ui/ExcelUploadButton';
import { fontSize, fontWeight } from '../../theme/typography';

const TRANSPORT_IMPORT_FIELDS: ExcelField[] = [
  { name: 'Route_Name', required: true, type: 'String', description: 'Name or title of the transport route', example: 'Route 1 - North Campus' },
  { name: 'Bus_Number', required: true, type: 'String', description: 'Vehicle / Bus registration number', example: 'TN-01-AB-1234' },
  { name: 'Driver_Name', type: 'String', description: 'Name of the designated driver', example: 'Rajesh Kumar' },
  { name: 'Driver_Phone', type: 'String', description: 'Contact number of the driver', example: '+91 98765 43210' },
  { name: 'Stops', type: 'String', description: 'Comma-separated route stops or waypoints', example: 'City Gate, Metro Station, Main Campus' },
  { name: 'Capacity', type: 'Number', description: 'Total seating capacity', example: '45' },
  { name: 'Status', type: 'String', description: 'Status: On Time, Delayed, Maintenance', example: 'On Time' },
];

const STATUS_OPTIONS = ['On Time', 'Delayed', 'Maintenance'].map((x) => ({ value: x, label: x }));
const blank = () => ({ name: '', busNumber: '', driverName: '', driverPhone: '', stops: '', capacity: '45', status: 'On Time' });

const statusTone = (s?: string): BadgeTone => (s === 'On Time' ? 'success' : s === 'Delayed' ? 'danger' : s === 'Maintenance' ? 'warning' : 'neutral');

/** Web: pages/admin/transport/TransportDashboard.jsx */
export default function TransportScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { items: routes, stats, isLoading, isAdding, createItem, deleteItem, bulkImport, isImporting, refetch } = useTransport(collegeId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [nameError, setNameError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setF = (k: string) => (x: string) => setForm((p: any) => ({ ...p, [k]: x }));

  const handleAddRoute = async () => {
    if (!form.name.trim()) { setNameError('Route name is required'); return; }
    try {
      await createItem({
        name: form.name.trim(),
        busNumber: form.busNumber.trim() || 'Bus #01',
        driverName: form.driverName.trim() || 'Staff Driver',
        driverPhone: form.driverPhone.trim() || '+91 98765 43210',
        stops: form.stops.trim() || 'City Gate, Campus',
        capacity: Number(form.capacity) || 45,
        status: form.status,
      });
      setIsModalOpen(false);
      setForm(blank());
    } catch {
      // toast handled by the hook
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (await confirm({ title: 'Delete Transport Route', message: `Are you sure you want to remove "${name}"?`, confirmText: 'Delete', isDestructive: true })) {
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
          <Text style={[styles.title, { color: colors.text }]}>Transport Tracking</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage school buses, routes, and daily transport operations.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <ExcelUploadButton
          label="Import Excel" title="Import Transport Routes & Buses"
          description="Upload an Excel sheet (.xlsx, .xls) or CSV file with your route and bus data."
          fields={TRANSPORT_IMPORT_FIELDS} sampleFileName="transport_routes_template.xlsx" onUpload={bulkImport} isLoading={isImporting}
        />
        <View style={{ width: 8 }} />
        <Button title="Add Bus Route" size="sm" fullWidth={false} icon={Plus} onPress={() => { setForm(blank()); setNameError(''); setIsModalOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total Buses" value={isLoading ? '...' : stats.totalBuses} icon={Bus} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Active Routes" value={isLoading ? '...' : stats.activeRoutes} icon={MapPin} tone="success" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Registered Students" value={isLoading ? '...' : stats.registeredStudents} icon={Users} tone="info" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="QR Scans Today" value={isLoading ? '...' : stats.qrScansToday} icon={QrCode} tone="warning" /></View>
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Active Transport Routes</Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Real-time bus assignments and route monitoring.</Text>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : routes.length === 0 ? (
        <EmptyState icon={Bus} title="No transport routes created yet." message='Tap "Add Bus Route" to configure your first vehicle route.' />
      ) : (
        routes.map((route: any) => (
          <Card key={route.id} style={styles.card}>
            <View style={styles.top}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}><Bus size={18} color={colors.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{route.name}</Text>
                <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{route.busNumber}</Text>
              </View>
              <Pressable onPress={() => handleDelete(route.id, route.name)} hitSlop={10} style={styles.delBtn}>
                <Trash2 size={17} color={colors.danger} />
              </Pressable>
            </View>

            <View style={styles.badgeRow}><Badge label={route.status || '-'} tone={statusTone(route.status)} /></View>

            <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Driver</Text>
                <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{route.driverName}</Text>
                <View style={styles.phoneRow}><Phone size={11} color={colors.textSubtle} /><Text style={[styles.meta, { color: colors.textSubtle, marginTop: 0, marginLeft: 4 }]}>{route.driverPhone}</Text></View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Capacity</Text>
                <Text style={[styles.value, { color: colors.text }]}>{route.studentsCount || 0} / {route.capacity}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>Stops / Waypoints</Text>
            <Text style={[styles.stops, { color: colors.text }]}>{route.stops}</Text>
          </Card>
        ))
      )}

      <SheetModal
        visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Bus Route" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsModalOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Save Route" loading={isAdding} onPress={handleAddRoute} style={styles.flex} />
          </View>
        }>
        <Input label="Route Name" required placeholder="e.g. Route 1 - North Campus Express" value={form.name} onChangeText={(x) => { setF('name')(x); setNameError(''); }} error={nameError} />
        <Input label="Bus Number / License Plate" placeholder="e.g. TN-33-AX-1234" autoCapitalize="characters" value={form.busNumber} onChangeText={setF('busNumber')} />
        <Input label="Seating Capacity" keyboardType="number-pad" value={String(form.capacity)} onChangeText={(x) => setF('capacity')(x.replace(/[^0-9]/g, ''))} />
        <Input label="Driver Name" placeholder="e.g. Ramesh Kumar" value={form.driverName} onChangeText={setF('driverName')} />
        <Input label="Driver Phone" placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" value={form.driverPhone} onChangeText={setF('driverPhone')} />
        <Input label="Stops / Waypoints" placeholder="e.g. Railway Station, City Center, Gate 2" value={form.stops} onChangeText={setF('stops')} />
        <Select label="Current Status" value={form.status} onChange={setF('status')} options={STATUS_OPTIONS} />
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
  loader: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  delBtn: { padding: 6 },
  badgeRow: { flexDirection: 'row', marginTop: 12 },
  infoRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  stops: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});