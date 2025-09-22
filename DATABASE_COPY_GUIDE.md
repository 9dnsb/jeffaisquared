# Database Copy Guide: Test to Production

This guide covers copying your Supabase test database to production after seeding with Square API data.

## Prerequisites

- Both test and production Supabase projects set up
- Database connection strings for both environments
- PostgreSQL client tools installed (`pg_dump`, `psql`)
- Supabase CLI (for Option 2)

## Option 1: Direct PostgreSQL Copy (Fastest)

### Step 1: Get Connection Strings

1. **Test Database:**
   - Go to Supabase Dashboard → Test Project
   - Settings → Database → Connection string
   - Copy the "Direct connection" string
   - Format: `postgresql://postgres:[password]@[host]:5432/postgres`

2. **Production Database:**
   - Go to Supabase Dashboard → Production Project
   - Settings → Database → Connection string
   - Copy the "Direct connection" string

### Step 2: Copy Data

```bash
# Single command to dump and restore
pg_dump --data-only --no-owner --no-privileges \
  "postgresql://postgres:[TEST_PASSWORD]@[TEST_HOST]:5432/postgres" | \
  psql "postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres"
```

**Flags explained:**
- `--data-only`: Copy only data, not schema (assumes schema already exists)
- `--no-owner`: Don't set ownership of objects
- `--no-privileges`: Don't dump access privileges

### Step 3: Verify

```bash
# Check record counts in production
psql "postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres" -c "
SELECT
  'categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'line_items', COUNT(*) FROM line_items;
"
```

---

## Option 2: Supabase CLI Method (More Controlled)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Create Backup

```bash
# Dump test database to file
supabase db dump \
  --db-url "postgresql://postgres:[TEST_PASSWORD]@[TEST_HOST]:5432/postgres" \
  > test_backup.sql
```

### Step 3: Prepare Production Database

⚠️ **WARNING: This will delete all production data!**

```bash
# Reset production database (clears all data and reapplies migrations)
supabase db reset \
  --db-url "postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres"
```

### Step 4: Restore to Production

```bash
# Restore backup to production
psql "postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres" < test_backup.sql
```

### Step 5: Verify

```bash
# Connect and verify data
psql "postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres" -c "
SELECT schemaname,tablename,n_tup_ins as inserted_rows
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC;
"
```

---

## Troubleshooting

### Common Issues

1. **Connection timeouts:**
   ```bash
   # Add connection timeout
   pg_dump --data-only --connect-timeout=30 ...
   ```

2. **Large datasets:**
   ```bash
   # Use compression
   pg_dump --data-only --compress=9 ... > backup.sql.gz
   gunzip -c backup.sql.gz | psql ...
   ```

3. **Foreign key constraints:**
   ```bash
   # Disable constraints during restore
   psql "..." -c "SET session_replication_role = replica;"
   psql "..." < backup.sql
   psql "..." -c "SET session_replication_role = DEFAULT;"
   ```

### Selective Table Copy

If you only want to copy specific tables:

```bash
# Copy only specific tables
pg_dump --data-only --table=categories --table=items --table=orders --table=line_items \
  "postgresql://postgres:[TEST_PASSWORD]@[TEST_HOST]:5432/postgres" | \
  psql "postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres"
```

---

## Environment Variables

To make this easier, you can set environment variables:

```bash
# In your terminal
export TEST_DB_URL="postgresql://postgres:[TEST_PASSWORD]@[TEST_HOST]:5432/postgres"
export PROD_DB_URL="postgresql://postgres:[PROD_PASSWORD]@[PROD_HOST]:5432/postgres"

# Then use them
pg_dump --data-only --no-owner --no-privileges "$TEST_DB_URL" | psql "$PROD_DB_URL"
```

---

## Performance Notes

- **Option 1** is faster for large datasets (direct streaming)
- **Option 2** gives you a backup file you can reuse
- Both preserve all relationships and foreign keys
- Expect ~1-2 minutes for databases with 10k+ orders

---

## Post-Copy Checklist

- [ ] Verify record counts match between test and production
- [ ] Test a few API endpoints to ensure data integrity
- [ ] Check that category relationships are preserved
- [ ] Verify line items are connected to orders and items
- [ ] Update any environment-specific configurations