-- Migration: Create audit_logs and notifications tables
-- Run this in your Supabase SQL Editor

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, etc.
  entity TEXT NOT NULL, -- Product, Sale, Customer, etc.
  details JSONB,        -- Details of the changes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable real-time for notifications table (optional but good for Supabase)
alter publication supabase_realtime add table notifications;
