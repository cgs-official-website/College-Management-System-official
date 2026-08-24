import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Save } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useApiIntegrations } from '../../../hooks/useApiIntegrations';

export default function ApiIntegrations() {
  const { integrations, isLoading, isSaving, saveIntegration } = useApiIntegrations();
  const [whatsappData, setWhatsappData] = useState({
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    isActive: true
  });

  useEffect(() => {
    if (integrations?.length) {
      const wa = integrations.find(i => i.provider === 'whatsapp');
      if (wa) {
        setWhatsappData({
          apiKey: wa.apiKey || '',
          apiSecret: wa.apiSecret || '',
          webhookUrl: wa.webhookUrl || '',
          isActive: wa.isActive
        });
      }
    }
  }, [integrations]);

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    await saveIntegration({
      provider: 'whatsapp',
      ...whatsappData
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">API Integrations</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage external API keys and webhooks (e.g. WhatsApp).</p>
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
    </div>
  );
}
