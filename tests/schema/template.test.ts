// Schema Template 支持测试

import { SchemaLoader } from '../../src/schema/loader';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Schema Template Support', () => {
  const tempDir = path.join(__dirname, '../fixtures/temp-schema');

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should parse entity type with template', async () => {
    const schemaContent = `
version: "1.0"
entity_types:
  Person:
    description: 人物
    template:
      summary: "一句话简介"
      info:
        - key: "职业/身份"
        - key: "所属组织"
`;
    const schemaPath = path.join(tempDir, 'ontology.yaml');
    await fs.writeFile(schemaPath, schemaContent);

    const loader = new SchemaLoader();
    const result = await loader.load(schemaPath);

    expect(result.schema.entity_types.Person.template).toBeDefined();
    expect(result.schema.entity_types.Person.template?.summary).toBe('一句话简介');
    expect(result.schema.entity_types.Person.template?.info).toHaveLength(2);
  });
});
