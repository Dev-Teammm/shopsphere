-- Fix subscription_plans table to have proper IDENTITY column
-- This script fixes the plan_id column to be auto-incrementing

-- First, check if the table exists and if plan_id is already an identity column
-- If the table doesn't exist, create it properly
-- If it exists but plan_id is not an identity, we need to fix it

DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        -- Table exists, check if plan_id is already an identity column
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'subscription_plans' 
            AND column_name = 'plan_id' 
            AND is_identity = 'YES'
        ) THEN
            -- plan_id exists but is not an identity column, we need to convert it
            -- This is tricky if there's data, so we'll use a sequence approach
            
            -- Drop the existing column constraint if any
            ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_pkey;
            
            -- Create a sequence if it doesn't exist
            CREATE SEQUENCE IF NOT EXISTS subscription_plans_plan_id_seq;
            
            -- Set the sequence to start from the max value + 1 if there's data
            SELECT setval('subscription_plans_plan_id_seq', COALESCE((SELECT MAX(plan_id) FROM subscription_plans), 0) + 1, false);
            
            -- Drop the old column
            ALTER TABLE subscription_plans DROP COLUMN IF EXISTS plan_id;
            
            -- Add the new column as IDENTITY
            ALTER TABLE subscription_plans 
                ADD COLUMN plan_id BIGSERIAL PRIMARY KEY;
        END IF;
    ELSE
        -- Table doesn't exist, create it with proper IDENTITY column
        CREATE TABLE subscription_plans (
            plan_id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            price DECIMAL(19, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'USD',
            duration_days INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT true,
            is_freemium BOOLEAN DEFAULT false,
            max_products INTEGER,
            max_warehouses INTEGER,
            max_employees INTEGER,
            max_delivery_agents INTEGER,
            features_json TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );
    END IF;
END $$;
