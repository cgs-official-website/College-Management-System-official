// Cross-tab real-time sync utility using BroadcastChannel
const channelName = 'cms_sync_events';
let channel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(channelName);
  }
} catch (e) {
  // Fallback if BroadcastChannel is blocked
}

export const broadcastSync = (moduleName) => {
  try {
    if (channel) {
      channel.postMessage({ type: 'CMS_SYNC', module: moduleName, timestamp: Date.now() });
    }
  } catch (e) {
    console.warn('Failed to broadcast sync event:', e);
  }
};

export const subscribeToSync = (callback) => {
  if (!channel) return () => {};
  const handler = (event) => {
    if (event?.data?.type === 'CMS_SYNC') {
      callback(event.data.module);
    }
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
};
