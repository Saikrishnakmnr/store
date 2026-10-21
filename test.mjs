import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');let failures=0;
for(const file of fs.readdirSync(path.join(root,'dist')).filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',path.join(root,'dist',file)],{stdio:'inherit'});if(r.status!==0)failures++;}
function checkServer(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())checkServer(file);else if(/\.(mjs|js|ts)$/.test(entry.name)){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)failures++;}}}
checkServer(path.join(root,'supabase','functions'));
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>/\.test\.(cjs|mjs)$/.test(f)).sort();
for(const file of tests){const r=spawnSync(process.execPath,[path.join(root,'tests',file)],{stdio:'inherit'});if(r.status!==0)failures++;}
console.log(`${tests.length} test suites; ${failures} failed checks. Live provider and browser tests are not included.`);process.exitCode=failures?1:0;
