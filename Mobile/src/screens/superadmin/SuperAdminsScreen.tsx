import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Key, Mail, ShieldCheck, Trash2, Users } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { syncChannel } from '../../utils/syncChannel';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDate, initials } from '../../utils/format';
import { toast } from '../../utils/toast';
import type { ApiEnvelope } from '../../types/api';
import type { AdminUser, College } from '../../types/models';

/** Web: pages/superadmin/SuperAdmins.jsx  ->  GET /users?role=admin, DELETE /users/:id */
export default function SuperAdminsScreen() {
  const confirm = useConfirm();
  const { colors } = useTheme();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [menuAdmin, setMenuAdmin] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setIsLoading(true);
    try {
      const [usersRes, collegesRes] = await Promise.all([
        api.get<ApiEnvelope<AdminUser[]>>('/users', { params: { role: 'admin' } }),
        // used only to show the admin name + college code (GET /users does not return them)
        api.get<ApiEnvelope<College[]>>('/colleges').catch(() => ({ data: [] as College[] })),
      ]);
      setAdmins(Array.isArray(usersRes?.data) ? usersRes.data : []);
      setColleges(Array.isArray(collegesRes?.data) ? collegesRes.data : []);
    } catch (e: any) {
      toast.error(e?.message || 'Error fetching admins');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // colleges deleted / onboarded elsewhere -> keep this list fresh
  useEffect(() => syncChannel.subscribe('colleges', () => load(true)), [load]);

  const collegeById = useMemo(() => {
    const map = new Map<string, College>();
    colleges.forEach((c) => map.set(c.id, c));
    return map;
  }, [colleges]);

  const nameOf = (admin: AdminUser) => {
    if (admin.name) return admin.name;
    const fromCollege = collegeById.get(admin.collegeId || '')?.users?.find((u) => u.id === admin.id)?.name;
    return fromCollege || admin.email.split('@')[0];
  };
  const codeOf = (admin: AdminUser) => {
    const c = collegeById.get(admin.collegeId || '');
    return c?.registrationNo || (admin.collegeId ? admin.collegeId.substring(0, 8).toUpperCase() : 'N/A');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (a) =>
        nameOf(a).toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        codeOf(a).toLowerCase().includes(q) ||
        collegeById.get(a.collegeId || '')?.name?.toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admins, search, collegeById]);

  const handleResetPassword = async (admin: AdminUser) => {
    setBusy(true);
    try {
      // existing backend flow: POST /auth/forgot-password -> emails the reset link
      await api.post('/auth/forgot-password', { email: admin.email });
      toast.success(`Password reset link sent to ${admin.email}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send reset link');
    } finally {
      setBusy(false);
      setMenuAdmin(null);
    }
  };

  const handleDelete = async (admin: AdminUser) => {
    setMenuAdmin(null);
    const ok = await confirm({ title: 'Delete admin?', message: 'Are you sure you want to delete this admin?', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`/users/${admin.id}`);
      toast.success('Admin deleted successfully');
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete admin');
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={() => load(true)}>
      <PageHeader title="College Admins" subtitle="Manage administrative accounts for all onboarded institutions." />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, email, or college code..." />
      <View style={{ height: 14 }} />

      {isLoading ? (
        <Loader label="Loading admins..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No admins found" message="Admins are created when onboarding a new college." />
      ) : (
        filtered.map((admin) => (
          <Card key={admin.id} onPress={() => setMenuAdmin(admin)} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.cardAlt }]}>
                <Text style={{ color: colors.textMuted, fontWeight: fontWeight.extrabold, fontSize: fontSize.md }}>{initials(nameOf(admin))}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {nameOf(admin)}
                </Text>
                <View style={styles.emailRow}>
                  <Mail size={12} color={colors.textSubtle} />
                  <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
                    {admin.email}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.badges}>
              <Badge label={codeOf(admin)} tone="primary" />
              <View style={{ width: 8 }} />
              <Badge label="College Admin" tone="info" />
              <Text style={[styles.joined, { color: colors.textSubtle }]}>{admin.createdAt ? formatDate(admin.createdAt) : 'Just now'}</Text>
            </View>
          </Card>
        ))
      )}

      <SheetModal visible={!!menuAdmin} onClose={() => setMenuAdmin(null)} title={menuAdmin ? nameOf(menuAdmin) : ''}>
        {menuAdmin ? (
          <View>
            <View style={[styles.infoBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <ShieldCheck size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.sm }}>{menuAdmin.email}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                  {collegeById.get(menuAdmin.collegeId || '')?.name || 'College'} • {codeOf(menuAdmin)}
                </Text>
              </View>
            </View>
            <View style={{ height: 14 }} />
            <Button title="Reset Password" variant="outline" icon={Key} loading={busy} onPress={() => handleResetPassword(menuAdmin)} />
            <View style={{ height: 10 }} />
            <Button title="Delete Admin" variant="danger" icon={Trash2} disabled={busy} onPress={() => handleDelete(menuAdmin)} />
            <View style={{ height: 8 }} />
          </View>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  email: { fontSize: fontSize.xs, marginLeft: 5, flex: 1 },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  joined: { marginLeft: 'auto', fontSize: fontSize.xs },
  infoBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12 },
});
