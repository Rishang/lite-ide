export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const filename = path.split('/').pop()?.toLowerCase() || ''
  
  switch (ext) {
    // Web Technologies
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'css'
    case 'json':
      return 'json'
    case 'xml':
      return 'xml'
    case 'yaml':
    case 'yml':
      return 'yaml'
    
    // Programming Languages
    case 'py':
      return 'python'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'java':
      return 'java'
    case 'kt':
    case 'kts':
      return 'kotlin'
    case 'scala':
      return 'scala'
    case 'clj':
    case 'cljs':
      return 'clojure'
    case 'coffee':
      return 'coffeescript'
    case 'dart':
      return 'dart'
    case 'jl':
      return 'julia'
    case 'lua':
      return 'lua'
    case 'r':
      return 'r'
    case 'rb':
      return 'ruby'
    case 'php':
      return 'php'
    case 'pl':
      return 'perl'
    
    // C Family
    case 'c':
      return 'c'
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c++':
      return 'cpp'
    case 'cs':
      return 'csharp'
    case 'fs':
      return 'fsharp'
    
    // System Languages
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell'
    case 'ps1':
      return 'powershell'
    case 'bat':
    case 'cmd':
      return 'bat'
    
    // Infrastructure & Config
    case 'tf':
    case 'tfvars':
    case 'hcl':
      return 'python' // Note: HCL is often used with Terraform, but can also be used in other contexts
    case 'dockerfile':
      return 'dockerfile'
    case 'ini':
    case 'cfg':
    case 'conf':
      return 'ini'
    
    // Data Formats
    case 'toml':
      return 'toml'
    case 'graphql':
    case 'gql':
      return 'graphql'
    case 'sql':
      return 'sql'
    case 'md':
    case 'markdown':
      return 'markdown'
    
    // Template Languages
    case 'handlebars':
    case 'hbs':
      return 'handlebars'
    case 'pug':
    case 'jade':
      return 'pug'
    case 'liquid':
      return 'liquid'
    
    // Other
    case 'proto':
      return 'proto'
    case 'vue':
      return 'vue'
    case 'svelte':
      return 'svelte'
    case 'elm':
      return 'elm'
    case 'erl':
    case 'hrl':
      return 'erlang'
    case 'ex':
    case 'exs':
      return 'elixir'
    case 'hs':
      return 'haskell'
    case 'ml':
    case 'mli':
      return 'ocaml'
    case 'pas':
    case 'pascal':
      return 'pascal'
    case 'swift':
      return 'swift'
    case 'tsql':
      return 'tsql'
    case 'vb':
      return 'vb'
    
    default:
      return 'plaintext'
  }
}

export function getThemeForLanguage(language: string): string {
  const themes: Record<string, string> = {
    'javascript': 'vs-dark',
    'typescript': 'vs-dark',
    'python': 'vs-dark',
    'go': 'vs-dark',
    'rust': 'vs-dark',
    'java': 'vs-dark',
    'cpp': 'vs-dark',
    'c': 'vs-dark',
    'html': 'vs-dark',
    'css': 'vs-dark',
    'json': 'vs-dark',
    'yaml': 'vs-dark',
    'markdown': 'vs-dark',
    'shell': 'vs-dark',
    'php': 'vs-dark',
    'ruby': 'vs-dark',
    'xml': 'vs-dark',
    'sql': 'vs-dark',
    'text': 'vs-dark',
    'terraform': 'vs-dark',
    'dockerfile': 'vs-dark',
  }
  return themes[language] || 'vs-dark'
}