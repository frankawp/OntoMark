# OntoMark V2 Complete Design

## Goal

Implement OntoMark as an ontology-driven AI native wiki builder that follows `docs/design/V2.md` and the LLM Wiki pattern in `docs/llm-wiki.md`.

## Decisions

- V2 is the only supported runtime path. Legacy V1 SDK behavior and compatibility are not preserved.
- `raw/` is immutable input. OntoMark only reads raw sources.
- `wiki/` is the persistent compiled knowledge layer. Generated pages are updated incrementally and must not overwrite user-authored content.
- `ontology.yaml` is loaded from the project root, then `.ontomark/ontology.yaml`, then `~/.ontomark/ontology.yaml`, then defaults.
- Each canonical object has one page under a type directory such as `wiki/Concepts/JWT.md`.
- Entity conflicts and low-confidence entities are written as draft pages with `needs_review: true`; they are not silently merged as canonical knowledge.
- `wiki/index.md`, `wiki/log.md`, backlinks, topic pages, and agent context are generated as navigational and operational wiki artifacts.

## Pipeline

1. Scan Markdown files under `raw/`.
2. Extract knowledge object mentions with the configured AI provider.
3. Resolve entities by canonical name and aliases.
4. Build or update canonical wiki pages while preserving user content.
5. Build cache data from generated wiki frontmatter.
6. Add wiki links across wiki pages.
7. Generate backlinks, topic pages, index, log, and agent context.

## Success Criteria

- SDK `build()` produces typed canonical pages with evidence sources.
- Existing user content in wiki pages remains after rebuild.
- Conflicted or low-confidence entities are reviewable drafts.
- Schema fallback follows the V2 project-root order.
- CLI `build` uses the same V2 SDK path.
- Tests cover the V2 design behaviors and the TypeScript build passes.
