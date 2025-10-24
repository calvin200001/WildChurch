const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  const { userId, title, body, data } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get user's push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data
  });

  // Send to all user's devices
  const promises = subscriptions.map(sub => 
    webpush.sendNotification(sub.subscription, payload)
      .catch(err => {
        if (err.statusCode === 410) {
          // Subscription expired, remove it
          return supabase
            .from('push_subscriptions')
            .delete()
            .eq('subscription', sub.subscription);
        }
      })
  );

  await Promise.all(promises);

  return {
    statusCode: 200,
    body: JSON.stringify({ sent: promises.length })
  };
};
