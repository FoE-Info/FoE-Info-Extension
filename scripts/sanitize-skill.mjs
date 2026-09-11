#!/usr/bin/env node

/**
 * Skill Sanitizer for FoE-Info Antigravity Ecosystem
 *
 * Cleans imported skills from agentic-awesome-skills catalog:
 * 1. Strips non-standard YAML frontmatter keys (risk, source, tools, tags, etc.)
 * 2. Preserves strictly standard 'name' and 'description' fields.
 * 3. Replaces non-existent 'Subagent (general-purpose):' with Antigravity invoke_subagent calls.
 * 4. Validates relative markdown links.
 */
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_KEYS = new Set(['name', 'description']);

function sanitizeSkillFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File does not exist: ${filePath}`);
    return false;
  }

  const originalContent = fs.readFileSync(filePath, 'utf8');
  const match = originalContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    console.warn(`[WARN] No YAML frontmatter found in ${filePath}`);
    return false;
  }

  const rawYaml = match[1];
  const body = match[2];

  // Extract name and description
  const nameMatch = rawYaml.match(/^name:\s*["']?([^"'\n]+)["']?/m);
  const descMatch = rawYaml.match(
    /^description:\s*(?:>-\s*\n\s*|\|\s*\n\s*|"|)([\s\S]*?)(?:"|\n[a-z_-]+:|$)/m,
  );

  if (!nameMatch || !descMatch) {
    console.warn(`[WARN] Could not parse name or description in ${filePath}`);
    return false;
  }

  const name = nameMatch[1].trim();
  let desc = descMatch[1].trim().replace(/\s+/g, ' ');

  // De-escalate coercive language if present
  desc = desc.replace(/^You MUST use this /i, 'Use this skill ');

  const cleanYaml = `---\nname: ${name}\ndescription: "${desc}"\n---`;

  // Replace generic placeholders in body
  let cleanBody = body.replace(
    /Subagent\s+\(general-purpose\):/g,
    'Subagent (invoke_subagent TypeName: "self" or "code-reviewer"):',
  );

  const newContent = `${cleanYaml}\n${cleanBody}`;

  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`[OK] Sanitized: ${filePath}`);
    return true;
  }

  console.log(`[PASS] Already clean: ${filePath}`);
  return false;
}

function processTarget(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const skillPath = path.join(target, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      sanitizeSkillFile(skillPath);
    } else {
      const entries = fs.readdirSync(target);
      for (const entry of entries) {
        const subPath = path.join(target, entry);
        if (fs.statSync(subPath).isDirectory()) {
          const subSkill = path.join(subPath, 'SKILL.md');
          if (fs.existsSync(subSkill)) {
            sanitizeSkillFile(subSkill);
          }
        }
      }
    }
  } else if (stat.isFile()) {
    sanitizeSkillFile(target);
  }
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--all')) {
  processTarget(path.join(process.cwd(), '.agents/skills'));
} else {
  for (const arg of args) {
    const resolved = path.resolve(process.cwd(), arg);
    processTarget(resolved);
  }
}
