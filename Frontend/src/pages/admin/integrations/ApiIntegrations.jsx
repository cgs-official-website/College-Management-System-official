import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, MessageSquare, Save } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useApiIntegrations } from '../../../hooks/useApiIntegrations';

export default function ApiIntegrations() {
  const { integrations, isLoading, isSaving, saveIntegration } = useApiIntegrations();
  const [whatsappData, setWhatsappData] = useState({
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    feeReceivedTemplate: '',
    examTemplate: '',
    leaveTemplate: '',
    noticeTemplate: '',
    templateLanguage: 'en',
    isActive: true
  });

    const [smsData, setSmsData] = useState({
    authKey: '',            
    senderId: '',           
    absentTemplateId: '',
    feeDueTemplateId: '', 
    isActive: false
  });

  const smsSaved = integrations?.find(i => i.provider === 'sms');
  const hasSmsAuthKey = Boolean(smsSaved?.apiKey);

  useEffect(() => {
    if (integrations?.length) {
      const wa = integrations.find(i => i.provider === 'whatsapp');
      if (wa) {
        setWhatsappData({
          apiKey: wa.apiKey || '',
          apiSecret: wa.apiSecret || '',
          webhookUrl: wa.webhookUrl || '',
          feeReceivedTemplate: wa.config?.templates?.fee_received || '',
          examTemplate: wa.config?.templates?.exam_timetable || '',
          leaveTemplate: wa.config?.templates?.leave_status || '',
          noticeTemplate: wa.config?.templates?.notice_board || '',
          templateLanguage: wa.config?.language || 'en',
          isActive: wa.isActive
        });
      }
      const sms = integrations.find(i => i.provider === 'sms');
      if (sms) {
        setSmsData({
          authKey: '',
          senderId: sms.apiSecret || '',
          absentTemplateId: sms.config?.templates?.absent_alert || '',
          feeDueTemplateId: sms.config?.templates?.fee_due || '',
          isActive: sms.isActive
        });
      }
    }
  }, [integrations]);

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    await saveIntegration({
      provider: 'whatsapp',
      apiKey: whatsappData.apiKey,
      apiSecret: whatsappData.apiSecret,
      webhookUrl: whatsappData.webhookUrl,
      config: {
        language: whatsappData.templateLanguage.trim() || 'en',
        templates: {
          fee_received: whatsappData.feeReceivedTemplate.trim(),
          exam_timetable: whatsappData.examTemplate.trim(),
          leave_status: whatsappData.leaveTemplate.trim(),
          notice_board: whatsappData.noticeTemplate.trim()
        }
      },
      isActive: whatsappData.isActive
    });
  };

  const handleSaveSms = async (e) => {
    e.preventDefault();
    const payload = {
      provider: 'sms',
      apiSecret: smsData.senderId.trim().toUpperCase(),
      config: {
        templates: {
          absent_alert: smsData.absentTemplateId.trim(),
          fee_due: smsData.feeDueTemplateId.trim()
        }
      },
      isActive: smsData.isActive
    };
    if (smsData.authKey.trim()) payload.apiKey = smsData.authKey.trim();
    await saveIntegration(payload);
    setSmsData(prev => ({ ...prev, authKey: '' }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">API Integrations</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage external API keys and webhooks (e.g. WhatsApp, SMS).</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">WhatsApp Integration</h2>
            <p className="text-sm text-slate-500">Configure your WhatsApp Business API credentials</p>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
          </div>
        ) : (
          <form onSubmit={handleSaveWhatsApp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="API Key / Token"
                placeholder="Enter your WhatsApp API Key"
                value={whatsappData.apiKey}
                onChange={(e) => setWhatsappData(prev => ({ ...prev, apiKey: e.target.value }))}
              />
              <Input
                label="API Secret / Phone Number ID"
                placeholder="Enter Secret or Phone ID"
                value={whatsappData.apiSecret}
                onChange={(e) => setWhatsappData(prev => ({ ...prev, apiSecret: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Webhook URL (Optional)"
                placeholder="https://yourdomain.com/webhook/whatsapp"
                value={whatsappData.webhookUrl}
                onChange={(e) => setWhatsappData(prev => ({ ...prev, webhookUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Message Templates</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the exact template names approved in your Meta WhatsApp Manager.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Fee Payment Received"
                  placeholder="e.g. fee_received"
                  value={whatsappData.feeReceivedTemplate}
                  onChange={(e) => setWhatsappData(prev => ({ ...prev, feeReceivedTemplate: e.target.value }))}
                />
                <Input
                  label="Exam Timetable"
                  placeholder="e.g. exam_timetable"
                  value={whatsappData.examTemplate}
                  onChange={(e) => setWhatsappData(prev => ({ ...prev, examTemplate: e.target.value }))}
                />
                <Input
                  label="Leave Approved / Rejected"
                  placeholder="e.g. leave_status"
                  value={whatsappData.leaveTemplate}
                  onChange={(e) => setWhatsappData(prev => ({ ...prev, leaveTemplate: e.target.value }))}
                />
                <Input
                  label="Notice Board"
                  placeholder="e.g. notice_board"
                  value={whatsappData.noticeTemplate}
                  onChange={(e) => setWhatsappData(prev => ({ ...prev, noticeTemplate: e.target.value }))}
                />
                <Input
                  label="Template Language Code"
                  placeholder="en"
                  value={whatsappData.templateLanguage}
                  onChange={(e) => setWhatsappData(prev => ({ ...prev, templateLanguage: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="wa-active" 
                checked={whatsappData.isActive}
                onChange={(e) => setWhatsappData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="wa-active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable WhatsApp Integration
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isSaving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">SMS Integration</h2>
            <p className="text-sm text-slate-500">Configure your MSG91 SMS credentials</p>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
          </div>
        ) : (
          <form onSubmit={handleSaveSms} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="MSG91 Auth Key"
                type="password"
                autoComplete="new-password"
                placeholder={hasSmsAuthKey ? 'Saved (leave blank to keep it)' : 'Enter your MSG91 Auth Key'}
                value={smsData.authKey}
                onChange={(e) => setSmsData(prev => ({ ...prev, authKey: e.target.value }))}
              />
              <Input
                label="Sender ID"
                placeholder="e.g. EXCELC (6 characters)"
                maxLength={6}
                value={smsData.senderId}
                onChange={(e) => setSmsData(prev => ({ ...prev, senderId: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Absent Alert Template ID"
                placeholder="Template ID from your MSG91 account"
                value={smsData.absentTemplateId}
                onChange={(e) => setSmsData(prev => ({ ...prev, absentTemplateId: e.target.value }))}
              />
              <Input
                label="Fee Due Template ID"
                placeholder="Template ID from your MSG91 account"
                value={smsData.feeDueTemplateId}
                onChange={(e) => setSmsData(prev => ({ ...prev, feeDueTemplateId: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="sms-active" 
                checked={smsData.isActive}
                onChange={(e) => setSmsData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="sms-active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable SMS Integration
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isSaving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
