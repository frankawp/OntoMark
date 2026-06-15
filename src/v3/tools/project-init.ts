/**
 * 项目初始化工具
 * 创建项目所需目录结构（raw/、wiki/、.ontomark/）
 * ontology.yaml 由 Ingest 第一次执行时动态生成
 */
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectInitResult {
  success: boolean;
  path: string;
  created: string[];
  errors: string[];
}

/**
 * 初始化项目结构
 *
 * @param projectPath 项目路径
 * @returns 初始化结果
 */
export async function projectInit(projectPath: string): Promise<ProjectInitResult> {
  const created: string[] = [];
  const errors: string[] = [];

  const dirs = [
    path.join(projectPath, 'raw'),
    path.join(projectPath, 'wiki'),
    path.join(projectPath, '.ontomark'),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      created.push(dir);
    } catch (err) {
      errors.push(`创建目录失败: ${dir} — ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    path: projectPath,
    created,
    errors,
  };
}
