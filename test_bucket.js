const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Need to load from .env

async function testCreate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing env vars locally");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const bucketName = 'system-backups';
  
  console.log(`Checking bucket: ${bucketName}...`);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) console.error("List error:", listError);
  
  const bucketExists = buckets?.find(b => b.name === bucketName);
  
  if (!bucketExists) {
    console.log(`Bucket not found. Creating...`);
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/gzip', 'application/x-gzip']
    });
    
    if (createError) {
      console.error('Failed to create bucket:', createError);
    } else {
      console.log('Bucket created successfully:', data);
    }
  } else {
    console.log("Bucket already exists.");
  }
}

testCreate();
