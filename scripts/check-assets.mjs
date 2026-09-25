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

const htmlFiles = findFiles('./src', '.html');
htmlFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const srcMatches = [...content.matchAll(/src=['"]([^'"]+)['"]/g)].concat([
    ...content.matchAll(/href=['"]([^'"]+)['"]/g),
  ]);

  srcMatches.forEach((match) => {
    let p = match[1];
    // ignore http, chrome-extension
    if (p.startsWith('http') || p.startsWith('chrome-extension')) return;
    if (p.startsWith('#')) return; // anchor

    // Resolve path relative to file
    let resolved = path.resolve(path.dirname(file), p);
    if (!fs.existsSync(resolved)) {
      console.log(`Broken asset in ${file}: ${p}`);
    }
  });
});
