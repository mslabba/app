/**
 * Bulk Make Google Drive Files Public
 * 
 * This script will make all files in a Google Drive folder publicly accessible
 * (Anyone with the link can view)
 * 
 * SETUP:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Drive API
 * 4. Create credentials (OAuth 2.0 Client ID for Desktop app)
 * 5. Download credentials.json and place in this directory
 * 6. Run: npm install googleapis
 * 7. Run this script
 */

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * Load or request authorization to call APIs.
 */
async function authorize() {
  let credentials;
  try {
    credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH));
  } catch (err) {
    console.error('Error loading client secret file:', err);
    console.log('\n📋 SETUP REQUIRED:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Enable Google Drive API');
    console.log('3. Create OAuth 2.0 credentials (Desktop app)');
    console.log('4. Download credentials.json');
    console.log('5. Place credentials.json in:', __dirname);
    return null;
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  try {
    const token = await fs.readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (err) {
    return getNewToken(oAuth2Client);
  }
}

/**
 * Get and store new token after prompting for user authorization
 */
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Authorize this app by visiting this URL:\n');
  console.log(authUrl);
  console.log('\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token stored to', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        console.error('Error retrieving access token', err);
        reject(err);
      }
    });
  });
}

/**
 * Make a single file public
 */
async function makeFilePublic(drive, fileId, fileName) {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    console.log(`✅ ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ ${fileName}: ${error.message}`);
    return false;
  }
}

/**
 * List all files in a folder recursively
 */
async function listFilesInFolder(drive, folderId, pageToken = null) {
  const query = `'${folderId}' in parents and trashed = false`;

  const response = await drive.files.list({
    q: query,
    fields: 'nextPageToken, files(id, name, mimeType)',
    pageSize: 100,
    pageToken: pageToken,
  });

  const files = response.data.files;
  const nextPageToken = response.data.nextPageToken;

  // Get files from subfolders
  for (const file of files) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      const subFiles = await listFilesInFolder(drive, file.id);
      files.push(...subFiles);
    }
  }

  // Continue pagination
  if (nextPageToken) {
    const moreFiles = await listFilesInFolder(drive, folderId, nextPageToken);
    files.push(...moreFiles);
  }

  // Filter out folders from final list
  return files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Google Drive Bulk Permission Updater\n');

  // Get folder ID from command line or prompt
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const folderId = await new Promise((resolve) => {
    rl.question('📁 Enter Google Drive Folder ID (from URL): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!folderId) {
    console.error('❌ Folder ID is required');
    return;
  }

  console.log('\n🔑 Authorizing...');
  const auth = await authorize();

  if (!auth) {
    return;
  }

  const drive = google.drive({ version: 'v3', auth });

  console.log('\n📋 Listing files...');
  const files = await listFilesInFolder(drive, folderId);

  console.log(`\n📊 Found ${files.length} files\n`);
  console.log('⏳ Making files public...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const success = await makeFilePublic(drive, file.id, file.name);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${files.length}`);
  console.log('='.repeat(50) + '\n');
}

// Run the script
main().catch(console.error);
