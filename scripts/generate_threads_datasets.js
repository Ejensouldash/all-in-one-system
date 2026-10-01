const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/user/Downloads/dataset_threads-scraper-usage_2026-10-01_07-37-25-195.json';
const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Keywords
const healthKeywords = [
  'sakit tekak', 'tekak', 'cirit', 'birit', 'muntah', 'vomit', 'batuk',
  'demam', 'fever', 'sakit perut', 'stomach', 'keracunan', 'poisoning',
  'sakit kepala', 'headache', 'pening', 'bloat', 'bloating', 'loya', 'nausea',
  'gastrik', 'diarrhea', 'diarrhoea', 'perut memulas', 'masuk wad', 'hospital', 'klinik', 'doktor'
];

const defectKeywords = [
  'bau tanah', 'bau ubat', 'bau petai', 'bau busuk', 'bau semacam', 'bau hanyir', 'bau pelik',
  'bau', 'smell', 'odor', 'odour', 'busuk', 'stink', 'tanah', 'ubat', 'petai', 'hanyir', 'plastik', 'minyak', 'masam', 'basi', 'tengik',
  'rasa pelik', 'rasa payau', 'payau', 'pahit', 'kelat', 'taste weird', 'weird taste', 'taste strange', 'pelik',
  'buncit', 'bengkak', 'kembung', 'leaking', 'bocor', 'habuk', 'keladak', 'lumut', 'kotor', 'berkeladak',
  'buang', 'buang air', 'buang botol', 'terbuang', 'recall', 'tarik balik', 'pulang', 'return', 'reject',
  'beli kat', 'beli dekat', 'beli kt', 'beli aritu', 'beli semalam', 'minum rasa', 'minum bau', 'terbeli', 'dah minum', 'lepas minum',
  'rosak', 'terjejas'
];

const inquiryKeywords = [
  'batch', 'exp', 'expired', 'tarikh', 'date', 'refund', 'claim', 'tukar', 'duit', 'ganti', 'kedai mana',
  'kenapa x boleh', 'kenapa tak boleh', 'kenapa takleh', 'sebab apa', 'isu apa', 'bermasalah', 'apa masalah',
  'boleh tahu', 'boleh tau', 'mcm mana', 'macam mana', 'hubungi', 'dm'
];

