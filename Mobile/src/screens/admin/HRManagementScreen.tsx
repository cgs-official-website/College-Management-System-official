import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Building,
  Edit,
  Eye,
  Mail,
  Link2,
  Phone,
  Plus,
  Send,
  Shield,
  Trash2,
  Users,
} from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useStaff } from '../../hooks/useStaff';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExcelUploadButton } from '../../components/ui/ExcelUploadButton';

import { StaffFormModal } from '../../features/hr/StaffFormModal';
import { StaffDetailsModal } from '../../features/hr/StaffDetailsModal';

import { fontSize, fontWeight } from '../../theme/typography';

const IMPORT_FIELDS = [
  { name: 'Employee_ID', required: true, example: 'TCH001' },
  { name: 'Staff_Name', required: true, example: 'Robert Oppenheimer' },
  { name: 'Department', required: true, example: 'Physics' },
  { name: 'Email_ID', required: true, example: 'robert@college.edu' },
  { name: 'Designation', example: 'Assistant Professor' },
  { name: 'Mobile_Number', example: '9876543210' },
  { name: 'Date_of_Joining', example: '2026-06-01' },
  { name: 'Gender', example: 'Male' },
  { name: 'Employment_Type', example: 'Full-time' },
];

export default function HRManagementScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();

  const collegeId = userData?.collegeId || 'default_college_id';

  const {
    staff,
    isLoading,
    addStaff,
    updateStaff,
    deleteStaff,
    isAdding,
    isUpdating,
    isImporting,
    bulkImport,
    refetch,
    sendSetupMail,
    generateSetupLink,
    isSendingSetup,
    isGeneratingLink,
  } = useStaff(collegeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [viewingStaff, setViewingStaff] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [busySetupId, setBusySetupId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) {
      return staff;
    }

    return staff.filter((member: any) => {
      const fullName = [
        member.firstName || '',
        member.lastName || '',
        member.name || '',
      ]
        .join(' ')
        .toLowerCase();

      return (
        fullName.includes(q) ||
        String(member.department || '').toLowerCase().includes(q) ||
        String(member.email || '').toLowerCase().includes(q) ||
        String(member.teacherId || '').toLowerCase().includes(q)
      );
    });
  }, [staff, searchTerm]);

  const rows = filtered.slice(
    (page - 1) * size,
    page * size,
  );

  const openAdd = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const openEdit = (member: any) => {
    setEditingStaff(member);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Staff',
      message: 'Are you sure you want to delete this user?',
      confirmText: 'Delete',
      isDestructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteStaff(id);
    } catch {
      // The useStaff hook handles the error notification.
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingStaff) {
        await updateStaff({
          id: editingStaff.id,
          data,
        });
      } else {
        await addStaff(data);
      }

      setIsFormOpen(false);
      setEditingStaff(null);
    } catch {
      // Keep the form open so the user can correct the data.
    }
  };

  // ---- Staff account-setup e-mail (same API the web admin uses) ----
  const hasRealEmail = (member: any) =>
    !!member?.email && !String(member.email).toLowerCase().includes('@pending.local');

  const handleSendSetupMail = async (member: any) => {
    const confirmed = await confirm({
      title: 'Send Setup Email',
      message: `Send the account setup link to ${member.email}?`,
      confirmText: 'Send',
    });
    if (!confirmed) return;

    setBusySetupId(member.id);
    try {
      await sendSetupMail(member.id);
    } catch {
      // useStaff already shows the error toast
    } finally {
      setBusySetupId(null);
    }
  };

  const handleShareSetupLink = async (member: any) => {
    setBusySetupId(member.id);
    try {
      const url = await generateSetupLink(member.id);
      if (url) {
        await Share.share({ message: `Set up your teacher account: ${url}` });
      }
    } catch {
      // useStaff already shows the error toast (Share dismissal is not an error)
    } finally {
      setBusySetupId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const roleBadge = (role?: string, member?: any) => {
    const rawDesig = (member?.designation || '').trim();
    const isGenericDesig = !rawDesig || ['teacher', 'staff', 'n/a', 'support'].includes(rawDesig.toLowerCase());
    const specificDesignation = !isGenericDesig ? rawDesig : null;
    const specificRole = (member?.customRole || specificDesignation || '').trim();

    const normalizedRole = String(role || member?.role || '').toLowerCase();
    const isHod = normalizedRole === 'hod' || (specificRole && /^(hod|head of department)$/i.test(specificRole));
    const isAdmin = normalizedRole === 'admin' || (specificRole && /^admin(istrator)?$/i.test(specificRole));
    const isNonTeaching = member?.staffType === 'non-teaching' || normalizedRole === 'staff' ||
      /admin|office|library|account|clerk|reception|driver|peon|warden|security|maintenance|store/i.test(specificRole);

    let badge = {
      label: specificRole || (normalizedRole === 'teacher' ? 'Teacher' : (normalizedRole === 'staff' ? 'Staff' : 'Support')),
      bg: colors.primarySoft,
      fg: colors.primary,
      hasShield: false,
    };

    if (isHod) {
      badge = {
        label: 'HOD',
        bg: colors.warningSoft,
        fg: colors.warning,
        hasShield: true,
      };
    } else if (isAdmin) {
      badge = {
        label: 'Admin',
        bg: colors.infoSoft,
        fg: colors.info,
        hasShield: true,
      };
    } else if (isNonTeaching) {
      badge = {
        label: specificRole || 'Staff',
        bg: colors.infoSoft,
        fg: colors.info,
        hasShield: true,
      };
    } else if (specificRole) {
      badge = {
        label: specificRole,
        bg: colors.primarySoft,
        fg: colors.primary,
        hasShield: false,
      };
    }

    return (
      <View
        style={[
          styles.roleBadge,
          { backgroundColor: badge.bg },
        ]}
      >
        {badge.hasShield ? (
          <Shield size={11} color={badge.fg} />
        ) : null}

        <Text
          style={{
            color: badge.fg,
            fontSize: 10,
            fontWeight: fontWeight.extrabold,
            textTransform: 'uppercase',
            marginLeft: badge.hasShield ? 4 : 0,
          }}
        >
          {badge.label}
        </Text>
      </View>
    );
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            HR & Staff Directory
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.textMuted },
            ]}
          >
            Manage all college employees and faculty.
          </Text>
        </View>

        <View
          style={[
            styles.headingIcon,
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <Users size={22} color={colors.primary} />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Add Staff"
          size="sm"
          fullWidth={false}
          icon={Plus}
          onPress={openAdd}
        />

        <ExcelUploadButton
          label="Import Excel"
          title="Import Staff"
          description="Upload an Excel (.xlsx, .xls) or CSV file of staff members."
          fields={IMPORT_FIELDS}
          sampleFileName="staff_import_template.xlsx"
          onUpload={bulkImport}
          isLoading={isImporting}
        />
      </View>

      <SearchBar
        value={searchTerm}
        onChangeText={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        placeholder="Search by name, email, or department..."
        style={styles.search}
      />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members found"
          message="No staff members found matching your search."
        />
      ) : (
        <>
          {rows.map((member: any) => {
            const name = [
              member.firstName || member.name || '',
              member.lastName || '',
            ]
              .join(' ')
              .trim() || 'Unnamed';

            const initials = (
              `${member.firstName?.charAt(0) || member.name?.charAt(0) || 'U'}${
                member.lastName?.charAt(0) || ''
              }`
            ).toUpperCase();

            const status = String(
              member.status ||
              member.accountStatus ||
              'unknown',
            );

            const active = status.toLowerCase() === 'active';

            return (
              <Card
                key={member.id}
                style={styles.card}
              >
                <View style={styles.top}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.nameContainer}>
                    <Text
                      style={[
                        styles.name,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>

                    <Text
                      style={[
                        styles.meta,
                        { color: colors.textSubtle },
                      ]}
                    >
                      Joined: {member.joinDate || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.statusWrap}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: active
                            ? colors.success
                            : colors.textSubtle,
                        },
                      ]}
                    />

                    <Text
                      style={{
                        color: active
                          ? colors.success
                          : colors.textMuted,
                        fontSize: 11,
                        fontWeight: fontWeight.bold,
                        textTransform: 'capitalize',
                      }}
                    >
                      {status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.badges}>
                  {roleBadge(member.role, member)}

                  {member.teacherId ? (
                    <View
                      style={[
                        styles.idBadge,
                        { backgroundColor: colors.infoSoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.info,
                          fontSize: 10,
                          fontWeight: fontWeight.extrabold,
                          letterSpacing: 0.6,
                        }}
                      >
                        {member.teacherId}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.deptRow}>
                    <Building
                      size={12}
                      color={colors.textMuted}
                    />

                    <Text
                      style={[
                        styles.meta,
                        {
                          color: colors.textMuted,
                          marginLeft: 4,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {member.department || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.contact}>
                  <Mail
                    size={13}
                    color={colors.textMuted}
                  />

                  <Text
                    style={[
                      styles.contactText,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {member.email || 'No email'}
                  </Text>
                </View>

                {member.phone ? (
                  <View style={styles.contact}>
                    <Phone
                      size={13}
                      color={colors.textMuted}
                    />

                    <Text
                      style={[
                        styles.contactText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {member.phone}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${name}`}
                    onPress={() => setViewingStaff(member)}
                    style={[
                      styles.actionBtn,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Eye size={15} color={colors.info} />
                    <Text
                      style={[
                        styles.actionText,
                        { color: colors.text },
                      ]}
                    >
                      View
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${name}`}
                    onPress={() => openEdit(member)}
                    style={[
                      styles.actionBtn,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Edit size={15} color={colors.primary} />
                    <Text
                      style={[
                        styles.actionText,
                        { color: colors.text },
                      ]}
                    >
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${name}`}
                    onPress={() => handleDelete(member.id)}
                    style={[
                      styles.actionBtn,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Trash2
                      size={15}
                      color={colors.danger}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        { color: colors.text },
                      ]}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>

                {status.toLowerCase() === 'pending_setup' ? (
                  <View style={styles.cardActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Send setup email to ${name}`}
                      disabled={!hasRealEmail(member) || busySetupId === member.id}
                      onPress={() => handleSendSetupMail(member)}
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: colors.border,
                          opacity: !hasRealEmail(member) || busySetupId === member.id ? 0.45 : 1,
                        },
                      ]}
                    >
                      {busySetupId === member.id && isSendingSetup ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Send size={15} color={colors.primary} />
                      )}
                      <Text style={[styles.actionText, { color: colors.text }]}>
                        Send Setup Mail
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Share setup link for ${name}`}
                      disabled={!hasRealEmail(member) || busySetupId === member.id}
                      onPress={() => handleShareSetupLink(member)}
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: colors.border,
                          opacity: !hasRealEmail(member) || busySetupId === member.id ? 0.45 : 1,
                        },
                      ]}
                    >
                      {busySetupId === member.id && isGeneratingLink ? (
                        <ActivityIndicator size="small" color={colors.info} />
                      ) : (
                        <Link2 size={15} color={colors.info} />
                      )}
                      <Text style={[styles.actionText, { color: colors.text }]}>
                        Share Link
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {status.toLowerCase() === 'pending_setup' && !hasRealEmail(member) ? (
                  <Text style={[styles.meta, { color: colors.warning, marginTop: 6 }]}>
                    Add the teacher's email (Edit) to send the setup mail.
                  </Text>
                ) : null}
              </Card>
            );
          })}

          <Pagination
            totalItems={filtered.length}
            currentPage={page}
            pageSize={size}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setSize(newSize);
              setPage(1);
            }}
          />
        </>
      )}

      <StaffFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStaff(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingStaff}
        isLoading={isAdding || isUpdating}
      />

      <StaffDetailsModal
        isOpen={!!viewingStaff}
        onClose={() => setViewingStaff(null)}
        staff={viewingStaff}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 3,
    lineHeight: 19,
  },
  headingIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  search: {
    marginBottom: 12,
  },
  loader: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 10,
    padding: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: fontWeight.extrabold,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
  },
  meta: {
    fontSize: 11,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  idBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  contactText: {
    fontSize: 12,
    marginLeft: 7,
    flexShrink: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    gap: 5,
  },
  actionText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
});