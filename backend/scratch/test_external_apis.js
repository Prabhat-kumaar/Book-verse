const fetch = require('node-fetch');
async function test() {
  try {
    const wordRes = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/asdfghjkl');
    console.log('Status code:', wordRes.status);
    const wordData = await wordRes.json();
    console.log('Data:', wordData);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
