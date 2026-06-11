import { DEFAULT_SCHEMA } from '../../src/schema/default';

describe('Default Schema', () => {
  it('should have version', () => {
    expect(DEFAULT_SCHEMA.version).toBe('1.0');
  });

  it('should have entity_types', () => {
    expect(DEFAULT_SCHEMA.entity_types).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['Concept']).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['System']).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['Component']).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['ADR']).toBeDefined();
  });

  it('should have relations', () => {
    expect(DEFAULT_SCHEMA.relations).toBeDefined();
    expect(DEFAULT_SCHEMA.relations['uses']).toBeDefined();
    expect(DEFAULT_SCHEMA.relations['uses'].from).toBe('System');
    expect(DEFAULT_SCHEMA.relations['uses'].to).toBe('Concept');
  });

  it('should have at least 8 entity types', () => {
    const entityCount = Object.keys(DEFAULT_SCHEMA.entity_types).length;
    expect(entityCount).toBeGreaterThanOrEqual(8);
  });
});
