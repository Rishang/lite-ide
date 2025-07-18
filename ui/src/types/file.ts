export interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  loaded?: boolean
  hasMore?: boolean
}