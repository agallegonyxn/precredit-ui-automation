#!/usr/bin/env node
// Sube un archivo como adjunto a un issue de Jira (API REST v3), usando un
// token API personal (Atlassian → perfil → seguridad → API tokens). Nunca
// usar el token de otra persona ni commitearlo — ver AGENTS.md.
//
// Uso:
//   node scripts/jira-attach.js <issueKey> <filePath>

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SITE = 'https://doublevpartners.atlassian.net';

async function attach(issueKey, filePath) {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) {
    throw new Error('Faltan JIRA_EMAIL/JIRA_API_TOKEN en .env');
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), filename);

  const res = await fetch(`${SITE}/rest/api/3/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'X-Atlassian-Token': 'no-check',
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Jira attach falló: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const [, , issueKey, filePath] = process.argv;
  if (!issueKey || !filePath) {
    console.error('Uso: node scripts/jira-attach.js <issueKey> <filePath>');
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(await attach(issueKey, filePath)));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
