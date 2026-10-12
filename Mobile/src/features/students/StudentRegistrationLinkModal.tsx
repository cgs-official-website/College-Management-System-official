import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Power, RefreshCw, Share2, ShieldCheck } from 'lucide-react-native';

import { api } from '../../api/client';
import { WEB_URL } from '../../config/env';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { toast } from '../../utils/toast';

/** Web: StudentRegistrationLinkModal.jsx (copy -> native share sheet, no clipboard dependency). */
export const StudentRegistrationLinkModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchLink = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<any>('/students/registration-link');
      setLinkData(response?.data ?? response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load registration link.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchLink();
  }, [isOpen, fetchLink]);

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: 'Regenerate link?',
      message: 'Regenerating this link will immediately invalidate all previously shared registration links. Continue?',
      confirmText: 'Regenerate',
    });
    if (!ok) return;
    setIsRegenerating(true);
    try {
      const response = await api.post<any>('/students/registration-link/regenerate');
      setLinkData(response?.data ?? response);
      toast.success('Registration link regenerated! Previous links are now invalid.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to regenerate link.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggle = async () => {
    if (!linkData) return;
    const newStatus = !linkData.isActive;
    setIsToggling(true);
    try {
      await api.patch('/students/registration-link/toggle', { isActive: newStatus });
      setLinkData((prev: any) => ({ ...prev, isActive: newStatus }));
      toast.success(`Registration link ${newStatus ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle status.');
    } finally {
      setIsToggling(false);
    }
  };

  const fullUrl = linkData?.path ? `${WEB_URL}${linkData.path}` : `${WEB_URL}/student/register`;

  const handleShare = async () => {
    try {
      await Share.share({ message: fullUrl });
    } catch {
      toast.error('Could not open the share sheet.');
    }
  };

  const active = !!linkData?.isActive;

  return (
    <SheetModal visible={isOpen} onClose={onClose} title="Student Registration Link">
      <Text style={[styles.caption, { color: colors.textMuted }]}>Share this secure link with admitted students</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.caption, { color: colors.textMuted, marginTop: 8 }]}>Fetching registration link...</Text>
        </View>
      ) : error ? (
        <View style={[styles.box, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}>
          <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{error}</Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.box,
              active
                ? { backgroundColor: colors.successSoft, borderColor: colors.successBorder }
                : { backgroundColor: colors.warningSoft, borderColor: colors.warning },
            ]}>
            <View style={styles.rowTop}>
              <ShieldCheck size={20} color={active ? colors.success : colors.warning} />
              <Text style={[styles.statusText, { color: active ? colors.success : colors.warning }]}>
                Status: {active ? 'Active (Accepting Registrations)' : 'Disabled (Registrations Blocked)'}
              </Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <Button
                size="sm"
                variant={active ? 'outline' : 'primary'}
                icon={Power}
                title={active ? 'Disable' : 'Enable'}
                onPress={handleToggle}
                loading={isToggling}
                fullWidth={false}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>REGISTRATION URL</Text>
          {linkData?.path ? (
            <>
              <View style={[styles.urlBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text selectable style={[styles.url, { color: colors.text }]}>{fullUrl}</Text>
              </View>
              <Button title="Share Link" icon={Share2} onPress={handleShare} />
            </>
          ) : (
            // rawToken is never stored (only the SHA-256 hash is kept) -> admin must regenerate to get a shareable URL.
            <View style={[styles.box, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
              <View style={styles.rowTop}>
                <AlertTriangle size={18} color={colors.warning} />
                <Text style={[styles.note, { color: colors.warning }]}>
                  Token not displayable. The registration token is stored as a secure hash, so the original URL cannot be
                  recovered. Tap "Regenerate Token" below to create a new shareable link. Previous links will be invalidated.
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.box, { backgroundColor: colors.cardAlt, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[styles.howTitle, { color: colors.text }]}>How Student Registration Works:</Text>
            <Text style={[styles.howItem, { color: colors.textMuted }]}>• Students can register directly through this college-specific link.</Text>
            <Text style={[styles.howItem, { color: colors.textMuted }]}>• Admission Number is optional; if omitted, one is assigned automatically.</Text>
            <Text style={[styles.howItem, { color: colors.textMuted }]}>• Passwords are encrypted with industry-standard bcrypt hashing.</Text>
          </View>

          <View style={{ marginTop: 16, marginBottom: 8 }}>
            <Button
              title="Regenerate Token (Invalidates Old Links)"
              variant="danger"
              icon={RefreshCw}
              size="sm"
              onPress={handleRegenerate}
              loading={isRegenerating}
            />
          </View>
        </>
      )}
    </SheetModal>
  );
};

export default StudentRegistrationLinkModal;

const styles = StyleSheet.create({
  caption: { fontSize: fontSize.xs, marginBottom: 14 },
  center: { alignItems: 'center', paddingVertical: 40 },
  box: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.8, marginBottom: 8 },
  urlBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  url: { fontSize: fontSize.xs, fontFamily: 'monospace' },
  note: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  howTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginBottom: 6 },
  howItem: { fontSize: fontSize.xs, lineHeight: 19 },
});