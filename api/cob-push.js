'use strict';
const https = require('https');
const REPO = 'catalinacarrasco-beep/mi-pagina-excel';
const FILE = 'cob-data.json';

function gh(path, method, body, token) {
  return new Promise((res, rej) => {
    const d = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = https.request({ hostname: 'api.github.com', path, method, headers: {
      'Authorization': 'token ' + token,
      'User-Agent': 'ventas-grantt',
      'Accept': 'application/vnd.github.v3+json',
      ...(d ? { 'Content-Type': 'application/json', 'Content-Length': d.length } : {})
    }}, r => { const buf = []; r.on('data', c => buf.push(c)); r.on('end', () => { try { res(JSON.parse(Buffer.concat(buf).toString())); } catch(e) { res({}); } }); });
    req.on('error', rej);
    if (d) req.write(d);
    req.end();
  });
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const tk = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!tk) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado' });

  const payload = req.body;
  if (!payload || !payload.records || !payload.records.length) return res.status(400).json({ error: 'No hay registros' });

  try {
    let sha = null;
    try {
      const existing = await gh('/repos/' + REPO + '/contents/' + FILE, 'GET', null, tk);
      if (existing && existing.sha) sha = existing.sha;
    } catch(e) {}

    const content = Buffer.from(JSON.stringify(payload)).toString('base64');
    const push = await gh('/repos/' + REPO + '/contents/' + FILE, 'PUT', {
      message: 'Actualización datos cobranzas',
      content,
      ...(sha ? { sha } : {})
    }, tk);

    if (!push.commit) return res.status(500).json({ error: 'GitHub rechazó el push', detail: JSON.stringify(push).slice(0, 300) });
    res.json({ ok: true, commit: push.commit.sha.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
