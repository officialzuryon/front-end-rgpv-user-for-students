// scripts/generate-static-data.js
// Run this file with: node scripts/generate-static-data.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'rrpv-papers';
const API_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Fetch all documents from a Firestore collection using pagination
 */
async function fetchCollection(collectionName) {
  let allDocs = [];
  let nextPageToken = null;
  let url = `${API_URL}/${collectionName}?pageSize=300`;

  console.log(`Fetching ${collectionName}...`);

  do {
    const fetchUrl = nextPageToken ? `${url}&pageToken=${nextPageToken}` : url;
    
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(fetchUrl, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });

      if (data.error) {
         throw new Error(data.error.message);
      }

      const docs = (data.documents || []).map(doc => {
        // Extract ID from name: "projects/rrpv-papers/databases/(default)/documents/papers/123" -> "123"
        const id = doc.name.split('/').pop();
        
        // Convert Firestore field format to plain JSON
        const fields = doc.fields || {};
        const parsed = { id };
        
        for (const [key, value] of Object.entries(fields)) {
          if ('stringValue' in value) parsed[key] = value.stringValue;
          else if ('integerValue' in value) parsed[key] = parseInt(value.integerValue, 10);
          else if ('doubleValue' in value) parsed[key] = parseFloat(value.doubleValue);
          else if ('booleanValue' in value) parsed[key] = value.booleanValue;
          else if ('timestampValue' in value) parsed[key] = value.timestampValue;
          else if ('referenceValue' in value) parsed[key] = value.referenceValue;
          else if ('arrayValue' in value && value.arrayValue.values) {
             parsed[key] = value.arrayValue.values.map(v => v.stringValue || v.integerValue || Object.values(v)[0]);
          }
        }
        
        return parsed;
      });

      allDocs = allDocs.concat(docs);
      nextPageToken = data.nextPageToken;
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err.message);
      break;
    }
  } while (nextPageToken);

  console.log(`- Fetched ${allDocs.length} items from ${collectionName}`);
  return allDocs;
}

async function generateStaticData() {
  try {
    const startTime = Date.now();
    
    // 1. Fetch data
    const [papers, branches, universities, degrees, blogs] = await Promise.all([
      fetchCollection('papers'),
      fetchCollection('branches'),
      fetchCollection('universities'),
      fetchCollection('degrees'),
      fetchCollection('blogs')
    ]);

    // 2. Process data
    const data = {
      papers: papers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
      blogs: blogs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
      branches,
      universities,
      degrees,
      generatedAt: new Date().toISOString()
    };

    // 3. Save to data/papers.json
    const outputDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'papers.json');
    fs.writeFileSync(outputPath, JSON.stringify(data));
    
    // 4. Also copy to frontend js folder for quick access
    const publicPath = path.join(__dirname, '..', 'js', 'papers-data.json');
    fs.writeFileSync(publicPath, JSON.stringify(data));

    console.log(`\n✅ Successfully generated static data in ${(Date.now() - startTime)}ms`);
    console.log(`Saved to: ${publicPath} (${(fs.statSync(publicPath).size / 1024).toFixed(2)} KB)`);

  } catch (err) {
    console.error('Failed to generate static data:', err);
  }
}

generateStaticData();
