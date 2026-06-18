const TECH_PATTERNS = [
  { name: 'Nginx', header: 'server', pattern: /nginx/i },
  { name: 'Apache', header: 'server', pattern: /apache/i },
  { name: 'Cloudflare', header: 'server', pattern: /cloudflare/i },
  { name: 'Express', header: 'x-powered-by', pattern: /express/i },
  { name: 'PHP', header: 'x-powered-by', pattern: /php/i },
  { name: 'ASP.NET', header: 'x-powered-by', pattern: /asp\.net/i },
  { name: 'Next.js', header: 'x-powered-by', pattern: /next\.js/i },
];

const META_PATTERNS = [
  { name: 'WordPress', pattern: /wp-content|wp-includes/i },
  { name: 'React', pattern: /__REACT|react\.development|react\.production/i },
  { name: 'Vue.js', pattern: /vue\.js|vue\.min\.js/i },
  { name: 'jQuery', pattern: /jquery\.min\.js|jquery-\d/i },
];

export default {
  type: 'tech',
  appliesTo: ['domain'],

  async run(asset) {
    const url = `https://${asset.name}`;
    let res;
    try {
      res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    } catch {
      res = await fetch(`http://${asset.name}`, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    }

    const headers = Object.fromEntries(res.headers.entries());
    const body = await res.text();

    const detected = new Set();

    for (const { name, header, pattern } of TECH_PATTERNS) {
      if (headers[header] && pattern.test(headers[header])) detected.add(name);
    }

    for (const { name, pattern } of META_PATTERNS) {
      if (pattern.test(body)) detected.add(name);
    }

    return [{
      technologies: [...detected],
      headers: {
        server: headers['server'] ?? null,
        'x-powered-by': headers['x-powered-by'] ?? null,
        'content-type': headers['content-type'] ?? null,
      },
      status_code: res.status,
      url: res.url,
    }];
  },
};
