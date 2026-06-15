import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ontologyStatus } from '../../../src/v3/tools/ontology-status';

describe('ontology-status', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return not exists when ontology.yaml missing', async () => {
    const result = await ontologyStatus(tempDir);
    expect(result.exists).toBe(false);
    expect(result.path).toBe(path.join(tempDir, 'ontology.yaml'));
  });

  it('should return ontology info when exists', async () => {
    const ontologyContent = `
version: "1.0"
entity_types:
  Person:
    description: 人物
  Event:
    description: 事件
`;
    await fs.writeFile(path.join(tempDir, 'ontology.yaml'), ontologyContent);

    const result = await ontologyStatus(tempDir);
    expect(result.exists).toBe(true);
    expect(result.entityTypes.Person).toBeDefined();
    expect(result.entityTypes.Person.description).toBe('人物');
    expect(result.entityTypes.Event).toBeDefined();
  });

  it('should calculate hash of ontology file', async () => {
    await fs.writeFile(path.join(tempDir, 'ontology.yaml'), 'version: "1.0"');

    const result = await ontologyStatus(tempDir);
    expect(result.hash).toBeDefined();
    expect(result.hash.length).toBe(32); // MD5 hex length
  });

  it('should handle empty yaml file', async () => {
    await fs.writeFile(path.join(tempDir, 'ontology.yaml'), '');

    const result = await ontologyStatus(tempDir);
    expect(result.exists).toBe(true);
    expect(result.entityTypes).toEqual({});
  });

  it('should handle yaml without entity_types', async () => {
    await fs.writeFile(path.join(tempDir, 'ontology.yaml'), 'version: "1.0"');

    const result = await ontologyStatus(tempDir);
    expect(result.exists).toBe(true);
    expect(result.entityTypes).toEqual({});
  });
});