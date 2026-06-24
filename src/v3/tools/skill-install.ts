/**
 * Skill + Plugin 安装/卸载工具
 */
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

// Skill 路径
const SKILL_SOURCE_DIR = '.claude/skills/ontomark';
const SKILL_TARGET_DIR = path.join(os.homedir(), '.claude', 'skills', 'ontomark');
// Plugin 路径
const PLUGIN_SOURCE_DIR = '.claude/plugins/ontomark';
const PLUGIN_TARGET_DIR = path.join(os.homedir(), '.claude', 'plugins', 'ontomark');

/**
 * 安装 Skill + Plugin 到用户目录
 */
export async function skillInstall(): Promise<void> {
  const packageDir = findPackageDir();
  if (!packageDir) {
    console.error('错误：无法找到 ontomark npm 包目录');
    console.error('请确保已全局安装：npm install -g ontomark');
    process.exit(1);
  }

  // --- 安装 Skill ---
  const skillSourceDir = path.join(packageDir, SKILL_SOURCE_DIR);
  try {
    await fs.access(skillSourceDir);
    // 先删除旧目录，再复制
    try { await fs.access(SKILL_TARGET_DIR); await fs.rm(SKILL_TARGET_DIR, { recursive: true }); } catch {}
    await fs.mkdir(path.dirname(SKILL_TARGET_DIR), { recursive: true });
    await copyDir(skillSourceDir, SKILL_TARGET_DIR);
    console.log('✅ Skill 已安装到:', SKILL_TARGET_DIR);
  } catch {
    console.log('⚠️ Skill 源目录不存在，跳过:', skillSourceDir);
  }

  // --- 安装 Plugin ---
  const pluginSourceDir = path.join(packageDir, PLUGIN_SOURCE_DIR);
  try {
    await fs.access(pluginSourceDir);
    try { await fs.access(PLUGIN_TARGET_DIR); await fs.rm(PLUGIN_TARGET_DIR, { recursive: true }); } catch {}
    await fs.mkdir(path.dirname(PLUGIN_TARGET_DIR), { recursive: true });
    await copyDir(pluginSourceDir, PLUGIN_TARGET_DIR);
    console.log('✅ Plugin 已安装到:', PLUGIN_TARGET_DIR);
  } catch {
    console.log('⚠️ Plugin 源目录不存在，跳过:', pluginSourceDir);
  }

  console.log('');
  console.log('下一步：');
  console.log('  1. 重启 Claude Code');
  console.log('  2. 或在 Claude Code 中运行: /reload-plugins');
  console.log('  3. 然后运行: /ontomark 或 /ontomark-ingest');
}

/**
 * 卸载用户目录中的 Skill + Plugin
 */
export async function skillUninstall(): Promise<void> {
  let anyUninstalled = false;

  try {
    await fs.access(SKILL_TARGET_DIR);
    await fs.rm(SKILL_TARGET_DIR, { recursive: true });
    console.log('✅ Skill 已卸载:', SKILL_TARGET_DIR);
    anyUninstalled = true;
  } catch {}

  try {
    await fs.access(PLUGIN_TARGET_DIR);
    await fs.rm(PLUGIN_TARGET_DIR, { recursive: true });
    console.log('✅ Plugin 已卸载:', PLUGIN_TARGET_DIR);
    anyUninstalled = true;
  } catch {}

  if (!anyUninstalled) {
    console.log('OntoMark 未安装或已卸载');
  }
}

/**
 * 查找 npm 包目录
 */
function findPackageDir(): string | null {
  // 方法1: 本地开发环境（当前项目目录）
  const localSkillDir = path.resolve(__dirname, '../../../.claude/skills/ontomark');
  try {
    fsSync.accessSync(localSkillDir);
    return path.resolve(__dirname, '../../..');
  } catch {}

  // 方法2: 从当前模块路径查找（npm 全局安装）
  try {
    let dir = __dirname;
    while (dir !== '/') {
      const pkgPath = path.join(dir, 'package.json');
      if (fsSync.existsSync(pkgPath)) {
        const pkg = JSON.parse(fsSync.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'ontomark') {
          return dir;
        }
      }
      dir = path.dirname(dir);
    }
  } catch {}

  // 方法3: 从全局 node_modules 查找
  const globalNodeModules = path.join(process.execPath, '../lib/node_modules');
  const globalPackageDir = path.join(globalNodeModules, 'ontomark');
  try {
    fsSync.accessSync(globalPackageDir);
    return globalPackageDir;
  } catch {}

  return null;
}

/**
 * 递归复制目录
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
