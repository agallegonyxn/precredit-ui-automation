#!/usr/bin/env node
// Helper de línea de comandos para la API de Xray Cloud (GraphQL): marcar
// status y adjuntar evidencia a nivel de Test Run y de paso individual, y
// asociar un Bug/Defecto ya creado al paso que falló.
//
// El testIssueId/testExecIssueId son los IDs internos de Jira (no las keys,
// ej. PCGL-3243) — resolverlos antes con Jira (MCP de Atlassian) y pasarlos
// como argumento.
//
// Uso:
//   node scripts/xray.js get-run <testIssueId> <testExecIssueId>
//   node scripts/xray.js set-status <testRunId> <PASSED|FAILED>
//   node scripts/xray.js add-evidence <testRunId> <filePath>
//   node scripts/xray.js reset <testRunId>
//   node scripts/xray.js get-test <testIssueId>                       # lista los steps (id/action/data/result)
//   node scripts/xray.js set-step-status <testRunId> <stepId> <PASSED|FAILED>
//   node scripts/xray.js add-step-evidence <testRunId> <stepId> <filePath>
//   node scripts/xray.js add-step-defect <testRunId> <stepId> <issueKey>

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = 'https://xray.cloud.getxray.app/api/v2';

async function authenticate() {
  const res = await fetch(`${BASE}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.XRAY_CLIENT_ID,
      client_secret: process.env.XRAY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`Xray auth falló: ${res.status} ${await res.text()}`);
  }
  return res.json(); // string: el JWT
}

async function graphql(token, query, variables) {
  const res = await fetch(`${BASE}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Xray GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function getRun(token, testIssueId, testExecIssueId) {
  const data = await graphql(
    token,
    `query($testIssueId: String!, $testExecIssueId: String!) {
      getTestRun(testIssueId: $testIssueId, testExecIssueId: $testExecIssueId) {
        id
        status { name description }
      }
    }`,
    { testIssueId, testExecIssueId }
  );
  return data.getTestRun;
}

async function setStatus(token, testRunId, status) {
  const data = await graphql(
    token,
    `mutation($id: String!, $status: String!) {
      updateTestRunStatus(id: $id, status: $status)
    }`,
    { id: testRunId, status }
  );
  return data.updateTestRunStatus;
}

function guessMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return (
    {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webm': 'video/webm',
      '.html': 'text/html',
      '.zip': 'application/zip',
    }[ext] || 'application/octet-stream'
  );
}

async function addEvidence(token, testRunId, filePath) {
  const filename = path.basename(filePath);
  const data64 = fs.readFileSync(filePath).toString('base64');
  const data = await graphql(
    token,
    `mutation($id: String!, $evidence: [AttachmentDataInput]!) {
      addEvidenceToTestRun(id: $id, evidence: $evidence) {
        addedEvidence
        warnings
      }
    }`,
    {
      id: testRunId,
      evidence: [{ filename, mimeType: guessMimeType(filename), data: data64 }],
    }
  );
  return data.addEvidenceToTestRun;
}

async function resetRun(token, testRunId) {
  const data = await graphql(
    token,
    `mutation($id: String!) { resetTestRun(id: $id) }`,
    { id: testRunId }
  );
  return data.resetTestRun;
}

async function getTest(token, testIssueId) {
  const data = await graphql(
    token,
    `query($issueId: String!) {
      getTest(issueId: $issueId) {
        issueId
        steps { id action data result }
      }
    }`,
    { issueId: testIssueId }
  );
  return data.getTest;
}

async function setStepStatus(token, testRunId, stepId, status) {
  const data = await graphql(
    token,
    `mutation($testRunId: String!, $stepId: String!, $status: String!) {
      updateTestRunStepStatus(testRunId: $testRunId, stepId: $stepId, status: $status) {
        warnings
      }
    }`,
    { testRunId, stepId, status }
  );
  return data.updateTestRunStepStatus;
}

async function addStepEvidence(token, testRunId, stepId, filePath) {
  const filename = path.basename(filePath);
  const data64 = fs.readFileSync(filePath).toString('base64');
  const data = await graphql(
    token,
    `mutation($testRunId: String!, $stepId: String!, $evidence: [AttachmentDataInput]) {
      addEvidenceToTestRunStep(testRunId: $testRunId, stepId: $stepId, evidence: $evidence) {
        addedEvidence
        warnings
      }
    }`,
    {
      testRunId,
      stepId,
      evidence: [{ filename, mimeType: guessMimeType(filename), data: data64 }],
    }
  );
  return data.addEvidenceToTestRunStep;
}

async function addStepDefect(token, testRunId, stepId, issueKey) {
  const data = await graphql(
    token,
    `mutation($testRunId: String!, $stepId: String!, $issues: [String]) {
      addDefectsToTestRunStep(testRunId: $testRunId, stepId: $stepId, issues: $issues) {
        addedDefects
        warnings
      }
    }`,
    { testRunId, stepId, issues: [issueKey] }
  );
  return data.addDefectsToTestRunStep;
}

async function main() {
  const [, , cmd, ...args] = process.argv;
  if (!process.env.XRAY_CLIENT_ID || !process.env.XRAY_CLIENT_SECRET) {
    throw new Error('Faltan XRAY_CLIENT_ID/XRAY_CLIENT_SECRET en .env');
  }
  const token = await authenticate();

  switch (cmd) {
    case 'get-run': {
      const [testIssueId, testExecIssueId] = args;
      console.log(JSON.stringify(await getRun(token, testIssueId, testExecIssueId)));
      break;
    }
    case 'set-status': {
      const [testRunId, status] = args;
      console.log(await setStatus(token, testRunId, status));
      break;
    }
    case 'add-evidence': {
      const [testRunId, filePath] = args;
      console.log(await addEvidence(token, testRunId, filePath));
      break;
    }
    case 'reset': {
      const [testRunId] = args;
      console.log(await resetRun(token, testRunId));
      break;
    }
    case 'get-test': {
      const [testIssueId] = args;
      console.log(JSON.stringify(await getTest(token, testIssueId)));
      break;
    }
    case 'set-step-status': {
      const [testRunId, stepId, status] = args;
      console.log(await setStepStatus(token, testRunId, stepId, status));
      break;
    }
    case 'add-step-evidence': {
      const [testRunId, stepId, filePath] = args;
      console.log(await addStepEvidence(token, testRunId, stepId, filePath));
      break;
    }
    case 'add-step-defect': {
      const [testRunId, stepId, issueKey] = args;
      console.log(await addStepDefect(token, testRunId, stepId, issueKey));
      break;
    }
    default:
      console.error(
        'Uso: node scripts/xray.js <get-run|set-status|add-evidence|reset|get-test|set-step-status|add-step-evidence|add-step-defect> ...'
      );
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
