import * as monaco from 'monaco-editor'

// Enhanced completion item types
export interface CompletionItem {
  label: string
  kind: monaco.languages.CompletionItemKind
  insertText: string
  documentation?: string
  detail?: string
  insertTextRules?: monaco.languages.CompletionItemInsertTextRule
  sortText?: string
  filterText?: string
}

// Language-specific completion providers
export class EditorCompletionProvider {
  private monaco: any

  constructor(monacoInstance: any) {
    this.monaco = monacoInstance
  }

  // Initialize all completion providers
  public initialize() {
    this.setupJavaScriptCompletions()
    this.setupTypeScriptCompletions()
    this.setupPythonCompletions()
    this.setupGoCompletions()
    this.setupHTMLCompletions()
    this.setupCSSCompletions()
    this.setupJSONCompletions()
    this.setupReactCompletions()
  }

  // JavaScript/TypeScript completions
  private setupJavaScriptCompletions() {
    const jsCompletions = [
      // Console methods
      {
        label: 'console.log',
        kind: this.monaco.languages.CompletionItemKind.Method,
        insertText: 'console.log(${1:value})',
        documentation: 'Log a value to the console',
        detail: 'console.log(value: any): void'
      },
      {
        label: 'console.error',
        kind: this.monaco.languages.CompletionItemKind.Method,
        insertText: 'console.error(${1:error})',
        documentation: 'Log an error to the console',
        detail: 'console.error(error: any): void'
      },
      {
        label: 'console.warn',
        kind: this.monaco.languages.CompletionItemKind.Method,
        insertText: 'console.warn(${1:warning})',
        documentation: 'Log a warning to the console',
        detail: 'console.warn(warning: any): void'
      },
      {
        label: 'console.table',
        kind: this.monaco.languages.CompletionItemKind.Method,
        insertText: 'console.table(${1:data})',
        documentation: 'Display data as a table in console',
        detail: 'console.table(data: any[]): void'
      },

      // Async patterns
      {
        label: 'async function',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'async function ${1:functionName}(${2:params}) {\n\t${3:// code}\n}',
        documentation: 'Create an async function',
        detail: 'Async function declaration'
      },
      {
        label: 'arrow function',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '(${1:params}) => {\n\t${2:// code}\n}',
        documentation: 'Create an arrow function',
        detail: 'Arrow function expression'
      },
      {
        label: 'async arrow function',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'async (${1:params}) => {\n\t${2:// code}\n}',
        documentation: 'Create an async arrow function',
        detail: 'Async arrow function expression'
      },

      // API calls
      {
        label: 'fetch',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'fetch(${1:url})\n\t.then(response => response.json())\n\t.then(data => {\n\t\t${2:// handle data}\n\t})\n\t.catch(error => {\n\t\t${3:// handle error}\n\t})',
        documentation: 'Make a fetch request with error handling',
        detail: 'Fetch API with JSON parsing and error handling'
      },
      {
        label: 'async fetch',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'try {\n\tconst response = await fetch(${1:url})\n\tconst data = await response.json()\n\t${2:// handle data}\n} catch (error) {\n\t${3:// handle error}\n}',
        documentation: 'Make an async fetch request with try-catch',
        detail: 'Async/await fetch with error handling'
      },

      // Control structures
      {
        label: 'if statement',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if (${1:condition}) {\n\t${2:// code}\n}',
        documentation: 'Basic if statement',
        detail: 'Conditional statement'
      },
      {
        label: 'if-else statement',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if (${1:condition}) {\n\t${2:// code}\n} else {\n\t${3:// code}\n}',
        documentation: 'If-else statement',
        detail: 'Conditional statement with else'
      },
      {
        label: 'switch statement',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t${3:// code}\n\t\tbreak\n\tdefault:\n\t\t${4:// code}\n}',
        documentation: 'Switch statement',
        detail: 'Multi-way branch statement'
      },

      // Loops
      {
        label: 'for loop',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// code}\n}',
        documentation: 'Traditional for loop',
        detail: 'Indexed for loop'
      },
      {
        label: 'for-of loop',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (const ${1:item} of ${2:array}) {\n\t${3:// code}\n}',
        documentation: 'For-of loop for arrays',
        detail: 'Iterate over array elements'
      },
      {
        label: 'for-in loop',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (const ${1:key} in ${2:object}) {\n\tif (${2:object}.hasOwnProperty(${1:key})) {\n\t\t${3:// code}\n\t}\n}',
        documentation: 'For-in loop for objects',
        detail: 'Iterate over object properties'
      },
      {
        label: 'while loop',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'while (${1:condition}) {\n\t${2:// code}\n}',
        documentation: 'While loop',
        detail: 'Loop while condition is true'
      },

      // Error handling
      {
        label: 'try-catch',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'try {\n\t${1:// code}\n} catch (error) {\n\t${2:// handle error}\n}',
        documentation: 'Basic try-catch block',
        detail: 'Error handling with catch'
      },
      {
        label: 'try-catch-finally',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'try {\n\t${1:// code}\n} catch (error) {\n\t${2:// handle error}\n} finally {\n\t${3:// cleanup}\n}',
        documentation: 'Try-catch-finally block',
        detail: 'Error handling with cleanup'
      },

      // Classes
      {
        label: 'class',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// constructor code}\n\t}\n}',
        documentation: 'Class declaration',
        detail: 'ES6 class with constructor'
      },
      {
        label: 'class with methods',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// constructor code}\n\t}\n\n\t${4:methodName}(${5:params}) {\n\t\t${6:// method code}\n\t}\n}',
        documentation: 'Class with method',
        detail: 'ES6 class with constructor and method'
      },

      // Modules
      {
        label: 'import',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import { ${1:module} } from \'${2:package}\'',
        documentation: 'Named import',
        detail: 'Import specific exports from module'
      },
      {
        label: 'import default',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import ${1:module} from \'${2:package}\'',
        documentation: 'Default import',
        detail: 'Import default export from module'
      },
      {
        label: 'import all',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import * as ${1:alias} from \'${2:package}\'',
        documentation: 'Namespace import',
        detail: 'Import entire module as namespace'
      },
      {
        label: 'export',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'export { ${1:item} }',
        documentation: 'Named export',
        detail: 'Export specific items'
      },
      {
        label: 'export default',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'export default ${1:item}',
        documentation: 'Default export',
        detail: 'Export as default'
      }
    ]

    this.registerCompletions('javascript', jsCompletions)
  }

  // TypeScript specific completions
  private setupTypeScriptCompletions() {
    const tsCompletions = [
      ...this.getJavaScriptCompletions(), // Include JS completions
      // TypeScript specific
      {
        label: 'interface',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'interface ${1:InterfaceName} {\n\t${2:property}: ${3:type}\n}',
        documentation: 'TypeScript interface',
        detail: 'Interface definition'
      },
      {
        label: 'type alias',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'type ${1:TypeName} = ${2:type}',
        documentation: 'Type alias',
        detail: 'TypeScript type alias'
      },
      {
        label: 'generic function',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'function ${1:functionName}<${2:T}>(${3:param}: ${2:T}): ${2:T} {\n\t${4:return param}\n}',
        documentation: 'Generic function',
        detail: 'Function with generic type parameter'
      },
      {
        label: 'enum',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'enum ${1:EnumName} {\n\t${2:Value1} = ${3:0},\n\t${4:Value2} = ${5:1}\n}',
        documentation: 'TypeScript enum',
        detail: 'Enum definition'
      }
    ]

    this.registerCompletions('typescript', tsCompletions)
  }

  // Python completions
  private setupPythonCompletions() {
    const pythonCompletions = [
      {
        label: 'def',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}',
        documentation: 'Function definition',
        detail: 'Define a Python function'
      },
      {
        label: 'class',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:params}):\n\t\t${3:pass}',
        documentation: 'Class definition',
        detail: 'Define a Python class with constructor'
      },
      {
        label: 'if',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if ${1:condition}:\n\t${2:pass}',
        documentation: 'If statement',
        detail: 'Conditional statement'
      },
      {
        label: 'if-else',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}',
        documentation: 'If-else statement',
        detail: 'Conditional with else'
      },
      {
        label: 'for',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',
        documentation: 'For loop',
        detail: 'Iterate over iterable'
      },
      {
        label: 'while',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'while ${1:condition}:\n\t${2:pass}',
        documentation: 'While loop',
        detail: 'Loop while condition is true'
      },
      {
        label: 'try',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}',
        documentation: 'Try-except block',
        detail: 'Exception handling'
      },
      {
        label: 'import',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import ${1:module}',
        documentation: 'Import module',
        detail: 'Import Python module'
      },
      {
        label: 'from import',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'from ${1:module} import ${2:name}',
        documentation: 'From import',
        detail: 'Import specific from module'
      },
      {
        label: 'print',
        kind: this.monaco.languages.CompletionItemKind.Function,
        insertText: 'print(${1:value})',
        documentation: 'Print to console',
        detail: 'Print function'
      },
      {
        label: 'list comprehension',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '[${1:expression} for ${2:item} in ${3:iterable}]',
        documentation: 'List comprehension',
        detail: 'Create list with comprehension'
      },
      {
        label: 'dict comprehension',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}',
        documentation: 'Dictionary comprehension',
        detail: 'Create dict with comprehension'
      }
    ]

    this.registerCompletions('python', pythonCompletions)
  }

  // Go completions
  private setupGoCompletions() {
    const goCompletions = [
      {
        label: 'func',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'func ${1:functionName}(${2:params}) ${3:returnType} {\n\t${4:return}\n}',
        documentation: 'Function definition',
        detail: 'Define a Go function'
      },
      {
        label: 'method',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'func (${1:receiver} *${2:Type}) ${3:methodName}(${4:params}) ${5:returnType} {\n\t${6:return}\n}',
        documentation: 'Method definition',
        detail: 'Define a method on a type'
      },
      {
        label: 'struct',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'type ${1:StructName} struct {\n\t${2:FieldName} ${3:FieldType}\n}',
        documentation: 'Struct definition',
        detail: 'Define a Go struct'
      },
      {
        label: 'interface',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'type ${1:InterfaceName} interface {\n\t${2:MethodName}(${3:params}) ${4:returnType}\n}',
        documentation: 'Interface definition',
        detail: 'Define a Go interface'
      },
      {
        label: 'if',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if ${1:condition} {\n\t${2:// code}\n}',
        documentation: 'If statement',
        detail: 'Conditional statement'
      },
      {
        label: 'for',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for ${1:i} := 0; ${1:i} < ${2:length}; ${1:i}++ {\n\t${3:// code}\n}',
        documentation: 'For loop',
        detail: 'Traditional for loop'
      },
      {
        label: 'range',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for ${1:index}, ${2:value} := range ${3:collection} {\n\t${4:// code}\n}',
        documentation: 'Range loop',
        detail: 'Iterate over collection with range'
      },
      {
        label: 'fmt.Println',
        kind: this.monaco.languages.CompletionItemKind.Function,
        insertText: 'fmt.Println(${1:value})',
        documentation: 'Print to console',
        detail: 'Print with newline'
      },
      {
        label: 'go routine',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'go func() {\n\t${1:// code}\n}()',
        documentation: 'Go routine',
        detail: 'Start a new goroutine'
      },
      {
        label: 'channel',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '${1:ch} := make(chan ${2:type})',
        documentation: 'Channel creation',
        detail: 'Create a new channel'
      }
    ]

    this.registerCompletions('go', goCompletions)
  }

  // HTML completions
  private setupHTMLCompletions() {
    const htmlCompletions = [
      {
        label: 'html5',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>',
        documentation: 'HTML5 boilerplate',
        detail: 'Complete HTML5 document structure'
      },
      {
        label: 'div',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '<div class="${1:className}">\n\t${2}\n</div>',
        documentation: 'Div element',
        detail: 'Generic container element'
      },
      {
        label: 'script',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '<script${1: type="module"}>\n\t${2:// code}\n</script>',
        documentation: 'Script tag',
        detail: 'JavaScript script element'
      },
      {
        label: 'link',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '<link rel="stylesheet" href="${1:styles.css}">',
        documentation: 'CSS link',
        detail: 'Link to external stylesheet'
      }
    ]

    this.registerCompletions('html', htmlCompletions)
  }

  // CSS completions
  private setupCSSCompletions() {
    const cssCompletions = [
      {
        label: 'flexbox',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
        documentation: 'Flexbox layout',
        detail: 'Basic flexbox setup'
      },
      {
        label: 'grid',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'display: grid;\ngrid-template-columns: ${1:1fr 1fr};\ngap: ${2:1rem};',
        documentation: 'CSS Grid',
        detail: 'Basic grid layout'
      },
      {
        label: 'media query',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '@media (${1:max-width}: ${2:768px}) {\n\t${3:// styles}\n}',
        documentation: 'Media query',
        detail: 'Responsive design breakpoint'
      },
      {
        label: 'keyframes',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '@keyframes ${1:animationName} {\n\tfrom {\n\t\t${2:// start styles}\n\t}\n\tto {\n\t\t${3:// end styles}\n\t}\n}',
        documentation: 'CSS keyframes',
        detail: 'CSS animation keyframes'
      }
    ]

    this.registerCompletions('css', cssCompletions)
    this.registerCompletions('scss', cssCompletions)
  }

  // JSON completions
  private setupJSONCompletions() {
    const jsonCompletions = [
      {
        label: 'package.json',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '{\n\t"name": "${1:package-name}",\n\t"version": "1.0.0",\n\t"description": "${2:description}",\n\t"main": "index.js",\n\t"scripts": {\n\t\t"start": "node index.js"\n\t},\n\t"dependencies": {\n\t\t${3}\n\t}\n}',
        documentation: 'Package.json template',
        detail: 'Complete package.json structure'
      },
      {
        label: 'tsconfig.json',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: '{\n\t"compilerOptions": {\n\t\t"target": "es2020",\n\t\t"module": "commonjs",\n\t\t"lib": ["es2020"],\n\t\t"outDir": "./dist",\n\t\t"rootDir": "./src",\n\t\t"strict": true,\n\t\t"esModuleInterop": true,\n\t\t"skipLibCheck": true,\n\t\t"forceConsistentCasingInFileNames": true\n\t}\n}',
        documentation: 'TypeScript config',
        detail: 'Complete tsconfig.json'
      }
    ]

    this.registerCompletions('json', jsonCompletions)
  }

  // React-specific completions
  private setupReactCompletions() {
    const reactCompletions = [
      {
        label: 'useState',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue})',
        documentation: 'React useState hook',
        detail: 'State management hook'
      },
      {
        label: 'useEffect',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'useEffect(() => {\n\t${1:// effect code}\n}, [${2:dependencies}])',
        documentation: 'React useEffect hook',
        detail: 'Side effect hook'
      },
      {
        label: 'useCallback',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'const ${1:callback} = useCallback(() => {\n\t${2:// callback code}\n}, [${3:dependencies}])',
        documentation: 'React useCallback hook',
        detail: 'Memoized callback hook'
      },
      {
        label: 'useMemo',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'const ${1:value} = useMemo(() => {\n\t${2:// compute value}\n}, [${3:dependencies}])',
        documentation: 'React useMemo hook',
        detail: 'Memoized value hook'
      },
      {
        label: 'useContext',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'const ${1:context} = useContext(${2:Context})',
        documentation: 'React useContext hook',
        detail: 'Context consumption hook'
      },
      {
        label: 'useReducer',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'const [${1:state}, ${2:dispatch}] = useReducer(${3:reducer}, ${4:initialState})',
        documentation: 'React useReducer hook',
        detail: 'State management with reducer'
      },
      {
        label: 'React component',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import React from \'react\'\n\ninterface ${1:ComponentName}Props {\n\t${2:prop}: ${3:type}\n}\n\nexport const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({ ${2:prop} }) => {\n\treturn (\n\t\t<div>\n\t\t\t${4:// component JSX}\n\t\t</div>\n\t)\n}',
        documentation: 'React functional component',
        detail: 'Complete React component with TypeScript'
      },
      {
        label: 'React useState component',
        kind: this.monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import React, { useState } from \'react\'\n\nexport const ${1:ComponentName} = () => {\n\tconst [${2:state}, set${2/(.*)/${1:/capitalize}/}] = useState(${3:initialValue})\n\n\treturn (\n\t\t<div>\n\t\t\t${4:// component JSX}\n\t\t</div>\n\t)\n}',
        documentation: 'React component with useState',
        detail: 'Functional component with state'
      }
    ]

    // Register React completions for JavaScript and TypeScript
    this.registerCompletions('javascript', reactCompletions)
    this.registerCompletions('typescript', reactCompletions)
  }

  // Helper to get JavaScript completions for TypeScript
  private getJavaScriptCompletions() {
    return [
      {
        label: 'console.log',
        kind: this.monaco.languages.CompletionItemKind.Method,
        insertText: 'console.log(${1:value})',
        documentation: 'Log a value to the console',
        detail: 'console.log(value: any): void'
      }
    ]
  }

  // Register completions for a language
  private registerCompletions(language: string, completions: CompletionItem[]) {
    try {
      this.monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }

          return {
            suggestions: completions.map(item => ({
              label: item.label,
              kind: item.kind,
              insertText: item.insertText,
              documentation: { value: item.documentation || '' },
              detail: item.detail,
              insertTextRules: item.insertTextRules || this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
              sortText: item.sortText || item.label,
              filterText: item.filterText || item.label
            }))
          }
        }
      })
    } catch (error) {
      console.warn(`Failed to register completions for ${language}:`, error)
    }
  }
}

// Initialize the completion system
export function setupEditorCompletions(monaco: any) {
  const provider = new EditorCompletionProvider(monaco)
  provider.initialize()
}