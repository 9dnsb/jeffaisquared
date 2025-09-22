For a simple one-time backup after your seed is already complete, just run:

# Create backup directory

mkdir -p backups

# Create timestamped backup

pg*dump --data-only --no-owner --no-privileges "$(grep DATABASE_URL .env.development | cut -d'=' -f2)" >
  "backups/square-seed-backup-$(date +%Y%m%d*%H%M%S).sql"

Or if you prefer using your environment file directly:

# Load environment and create backup

source .env.development
pg*dump --data-only --no-owner --no-privileges "$DATABASE_URL" > "backups/square-seed-backup-$(date +%Y%m%d*%H%M%S).sql"

This will create a file like backups/square-seed-backup-20250921_143052.sql that you can use to restore to production or as a safety  
 backup.

To compress it (saves ~70% space):
gzip backups/square-seed-backup-\*.sql

That's it! Simple one-command backup of your completed seed.
