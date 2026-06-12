import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import { OntologySchema, SchemaLoadResult } from './types';
import { DEFAULT_SCHEMA } from './default';
import { SchemaError } from '../utils/errors';

export class SchemaLoader {
  async load(filePath: string): Promise<SchemaLoadResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const schema = yaml.parse(content) as OntologySchema;

    this.validate(schema);

    return {
      schema,
      source: 'root',
      filePath,
    };
  }

  async loadWithFallback(projectPath: string, homePath: string = os.homedir()): Promise<SchemaLoadResult> {
    const rootSchemaPath = path.join(projectPath, 'ontology.yaml');
    const hiddenSchemaPath = path.join(projectPath, '.ontomark', 'ontology.yaml');
    const homeSchemaPath = path.join(homePath, '.ontomark', 'ontology.yaml');

    // Try root ontology.yaml
    try {
      await fs.access(rootSchemaPath);
      const result = await this.load(rootSchemaPath);
      return { ...result, source: 'root' };
    } catch {
      // Continue to next fallback
    }

    // Try .ontomark/ontology.yaml
    try {
      await fs.access(hiddenSchemaPath);
      const result = await this.load(hiddenSchemaPath);
      return { ...result, source: 'hidden' };
    } catch {
      // Continue to home fallback
    }

    // Try ~/.ontomark/ontology.yaml
    try {
      await fs.access(homeSchemaPath);
      const result = await this.load(homeSchemaPath);
      return { ...result, source: 'home' };
    } catch {
      // Use default
    }

    // Return default schema
    return {
      schema: DEFAULT_SCHEMA,
      source: 'default',
    };
  }

  validate(schema: OntologySchema): void {
    if (!schema.version) {
      throw new SchemaError('Schema must have a version field', '');
    }

    if (!schema.entity_types || Object.keys(schema.entity_types).length === 0) {
      throw new SchemaError('Schema must have at least one entity_types defined', '');
    }

    // Validate relation references
    if (schema.relations) {
      for (const [name, rel] of Object.entries(schema.relations)) {
        if (!schema.entity_types[rel.from]) {
          throw new SchemaError(
            `Relation "${name}" references unknown entity_type "${rel.from}"`,
            ''
          );
        }
        if (!schema.entity_types[rel.to]) {
          throw new SchemaError(
            `Relation "${name}" references unknown entity_type "${rel.to}"`,
            ''
          );
        }
      }
    }
  }
}
