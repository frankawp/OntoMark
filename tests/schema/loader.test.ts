import * as path from 'path';
import * as fs from 'fs';
import { SchemaLoader } from '../../src/schema/loader';
import { SchemaError } from '../../src/utils/errors';

describe('SchemaLoader', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  describe('load', () => {
    it('should load valid schema from file', async () => {
      const loader = new SchemaLoader();
      const schemaPath = path.join(fixturesDir, 'schema-valid.yaml');
      const result = await loader.load(schemaPath);

      expect(result.schema.version).toBe('1.0');
      expect(result.schema.entity_types['Concept']).toBeDefined();
      expect(result.source).toBe('root');
    });

    it('should throw SchemaError for missing entity_types', async () => {
      const loader = new SchemaLoader();
      const schemaPath = path.join(fixturesDir, 'schema-invalid-missing-types.yaml');

      await expect(loader.load(schemaPath)).rejects.toThrow(SchemaError);
    });

    it('should throw SchemaError for invalid relation reference', async () => {
      const loader = new SchemaLoader();
      const schemaPath = path.join(fixturesDir, 'schema-invalid-relation-ref.yaml');

      await expect(loader.load(schemaPath)).rejects.toThrow(SchemaError);
    });
  });

  describe('loadWithFallback', () => {
    const testVault = path.join(fixturesDir, 'test-vault');
    const schemaInRoot = path.join(testVault, 'ontology.yaml');
    const schemaInHidden = path.join(testVault, '.ontomark', 'ontology.yaml');

    beforeAll(() => {
      fs.mkdirSync(testVault, { recursive: true });
      fs.mkdirSync(path.join(testVault, '.ontomark'), { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(testVault, { recursive: true, force: true });
    });

    afterEach(() => {
      if (fs.existsSync(schemaInRoot)) fs.unlinkSync(schemaInRoot);
      if (fs.existsSync(schemaInHidden)) fs.unlinkSync(schemaInHidden);
    });

    it('should load from root ontology.yaml first', async () => {
      fs.writeFileSync(schemaInRoot, 'version: "1.0"\nentity_types:\n  Test:\n    description: test\nrelations: {}');

      const loader = new SchemaLoader();
      const result = await loader.loadWithFallback(testVault);

      expect(result.source).toBe('root');
      expect(result.schema.entity_types['Test']).toBeDefined();
    });

    it('should load from .ontomark/ontology.yaml if root not found', async () => {
      fs.writeFileSync(schemaInHidden, 'version: "1.0"\nentity_types:\n  Hidden:\n    description: hidden\nrelations: {}');

      const loader = new SchemaLoader();
      const result = await loader.loadWithFallback(testVault);

      expect(result.source).toBe('hidden');
      expect(result.schema.entity_types['Hidden']).toBeDefined();
    });

    it('should return default schema if no file found', async () => {
      const loader = new SchemaLoader();
      const result = await loader.loadWithFallback(testVault);

      expect(result.source).toBe('default');
      expect(result.schema.entity_types['Concept']).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate correct schema', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '1.0',
        entity_types: {
          Concept: { description: 'test' },
        },
        relations: {},
      };

      expect(() => loader.validate(schema)).not.toThrow();
    });

    it('should throw for missing version', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '',
        entity_types: { Concept: { description: 'test' } },
        relations: {},
      } as any;

      expect(() => loader.validate(schema)).toThrow('version');
    });

    it('should throw for empty entity_types', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '1.0',
        entity_types: {},
        relations: {},
      };

      expect(() => loader.validate(schema)).toThrow('entity_types');
    });

    it('should throw for invalid relation reference', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '1.0',
        entity_types: {
          Concept: { description: 'test' },
        },
        relations: {
          uses: { from: 'NonExistent', to: 'Concept' },
        },
      };

      expect(() => loader.validate(schema)).toThrow('NonExistent');
    });
  });
});
