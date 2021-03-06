import { resolve, dirname } from 'path'
import { EventEmitter } from 'events'
import { resolveAllDependencies } from './lib/dependencies'
import { CompileResult, compile } from './lib/compile'
import { writeFile, mkdirp } from './utils/fs'
import { Emitter, DependencyTree } from './interfaces'
import { InstallResult } from './install'

/**
 * Bundle configuration options.
 */
export interface BundleOptions {
  name?: string
  cwd: string
  global?: boolean
  resolution?: string
  out: string
  emitter?: Emitter
}

/**
 * Bundle the current typings project into a single global definition.
 */
export function bundle (options: BundleOptions): Promise<InstallResult> {
  const { cwd, global, out } = options
  const emitter = options.emitter || new EventEmitter()
  const resolution = options.resolution || 'main'

  if (out == null) {
    return Promise.reject(new TypeError('Out file path is required for bundle'))
  }

  return resolveAllDependencies({ cwd, dev: false, global: false, emitter })
    .then<CompileResult>(tree => {
      const name = options.name || tree.name

      if (name == null) {
        return Promise.reject(new TypeError(
          'Unable to infer typings name from project. Use the `--name` flag to specify it manually'
        ))
      }

      return compile(tree, [resolution], { cwd, name, global, emitter, meta: true })
    })
    .then<{ tree: DependencyTree }>((output) => {
      const path = resolve(cwd, out)

      return mkdirp(dirname(path))
        .then(() => {
          return writeFile(path, output.results[resolution])
        })
        .then(() => ({ tree: output.tree }))
    })
}
