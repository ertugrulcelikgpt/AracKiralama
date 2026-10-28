import cds from '@sap/cds/eslint.config.mjs'
export default [
  ...cds.recommended,
  // Build çıktıları ve approuter'a kopyalanan arayüz dosyaları
  { ignores: ['gen/', 'mta_archives/', '.deploy/app-router/resources/', '.deploy/app-router/node_modules/'] },
  // Komut satırı betikleri çıktıyı konsola yazar
  { files: ['scripts/**'], rules: { 'no-console': 'off' } }
]
