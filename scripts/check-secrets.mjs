import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '--cached', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
if (!files.length)
  throw new Error(
    'No staged/tracked files to inspect. Stage the project before running this check.',
  );
const forbidden =
  /(^|\/)(\.env(?:\..*)?|\.local|node_modules|\.next|test-results|playwright-report|[^/]+\.log|[^/]+\.sql(?:ite|ite3|db)|[^/]+\.(?:pem|key|p12))$/;
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{25,}/,
  /\b(?:sk_live_|sk_test_|whsec_)[A-Za-z0-9]{24,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
];
const privateValues = existsSync('.env')
  ? readFileSync('.env', 'utf8')
      .split('\n')
      .filter((line) =>
        /^(ADMIN_PASSWORD|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|CRON_SECRET)=/.test(line),
      )
      .map((line) => line.slice(line.indexOf('=') + 1).trim())
      .filter((value) => value.length >= 12)
  : [];
const findings = [];
for (const file of files) {
  if (
    (forbidden.test(file) ||
      /(^|\/)(?:\.local|node_modules|\.next|test-results|playwright-report)\//.test(file)) &&
    file !== '.env.example' &&
    file !== '.env.production.example'
  )
    findings.push(`${file}: forbidden artifact`);
  const bytes = readFileSync(file);
  if (bytes.includes(0)) continue;
  const text = bytes.toString('utf8');
  if (privateValues.some((value) => text.includes(value)))
    findings.push(`${file}: matches a private environment value`);
  if (patterns.some((pattern) => pattern.test(text)))
    findings.push(`${file}: credential-like content`);
}
if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Secret/artifact checks passed for ${files.length} staged/tracked files. Values were not printed.`,
  );
