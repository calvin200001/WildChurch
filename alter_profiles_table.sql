-- Add username column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN username text;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column username already exists in public.profiles.';
END $$;

-- Add beliefs column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN beliefs text[];
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column beliefs already exists in public.profiles.';
END $$;

-- Add state column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN state text;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column state already exists in public.profiles.';
END $$;

-- Add updated_at column if it doesn't exist and set default
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamp with time zone DEFAULT now();
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column updated_at already exists in public.profiles.';
END $$;

-- Add a constraint for username length
ALTER TABLE public.profiles ADD CONSTRAINT username_length CHECK (char_length(username) >= 3);