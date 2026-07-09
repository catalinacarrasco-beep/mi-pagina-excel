'use strict';
const https = require('https');
const REPO = 'catalinacarrasco-beep/mi-pagina-excel';

module.exports.config = { api: { bodyParser: { sizeLimit: '4mb' } } };

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode >= 300 && r.statusCode < 400) return res(get(r.headers.location));
      const buf = []; r.on('data', c => buf.push(c)); r.on('end', () => res(Buffer.concat(buf).toString('utf8')));
    }).on('error', rej);
  });
}

function gh(path, method, body) {
  return new Promise((res, rej) => {
    const d = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = https.request({ hostname: 'api.github.com', path, method, headers: {
      'Authorization': 'token ' + process.env.GITHUB_TOKEN,
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
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });

  const { data, dateStr } = req.body || {};
  if (!data || !dateStr) return res.status(400).json({ error: 'Faltan datos' });

  try {
    // Parallel: fetch raw HTML + get tree to find file SHA
    const rawUrl = 'https://raw.githubusercontent.com/' + REPO + '/main/index.html';
    const [rawHtml, ref] = await Promise.all([get(rawUrl), gh('/repos/' + REPO + '/git/ref/heads/main', 'GET')]);
    const commit = await gh('/repos/' + REPO + '/git/commits/' + ref.object.sha, 'GET');
    const tree = await gh('/repos/' + REPO + '/git/trees/' + commit.tree.sha, 'GET');
    const fileSha = (tree.tree || []).find(f => f.path === 'index.html')?.sha;
    if (!fileSha) return res.status(500).json({ error: 'index.html no encontrado en árbol' });

    // Replace constants (same logic as update_html.mjs)
    const map = {
      DETAIL_GEN26: data.gen26, DETAIL_GEN25: data.gen25,
      DETAIL_2026: data.vend26, DETAIL_2025: data.vend25,
      CANALES_DETAIL26: data.canales26, CANALES_DETAIL25: data.canales25,
      RESUMEN_CANALES: data.resumenCanales,
      EXTRAS_DETAIL26: data.extras26, RESUMEN_EXTRAS: data.resumenExtras,
      RESUMEN: data.resumen, STOCK: data.stock,
      CLIENTES26: data.cli26, CLIENTES25: data.cli25,
    };
    let lines = rawHtml.split('\n');
    for (const [name, value] of Object.entries(map)) {
      const p1 = 'const ' + name + ' = ', p2 = 'const ' + name + '={', p3 = 'const ' + name + '= ';
      const nl = 'const ' + name + ' = ' + JSON.stringify(value) + ';';
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(p1) || lines[i].startsWith(p2) || lines[i].startsWith(p3)) lines[i] = nl;
      }
    }
    let html = lines.join('\n').replace(/Datos al \d{2}-\d{2}-\d{4}/g, 'Datos al ' + dateStr);

    // Push to GitHub
    const push = await gh('/repos/' + REPO + '/contents/index.html', 'PUT', {
      message: 'Actualización automática ' + dateStr,
      content: Buffer.from(html).toString('base64'),
      sha: fileSha
    });

    if (!push.commit) return res.status(500).json({ error: 'GitHub rechazó el push', detail: JSON.stringify(push).slice(0, 300) });
    res.json({ ok: true, commit: push.commit.sha.slice(0, 10), dateStr });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
