const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

test('staging installs at the root and keeps the former launch and worker routes', (t) => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'neopep-staging-pwa-'));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  for (const file of [
    'scripts/build-staging.cjs', 'release/multiagent-staging/configure-frontend.cjs',
    'dist/index.html', 'dist/admin/index.html', 'dist/excluir-conta/index.html',
    'dist/sw.js', 'dist/manifest.webmanifest', 'dist/style.css'
  ]) {
    const dest = path.join(work, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  fs.writeFileSync(path.join(work, 'fetch.cjs'), 'global.fetch = async () => ({ ok: true });');
  execFileSync(process.execPath, ['--require', './fetch.cjs', 'scripts/build-staging.cjs'], {
    cwd: work, env: {
      ...process.env, VERCEL: '1', VERCEL_GIT_COMMIT_REF: 'staging/permanente', VERCEL_PROJECT_ID: 'prj_ksWxwsJyKhdR2nW2OiZkwx8hlkdq',
      NEO_STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture'
    }
  });
  const integrated = {
    ...process.env, VERCEL: '1', VERCEL_GIT_COMMIT_REF: 'homologacao/loja-010-04-010-05',
    VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40), NEO_STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture'
  };
  const build = (env) => execFileSync(process.execPath, ['--require', './fetch.cjs', 'scripts/build-staging.cjs'], {
    cwd: work, env, stdio: 'pipe'
  });
  assert.throws(() => build({...integrated, VERCEL_PROJECT_ID:'prj_Qd8luBAEbXtJgk5dIwwoSbnrBIki'}), /projeto Vercel de Teste/);
  assert.throws(() => build({...integrated, VERCEL_PROJECT_ID:'prj_ksWxwsJyKhdR2nW2OiZkwx8hlkdq', VERCEL_GIT_COMMIT_SHA:''}), /SHA Git/);
  build({...integrated, VERCEL_PROJECT_ID:'prj_ksWxwsJyKhdR2nW2OiZkwx8hlkdq'});
  const cycle={...integrated,VERCEL_GIT_COMMIT_REF:'homologacao/ciclo-completo-2026-11-24'};
  assert.throws(()=>build({...cycle, VERCEL_PROJECT_ID:'prj_Qd8luBAEbXtJgk5dIwwoSbnrBIki'}),/projeto Vercel de Teste/);
  build({...cycle, VERCEL_PROJECT_ID:'prj_ksWxwsJyKhdR2nW2OiZkwx8hlkdq'});
  const read = (file) => fs.readFileSync(path.join(work, 'dist', file), 'utf8');
  assert.doesNotMatch(fs.readFileSync('dist/style.css','utf8'), /content:"TESTE"/);
  assert.match(read('style.css'), /content:"TESTE";display:block/);
  assert.match(read('style.css'), /pointer-events:none/);
  assert.match(read('admin/index.html'), /href="..\/style.css"/);
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.deepEqual([manifest.id, manifest.start_url, manifest.scope], ['/', '/', '/']);
  assert.equal(manifest.name, 'NeoPep Teste');
  assert.equal(manifest.short_name, 'NeoPep Teste');
  assert.match(read('index.html'), /name="apple-mobile-web-app-title" content="NeoPep Teste"/);
  assert.equal(read('neo/index.html'), read('index.html'));
  const window = {};
  vm.runInNewContext(read('config.js'), { window });
  assert.equal(window.NEO_CONFIG.supabaseUrl, 'https://qnuluspqfazdppciermw.supabase.co');
  assert.equal(window.NEO_CONFIG.stagingBuild.commit, 'a'.repeat(40));
  assert.equal(window.NEO_CONFIG.stagingBuild.branch, 'homologacao/ciclo-completo-2026-11-24');
  assert.equal(window.NEO_CONFIG.authRedirectPath, '/neo/');
  assert.equal(window.NEO_CONFIG.legacyPushScope, '/neo/');
  const cache = (scope) => vm.runInNewContext(read('sw.js') + '\nCACHE', {
    URL, self: { registration: { scope }, addEventListener() {} }
  });
  assert.notEqual(cache('https://test.example/'), cache('https://test.example/neo/'));
  assert.match(cache('https://test.example/'),/pwa-v48-capas-campanhas$/);
  assert.match(cache('https://test.example/neo/'),/pwa-v48-capas-campanhas$/);
  assert.match(read('sw.js'),/'appearance\.js'/);
  assert.match(read('sw.js'),/'library-video\.js','library-files\.js'/);
  for(const file of ['index.html','neo/index.html']){
   const html=read(file);
   assert.ok(html.indexOf('library-video.js')>=0&&html.indexOf('library-video.js')<html.indexOf('library-files.js'));
  }
  const { rewrites, headers } = JSON.parse(fs.readFileSync('vercel.json'));
  assert.ok(rewrites.some(rule => rule.source === '/neo/sw.js' && rule.destination === '/sw.js'));
  assert.ok(headers.some(rule => rule.source === '/neo/sw.js' &&
    rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-cache'))));
});
