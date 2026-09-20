export const EVENT_ID = 'printing-united-2026';
export const APP_ORIGIN = 'https://bme-productivity-calculator.vercel.app';

export function validSubscription(subscription) {
  try {
    const url = new URL(subscription.endpoint);
    const trusted = url.hostname === 'fcm.googleapis.com' || url.hostname === 'web.push.apple.com' ||
      url.hostname.endsWith('.push.apple.com') || url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname.endsWith('.notify.windows.com');
    const keyLength = (key) => /^[A-Za-z0-9_-]+={0,2}$/.test(key || '') ?
      atob(key.replace(/-/g,'+').replace(/_/g,'/')).length : 0;
    return trusted && url.protocol === 'https:' && !url.port && !url.username && !url.password &&
      !url.hash && subscription.endpoint.length < 2048 &&
      keyLength(subscription.keys?.p256dh) === 65 && keyLength(subscription.keys?.auth) === 16;
  } catch { return false; }
}

export function notificationPayload(message, personId) {
  return {
    title: message.urgent ? 'Urgent C.P. Bourg message' : 'C.P. Bourg Chat',
    body: `${message.sender}: ${message.body}`,
    tag: `bourg-chat-${message.id}`,
    personId,
    url: `/bourg-expo-ops/?open=chat&message=${encodeURIComponent(message.id)}`
  };
}
