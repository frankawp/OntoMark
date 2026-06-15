import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { projectInit } from '../../../src/v3/tools/project-init';

describe('project-init', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create default project directories', async () => {
    const result = await projectInit(tempDir);

    expect(result.success).toBe(true);

    // 检查目录是否创建
    await expect(fs.access(path.join(tempDir, 'raw'))).resolves.not.toThrow();
    await expect(fs.access(path.join(tempDir, 'wiki'))).resolves.not.toThrow();
    await expect(fs.access(path.join(tempDir, '.ontomark'))).resolves.not.toThrow();

    // init 不生成 ontology.yaml，留给 ingest 第一次执行时动态生成
    await expect(fs.access(path.join(tempDir, 'ontology.yaml'))).rejects.toThrow();
  });

  it('should report created paths', async () => {
    const result = await projectInit(tempDir);
    expect(result.created.length).toBe(3); // raw + wiki + .ontomark
    expect(result.created.some(p => p.endsWith('raw'))).toBe(true);
    expect(result.created.some(p => p.endsWith('wiki'))).toBe(true);
    expect(result.created.some(p => p.endsWith('.ontomark'))).toBe(true);
  });

  it('should handle existing directory gracefully', async () => {
    // 先运行一次 init
    await projectInit(tempDir);
    // 再运行一次，不应报错
    const result = await projectInit(tempDir);
    expect(result.success).toBe(true);
  });
});
