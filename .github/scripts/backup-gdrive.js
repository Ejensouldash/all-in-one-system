const fs = require('fs');
const { google } = require('googleapis');

async function main() {
  const filename = process.env.FILENAME;
  const folderId = process.env.GDRIVE_FOLDER_ID;
  const credentialsJsonStr = process.env.GDRIVE_CREDENTIALS_JSON;

  if (!filename || !folderId || !credentialsJsonStr) {
    console.error("Missing required environment variables for Google Drive backup.");
    process.exit(1);
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJsonStr);
  } catch (error) {
    console.error("Failed to parse GDRIVE_CREDENTIALS_JSON. Ensure it is valid JSON.");
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log(`Starting upload of ${filename} to Google Drive folder: ${folderId}`);

  try {
    const fileMetadata = {
      name: filename,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/gzip',
      body: fs.createReadStream(filename),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, createdTime',
    });

    console.log(`Successfully uploaded! File ID: ${file.data.id}`);

    // --- Enforce 30-Day Retention Policy ---
    console.log("Checking for backups older than 30 days...");
    
    // We search for files in the folder with the name ending in .sql.gz
    // Note: Google Drive search query uses specific syntax. 'name contains' is supported.
    const query = `'${folderId}' in parents and name contains '.sql.gz' and trashed = false`;
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });

    const backups = response.data.files;
    console.log(`Found ${backups.length} backup(s) in the folder.`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const backup of backups) {
      const createdDate = new Date(backup.createdTime);
      if (createdDate < thirtyDaysAgo) {
        console.log(`Deleting old backup: ${backup.name} (Created: ${createdDate.toISOString()})`);
        await drive.files.delete({
          fileId: backup.id,
        });
      }
    }

    console.log("Retention policy check completed.");
  } catch (error) {
    console.error("Error during Google Drive backup process:");
    console.error(error.message);
    process.exit(1);
  }
}

main();
