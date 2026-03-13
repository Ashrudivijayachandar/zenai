const fs = require('fs');
const content = fs.readFileSync('results2.txt', 'utf8');
const lines = content.split('\n');
let currentAgent = '';
let failCount = 0;
let perAgent = {};
for (const line of lines) {
  const agentMatch = line.match(/Agent (\d+):\s+(.+)/);
  if (agentMatch && !line.includes('PASS') && !line.includes('FAIL')) {
    currentAgent = `Agent ${agentMatch[1]}: ${agentMatch[2].replace(/[^\x20-\x7E]/g,'').trim()}`;
  }
  if (line.includes('FAIL') && line.includes('"')) {
    failCount++;
    const msgMatch = line.match(/"([^"]+)"/);
    const gotMatch = line.match(/got: ([^,]+)/);
    const expMatch = line.match(/expected: ([^\s)]+)/);
    console.log(`${failCount}. ${currentAgent}`);
    console.log(`   Query: "${msgMatch ? msgMatch[1] : '?'}"`);
    console.log(`   Got: ${gotMatch ? gotMatch[1] : '?'} | Expected: ${expMatch ? expMatch[1] : '?'}`);
  }
  const passedMatch = line.match(/(\d+)\/(\d+) passed/);
  if (passedMatch) {
    console.log(`   >> ${currentAgent}: ${passedMatch[1]}/${passedMatch[2]} passed`);
  }
}
console.log(`\nTotal failures: ${failCount}`);
