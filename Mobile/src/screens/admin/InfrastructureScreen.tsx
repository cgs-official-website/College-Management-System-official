import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Building, Calendar, CheckCircle, CheckCircle2, Clock, Edit, MapPin, Plus, Trash2, Users, Wrench, XCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useInfrastructure } from '../../hooks/useInfrastructure';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { FacilityFormModal } from '../../features/infrastructure/FacilityFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

const REQUEST_FILTERS = [
  { value: 'ALL', label: 'All' }, { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
];

/** Web: pages/admin/infrastructure/Infrastructure.jsx */
export default function InfrastructureScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const {
    facilities, requests, isLoading, isRequestsLoading, addFacility, updateFacility, deleteFacility, reviewRequest,
    isAdding, isUpdating, isReviewing, refetch,
  } = useInfrastructure(collegeId);

  const [activeTab, setActiveTab] = useState<'facilities' | 'requests'>('facilities');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [facilityPage, setFacilityPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [size, setSize] = useState(10);

  const q = searchTerm.trim().toLowerCase();
  const filteredFacilities = useMemo(
    () => facilities.filter((f: any) => (f.name || '').toLowerCase().includes(q) || (f.type || '').toLowerCase().includes(q) || (f.building || f.location || '').toLowerCase().includes(q)),
    [facilities, q],
  );
  const filteredRequests = useMemo(
    () =>
      requests.filter((r: any) => {
        const hay = [r.facility?.name, r.eventName, r.department?.name, r.requester?.name || r.requester?.email].map((x) => (x || '').toLowerCase());
        return hay.some((h) => h.includes(q)) && (statusFilter === 'ALL' || r.status === statusFilter);
      }),
    [requests, q, statusFilter],
  );
  const pagedFacilities = filteredFacilities.slice((facilityPage - 1) * size, facilityPage * size);
  const pagedRequests = filteredRequests.slice((requestPage - 1) * size, requestPage * size);
  const pendingCount = requests.filter((r: any) => r.status === 'pending').length;

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Remove Facility', message: 'Are you sure you want to remove this facility from the registry?', confirmText: 'Remove', isDestructive: true })) {
      await deleteFacility(id).catch(() => {});
    }
  };

  const handleSubmitFacility = async (data: any) => {
    try {
      if (editing) await updateFacility({ id: editing.id, data });
      else await addFacility(data);
      setIsFormOpen(false);
    } catch {
      // hook shows the toast
    }
  };

  const openReview = (req: any, action: string) => { setReviewing(req); setReviewAction(action); setRemarks(''); };
  const confirmReview = async () => {
    if (!reviewing) return;
    try {
      await reviewRequest({ id: reviewing.id, status: reviewAction, adminRemarks: remarks.trim() });
      setReviewing(null);
    } catch {
      // hook shows the toast
    }
  };

  const Tab = ({ id, label, badge }: any) => {
    const active = activeTab === id;
    return (
      <Pressable onPress={() => setActiveTab(id)} style={[styles.tab, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}>
        <Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold }}>{label}</Text>
        {badge ? <View style={[styles.tabBadge, { backgroundColor: colors.danger }]}><Text style={styles.tabBadgeText}>{badge}</Text></View> : null}
      </Pressable>
    );
  };

  const statusBadge = (s: string) => {
    if (s === 'operational' || s === 'active') return <View style={styles.statusRow}><CheckCircle size={13} color={colors.success} /><Text style={[styles.statusText, { color: colors.success }]}>Operational</Text></View>;
    if (s === 'maintenance') return <View style={styles.statusRow}><Wrench size={13} color={colors.warning} /><Text style={[styles.statusText, { color: colors.warning }]}>Maintenance</Text></View>;
    return <View style={styles.statusRow}><Building size={13} color={colors.textMuted} /><Text style={[styles.statusText, { color: colors.textMuted }]}>Closed</Text></View>;
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.banner}>
        <View style={styles.bannerGlow} />
        <Text style={styles.bannerTitle}>Infrastructure & Facilities</Text>
        <Text style={styles.bannerSub}>Manage auditoriums, halls, labs and review departmental reservation requests.</Text>
        <Pressable onPress={() => { setEditing(null); setIsFormOpen(true); }} style={styles.bannerBtn}>
          <Plus size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: fontWeight.extrabold, fontSize: 12, marginLeft: 6 }}>Add Facility</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Tab id="facilities" label={`Facilities (${facilities.length})`} />
        <Tab id="requests" label="HOD Requests" badge={pendingCount > 0 ? pendingCount : null} />
      </View>

      {activeTab === 'requests' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
          {REQUEST_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <Pressable key={f.value} onPress={() => { setStatusFilter(f.value); setRequestPage(1); }} style={[styles.chip, { backgroundColor: active ? colors.primarySoft : colors.card, borderColor: active ? colors.primary : colors.border }]}>
                <Text style={{ color: active ? colors.primary : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <SearchBar
        value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setFacilityPage(1); setRequestPage(1); }} style={styles.search}
        placeholder={activeTab === 'facilities' ? 'Search facility name, type...' : 'Search event, HOD, venue...'}
      />

      {activeTab === 'facilities' ? (
        isLoading ? (
          <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : filteredFacilities.length === 0 ? (
          <EmptyState icon={Building} title="No facilities registered" message="Register auditoriums, seminar halls or labs to allow HODs to request bookings." actionLabel="Add Facility" onAction={() => { setEditing(null); setIsFormOpen(true); }} />
        ) : (
          <>
            {pagedFacilities.map((fac: any) => (
              <Card key={fac.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}><Building size={18} color={colors.primary} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{fac.name}</Text>
                    <Badge label={fac.type || 'Facility'} tone="info" small />
                  </View>
                  <Pressable onPress={() => { setEditing(fac); setIsFormOpen(true); }} hitSlop={8} style={styles.iconBtn}><Edit size={17} color={colors.primary} /></Pressable>
                  <Pressable onPress={() => handleDelete(fac.id)} hitSlop={8} style={styles.iconBtn}><Trash2 size={17} color={colors.danger} /></Pressable>
                </View>
                <View style={styles.info}><MapPin size={13} color={colors.textMuted} /><Text style={[styles.meta, { color: colors.textMuted }]}>{fac.building || fac.location || 'Main Campus'}</Text></View>
                <View style={styles.info}><Users size={13} color={colors.textMuted} /><Text style={[styles.meta, { color: colors.textMuted }]}>Capacity: {fac.capacity || 0} seats</Text></View>
                <View style={[styles.footerRow, { borderColor: colors.border }]}>
                  {statusBadge(fac.status)}
                  {fac.features ? <Text style={[styles.meta, { color: colors.textSubtle, flexShrink: 1 }]} numberOfLines={1}>{fac.features}</Text> : null}
                </View>
              </Card>
            ))}
            <Pagination totalItems={filteredFacilities.length} currentPage={facilityPage} pageSize={size} onPageChange={setFacilityPage} onPageSizeChange={(s) => { setSize(s); setFacilityPage(1); setRequestPage(1); }} />
          </>
        )
      ) : isRequestsLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filteredRequests.length === 0 ? (
        <EmptyState icon={Calendar} title="No requests" message="No facility requests found for the selected criteria." />
      ) : (
        <>
          {pagedRequests.map((req: any) => {
            const date = req.eventDate ? new Date(req.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
            return (
              <Card key={req.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{req.eventName}</Text>
                    {req.purpose ? <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={2}>{req.purpose}</Text> : null}
                  </View>
                  <Badge label={req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending'} tone={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'} small />
                </View>
                <View style={styles.info}><Building size={13} color={colors.primary} /><Text style={[styles.meta, { color: colors.text }]}>{req.facility?.name || 'Facility'}</Text></View>
                <View style={styles.info}><Users size={13} color={colors.textMuted} /><Text style={[styles.meta, { color: colors.textMuted }]}>{req.department?.name || 'Department'} • {req.requester?.name || req.requester?.email || 'HOD'}</Text></View>
                <View style={styles.info}><Calendar size={13} color={colors.textMuted} /><Text style={[styles.meta, { color: colors.textMuted }]}>{date}</Text></View>
                <View style={styles.info}><Clock size={13} color={colors.textMuted} /><Text style={[styles.meta, { color: colors.textMuted }]}>{req.startTime} - {req.endTime} • {req.expectedAttendees || 0} attendees</Text></View>
                {req.status === 'pending' ? (
                  <View style={styles.actions}>
                    <Pressable onPress={() => openReview(req, 'approved')} style={[styles.actionBtn, { backgroundColor: colors.successSoft }]}><CheckCircle2 size={15} color={colors.success} /><Text style={[styles.actionText, { color: colors.success }]}>Approve</Text></Pressable>
                    <Pressable onPress={() => openReview(req, 'rejected')} style={[styles.actionBtn, { backgroundColor: colors.dangerSoft }]}><XCircle size={15} color={colors.danger} /><Text style={[styles.actionText, { color: colors.danger }]}>Reject</Text></Pressable>
                  </View>
                ) : (
                  <Text style={[styles.meta, { color: colors.textSubtle, marginTop: 8 }]}>{req.adminRemarks ? `Remarks: ${req.adminRemarks}` : 'Reviewed'}</Text>
                )}
              </Card>
            );
          })}
          <Pagination totalItems={filteredRequests.length} currentPage={requestPage} pageSize={size} onPageChange={setRequestPage} onPageSizeChange={(s) => { setSize(s); setFacilityPage(1); setRequestPage(1); }} />
        </>
      )}

      <FacilityFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmitFacility} initialData={editing} isLoading={isAdding || isUpdating} />

      <SheetModal
        visible={!!reviewing} onClose={() => setReviewing(null)} title={`${reviewAction === 'approved' ? 'Approve' : 'Reject'} Facility Request`}
        footer={
          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setReviewing(null)} />
            <Button title={reviewAction === 'approved' ? 'Approve' : 'Reject'} variant={reviewAction === 'approved' ? 'primary' : 'danger'} loading={isReviewing} style={{ flex: 1 }} onPress={confirmReview} />
          </View>
        }>
        {reviewing ? (
          <>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Facility: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{reviewing.facility?.name}</Text></Text>
            <Text style={[styles.meta, { color: colors.textMuted, marginTop: 4 }]}>Event: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{reviewing.eventName}</Text></Text>
            <Text style={[styles.meta, { color: colors.textMuted, marginTop: 4, marginBottom: 12 }]}>Requested by: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{reviewing.requester?.name || reviewing.requester?.email} ({reviewing.department?.name})</Text></Text>
            <Input label="Admin Remarks / Note (Optional)" multiline value={remarks} onChangeText={setRemarks} placeholder="Add a note for the HOD..." />
          </>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: 16, marginBottom: 12, backgroundColor: '#0F172A', overflow: 'hidden' },
  bannerGlow: { position: 'absolute', right: -50, bottom: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(5,150,105,0.35)' },
  bannerTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  bannerSub: { color: 'rgba(226,232,240,0.85)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  bannerBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 14, height: 38, marginTop: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 38 },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 6, paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: fontWeight.extrabold },
  rowScroll: { flexGrow: 0, marginBottom: 10 },
  rowContent: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 34, alignItems: 'center', justifyContent: 'center' },
  search: { marginBottom: 12 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  iconBtn: { padding: 6, marginLeft: 2 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginBottom: 3 },
  meta: { fontSize: 12, lineHeight: 17 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 11, fontWeight: fontWeight.extrabold },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 10, gap: 6 },
  actionText: { fontSize: 12, fontWeight: fontWeight.extrabold },
});