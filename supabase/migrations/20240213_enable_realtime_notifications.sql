-- Enable Realtime for notifications table
begin;
  -- Remove if already exists to avoid error (optional safety)
  -- drop publication if exists supabase_realtime; 
  -- create publication supabase_realtime for all tables; -- This is usually default
  
  -- Add table to publication
  alter publication supabase_realtime add table notifications;
commit;
