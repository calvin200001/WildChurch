export async function checkRateLimit(supabase, userId, actionType, maxCount = 10, windowMinutes = 60) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  // Count recent actions
  const { data, error } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('window_start', windowStart.toISOString())
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    throw error;
  }

  const currentCount = data?.count || 0;

  if (currentCount >= maxCount) {
    return { allowed: false, remaining: 0 };
  }

  // Increment or create counter
  if (data) {
    await supabase
      .from('rate_limits')
      .update({ count: currentCount + 1 })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('window_start', windowStart.toISOString());
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        action_type: actionType,
        count: 1,
        window_start: new Date().toISOString()
      });
  }

  return { allowed: true, remaining: maxCount - currentCount - 1 };
}