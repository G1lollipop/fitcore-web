const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

process.env.HTTPS_PROXY = 'http://127.0.0.1:7890';
process.env.HTTP_PROXY = 'http://127.0.0.1:7890';

const output = execSync('.\\node_modules\\supabase\\bin\\supabase.exe gen types --linked --lang=typescript', {
  encoding: 'utf-8',
  cwd: path.join(__dirname, '..')
});

const lines = output.split('\n');
const startIndex = lines.findIndex(line => line.startsWith('export type Json'));

if (startIndex === -1) {
  console.error('Could not find start of types output');
  process.exit(1);
}

const cleanOutput = lines.slice(startIndex).join('\n');

const outputPath = path.join(__dirname, '..', 'lib', 'database.types.ts');
fs.writeFileSync(outputPath, cleanOutput, 'utf-8');

console.log('Types generated successfully to lib/database.types.ts');
