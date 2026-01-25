CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    service_name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    billing_cycle TEXT NOT NULL,
    category TEXT NOT NULL,
    start_date DATE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active', 
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT subscriptions_userId_fkey 
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);