function extractBatch(text) {
  if (!text) return null;
  const m1 = text.match(/\b(\d{6}-\d{2})\b/);
  if (m1) return m1[1];

  const m1b = text.match(/\b(\d{6})\b/);
  if (m1b && !/^(202610|123456)$/.test(m1b[1])) return m1b[1];

  const m2 = text.match(/\b(?:batch|b\/n|no batch)\s*[:#\-]?\s*([A-Za-z0-9\-\.\/]+)/i);
  if (m2 && !/^(apa|mana|ke|tu|ni|terbaru|lama|yg|yang|kt|kat|bila|kenapa|tahu|cek|check|sama|air|nombor|number)$/i.test(m2[1])) {
    return m2[1].replace(/[.,]+$/, '');
  }

  const m3 = text.match(/\b(?:exp|bb|expiry)\s*[:#\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4,8})/i);
  if (m3) return 'EXP ' + m3[1];

  return null;
}

function extractSymptomsList(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const symptoms = [];

  // Health
  if (lower.includes('cirit') || lower.includes('birit') || lower.includes('diarrhea')) symptoms.push('Cirit-birit');
  if (lower.includes('muntah') || lower.includes('vomit') || lower.includes('loya') || lower.includes('nausea')) symptoms.push('Muntah / Loya');
  if (lower.includes('sakit perut') || lower.includes('memulas') || lower.includes('bloat')) symptoms.push('Sakit Perut / Kembung');
  if (lower.includes('sakit tekak') || lower.includes('batuk')) symptoms.push('Sakit Tekak / Batuk');
  if (lower.includes('sakit kepala') || lower.includes('pening') || lower.includes('headache')) symptoms.push('Sakit Kepala / Pening');
  if (lower.includes('demam') || lower.includes('fever')) symptoms.push('Demam');
  if (lower.includes('keracunan') || lower.includes('hospital') || lower.includes('wad') || lower.includes('klinik')) symptoms.push('Keracunan / Rawatan');

  // Defect
  if (lower.includes('bau tanah') || lower.includes('tanah')) symptoms.push('Bau Tanah');
  if (lower.includes('bau ubat') || lower.includes('ubat')) symptoms.push('Bau Ubat');
  if (lower.includes('bau petai') || lower.includes('petai')) symptoms.push('Bau Petai');
  if (lower.includes('bau busuk') || lower.includes('busuk') || lower.includes('bau semacam') || lower.includes('hanyir') || lower.includes('tengik')) symptoms.push('Bau Busuk / Pelik');
  if (lower.includes('rasa payau') || lower.includes('payau')) symptoms.push('Rasa Payau');
  if (lower.includes('rasa pelik') || lower.includes('pahit') || lower.includes('kelat') || lower.includes('masam') || lower.includes('basi')) symptoms.push('Rasa Pelik / Pahit');
  if (lower.includes('buncit') || lower.includes('kembung') || lower.includes('bengkak')) symptoms.push('Botol Buncit');
  if (lower.includes('keladak') || lower.includes('habuk') || lower.includes('kotor') || lower.includes('lumut') || lower.includes('bocor') || lower.includes('leaking')) symptoms.push('Keladak / Bocor');
  if (lower.includes('buang') || lower.includes('recall') || lower.includes('tarik balik') || lower.includes('pulang')) symptoms.push('Stok Dibuang / Recall');

  // Inquiry / Refund
  if (lower.includes('refund') || lower.includes('claim') || lower.includes('ganti')) symptoms.push('Tuntutan Refund / Ganti');

  return Array.from(new Set(symptoms));
}

function classifyItem(item) {
  const username = (item.username || '').toLowerCase();
  const text = (item.text || '').trim();
  const lowerText = text.toLowerCase();

  // 1. Brand Official
  if (username === 'bubbleso2') {
    return {
      categoryGroup: 'Brand Official',
      priority: 'Info',
    };
  }

  // 2. Meta AI Bot
  if (username === 'meta.ai') {
    return {
      categoryGroup: 'Meta AI Assistant',
      priority: 'Info',
    };
  }

  // 3. Health Issues
  if (healthKeywords.some(kw => lowerText.includes(kw))) {
    return {
      categoryGroup: 'Health Issue',
      priority: 'High',
    };
  }

  // 4. Quality & Defect Issues
  if (defectKeywords.some(kw => lowerText.includes(kw))) {
    return {
      categoryGroup: 'Quality Defect',
      priority: 'Medium',
    };
  }

  // 5. Inquiries & Refunds
  if (inquiryKeywords.some(kw => lowerText.includes(kw))) {
    return {
      categoryGroup: 'Inquiry & Refund',
      priority: 'Low',
    };
  }

  // 6. General Social Chatter / Mentions / Discussion
  return {
    categoryGroup: 'General Chatter',
    priority: 'Low',
  };
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Sort descending by taken_at
const sortedRaw = [...rawData].sort((a, b) => (b.taken_at || 0) - (a.taken_at || 0));

const allRecords = [];
let idCounter = 1;

sortedRaw.forEach(item => {
  const text = (item.text || '').trim();
  const { categoryGroup, priority } = classifyItem(item);
  const symptoms = extractSymptomsList(text);
  const batchNo = extractBatch(text);

  const complaintId = `CMP-TH-${String(idCounter).padStart(3, '0')}`;
  idCounter++;

  const dateStr = formatDate(item.taken_at);
  const username = item.username ? `@${item.username}` : '@anonymous';
  const customerName = item.full_name ? `${username} (${item.full_name})` : username;

  // Build compact main complaint with category, symptoms, and batch tags
  let summaryParts = [];
  if (symptoms.length > 0) {
    summaryParts.push(`[Simptom: ${symptoms.join(', ')}]`);
  }
  if (batchNo) {
    summaryParts.push(`[Batch No: ${batchNo}]`);
  }
  summaryParts.push(text ? text.replace(/\r?\n|\r/g, ' ') : '[No Text / Media only]');
  const mainComplaint = summaryParts.join(' ');

  allRecords.push({
    complaintId,
    categoryGroup,
    date: dateStr,
    takenAt: item.taken_at,
    rawDate: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : null,
    customerName,
    username: item.username || '',
    fullName: item.full_name || '',
    customerNumber: 'N/A (Threads)',
    platform: 'Threads',
    postUrl: item.post_url || '',
    mainComplaint,
    rawText: text || '(No text)',
    symptoms,
    detectedBatchNo: batchNo,
    priority, // High, Medium, Low, Info
    status: 'Open',
    picHandling: 'Unassigned',
    likeCount: item.like_count || 0,
    replyCount: item.reply_count || 0
  });
});

console.log('Total Records Processed:', allRecords.length);
const groupCounts = {};
allRecords.forEach(r => {
  groupCounts[r.categoryGroup] = (groupCounts[r.categoryGroup] || 0) + 1;
});
console.log('Group Breakdown:');
console.log(groupCounts);

// Generate CSV with CATEGORY / GROUP column
const csvHeaders = [
  'COMPLAINT ID',
  'CATEGORY / GROUP',
  'DATE',
  'CUSTOMER & NUMBER',
  'PLATFORM & SOCIALS',
  'MAIN COMPLAINT',
  'PRIORITY',
  'STATUS',
  'PIC HANDLING'
];

const csvRows = allRecords.map(c => [
  `"${c.complaintId}"`,
  `"${c.categoryGroup}"`,
  `"${c.date}"`,
  `"${c.customerName.replace(/"/g, '""')}"`,
  `"Threads - ${c.postUrl}"`,
  `"${c.mainComplaint.replace(/"/g, '""')}"`,
  `"${c.priority}"`,
  `"${c.status}"`,
  `"${c.picHandling}"`
]);

const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\r\n');

// Output files
const outCsvPath = 'C:/Users/user/Downloads/threads_complaints_structured.csv';
const outJsonPath = 'C:/Users/user/Downloads/threads_complaints_structured.json';
const appJsonPath = path.join(__dirname, '../src/data/threads_complaints.json');

fs.mkdirSync(path.dirname(appJsonPath), { recursive: true });
fs.writeFileSync(outCsvPath, csvContent, 'utf8');
fs.writeFileSync(outJsonPath, JSON.stringify(allRecords, null, 2), 'utf8');
fs.writeFileSync(appJsonPath, JSON.stringify(allRecords, null, 2), 'utf8');

console.log('Files generated successfully:');
console.log('  1. ' + outCsvPath);
console.log('  2. ' + outJsonPath);
console.log('  3. ' + appJsonPath);
