import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { CheckCircle2, FileText, LayoutTemplate, Link2, Save, Type } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { Banner } from '../../components/layout/Banner';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { fontSize, fontWeight } from '../../theme/typography';
import { toast } from '../../utils/toast';

interface LandingForm {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

const EMPTY: LandingForm = { heroBadge: '', heroTitle: '', heroSubtitle: '', contactEmail: '', contactPhone: '', contactAddress: '' };

const toForm = (d: any): LandingForm => ({
  heroBadge: d?.heroBadge || '',
  heroTitle: d?.heroTitle || '',
  heroSubtitle: d?.heroSubtitle || '',
  contactEmail: d?.contactEmail || '',
  contactPhone: d?.contactPhone || '',
  contactAddress: d?.contactAddress || '',
});

/**
 * Web: LandingPageSettings.jsx
 * GET /landing-page -> { status: 'success', data }      PUT /landing-page
 */
export default function LandingPageSettingsScreen() {
  const { colors } = useTheme();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<LandingForm>({ defaultValues: EMPTY });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      try {
        const res = await api.get<any>('/landing-page');
        if (res?.status === 'success' || res?.data) {
          reset(toForm(res.data));
          setError('');
        }
      } catch {
        setError('Failed to load landing page settings.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [reset],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (data: LandingForm) => {
    setIsSaving(true);
    setError('');
    try {
      const res = await api.put<any>('/landing-page', data);
      if (res?.status === 'success') {
        setIsSaved(true);
        toast.success('Landing page updated');
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={() => load(true)}>
      <PageHeader
        title="Landing Page Configuration"
        subtitle="Manage the content shown on the public landing page dynamically."
      />

      {error ? <Banner type="error" message={error} /> : null}

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <Card>
            <View style={styles.cardHead}>
              <LayoutTemplate size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Hero Section</Text>
            </View>

            <Controller
              control={control}
              name="heroBadge"
              rules={{ required: 'Hero Badge is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Hero Badge"
                  icon={Link2}
                  placeholder="e.g. Next-Gen Campus OS"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.heroBadge?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="heroTitle"
              rules={{ required: 'Hero Title is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Hero Title"
                  icon={Type}
                  placeholder="e.g. Architect Your Future."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.heroTitle?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="heroSubtitle"
              rules={{ required: 'Hero Subtitle is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Hero Subtitle"
                  icon={FileText}
                  placeholder="Enter a brief description..."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  error={errors.heroSubtitle?.message}
                />
              )}
            />

            <View style={[styles.contactBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Configuration</Text>
              <Controller
                control={control}
                name="contactEmail"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Support Email"
                    placeholder="e.g. support@zuna.edu"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              <Controller
                control={control}
                name="contactPhone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Support Phone"
                    placeholder="e.g. +1 (555) 123-4567"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                  />
                )}
              />
              <Controller
                control={control}
                name="contactAddress"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Headquarters Address"
                    placeholder="e.g. 123 Education Blvd, New York, NY"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    containerStyle={{ marginBottom: 0 }}
                  />
                )}
              />
            </View>
          </Card>

          <View style={{ height: 16 }} />
          <Button
            title={isSaved ? 'Saved Successfully' : 'Save Changes'}
            icon={isSaved ? CheckCircle2 : Save}
            loading={isSaving}
            onPress={handleSubmit(onSubmit)}
            style={isSaved ? { backgroundColor: colors.success, borderColor: colors.success } : undefined}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  cardTitle: { marginLeft: 8, fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  contactBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 4 },
  contactTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: 14 },
});
