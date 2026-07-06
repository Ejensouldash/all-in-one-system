# Enterprise Database Backup Pipeline

This repository includes a fully automated, enterprise-grade database backup pipeline using GitHub Actions, PostgreSQL `pg_dump`, and Supabase Storage.

## How It Works
1. A GitHub Action runs daily at 18:00 UTC (02:00 MYT).
2. It executes a full `pg_dump` of the PostgreSQL database, capturing schemas, data rows, user authentication records, and policies.
3. The dump is compressed on-the-fly (`.sql.gz`) and uploaded directly to a private Supabase Storage bucket named `system-backups`.
4. The pipeline automatically deletes any backups older than 30 days to optimize storage costs.
5. The SUPERADMIN can view and download these backups directly from the **Settings > Data Backup & Restore** page in the dashboard.

## Required GitHub Secrets
To ensure the automated backup runs successfully, you must configure the following Secrets in your GitHub Repository Settings (**Settings > Secrets and variables > Actions > New repository secret**):

- `DATABASE_URL`: Your full PostgreSQL connection string (must have superuser or sufficient read access). Example: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`
- `SUPABASE_PROJECT_ID`: Your Supabase Project ID (the subdomain of your Supabase URL, e.g., `xyz123abc`).
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (found in **Supabase Dashboard > Project Settings > API**).

## NAS S3 Integration (Synology / QNAP)
Since Supabase Storage supports the S3 protocol, you can easily configure your local Network Attached Storage (NAS) to automatically pull the daily backups and store them securely on-premise.

### Step 1: Generate S3 Credentials in Supabase
1. Go to your **Supabase Dashboard**.
2. Navigate to **Project Settings > Storage**.
3. Under the **S3 Access Keys** section, click **New Access Key**.
4. Save the generated `Access Key ID` and `Secret Access Key`.

### Step 2: S3 Endpoint Information
When configuring your NAS software (like Synology Cloud Sync or QNAP HBS 3), use the following details:
- **S3 Endpoint URL:** `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/storage/v1/s3`
- **Region:** Use your Supabase project region (e.g., `ap-southeast-1`), or simply use `us-east-1` if your NAS client ignores it.
- **Bucket Name:** `system-backups`
- **Access Key ID:** *From Step 1*
- **Secret Access Key:** *From Step 1*

### Step 3: Configure Synology Cloud Sync (Example)
1. Open **Cloud Sync** on your Synology NAS.
2. Select **S3 Storage** as the cloud provider.
3. Choose **Custom Server URL** and enter the S3 Endpoint URL.
4. Enter the Access Key and Secret Key.
5. Select the `system-backups` bucket.
6. Set the Sync Direction to **Download Only** (to prevent the NAS from accidentally deleting or overwriting cloud backups).
7. Complete the setup. Your NAS will now automatically download new `.sql.gz` backups as soon as they appear in Supabase!

## Disaster Recovery (Restore)
To restore an `.sql.gz` backup, you must use PostgreSQL tools (like `pgAdmin` or `psql`) or the Supabase CLI. 
*Note: Do not use the "JSON Restore" button in the dashboard for full disaster recovery, as it only restores basic table rows and ignores schemas/auth.*

Example restore command:
```bash
gunzip -c BubblesO2_Full_DB_20260706.sql.gz | psql "$DATABASE_URL"
```
