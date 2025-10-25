CREATE OR REPLACE FUNCTION public.create_or_get_conversation(
  p_user_id1 uuid,
  p_user_id2 uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Check if a conversation already exists between the two users
  SELECT cp1.conversation_id INTO conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = p_user_id1 AND cp2.user_id = p_user_id2
  LIMIT 1;

  -- If no conversation exists, create a new one
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (last_message_at)
    VALUES (now())
    RETURNING id INTO conversation_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conversation_id, p_user_id1),
           (conversation_id, p_user_id2);
  END IF;

  RETURN conversation_id;
END;
$$;