const fs = require('node:fs');
const vm = require('node:vm');
const { staging, verifyStagingKey, writeConfig } = require('../release/multiagent-staging/configure-frontend.cjs');

async function prepare() {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  const integratedBranch = ['homologacao/loja-010-04-010-05','desenvolvimento/ajuste-010-06-conciliacao','desenvolvimento/ajuste-011-gerenciamento-massa','homologacao/ciclo-completo-2026-11-24','fix/nov25-ux-syringe-consent-media-test','fix/pacote-final-teste-20261125','fix/test-vial-cover-20261125'].includes(branch);
  if (integratedBranch && (process.env.VERCEL_PROJECT_ID !== 'prj_ksWxwsJyKhdR2nW2OiZkwx8hlkdq'
      || !/^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA || ''))) {
    throw new Error('A integração financeira exige o projeto Vercel de Teste e um SHA Git.');
  }
  // Nunca servir o build de Teste com cadastro aberto em outro projeto.
  if (process.env.VERCEL === '1' && process.env.VERCEL_PROJECT_ID !== 'prj_ksWxwsJyKhdR2nW2OiZkwx8hlkdq') {
    throw new Error('O cadastro de homologação exige o projeto Vercel NeoPep Teste.');
  }
  if (process.env.VERCEL === '1' && !integratedBranch && !['staging', 'staging/permanente'].includes(branch)) {
    throw new Error('Branch inválida para a publicação de homologação.');
  }

  const key = process.env.NEO_STAGING_SUPABASE_PUBLISHABLE_KEY || '';
  const vapid = process.env.NEO_STAGING_VAPID_PUBLIC_KEY || '';
  const captchaSiteKey = (process.env.NEO_STAGING_CAPTCHA_SITE_KEY || '').trim();
  await verifyStagingKey(key);
  if (vapid && !/^[A-Za-z0-9_-]{87}$/.test(vapid)) throw new Error('Chave VAPID pública inválida.');

  writeConfig('dist', key);
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('dist/config.js', 'utf8'), context);
  const base = context.window.NEO_CONFIG;
  const config = {
    ...base,
    // O cadastro por e-mail é permitido somente na homologação.
    // A configuração de Produção continua com publicRegistration=false.
    publicRegistration: false,
    captchaSiteKey,
    captchaRequired: Boolean(captchaSiteKey),
    previewRegistration: Boolean(captchaSiteKey),
    appDisplayName: 'NeoPep Teste',
    legacyPushScope: '/neo/',
    stagingGeoEnabled: process.env.NEO_STAGING_GEO_ENABLED === '1' && !!process.env.NEO_STAGING_SERVER_SUPABASE_KEY,
    stagingBuild: /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA || '') ? {
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      branch,
      builtAt: new Date().toISOString()
    } : null,
    pushVapidPublicKey: vapid,
    providers: {
      ...base.providers,
      google: process.env.NEO_STAGING_GOOGLE_ENABLED === '1',
      apple: process.env.NEO_STAGING_APPLE_ENABLED === '1'
    }
  };
  fs.writeFileSync('dist/config.js', `window.NEO_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`);

  const manifestPath = 'dist/manifest.webmanifest';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  Object.assign(manifest, { id: '/', name: 'NeoPep Teste', short_name: 'NeoPep Teste', start_url: '/', scope: '/' });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  for (const path of ['dist/index.html', 'dist/admin/index.html', 'dist/excluir-conta/index.html']) {
    const html = fs.readFileSync(path, 'utf8')
      .replace(/<title>([^<]*?)(?: — Homologação)?<\/title>/, (_, title) => '<title>' + title.replace(/NeoPep(?! Teste)/, 'NeoPep Teste') + '</title>')
      .replace('name="apple-mobile-web-app-title" content="NeoPep"', 'name="apple-mobile-web-app-title" content="NeoPep Teste"')
      .replaceAll('https://*.supabase.co', staging)
      .replaceAll('wss://*.supabase.co', staging.replace('https:', 'wss:'));
    fs.writeFileSync(path, html);
  }
  const style = 'dist/style.css';
  const marker = '/* Identificação exclusiva da homologação */';
  const css = fs.readFileSync(style, 'utf8').split(marker)[0];
  fs.writeFileSync(style, css + `
${marker}
body::before{
  content:"TESTE";display:block;width:max-content;margin:calc(env(safe-area-inset-top,0px) + 4px) auto 4px;
  pointer-events:none;color:#e5c886;background:#19150f;border:1px solid #d5ad62;border-radius:999px;
  padding:2px 9px;font:700 10px/1.3 system-ui,sans-serif;letter-spacing:.13em;
}
html[data-theme=light] body::before{color:#142743;background:#edf0f4;border-color:#a8b4cc}
`);
  // Keep the former launch URL and Auth callback as real pages at the same origin.
  fs.mkdirSync('dist/neo', { recursive: true });
  fs.copyFileSync('dist/index.html', 'dist/neo/index.html');

  const serviceWorker = 'dist/sw.js';
  const worker = fs.readFileSync(serviceWorker, 'utf8')
    .replace(/^(?:const CACHE_PREFIX=.*;\n)?const CACHE=.*;$/m,
      "const CACHE_PREFIX='staging-neopeptideos-shell-'+(new URL(self.registration.scope).pathname==='/neo/'?'legacy-':'root-');\nconst CACHE=CACHE_PREFIX+'pwa-v48-capas-campanhas';")
    .replace(/key\.startsWith\((?:'[^']+'|CACHE_PREFIX)\)/, 'key.startsWith(CACHE_PREFIX)');
  fs.writeFileSync(serviceWorker, worker);
}

prepare().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
