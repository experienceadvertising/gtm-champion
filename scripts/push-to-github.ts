import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.local', '.cache', '.config',
  '.upm', '__pycache__', 'server/public'
]);

const IGNORE_FILES = new Set([
  '.replit', 'replit.nix'
]);

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split('/');
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return true;
  }
  if (IGNORE_FILES.has(path.basename(filePath))) return true;
  if (filePath.endsWith('.tar.gz')) return true;
  return false;
}

function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2',
    '.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz', '.mp3', '.mp4',
    '.webp', '.avif'
  ]);
  return binaryExtensions.has(path.extname(filePath).toLowerCase());
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (shouldIgnore(relativePath)) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function retryOp<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      console.log(`  Retry ${i + 1}/${retries} after error: ${e.status || e.message}`);
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error('Should not reach here');
}

async function pushToGitHub() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });

  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  const owner = user.login;
  const repoName = 'gtm-champion';

  try {
    await octokit.repos.delete({ owner, repo: repoName });
    console.log('Deleted existing empty repository');
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (e: any) {
    if (e.status !== 404 && e.status !== 403) {
      console.log(`Could not delete repo (status ${e.status}), continuing...`);
    }
  }

  try {
    await octokit.repos.get({ owner, repo: repoName });
    console.log(`Repository ${owner}/${repoName} already exists, using it`);
  } catch (e: any) {
    if (e.status === 404) {
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'GTM Champion - AI-powered B2B SaaS Go-To-Market strategy platform',
        private: false,
        auto_init: true,
      });
      console.log(`Created repository with initial commit: ${owner}/${repoName}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      throw e;
    }
  }

  let mainRef;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo: repoName, ref: 'heads/main' });
    mainRef = ref;
  } catch {
    console.log('Waiting for repo initialization...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    const { data: ref } = await octokit.git.getRef({ owner, repo: repoName, ref: 'heads/main' });
    mainRef = ref;
  }

  console.log(`Main branch SHA: ${mainRef.object.sha}`);

  const projectDir = '/home/runner/workspace';
  const files = getAllFiles(projectDir);
  console.log(`Found ${files.length} files to push`);

  const BATCH_SIZE = 10;
  const treeItems: any[] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = [];

    for (const filePath of batch) {
      const fullPath = path.join(projectDir, filePath);
      const isBinary = isBinaryFile(filePath);

      let content: string;
      let encoding: 'utf-8' | 'base64';

      if (isBinary) {
        content = fs.readFileSync(fullPath).toString('base64');
        encoding = 'base64';
      } else {
        content = fs.readFileSync(fullPath, 'utf-8');
        encoding = 'utf-8';
      }

      const blob = await retryOp(async () => {
        const { data } = await octokit.git.createBlob({
          owner,
          repo: repoName,
          content,
          encoding,
        });
        return data;
      });

      results.push({
        path: filePath,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      });
    }

    treeItems.push(...results);
    console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} files...`);
  }

  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    base_tree: mainRef.object.sha,
    tree: treeItems,
  });

  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: 'GTM Champion - AI-powered B2B SaaS Go-To-Market strategy platform\n\nFull application source code including:\n- React + TypeScript frontend with Tailwind CSS\n- Express.js backend with PostgreSQL\n- AI-powered website analysis and GTM recommendations\n- Stripe subscription integration\n- Postmark email campaigns\n- 13-channel marketing strategy engine\n- Premium content tools (LinkedIn, Email, Blog generators)\n- AI chat assistant',
    tree: tree.sha,
    parents: [mainRef.object.sha],
  });

  console.log('Updating reference...');
  await octokit.git.updateRef({
    owner,
    repo: repoName,
    ref: 'heads/main',
    sha: commit.sha,
    force: true,
  });

  console.log(`\nSuccessfully pushed to: https://github.com/${owner}/${repoName}`);
}

pushToGitHub().catch(console.error);
