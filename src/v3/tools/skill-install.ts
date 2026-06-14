/**
 * Skill 安装/卸载工具
 */
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

// npm 全局安装时的 Skill 源路径
const SKILL_SOURCE_DIR = '.claude/skills/ontomark';
// 用户 Skill 目标路径
const SKILL_TARGET_DIR = path.join(process.env.HOME || '', '.claude', 'skills', 'ontomark');

/**
 * 安装 Skill 到用户目录
 */
export async function skillInstall(): Promise<void> {
  // 查找 npm 包中的 Skill 目录
  const packageDir = findPackageDir();
  if (!packageDir) {
    console.error('错误：无法找到 ontomark npm 包目录');
    console.error('请确保已全局安装：npm install -g ontomark');
    process.exit(1);
  }

  const sourceDir = path.join(packageDir, SKILL_SOURCE_DIR);

  // 检查源目录是否存在
  try {
    await fs.access(sourceDir);
  } catch {
    console.error('错误：Skill 文件不存在于', sourceDir);
    process.exit(1);
  }

  // 创建目标目录
  await fs.mkdir(path.dirname(SKILL_TARGET_DIR), { recursive: true });

  // 如果目标已存在，先删除
  try {
    await fs.access(SKILL_TARGET_DIR);
    await fs.rm(SKILL_TARGET_DIR, { recursive: true });
  } catch {
    // 目录不存在，继续
  }

  // 复制 Skill 文件
  await copyDir(sourceDir, SKILL_TARGET_DIR);

  console.log('✅ Skill 已安装到:', SKILL_TARGET_DIR);
  console.log('');
  console.log('下一步：');
  console.log('  1. 重启 Claude Code');
  console.log('  2. 或在 Claude Code 中运行: /reload-plugins');
  console.log('  3. 然后运行: /ontomark');
}

/**
 * 卸载用户目录中的 Skill
 */
export async function skillUninstall(): Promise<void> {
  try {
    await fs.access(SKILL_TARGET_DIR);
    await fs.rm(SKILL_TARGET_DIR, { recursive: true });
    console.log('✅ Skill 已卸载:', SKILL_TARGET_DIR);
  } catch {
    console.log('Skill 未安装或已卸载');
  }
}

/**
 * 查找 npm 包目录
 */
function findPackageDir(): string | null {
  // 方法1: 本地开发环境（当前项目目录）
  // 检查是否存在 .claude/skills/ontomark 目录
  const localSkillDir = path.resolve(__dirname, '../../../.claude/skills/ontomark');
  try {
    fsSync.accessSync(localSkillDir);
    // 返回项目根目录
    return path.resolve(__dirname, '../../..');
  } catch {
    // 继续
  }

  // 方法2: 从当前模块路径查找（npm 全局安装）
  try {
    // __dirname 是 dist/v3/tools，向上找到包根目录
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
  } catch {
    // 继续
  }

  // 方法3: 从全局 node_modules 查找
  const globalNodeModules = path.join(process.execPath, '../lib/node_modules');
  const globalPackageDir = path.join(globalNodeModules, 'ontomark');
  try {
    fsSync.accessSync(globalPackageDir);
    return globalPackageDir;
  } catch {
    // 继续
  }

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
