// src/lib/pushNotifications.js

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return null;
  }

  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    return await subscribeUserToPush();
  }
  
  return null;
}

async function subscribeUserToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  // Generate VAPID keys: npx web-push generate-vapid-keys
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Save subscription to Supabase
export async function savePushSubscription(supabase, subscription) {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    subscription: subscription,
    updated_at: new Date().toISOString()
  });
}
