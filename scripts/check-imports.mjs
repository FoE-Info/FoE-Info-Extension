import fs from 'fs';
import path from 'path';

function findFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(file, ext));
    } else if (file.endsWith(ext)) {
      results.push(file);
    }
  });
  return results;
}

const jsFiles = findFiles('./src', '.js').concat(findFiles('./src', '.mjs'));

jsFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  // Simple regex for import and require
  const imports = [...content.matchAll(/import.*?from\s+['"]([^'"]+)['"]/g)]
    .concat([...content.matchAll(/import\(['"]([^'"]+)['"]\)/g)])
    .concat([...content.matchAll(/require\(['"]([^'"]+)['"]\)/g)]);

  imports.forEach((match) => {
    let importPath = match[1];
    if (importPath.startsWith('.')) {
      let resolved = path.resolve(path.dirname(file), importPath);
      if (
        !fs.existsSync(resolved) &&
        !fs.existsSync(resolved + '.js') &&
        !fs.existsSync(resolved + '/index.js')
      ) {
        console.log(`Broken import in ${file}: ${importPath}`);
      }
    }
  });
});
