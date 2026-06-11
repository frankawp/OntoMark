import * as path from 'path';
import * as fs from 'fs';
import { EntityIndexBuilder } from '../../src/index/entity-index';
import { DEFAULT_SCHEMA } from '../../src/schema/default';

describe('EntityIndexBuilder', () => {
  const testVault = path.join(__dirname, '../fixtures/index-vault');
  const jwtFile = path.join(testVault, 'Concepts', 'JWT.md');
  const authFile = path.join(testVault, 'Systems', 'Auth.md');

  beforeAll(() => {
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Systems'), { recursive: true });

    fs.writeFileSync(jwtFile, `---
aliases:
  - JSON Web Token
tags:
  - Concept
  - Security
---
# JWT

JSON Web Token for authentication.

## Usage
Usage example here.

^jwt-definition
`);
    fs.writeFileSync(authFile, `---
tags:
  - System
---
# Auth

Authentication system uses JWT.

# Login
Login flow description.
`);
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  describe('build', () => {
    it('should build entity index from files', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, authFile];
      const index = await builder.build(files);

      expect(index.entities.size).toBe(2);
      expect(index.entities.get(jwtFile)).toBeDefined();
      expect(index.entities.get(authFile)).toBeDefined();
    });

    it('should extract file name as entity name', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.fileName).toBe('JWT');
    });

    it('should extract aliases from frontmatter', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.aliases).toContain('JSON Web Token');
    });

    it('should extract entity type from tags', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.entityType).toBe('Concept');
    });

    it('should extract headings', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, authFile];
      const index = await builder.build(files);

      const jwtEntity = index.entities.get(jwtFile);
      expect(jwtEntity?.headings).toContain('JWT');
      expect(jwtEntity?.headings).toContain('Usage');

      const authEntity = index.entities.get(authFile);
      expect(authEntity?.headings).toContain('Auth');
      expect(authEntity?.headings).toContain('Login');
    });

    it('should extract block references', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.blocks).toContain('jwt-definition');
    });
  });

  describe('buildAliasIndex', () => {
    it('should build alias index', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      expect(index.aliasIndex.get('JSON Web Token')).toBeDefined();
      expect(index.aliasIndex.get('JSON Web Token')).toContain(jwtFile);
    });

    it('should detect alias conflict', async () => {
      // Create another file with same alias
      const conflictFile = path.join(testVault, 'Conflict.md');
      fs.writeFileSync(conflictFile, `---
aliases:
  - JSON Web Token
---
# Conflict
`);

      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, conflictFile];
      const index = await builder.build(files);

      expect(index.aliasIndex.get('JSON Web Token')?.length).toBe(2);

      fs.unlinkSync(conflictFile);
    });
  });

  describe('buildHeadingIndex', () => {
    it('should build heading index', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, authFile];
      const index = await builder.build(files);

      expect(index.headingIndex.get('JWT')).toBeDefined();
      expect(index.headingIndex.get('Login')).toBeDefined();
    });
  });
});
