import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

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
import { Banner } from '../../components/layout/Banner';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useColleges } from '../../hooks/useColleges';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDate } from '../../utils/format';
import { toast } from '../../utils/toast';
import type { College, OnboardCollegeResult } from '../../types/models';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const PLAN_OPTIONS = [
  { label: 'Free Plan', value: 'Free' },
  { label: 'Basic Plan', value: 'Basic' },
  { label: 'Premium Plan', value: 'Premium' },
  { label: 'Enterprise Plan', value: 'Enterprise' },
];
const PLAN_STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Expired', value: 'Expired' },
  { label: 'Canceled', value: 'Canceled' },
];

const matchOption = (options: { value: string }[], value?: string | null, fallback = '') =>
  options.find((o) => o.value.toLowerCase() === String(value || '').toLowerCase())?.value || fallback;

const toDateInput = (value?: string | number | Date | null): string => {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const isValidDateInput = (value: string) => DATE_REGEX.test(value) && !isNaN(new Date(value).getTime());

const emailOf = (c: College) => c.contactEmail || c.email || '';
const phoneOf = (c: College) => c.contactPhone || c.phone || '';
const websiteOf = (c: College) => c.website || c.websiteUrl || '';
const codeOf = (c: College) => c.registrationNo || String(c.id || '').substring(0, 8).toUpperCase();

const statusTone = (status?: string) => (status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'danger');
const statusLabel = (status?: string) => (status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : 'Inactive');

function CollegeAvatar({ college, size = 44 }: { college: College; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = college.logoUrl || college.logoBase64;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        resizeMode="contain"
        style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: fontWeight.extrabold, fontSize: size * 0.42 }}>{college.name?.charAt(0) || 'C'}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>{children}</Text>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: LucideIcon }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      {Icon ? <Icon size={16} color={colors.textSubtle} style={{ marginTop: 2, marginRight: 8 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.textSubtle }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// screen
// ---------------------------------------------------------------------------
export default function SuperCollegesScreen() {
  const nav = useDrawerNav();
  const confirm = useConfirm();
  const { colors } = useTheme();
  const { colleges, isLoading, isRefetching, refetch, onboardCollege, updateCollegeStatus, deleteCollege, updateCollegeSubscription } =
    useColleges();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [onboardOpen, setOnboardOpen] = useState(!!nav.params?.openOnboard);
  const [selected, setSelected] = useState<College | null>(null);
  const [planCollege, setPlanCollege] = useState<College | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setPage(1), [search, pageSize]);

  // "Onboard New College" on the dashboard opens this screen with { openOnboard: true } - consume it once
  useEffect(() => {
    if (nav.params?.openOnboard) nav.navigate('colleges', {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colleges;
    return colleges.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.registrationNo?.toLowerCase().includes(q),
    );
  }, [colleges, search]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const changeStatus = async (college: College, status: 'active' | 'suspended') => {
    setBusyId(college.id);
    try {
      await updateCollegeStatus.mutateAsync({ id: college.id, status });
      toast.success(status === 'active' ? `${college.name} is now active` : `${college.name} suspended`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update college status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (college: College) => {
    const ok = await confirm({
      title: 'Delete college?',
      message: 'Are you sure you want to permanently delete this college? This action cannot be undone.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    setBusyId(college.id);
    try {
      await deleteCollege.mutateAsync(college.id);
      toast.success('College deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete college.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefetching} onRefresh={() => refetch(true)}>
      <PageHeader
        title="Colleges Directory"
        subtitle="Manage all institutions registered in the Zuna ecosystem."
        action={<Button title="Onboard New College" icon={Plus} onPress={() => setOnboardOpen(true)} />}
      />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by college name or code (e.g. ZUNAC1234)..." />
      <View style={{ height: 14 }} />

      {isLoading ? (
        <Loader label="Loading institutions..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No colleges found" message='Tap "Onboard New College" to add one.' />
      ) : (
        <>
          {paginated.map((college) => (
            <Card key={college.id} onPress={() => setSelected(college)} style={styles.card}>
              <View style={styles.cardTop}>
                <CollegeAvatar college={college} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {college.name}
                  </Text>
                  <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
                    {emailOf(college) || '-'}
                  </Text>
                </View>
                <Badge label={statusLabel(college.status)} tone={statusTone(college.status)} />
              </View>

              <View style={styles.metaRow}>
                <Badge label={codeOf(college)} tone="neutral" />
                <Text style={[styles.joined, { color: colors.textSubtle }]}>Joined {formatDate(college.createdAt)}</Text>
              </View>

              <View style={styles.actions}>
                {college.status === 'pending' ? (
                  <Button
                    title="Approve"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    loading={busyId === college.id}
                    onPress={() => changeStatus(college, 'active')}
                    style={styles.action}
                  />
                ) : null}
                {college.status === 'active' ? (
                  <Button
                    title="Suspend"
                    size="sm"
                    variant="outline"
                    fullWidth={false}
                    loading={busyId === college.id}
                    onPress={() => changeStatus(college, 'suspended')}
                    style={styles.action}
                  />
                ) : null}
                {college.status === 'suspended' ? (
                  <Button
                    title="Activate"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    loading={busyId === college.id}
                    onPress={() => changeStatus(college, 'active')}
                    style={styles.action}
                  />
                ) : null}
                <Button title="Manage Plan" size="sm" variant="outline" fullWidth={false} onPress={() => setPlanCollege(college)} style={styles.action} />
                <Button
                  title="Delete"
                  size="sm"
                  variant="danger"
                  fullWidth={false}
                  disabled={busyId === college.id}
                  onPress={() => handleDelete(college)}
                  style={styles.action}
                />
              </View>
            </Card>
          ))}

          <Pagination
            totalItems={filtered.length}
            currentPage={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {onboardOpen ? (
        <OnboardCollegeSheet
          onboard={onboardCollege.mutateAsync}
          onClose={() => setOnboardOpen(false)}
        />
      ) : null}

      {selected ? (
        <CollegeDetailsSheet
          college={selected}
          onClose={() => setSelected(null)}
          onManageSubscription={(c) => {
            setSelected(null);
            setPlanCollege(c);
          }}
        />
      ) : null}

      {planCollege ? (
        <ManageSubscriptionSheet
          college={planCollege}
          save={updateCollegeSubscription.mutateAsync}
          onClose={() => setPlanCollege(null)}
        />
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Onboard New College
// ---------------------------------------------------------------------------
interface OnboardForm {
  collegeName: string;
  shortName: string;
  collegeEmail: string;
  officialPhone: string;
  category: string;
  establishedYear: string;
  affiliatedBoard: string;
  websiteUrl: string;
  aicteNumber: string;
  ugcRecognition: string;
  affiliationCode: string;
  gstin: string;
  streetAddress: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const EMPTY_FORM: OnboardForm = {
  collegeName: '',
  shortName: '',
  collegeEmail: '',
  officialPhone: '',
  category: '',
  establishedYear: '',
  affiliatedBoard: '',
  websiteUrl: '',
  aicteNumber: '',
  ugcRecognition: '',
  affiliationCode: '',
  gstin: '',
  streetAddress: '',
  city: '',
  district: '',
  state: '',
  country: '',
  pincode: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function OnboardCollegeSheet({
  onboard,
  onClose,
}: {
  onboard: (payload: any) => Promise<OnboardCollegeResult>;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { control, handleSubmit, formState: { errors } } = useForm<OnboardForm>({ defaultValues: EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState<OnboardCollegeResult | null>(null);

  const field = (
    name: keyof OnboardForm,
    label: string,
    opts: { required?: boolean; rules?: any; icon?: LucideIcon; placeholder?: string; input?: TextInputProps } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      rules={opts.rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <Input
          label={label}
          required={opts.required}
          icon={opts.icon}
          placeholder={opts.placeholder}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors[name]?.message as string | undefined}
          autoCorrect={false}
          {...opts.input}
        />
      )}
    />
  );

  const onSubmit = async (d: OnboardForm) => {
    setSubmitting(true);
    setApiError('');
    try {
      const result = await onboard({
        adminUser: { name: d.adminName.trim(), email: d.adminEmail.trim(), password: d.adminPassword },
        collegeData: {
          name: d.collegeName.trim(),
          shortName: d.shortName.trim(),
          email: d.collegeEmail.trim(),
          phone: d.officialPhone.trim(),
          category: d.category.trim(),
          establishedYear: d.establishedYear.trim(),
          affiliatedBoard: d.affiliatedBoard.trim(),
          websiteUrl: d.websiteUrl.trim(),
          aicteNumber: d.aicteNumber.trim(),
          ugcRecognition: d.ugcRecognition.trim(),
          affiliationCode: d.affiliationCode.trim(),
          gstin: d.gstin.trim(),
          streetAddress: d.streetAddress.trim(),
          city: d.city.trim(),
          district: d.district.trim(),
          state: d.state.trim(),
          country: d.country.trim(),
          pincode: d.pincode.trim(),
        },
      });
      setSuccess(result);
    } catch (e: any) {
      const msg: string = e?.message || '';
      if (msg.includes('already in use') || msg.includes('already registered')) {
        setApiError('The admin email address is already in use by another account.');
      } else if (msg.includes('weak-password')) {
        setApiError('The password is too weak. Please use at least 6 characters.');
      } else {
        setApiError(msg || 'Failed to onboard college. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SheetModal
      visible
      tall
      onClose={onClose}
      title="Onboard New College"
      footer={
        success ? undefined : (
          <View style={{ flexDirection: 'row' }}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} disabled={submitting} />
            <View style={{ width: 12 }} />
            <Button title="Onboard College" onPress={handleSubmit(onSubmit)} loading={submitting} style={{ flex: 1.4 }} />
          </View>
        )
      }>
      {success ? (
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: colors.successSoft }]}>
            <CheckCircle2 size={40} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>College Onboarded!</Text>
          <Text style={[styles.successText, { color: colors.textMuted }]}>
            The institution has been registered and the admin credentials have been securely generated.
          </Text>
          <View style={[styles.codeBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Generated College Code:</Text>
            <Text style={[styles.codeValue, { color: colors.primary }]}>{success.collegeCode}</Text>
          </View>
          <Button title="Return to Directory" onPress={onClose} />
        </View>
      ) : (
        <View>
          {apiError ? <Banner type="error" message={apiError} /> : null}

          <SectionTitle>Institution Details</SectionTitle>
          {field('collegeName', 'College Name', { required: true, icon: Building2, placeholder: 'Oxford University', rules: { required: 'College Name is required' } })}
          {field('shortName', 'Short / Abbreviated Name', { icon: Hash, placeholder: 'e.g. OXF' })}
          {field('collegeEmail', 'Official Email', {
            required: true,
            icon: Mail,
            placeholder: 'contact@oxford.edu',
            input: { keyboardType: 'email-address', autoCapitalize: 'none' },
            rules: {
              required: 'Official Email is required',
              pattern: { value: EMAIL_REGEX, message: 'Please enter a valid email address with a valid domain (e.g. .com, .edu, .in)' },
            },
          })}
          {field('officialPhone', 'Official Phone (10 Digits)', {
            icon: Phone,
            placeholder: '9876543210',
            input: { keyboardType: 'phone-pad', maxLength: 10 },
            rules: { validate: (v: string) => !v || PHONE_REGEX.test(v) || 'Official phone must be a valid 10-digit mobile number' },
          })}
          {field('category', 'College Type / Category', { icon: FileText, placeholder: 'e.g. Engineering, Arts & Science' })}
          {field('establishedYear', 'Established Year', { icon: Calendar, placeholder: 'e.g. 1998', input: { keyboardType: 'number-pad', maxLength: 4 } })}
          {field('affiliatedBoard', 'Affiliated University / Board', { icon: Award, placeholder: 'e.g. Anna University' })}
          {field('websiteUrl', 'Website URL (Optional)', { icon: Globe, placeholder: 'https://www.oxford.edu', input: { keyboardType: 'url', autoCapitalize: 'none' } })}

          <SectionTitle>Credentials & Identifiers</SectionTitle>
          {field('aicteNumber', 'AICTE Number', { icon: Hash })}
          {field('ugcRecognition', 'UGC Recognition', { icon: Award })}
          {field('affiliationCode', 'Affiliation Code', { icon: Hash })}
          {field('gstin', 'GSTIN (Optional)', { icon: FileText, input: { autoCapitalize: 'characters' } })}

          <SectionTitle>Location & Address</SectionTitle>
          {field('streetAddress', 'Street Address', { icon: MapPin })}
          {field('city', 'City', { placeholder: 'Erode' })}
          {field('district', 'District')}
          {field('state', 'State', { placeholder: 'Tamil Nadu' })}
          {field('country', 'Country', { placeholder: 'India' })}
          {field('pincode', 'Postal Pincode', { input: { keyboardType: 'number-pad', maxLength: 10 } })}

          <SectionTitle>Primary Admin Account</SectionTitle>
          {field('adminName', 'Admin Full Name', { required: true, icon: User, rules: { required: 'Admin Name is required' } })}
          {field('adminEmail', 'Admin Email', {
            required: true,
            icon: Mail,
            placeholder: 'principal@oxford.edu',
            input: { keyboardType: 'email-address', autoCapitalize: 'none' },
            rules: {
              required: 'Admin Email is required',
              pattern: { value: EMAIL_REGEX, message: 'Please enter a valid email address with a valid domain (e.g. .com, .edu, .in)' },
            },
          })}
          {field('adminPassword', 'Temporary Password', {
            required: true,
            icon: Lock,
            placeholder: 'Enter secure initial password',
            input: { autoCapitalize: 'none' },
            rules: { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } },
          })}
        </View>
      )}
    </SheetModal>
  );
}

// ---------------------------------------------------------------------------
// College details
// ---------------------------------------------------------------------------
function CollegeDetailsSheet({
  college,
  onClose,
  onManageSubscription,
}: {
  college: College;
  onClose: () => void;
  onManageSubscription: (college: College) => void;
}) {
  const { colors } = useTheme();
  const hasPlan = !!college.subscriptionPlan;
  const expired = String(college.subscriptionStatus || '').toLowerCase() === 'expired';
  const tint = hasPlan ? (expired ? colors.danger : colors.success) : colors.textSubtle;
  const tintBg = hasPlan ? (expired ? colors.dangerSoft : colors.successSoft) : colors.cardAlt;

  return (
    <SheetModal visible tall onClose={onClose} title="College Details">
      <View style={styles.detailHead}>
        <CollegeAvatar college={college} size={72} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.detailName, { color: colors.text }]}>{college.name}</Text>
          <Text style={[styles.mono, { color: colors.textMuted }]} numberOfLines={1}>
            {college.id}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
            <Badge label={(college.status || 'unknown').toUpperCase()} tone={statusTone(college.status)} />
            <View style={{ width: 6 }} />
            <Badge label={codeOf(college)} tone="neutral" />
          </View>
        </View>
      </View>

      <SectionTitle>Credentials</SectionTitle>
      <InfoRow label="College Code" value={college.registrationNo} />
      <InfoRow label="AICTE Number" value={college.aicteNumber} />
      <InfoRow label="UGC Recognition" value={college.ugcCode || college.ugcRecognition} />
      <InfoRow label="Affiliation Code" value={college.affiliationCode} />
      <InfoRow label="Academic Year" value={college.academicYear} />

      <SectionTitle>Contact & Location</SectionTitle>
      <InfoRow icon={Mail} label="Official Email" value={emailOf(college)} />
      <InfoRow icon={Phone} label="Official Phone" value={phoneOf(college)} />
      <InfoRow icon={Globe} label="Website" value={websiteOf(college)} />
      <InfoRow icon={MapPin} label="Address" value={college.address} />

      {college.users && college.users.length > 0 ? (
        <>
          <SectionTitle>College Admin</SectionTitle>
          {college.users.map((u) => (
            <InfoRow key={u.id} icon={User} label={u.name || 'Admin'} value={u.email} />
          ))}
        </>
      ) : null}

      <SectionTitle>Subscription Details</SectionTitle>
      <View style={[styles.planBox, { backgroundColor: tintBg, borderColor: colors.border }]}>
        <View style={[styles.planIcon, { backgroundColor: colors.card }]}>
          <Award size={22} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planTitle, { color: colors.text }]}>
            {hasPlan ? `${college.subscriptionPlan} Plan` : 'No Active Plan'}
          </Text>
          <Text style={[styles.planSub, { color: colors.textMuted }]}>
            {hasPlan
              ? `${college.subscriptionStatus || 'Active'} • Valid until ${formatDate(college.subscriptionEndDate)}`
              : 'Contact Zuna global to upgrade.'}
          </Text>
        </View>
      </View>
      <View style={{ height: 12 }} />
      <Button title="Manage Plan" variant="outline" onPress={() => onManageSubscription(college)} />
      <View style={{ height: 12 }} />
    </SheetModal>
  );
}

// ---------------------------------------------------------------------------
// Manage plan
// ---------------------------------------------------------------------------
function ManageSubscriptionSheet({
  college,
  save,
  onClose,
}: {
  college: College;
  save: (payload: { id: string; planTier: string; status: string; currentPeriodEnd: string | null }) => Promise<any>;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState(matchOption(PLAN_OPTIONS, college.subscriptionPlan, 'Enterprise'));
  const [status, setStatus] = useState(matchOption(PLAN_STATUS_OPTIONS, college.subscriptionStatus, 'Active'));
  const [endDate, setEndDate] = useState(toDateInput(college.subscriptionEndDate));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!endDate) {
      setError('Valid Until date is required');
      return;
    }
    if (!isValidDateInput(endDate)) {
      setError('Use the date format YYYY-MM-DD (e.g. 2027-03-31)');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await save({ id: college.id, planTier: plan, status, currentPeriodEnd: endDate });
      toast.success('Subscription updated successfully!');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update subscription.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible
      onClose={onClose}
      title={`Manage Plan - ${college.name}`}
      footer={<Button title="Save Subscription" onPress={submit} loading={saving} />}>
      <Select label="Subscription Plan" value={plan} options={PLAN_OPTIONS} onChange={setPlan} />
      <Select label="Status" value={status} options={PLAN_STATUS_OPTIONS} onChange={setStatus} />
      <Input
        label="Valid Until"
        required
        icon={Calendar}
        placeholder="YYYY-MM-DD"
        value={endDate}
        onChangeText={setEndDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={error || undefined}
        hint="Example: 2027-03-31"
      />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  joined: { fontSize: fontSize.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  action: { marginRight: 8, marginBottom: 6 },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingBottom: 8,
    marginBottom: 14,
    marginTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRow: { flexDirection: 'row', marginBottom: 14 },
  infoLabel: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 2 },
  detailHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  detailName: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  mono: { fontSize: fontSize.xs, marginTop: 2, fontFamily: 'Courier' },
  planBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14 },
  planIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  planTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  planSub: { fontSize: fontSize.xs, marginTop: 2 },
  successWrap: { alignItems: 'center', paddingVertical: 12 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, marginBottom: 8 },
  successText: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  codeBox: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  codeLabel: { fontSize: fontSize.sm },
  codeValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: 1.5, marginTop: 4, fontFamily: 'Courier' },
});
