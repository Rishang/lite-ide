/* tiny fetch wrappers */
export const getTree = async () => (await fetch('/api/files')).json();
export const readFile = async path => (await fetch('/api/files' + path)).text();
 
export const writeFile = async (path, data) => {
  await fetch('/api/files' + path, {method: 'PUT', body: data});
}; 