-- Fix missing foreign key constraint on user_cups.user_id
-- This ensures data integrity and prevents API errors when joining with profiles

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_cups_user_id_fkey' 
        AND table_name = 'user_cups'
    ) THEN
        ALTER TABLE user_cups
        ADD CONSTRAINT user_cups_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
