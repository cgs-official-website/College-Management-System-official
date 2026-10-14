import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Building, Calendar, CheckCircle2, Clock, Plus, Send, Sparkles, XCircle } from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useInfrastructure } from '../../hooks/useInfrastructure';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar } from '../../components/ui/SearchBar';
import { SheetModal } from '../../components/ui/SheetModal';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';

const todayStr = () => new Date().toISOString().split('T')[0];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const blank = (facilityId = '') => ({
  facilityId,
  eventName: '',
  purpose: '',
  eventDate: todayStr(),
  startTime: '09:00',
  endTime: '12:00',
  expectedAttendees: '50',
  specialRequirements: '',
});

const STATUS_OPTIONS_BASE = [
  { value: 'ALL', label: 'All Status' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

/** Web: pages/teacher/HODFacilityRequests.jsx (useInfrastructure -> /infrastructure, /infrastructure/requests) */
export default function HODFacilityRequestsScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';

  const { facilities, requests, isLoading, isRequestsLoading, createRequest, isRequesting, refetch } = useInfrastructure(collegeId);

  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only facilities created by the college admin are bookable
  const bookable = useMemo(() => facilities.filter((f: any) => ['active', 'operational'].includes(f.status)), [facilities]);
  const facilityOptions = bookable.map((f: any) => ({
    value: String(f.id),
    label: `${f.name} (${f.type} - Capacity: ${f.capacity} seats, ${f.location || 'Campus'})`,
  }));
  const selectedFacility = facilities.find((f: any) => String(f.id) === form.facilityId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r: any) => {
      const matchesSearch =
        (r.facility?.name || '').toLowerCase().includes(q) || (r.eventName || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const statusOptions = STATUS_OPTIONS_BASE.map((o) =>
    o.value === 'ALL' ? { ...o, label: `All Status (${requests.length})` } : o,
  );

  const openModal = () => {
    setForm(blank(bookable[0] ? String(bookable[0].id) : ''));
    setErrors({});
    setOpen(true);
  };

  const set = (k: keyof ReturnType<typeof blank>) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.facilityId) e.facilityId = 'Please select a facility';
    if (!form.eventName.trim()) e.eventName = 'Event name is required';
    if (!isDate(form.eventDate)) e.eventDate = 'Use YYYY-MM-DD';
    if (!isTime(form.startTime)) e.startTime = 'HH:MM';
    if (!isTime(form.endTime)) e.endTime = 'HH:MM';
    if (!e.startTime && !e.endTime && form.endTime <= form.startTime) e.endTime = 'Must be after start';
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    try {
      await createRequest(form);
      setOpen(false);
    } catch {
      // toast shown by the hook
    }
  };

  const StatusPill = ({ status }: { status?: string }) =>
    status === 'approved' ? (
      <View style={[styles.pill, { backgroundColor: colors.successSoft }]}>
        <CheckCircle2 size={13} color={colors.success} />
        <Text style={[styles.pillText, { color: colors.success }]}>Approved by Admin</Text>
      </View>
    ) : status === 'rejected' ? (
      <View style={[styles.pill, { backgroundColor: colors.dangerSoft }]}>
        <XCircle size={13} color={colors.danger} />
        <Text style={[styles.pillText, { color: colors.danger }]}>Rejected</Text>
      </View>
    ) : (
      <View style={[styles.pill, { backgroundColor: colors.warningSoft }]}>
        <Clock size={13} color={colors.warning} />
        <Text style={[styles.pillText, { color: colors.warning }]}>Awaiting Admin Approval</Text>
      </View>
    );

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
      }}>
      {/* Header banner */}
      <View style={styles.banner}>
        <View style={styles.bannerTag}>
          <Sparkles size={13} color="#6ee7b7" />
          <Text style={styles.bannerTagText}>Department Resource & Venue Reservation</Text>
        </View>
        <Text style={styles.bannerTitle}>Facility & Infrastructure Requests</Text>
        <Text style={styles.bannerText}>
          Request institutional auditoriums, seminar halls, and smart labs for departmental symposiums, guest lectures, and academic events.
        </Text>
        <View style={{ marginTop: 16 }}>
          <Button title="Request Facility" icon={Plus} onPress={openModal} />
        </View>
      </View>

      {/* Admin registered facilities */}
      <Card style={styles.block}>
        <View style={styles.facHead}>
          <Building size={16} color={colors.primary} />
          <Text style={[styles.facTitle, { color: colors.text }]}>Admin Registered Facilities ({facilities.length})</Text>
        </View>
        <Text style={[styles.facSub, { color: colors.textSubtle }]}>Dynamically created by Institutional Administration</Text>

        {isLoading ? (
          <Loader size="small" />
        ) : facilities.length === 0 ? (
          <Text style={[styles.facEmpty, { color: colors.textMuted }]}>No facilities registered by college administration yet.</Text>
        ) : (
          facilities.map((fac: any) => (
            <View key={fac.id} style={[styles.fac, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.facName, { color: colors.text }]} numberOfLines={1}>{fac.name}</Text>
                <Text style={[styles.facMeta, { color: colors.textMuted }]}>
                  {fac.type} • {fac.capacity} seats
                </Text>
              </View>
              <Badge label={String(fac.status || 'active').toUpperCase()} tone="success" small />
            </View>
          ))
        )}
      </Card>

      {/* Filters */}
      <Select
        value={statusFilter}
        options={statusOptions}
        onChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      />
      <SearchBar
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Search event name, facility..."
        style={{ marginBottom: 16 }}
      />

      <Text style={[styles.heading, { color: colors.text }]}>Department Request History & Status</Text>

      {isRequestsLoading ? (
        <Loader label="Loading requests..." />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building}
            title="No requests found"
            message={'No facility requests submitted yet. Tap "Request Facility" above to create one.'}
          />
        </Card>
      ) : (
        <>
          {paginated.map((req: any) => {
            const dateStr = req.eventDate
              ? new Date(req.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'TBA';
            return (
              <Card key={req.id} style={styles.card}>
                <Text style={[styles.event, { color: colors.text }]}>{req.eventName}</Text>
                {req.purpose ? <Text style={[styles.purpose, { color: colors.textMuted }]}>{req.purpose}</Text> : null}
                {req.specialRequirements ? (
                  <Text style={[styles.equip, { color: colors.primary }]}>Equipment: {req.specialRequirements}</Text>
                ) : null}

                <View style={[styles.facChip, { backgroundColor: colors.primarySoft }]}>
                  <Building size={13} color={colors.primary} />
                  <Text style={[styles.facChipText, { color: colors.primary }]} numberOfLines={1}>
                    {req.facility?.name || 'Facility'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.primary} />
                  <Text style={[styles.info, { color: colors.text }]}>{dateStr}</Text>
                  <Clock size={14} color={colors.textSubtle} style={{ marginLeft: 10 }} />
                  <Text style={[styles.info, { color: colors.textMuted }]}>
                    {req.startTime} - {req.endTime}
                  </Text>
                </View>
                <Text style={[styles.info, { color: colors.textMuted, marginTop: 6 }]}>
                  {req.expectedAttendees || 0} attendees
                </Text>

                <View style={[styles.statusBox, { borderTopColor: colors.border }]}>
                  <StatusPill status={req.status} />
                  {req.adminRemarks ? (
                    <Text style={[styles.remarks, { color: colors.textMuted }]}>"{req.adminRemarks}"</Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
          <Pagination
            totalItems={filtered.length}
            currentPage={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Request sheet */}
      <SheetModal
        visible={open}
        onClose={() => setOpen(false)}
        title="Raise Facility Request"
        tall
        footer={
          <View style={styles.footerRow}>
            <View style={styles.flex}>
              <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} />
            </View>
            <View style={[styles.flex, { flex: 2 }]}>
              <Button title="Submit to Admin" icon={Send} loading={isRequesting} onPress={submit} />
            </View>
          </View>
        }>
        <View style={[styles.policy, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Text style={[styles.policyText, { color: colors.primary }]}>
            <Text style={{ fontWeight: fontWeight.extrabold }}>Institutional Policy: </Text>
            This request will be instantly dispatched to the College Administration. You will receive an in-app alert notification as soon as the Admin approves or provides feedback.
          </Text>
        </View>

        <Select
          label="Select Facility / Venue"
          required
          searchable
          value={form.facilityId}
          options={facilityOptions}
          onChange={set('facilityId')}
          placeholder="Select admin-created facility..."
          error={errors.facilityId}
        />

        {selectedFacility ? (
          <View style={[styles.facInfo, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[styles.facInfoText, { color: colors.textMuted }]}>
              Location: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{selectedFacility.location || 'Campus'}</Text>
            </Text>
            <Text style={[styles.facInfoText, { color: colors.textMuted }]}>
              Max Capacity: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{selectedFacility.capacity} seats</Text>
            </Text>
          </View>
        ) : null}

        <Input
          label="Event Name / Title"
          required
          placeholder="e.g. Annual National AI & Data Science Symposium"
          value={form.eventName}
          onChangeText={set('eventName')}
          error={errors.eventName}
        />

        <Input
          label="Event Date"
          required
          placeholder="2026-10-20"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          value={form.eventDate}
          onChangeText={set('eventDate')}
          error={errors.eventDate}
        />
        <View style={styles.footerRow}>
          <View style={styles.flex}>
            <Input
              label="Start Time"
              required
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={form.startTime}
              onChangeText={set('startTime')}
              error={errors.startTime}
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="End Time"
              required
              placeholder="12:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={form.endTime}
              onChangeText={set('endTime')}
              error={errors.endTime}
            />
          </View>
        </View>

        <Input
          label="Expected Attendees Count"
          placeholder="e.g. 120"
          keyboardType="numeric"
          value={form.expectedAttendees}
          onChangeText={(v) => set('expectedAttendees')(v.replace(/[^0-9]/g, ''))}
        />
        <Input
          label="Special Equipment Requirements"
          placeholder="e.g. 2 Wireless Mics, Stage Projector, AC"
          value={form.specialRequirements}
          onChangeText={set('specialRequirements')}
        />
        <Input
          label="Event Purpose / Description"
          multiline
          placeholder="Describe the objective of this session, chief guests, or target student batches..."
          value={form.purpose}
          onChangeText={set('purpose')}
        />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { backgroundColor: '#0f172a', borderRadius: 24, padding: 20, marginBottom: 16 },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.12)',
    marginBottom: 12,
  },
  bannerTagText: { color: '#6ee7b7', fontSize: 11, fontWeight: fontWeight.semibold },
  bannerTitle: { color: '#ffffff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, letterSpacing: -0.3 },
  bannerText: { color: '#cbd5e1', fontSize: fontSize.sm, lineHeight: 20, marginTop: 6 },
  block: { marginBottom: 16 },
  facHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  facTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  facSub: { fontSize: 11, marginTop: 4, marginBottom: 12 },
  facEmpty: { fontSize: fontSize.xs },
  fac: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: radius.md, marginBottom: 8 },
  facName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  facMeta: { fontSize: 11, marginTop: 2 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 12 },
  card: { marginBottom: 12 },
  event: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  purpose: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4 },
  equip: { fontSize: 12, fontWeight: fontWeight.medium, marginTop: 6 },
  facChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginTop: 12 },
  facChipText: { fontSize: 12, fontWeight: fontWeight.bold, maxWidth: 240 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  info: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  statusBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: fontWeight.bold },
  remarks: { fontSize: fontSize.sm, fontStyle: 'italic', lineHeight: 20 },
  footerRow: { flexDirection: 'row', gap: 12 },
  policy: { borderWidth: 1, borderRadius: radius.md, padding: 12, marginBottom: 16 },
  policyText: { fontSize: 12, lineHeight: 18 },
  facInfo: { borderWidth: 1, borderRadius: radius.md, padding: 12, marginTop: -4, marginBottom: 16, gap: 4 },
  facInfoText: { fontSize: 12 },
});