import * as fs from 'fs/promises';
import * as path from 'path';
import { isMarkdownFile, normalizePath } from '../utils/path';

export interface FileInfo {
  path: string;
  size: number;
  mtime: Date;
}

export class VaultScanner {
  private vaultPath: string;
  private excludePatterns: string[];

  constructor(vaultPath: string, excludePatterns: string[] = []) {
    this.vaultPath = vaultPath;
    this.excludePatterns = ['**/.ontomark/**', '**/node_modules/**', ...excludePatterns];
  }

  async scan(): Promise<string[]> {
    const files: string[] = [];
    await this.walk(this.vaultPath, files);
    return files;
  }

  async scanWithInfo(): Promise<FileInfo[]> {
    const files = await this.scan();
    const infos: FileInfo[] = [];

    for (const file of files) {
      const stat = await fs.stat(file);
      infos.push({
        path: file,
        size: stat.size,
        mtime: stat.mtime,
      });
    }

    return infos;
  }

  private async walk(dir: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.vaultPath, fullPath);
      const normalizedPath = normalizePath(relativePath);

      if (this.shouldExclude(normalizedPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walk(fullPath, files);
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  private shouldExclude(relativePath: string): boolean {
    for (const pattern of this.excludePatterns) {
      if (this.matchPattern(pattern, relativePath)) {
        return true;
      }
    }
    return false;
  }

  private matchPattern(pattern: string, filePath: string): boolean {
    // Simple glob pattern matching for ** and *
    // ** matches zero or more path segments, * matches any characters except /
    let regexStr = pattern
      .replace(/^\*\*\//, '(.*\\/)?')  // 开头的 **/ 变成可选的路径前缀
      .replace(/\/\*\*$/, '(\\/.*)?') // 结尾的 /** 变成可选的子路径
      .replace(/\*\*/g, '.*')         // 中间的 ** 匹配任意字符
      .replace(/\*/g, '[^/]*');       // 单个 * 匹配除了 / 之外的任意字符

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(filePath);
  }
}