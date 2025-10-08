#!/bin/bash

# Script to apply pgvector migration to Supabase
# This script reads the migration SQL and provides instructions for manual application

MIGRATION_FILE="prisma/migrations/20251007_add_pgvector_schema_embeddings/migration.sql"

echo "🚀 pgvector Migration Helper"
echo "=============================="
echo ""
echo "This migration will:"
echo "  ✓ Enable pgvector extension"
echo "  ✓ Create schema_embeddings table"
echo "  ✓ Create vector similarity indexes"
echo ""
echo "📄 Migration file: $MIGRATION_FILE"
echo ""
echo "📋 Instructions:"
echo ""
echo "1. Open your Supabase project dashboard"
echo "2. Go to: SQL Editor → New Query"
echo "3. Copy and paste the content from: $MIGRATION_FILE"
echo "4. Click 'Run' to execute the migration"
echo ""
echo "OR use the Supabase CLI:"
echo ""
echo "  supabase db push"
echo ""
echo "After migration, run:"
echo "  npm run db:generate"
echo ""

# Display the migration content
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Migration SQL Preview:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$MIGRATION_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
