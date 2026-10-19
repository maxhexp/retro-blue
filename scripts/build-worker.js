import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
await build({entryPoints:['server/worker.js'],outfile:'dist/_worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*','/admin','/admin/*','/media/*'],exclude:[]}));
