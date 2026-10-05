//@ts-check
import { spawnSync } from 'child_process'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function gatherProcessStdout(cmd, args) {
  const { status, stdout, stderr } = spawnSync(cmd, args)
  if (status !== 0) throw new Error(stderr)
  return stdout.toString().replace(/\n/g, '')
}

async function getGitRef() {
  if (process.env.VERSION_INFO_GIT_REF) {
    return process.env.VERSION_INFO_GIT_REF
  }

  // --always never fails on a valid git work tree: tag describe or short SHA.
  // Untagged Actions clones used to throw `No names found` and log Error.
  let git_describe
  try {
    git_describe = gatherProcessStdout('git', ['describe', '--tags', '--always'])
  } catch (err) {
    console.log('Hint: you can set the env var VERSION_INFO_GIT_REF manually')
    console.log(err)
    try {
      git_describe = gatherProcessStdout('git', ['rev-parse', 'HEAD']).substring(
        0,
        7
      )
    } catch {
      git_describe = 'unknown'
    }
  }

  let git_branch = 'main'
  try {
    const git_symbolic_ref =
      process.env.GITHUB_HEAD_REF ||
      process.env.GITHUB_REF ||
      gatherProcessStdout('git', ['symbolic-ref', 'HEAD'])
    git_branch = git_symbolic_ref.split('/').pop()
  } catch {
    git_branch = 'main'
  }

  const git_ref = git_describe + (git_branch === 'main' ? '' : '-' + git_branch)
  return git_ref
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
