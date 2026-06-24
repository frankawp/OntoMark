/**
 * 配置读取工具 — 从 .ontomark/config.json 读取项目配置
 */
import * as fs from 'fs/promises';
import * as path from 'path';

export interface OntoMarkConfig {
  version: string;
  /** 输入源目录列表（可多个），Ingest 从这些目录读取文档 */
  inputDirs: string[];
  /** 输出目录（仅一个），Ingest 生成的实体页面写入此目录 */
  outputDir: string;
}

const DEFAULT_CONFIG: OntoMarkConfig = {
  version: '1.0',
  inputDirs: ['raw'],
  outputDir: 'wiki',
};

/**
 * 读取项目配置
 *
 * 优先读取 .ontomark/config.json，不存在时返回默认配置。
 *
 * @param projectPath 项目根目录
 * @returns 项目配置
 */
export async function readConfig(projectPath: string): Promise<OntoMarkConfig> {
  try {
    const configPath = path.join(projectPath, '.ontomark', 'config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return DEFAULT_CONFIG;
  }
}
