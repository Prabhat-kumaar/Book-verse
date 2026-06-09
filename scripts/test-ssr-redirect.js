const path = require('path')
const fs = require('fs')

// Load env vars from backend/.env if present
const envPath = path.join(__dirname, '..', 'backend', '.env')
if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
    raw.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
        if (m) {
            const key = m[1]
            let val = m[2]
            // strip quotes
            if ((val.startsWith("\'") && val.endsWith("\'")) || (val.startsWith('"') && val.endsWith('"'))) {
                val = val.slice(1, -1)
            }
            process.env[key] = val
        }
    })
}

const handler = require(path.join(__dirname, '..', 'api', 'redirect', 'book', '[id].js'))

async function runTest(id) {
    const req = { query: { id }, url: `/book/${id}` }

    let finished = false
    const res = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v },
        writeHead(code, h) { this.statusCode = code; Object.assign(this.headers, h || {}) },
        end(payload) { finished = true; this._ended = payload; console.log('\n--- RESPONSE END ---'); console.log('status:', this.statusCode); console.log('headers:', this.headers); if (payload) console.log('payload:', payload); },
        status(code) { this.statusCode = code; return this },
        send(body) { this._sent = body; this._sentWas = true; console.log('\n--- SEND ---'); console.log('status:', this.statusCode); console.log('body:', body) }
    }

    try {
        await handler(req, res)
        console.log('\nTest completed (handler returned).')
    } catch (err) {
        console.error('Handler threw:', err)
    }
}

const sampleId = process.argv[2] || '6a2252a362f02dec9196c843'
console.log('Testing SSR redirect for id=', sampleId)
runTest(sampleId).then(() => console.log('done'))
