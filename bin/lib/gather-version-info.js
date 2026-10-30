//@ts-check
import { spawnSync } from 'child_process'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function gatherProcessStdout(cmd, args) {
  const { status, stdout, stderr, error } = spawnSync(cmd, args)
  if (status !== 0) throw error || new Error(stderr?.toString() || `${cmd} failed`)
  return stdout.toString().replace(/\n/g, '')
}

async function getGitRef() {
  if (process.env.VERSION_INFO_GIT_REF) {
    return process.env.VERSION_INFO_GIT_REF
  }

  let git_describe
  try {
    // A checkout without tags still has a genuine commit identifier.
    git_describe = gatherProcessStdout('git', ['describe', '--tags', '--always'])
  } catch {
    try {
      git_describe = gatherProcessStdout('git', ['rev-parse', 'HEAD']).substring(0, 7)
    } catch {
      console.warn(
        'Git version metadata unavailable; set VERSION_INFO_GIT_REF manually for source archives.'
      )
      return 'unknown'
    }
  }

  let git_branch = 'main'
  const environmentRef = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF
  if (environmentRef) {
    git_branch = environmentRef.split('/').pop() || 'main'
  } else {
    try {
      // Detached CI/release checkouts are normal, not version errors.
      git_branch =
        gatherProcessStdout('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'])
          .split('/')
          .pop() || 'main'
    } catch {
      // With no named branch, the genuine describe/SHA is sufficient.
    }
  }
  return git_describe + (git_branch === 'main' ? '' : '-' + git_branch)
}

/**
 * @returns {Promise<import('@deltachat-desktop/shared/shared-types').BuildInfo>}
 */
export async function gatherBuildInfo() {
  const packageJSON = join(__dirname, '../../package.json')
  const packageObject = JSON.parse(await readFile(packageJSON, 'utf8'))
  return {
    VERSION: packageObject.version,
    BUILD_TIMESTAMP: process.env.SOURCE_DATE_EPOCH
      ? Number(process.env.SOURCE_DATE_EPOCH) * 1000
      : Date.now(),
    GIT_REF: await getGitRef(),
  }
}
