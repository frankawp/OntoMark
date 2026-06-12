/**
 * tests/storage/cache.test.ts - CacheManager 单元测试
 *
 * 测试缓存管理的加载、保存、失效等功能
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CacheManager, EntityCache, CachedEntity } from '../../src/storage/cache';

describe('storage/cache', () => {
  const testCacheDir = path.join(__dirname, 'test-cache');

  beforeEach(async () => {
    await fs.mkdir(testCacheDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testCacheDir, { recursive: true, force: true });
  });

  describe('CacheManager', () => {
    it('应该初始化空缓存', async () => {
      const manager = new CacheManager(testCacheDir);
      const cache = await manager.load();

      expect(cache.entities.size).toBe(0);
      expect(cache.aliases.size).toBe(0);
    });

    it('应该保存和加载缓存', async () => {
      const manager = new CacheManager(testCacheDir);

      const cache: EntityCache = {
        entities: new Map([
          ['JWT', { name: 'JWT', entityType: 'Concept', sources: [], wikiPagePath: 'wiki/JWT.md', hash: 'abc' }],
        ]),
        aliases: new Map([['jwt', 'JWT']]),
        lastScan: '2026-06-11',
        schemaHash: 'def',
      };

      await manager.save(cache);

      const loaded = await manager.load();
      expect(loaded.entities.size).toBe(1);
      expect(loaded.entities.get('JWT')?.name).toBe('JWT');
      expect(loaded.aliases.size).toBe(1);
      expect(loaded.aliases.get('jwt')).toBe('JWT');
      expect(loaded.lastScan).toBe('2026-06-11');
      expect(loaded.schemaHash).toBe('def');
    });

    it('应该失效特定实体', async () => {
      const manager = new CacheManager(testCacheDir);

      const cache: EntityCache = {
        entities: new Map([
          ['JWT', { name: 'JWT', entityType: 'Concept', sources: [], wikiPagePath: '', hash: '' }],
          ['OAuth', { name: 'OAuth', entityType: 'Concept', sources: [], wikiPagePath: '', hash: '' }],
        ]),
        aliases: new Map([['jwt', 'JWT'], ['oauth', 'OAuth']]),
        lastScan: '',
        schemaHash: '',
      };

      await manager.save(cache);
      await manager.invalidate('JWT');

      const loaded = await manager.load();
      expect(loaded.entities.has('JWT')).toBe(false);
      expect(loaded.entities.has('OAuth')).toBe(true);
      expect(loaded.aliases.has('jwt')).toBe(false);
      expect(loaded.aliases.has('oauth')).toBe(true);
    });

    it('应该失效所有实体（不指定名称）', async () => {
      const manager = new CacheManager(testCacheDir);

      const cache: EntityCache = {
        entities: new Map([
          ['JWT', { name: 'JWT', entityType: 'Concept', sources: [], wikiPagePath: '', hash: '' }],
          ['OAuth', { name: 'OAuth', entityType: 'Concept', sources: [], wikiPagePath: '', hash: '' }],
        ]),
        aliases: new Map([['jwt', 'JWT'], ['oauth', 'OAuth']]),
        lastScan: '',
        schemaHash: '',
      };

      await manager.save(cache);
      await manager.invalidate();

      const loaded = await manager.load();
      expect(loaded.entities.size).toBe(0);
      expect(loaded.aliases.size).toBe(0);
    });

    it('应该添加实体到缓存', async () => {
      const manager = new CacheManager(testCacheDir);

      // 先加载空缓存
      const cache = await manager.load();

      const entity: CachedEntity = {
        name: 'JWT',
        entityType: 'Concept',
        sources: [],
        wikiPagePath: 'wiki/JWT.md',
        hash: 'abc123',
      };

      await manager.addEntity(cache, entity);

      expect(cache.entities.has('JWT')).toBe(true);
      expect(cache.entities.get('JWT')?.entityType).toBe('Concept');

      // 保存后重新加载验证
      await manager.save(cache);
      const loaded = await manager.load();
      expect(loaded.entities.get('JWT')?.name).toBe('JWT');
    });

    it('应该添加别名到缓存', async () => {
      const manager = new CacheManager(testCacheDir);

      const cache = await manager.load();

      // 先添加实体
      const entity: CachedEntity = {
        name: 'JWT',
        entityType: 'Concept',
        sources: [],
        wikiPagePath: 'wiki/JWT.md',
        hash: 'abc123',
      };
      await manager.addEntity(cache, entity);

      // 添加别名
      await manager.addAlias(cache, 'jwt-token', 'JWT');

      expect(cache.aliases.get('jwt-token')).toBe('JWT');

      // 保存后重新加载验证
      await manager.save(cache);
      const loaded = await manager.load();
      expect(loaded.aliases.get('jwt-token')).toBe('JWT');
    });

    it('应该检查是否需要重建（文件不存在时）', async () => {
      const manager = new CacheManager(testCacheDir);

      const rawFile = {
        path: '/some/nonexistent/file.md',
        hash: 'newhash',
      };

      const needsRebuild = await manager.needsRebuild(rawFile);
      expect(needsRebuild).toBe(true);
    });

    it('应该检查是否需要重建（哈希变化时）', async () => {
      const manager = new CacheManager(testCacheDir);

      // 先保存一个有实体的缓存
      const cache: EntityCache = {
        entities: new Map([
          ['JWT', { name: 'JWT', entityType: 'Concept', sources: [{ path: '/test/file.md', hash: 'oldhash' }], wikiPagePath: 'wiki/JWT.md', hash: 'entityhash' }],
        ]),
        aliases: new Map(),
        lastScan: '',
        schemaHash: '',
      };
      await manager.save(cache);

      const rawFile = {
        path: '/test/file.md',
        hash: 'newhash',
      };

      const needsRebuild = await manager.needsRebuild(rawFile);
      expect(needsRebuild).toBe(true);
    });

    it('应该检查不需要重建（哈希未变化）', async () => {
      const manager = new CacheManager(testCacheDir);

      // 先保存一个有实体的缓存
      const cache: EntityCache = {
        entities: new Map([
          ['JWT', { name: 'JWT', entityType: 'Concept', sources: [{ path: '/test/file.md', hash: 'samehash' }], wikiPagePath: 'wiki/JWT.md', hash: 'entityhash' }],
        ]),
        aliases: new Map(),
        lastScan: '',
        schemaHash: '',
      };
      await manager.save(cache);

      const rawFile = {
        path: '/test/file.md',
        hash: 'samehash',
      };

      const needsRebuild = await manager.needsRebuild(rawFile);
      expect(needsRebuild).toBe(false);
    });

    it('应该正确处理空缓存的保存和加载', async () => {
      const manager = new CacheManager(testCacheDir);

      const emptyCache: EntityCache = {
        entities: new Map(),
        aliases: new Map(),
        lastScan: '',
        schemaHash: '',
      };

      await manager.save(emptyCache);
      const loaded = await manager.load();

      expect(loaded.entities.size).toBe(0);
      expect(loaded.aliases.size).toBe(0);
    });

    it('应该处理多个实体的缓存', async () => {
      const manager = new CacheManager(testCacheDir);

      const cache: EntityCache = {
        entities: new Map([
          ['JWT', { name: 'JWT', entityType: 'Concept', sources: [], wikiPagePath: 'wiki/JWT.md', hash: 'h1' }],
          ['OAuth', { name: 'OAuth', entityType: 'Concept', sources: [], wikiPagePath: 'wiki/OAuth.md', hash: 'h2' }],
          ['API', { name: 'API', entityType: 'Concept', sources: [], wikiPagePath: 'wiki/API.md', hash: 'h3' }],
        ]),
        aliases: new Map([
          ['jwt', 'JWT'],
          ['oauth', 'OAuth'],
          ['api', 'API'],
        ]),
        lastScan: '2026-06-11T10:00:00',
        schemaHash: 'schema-v1',
      };

      await manager.save(cache);
      const loaded = await manager.load();

      expect(loaded.entities.size).toBe(3);
      expect(loaded.aliases.size).toBe(3);
      expect(loaded.entities.get('API')?.hash).toBe('h3');
    });
  });
});