import { PackagerServerFileDescriptor } from '../../shared/npm-dependency-types'
import { NodeModules, esCodeFile } from '../../shared/project-file-types'
import { objectMap } from '../../shared/object-utils'

export function createNodeModules(contents: {
  [filepath: string]: PackagerServerFileDescriptor
}): NodeModules {
  return objectMap(
    (content, key: string) => esCodeFile(content.content, 'NODE_MODULES', key),
    contents,
  )
}
