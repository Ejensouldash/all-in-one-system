const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const filename = process.env.FILENAME;

  if (!projectId || !serviceRoleKey || !filename) {
    console.error('Missing required environment variables.');
    process.exit(1);
  }

  const supabaseUrl = `https://${projectId}.supabase.co`;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const bucketName = 'system-backups';

  // 1. Ensure bucket exists (or fails gracefully if we don't have permissions to create it, assuming it exists)
  console.log(`Checking bucket: ${bucketName}...`);
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.find(b => b.name === bucketName);
  
  if (!bucketExists) {
    console.log(`Bucket ${bucketName} not found. Attempting to create it...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/gzip', 'application/x-gzip']
    });
    
    if (createError) {
      console.error('Failed to create bucket. Please create it manually in the dashboard.', createError);
      process.exit(1);
    }
  }

  // 2. Upload the new backup
  console.log(`Uploading ${filename} to Supabase Storage...`);
  const fileBuffer = fs.readFileSync(path.join(process.cwd(), filename));
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filename, fileBuffer, {
      contentType: 'application/gzip',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    process.exit(1);
  }
  console.log('Upload successful:', uploadData);

  // 3. Enforce 30-day Retention Policy
  console.log('Checking for old backups to purge (older than 30 days)...');
  const { data: files, error: listError } = await supabase.storage.from(bucketName).list();
  
  if (listError) {
    console.error('Error listing files for retention check:', listError);
    process.exit(1);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filesToDelete = files
    .filter(f => {
      // Only delete .sql.gz files
      if (!f.name.endsWith('.sql.gz')) return false;
      
      const fileDate = new Date(f.created_at);
      return fileDate < thirtyDaysAgo;
    })
    .map(f => f.name);

  if (filesToDelete.length > 0) {
    console.log(`Found ${filesToDelete.length} old backups to delete:`, filesToDelete);
    const { error: deleteError } = await supabase.storage.from(bucketName).remove(filesToDelete);
    
    if (deleteError) {
      console.error('Error deleting old backups:', deleteError);
    } else {
      console.log('Old backups successfully purged.');
    }
  } else {
    console.log('No backups older than 30 days found.');
  }
}

run();
