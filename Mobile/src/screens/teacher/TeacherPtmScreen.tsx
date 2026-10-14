import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, CalendarClock, MapPin, Plus, Trash2, UserPlus, Video, X } from 'lucide-react-native';

import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const toArray = (res: any): any[] => {
  const raw = res?.data ?? res;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.students)) return raw.students;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};
const errMsg = (err: any) => err?.data?.error?.message || err?.message || 'Something went wrong';
const dayOf = (d: any) => String(d).slice(0, 10);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const studentLabel = (s: any) => {
  const name = s.user?.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || 'Student';
  return s.rollNumber ? `${name} (${s.rollNumber})` : name;
};

/** Same colours as web statusCls: available/completed = green, cancelled = red, else amber. */
const statusTone = (s?: string): BadgeTone =>
  s === 'available' || s === 'completed' ? 'success' : s === 'cancelled' ? 'danger' : 'warning';

const EMPTY_SLOT = { date: '', startTime: '', endTime: '' };
const EMPTY_ASSIGN = { studentId: '', mode: 'online', venue: '', agenda: '' };

/** Web: pages/teacher/TeacherPtm.jsx (/ptm/slots, /ptm/meetings, /ptm/students) */
export default function TeacherPtmScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();

  const [slots, setSlots] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [slotForm, setSlotForm] = useState({ ...EMPTY_SLOT });
  const [creatingSlot, setCreatingSlot] = useState(false);

  const [assignSlot, setAssignSlot] = useState<any>(null);
  const [assignForm, setAssignForm] = useState({ ...EMPTY_ASSIGN });
  const [assigning, setAssigning] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const loadSlots = useCallback(async () => {
    try {
      const res = await api.get<any>('/ptm/slots');
      if (mounted.current) setSlots(toArray(res));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      if (mounted.current) setSlotsLoading(false);
    }
  }, []);

  const loadMeetings = useCallback(async () => {
    try {
      const res = await api.get<any>('/ptm/meetings');
      if (mounted.current) setMeetings(toArray(res));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      if (mounted.current) setMeetingsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadSlots(), loadMeetings()]);
  }, [loadSlots, loadMeetings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Students are only needed once the assign sheet is opened (same as web `enabled: !!assignSlot`)
  useEffect(() => {
    if (!assignSlot) return;
    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const res = await api.get<any>('/ptm/students');
        if (!cancelled) setStudents(toArray(res));
      } catch (err) {
        if (!cancelled) toast.error(errMsg(err));
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignSlot]);

  const handleCreateSlot = async () => {
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) {
      toast.error('Please fill date, start time and end time');
      return;
    }
    if (!isDate(slotForm.date)) return toast.error('Use date format YYYY-MM-DD');
    if (!isTime(slotForm.startTime) || !isTime(slotForm.endTime)) return toast.error('Use time format HH:MM (24-hour)');
    if (slotForm.endTime <= slotForm.startTime) {
      toast.error('End time must be after start time');
      return;
    }

    setCreatingSlot(true);
    try {
      await api.post('/ptm/slots', slotForm);
      toast.success('Slot added');
      setSlotForm({ ...EMPTY_SLOT });
      await refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Slot',
      message: 'Are you sure you want to delete this slot?',
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/ptm/slots/${id}`);
      toast.success('Slot deleted');
      await refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const closeAssign = () => {
    setAssignSlot(null);
    setAssignForm({ ...EMPTY_ASSIGN });
  };

  const handleAssign = async () => {
    if (!assignForm.studentId) {
      toast.error('Please select a student');
      return;
    }
    if (assignForm.mode === 'offline' && !assignForm.venue.trim()) {
      toast.error('Venue is required for offline meetings');
      return;
    }

    setAssigning(true);
    try {
      await api.post('/ptm/meetings', {
        slotId: assignSlot.id,
        studentId: assignForm.studentId,
        mode: assignForm.mode,
        venue: assignForm.mode === 'offline' ? assignForm.venue.trim() : undefined,
        agenda: assignForm.agenda.trim() || undefined,
      });
      toast.success('Meeting assigned to student');
      closeAssign();
      await refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setAssigning(false);
    }
  };

  const updateMeeting = async (id: string, status: 'completed' | 'cancelled') => {
    if (status === 'cancelled') {
      const ok = await confirm({
        title: 'Cancel Meeting',
        message: 'Are you sure you want to cancel this meeting?',
        confirmText: 'Cancel Meeting',
        isDestructive: true,
      });
      if (!ok) return;
    }
    setUpdatingId(id);
    try {
      await api.patch(`/ptm/meetings/${id}`, { status });
      toast.success('Meeting updated');
      await refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error('Could not open the meeting link');
    }
  };

  const setSlot = (k: keyof typeof EMPTY_SLOT) => (v: string) => setSlotForm((p) => ({ ...p, [k]: v }));

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
      }}>
      <Text style={[styles.title, { color: colors.text }]}>Parent-Teacher Meetings</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Create your available slots and assign meetings to students.
      </Text>

      {/* Add slot */}
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>Add Availability Slot</Text>
        <Input
          label="Date"
          required
          placeholder="2026-10-20"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          value={slotForm.date}
          onChangeText={setSlot('date')}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              label="Start Time"
              required
              placeholder="10:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={slotForm.startTime}
              onChangeText={setSlot('startTime')}
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="End Time"
              required
              placeholder="10:30"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={slotForm.endTime}
              onChangeText={setSlot('endTime')}
            />
          </View>
        </View>
        <Text style={[styles.hint, { color: colors.textSubtle }]}>Date: YYYY-MM-DD · Time: 24-hour HH:MM</Text>
        <Button title="Add Slot" icon={Plus} loading={creatingSlot} onPress={handleCreateSlot} />
      </Card>

      {/* My slots */}
      <View style={styles.sectionHead}>
        <Text style={[styles.heading, styles.noMb, { color: colors.text }]}>My Slots</Text>
        <Badge label={String(slots.length)} tone="primary" />
      </View>
      {slotsLoading ? (
        <Loader />
      ) : slots.length === 0 ? (
        <Card style={styles.block}>
          <EmptyState icon={CalendarClock} title="No slots yet" message="Add your first availability slot." />
        </Card>
      ) : (
        <View style={styles.block}>
          {slots.map((s: any) => (
            <Card key={s.id} style={styles.item}>
              <View style={styles.top}>
                <View style={styles.flex}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{dayOf(s.date)}</Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {s.startTime} - {s.endTime}
                  </Text>
                </View>
                <Badge label={String(s.status || '').toUpperCase()} tone={statusTone(s.status)} small />
              </View>
              {s.status !== 'booked' ? (
                <View style={[styles.actions, { borderTopColor: colors.border }]}>
                  {s.status === 'available' ? (
                    <View style={styles.flex}>
                      <Button title="Assign" size="sm" icon={UserPlus} onPress={() => setAssignSlot(s)} />
                    </View>
                  ) : null}
                  {s.status !== 'booked' ? (
                    <Pressable
                      onPress={() => handleDeleteSlot(s.id)}
                      hitSlop={8}
                      style={[styles.iconBtn, { backgroundColor: colors.dangerSoft }]}
                      accessibilityLabel="Delete slot">
                      <Trash2 size={17} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {/* Assigned meetings */}
      <View style={styles.sectionHead}>
        <Text style={[styles.heading, styles.noMb, { color: colors.text }]}>Assigned Meetings</Text>
        <Badge label={String(meetings.length)} tone="primary" />
      </View>
      {meetingsLoading ? (
        <Loader />
      ) : meetings.length === 0 ? (
        <Card>
          <Text style={[styles.empty, { color: colors.textMuted }]}>No meetings assigned yet.</Text>
        </Card>
      ) : (
        meetings.map((m: any) => (
          <Card key={m.id} style={styles.item}>
            <View style={styles.top}>
              <Text style={[styles.itemTitle, styles.flex, { color: colors.text }]} numberOfLines={2}>
                {m.student ? studentLabel(m.student) : 'Student'}
              </Text>
              <Badge label={String(m.status || '').toUpperCase()} tone={statusTone(m.status)} small />
            </View>
            {m.slot ? (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {dayOf(m.slot.date)} • {m.slot.startTime} - {m.slot.endTime}
              </Text>
            ) : null}
            {m.agenda ? <Text style={[styles.agenda, { color: colors.text }]}>{m.agenda}</Text> : null}

            <View style={[styles.actions, { borderTopColor: colors.border, flexWrap: 'wrap' }]}>
              {m.mode === 'online' && m.meetingLink ? (
                <Button
                  title="Join Meeting"
                  size="sm"
                  icon={Video}
                  fullWidth={false}
                  style={{ backgroundColor: colors.success, borderColor: colors.success }}
                  onPress={() => openLink(m.meetingLink)}
                />
              ) : (
                <View style={styles.venue}>
                  <MapPin size={15} color={colors.textMuted} />
                  <Text style={[styles.venueText, { color: colors.textMuted }]}>{m.venue || 'Offline'}</Text>
                </View>
              )}
              {m.status === 'scheduled' ? (
                <>
                  <Button
                    title="Mark Completed"
                    size="sm"
                    icon={Check}
                    fullWidth={false}
                    loading={updatingId === m.id}
                    onPress={() => updateMeeting(m.id, 'completed')}
                  />
                  <Button
                    title="Cancel"
                    size="sm"
                    variant="outline"
                    icon={X}
                    fullWidth={false}
                    disabled={updatingId === m.id}
                    onPress={() => updateMeeting(m.id, 'cancelled')}
                  />
                </>
              ) : null}
            </View>
          </Card>
        ))
      )}

      {/* Assign sheet */}
      <SheetModal
        visible={!!assignSlot}
        onClose={closeAssign}
        title="Assign Meeting"
        tall
        footer={
          <Button title="Assign Meeting" icon={UserPlus} loading={assigning} onPress={handleAssign} />
        }>
        {assignSlot ? (
          <Text style={[styles.meta, { color: colors.textMuted, marginBottom: 14 }]}>
            {dayOf(assignSlot.date)} • {assignSlot.startTime} - {assignSlot.endTime}
          </Text>
        ) : null}

        <Select
          label="Student"
          required
          searchable
          value={assignForm.studentId}
          options={students.map((s: any) => ({ value: String(s.id), label: studentLabel(s) }))}
          onChange={(v) => setAssignForm((p) => ({ ...p, studentId: v }))}
          placeholder={studentsLoading ? 'Loading students...' : 'Select student'}
          disabled={studentsLoading}
        />
        <Select
          label="Mode"
          value={assignForm.mode}
          options={[
            { value: 'online', label: 'Online (link auto-generated)' },
            { value: 'offline', label: 'Offline' },
          ]}
          onChange={(v) => setAssignForm((p) => ({ ...p, mode: v }))}
        />
        {assignForm.mode === 'offline' ? (
          <Input
            label="Venue"
            required
            placeholder="Example: Staff Room, Block A"
            value={assignForm.venue}
            onChangeText={(v) => setAssignForm((p) => ({ ...p, venue: v }))}
          />
        ) : null}
        <Input
          label="Agenda (optional)"
          multiline
          placeholder="What do you want to discuss?"
          value={assignForm.agenda}
          onChangeText={(v) => setAssignForm((p) => ({ ...p, agenda: v }))}
        />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  block: { marginBottom: 20 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 14 },
  noMb: { marginBottom: 0 },
  row: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: fontSize.xs, marginTop: -8, marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  item: { marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.sm, marginTop: 4 },
  agenda: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  venue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  venueText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  empty: { textAlign: 'center', paddingVertical: 12, fontSize: fontSize.sm },
});