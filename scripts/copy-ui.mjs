// Fiori uygulamalarını ve launchpad sandbox'ını approuter'ın statik klasörüne kopyalar (mbt build'in before-all adımı).
// Arayüzü approuter sunar (xs-app.json → localDir), OData istekleri CAP servisine gider.
import fs from 'node:fs'
import path from 'node:path'

const root = path.join(import.meta.dirname, '..')
const target = path.join(root, '.deploy', 'app-router', 'resources')
const files = ['index.html', 'fioriSandboxAppConfig.json']
const apps = ['rentals', 'vehicles', 'customers', 'analytics']

fs.rmSync(target, { recursive: true, force: true })
for (const file of files) fs.cpSync(path.join(root, 'app', file), path.join(target, file))
for (const app of apps) fs.cpSync(path.join(root, 'app', app, 'webapp'), path.join(target, app, 'webapp'), { recursive: true })
console.log(`Arayüz kopyalandı: ${path.relative(root, target)} (${apps.join(', ')})`)
