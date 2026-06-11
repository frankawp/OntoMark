import matter from 'gray-matter';

export class FrontmatterHandler {
  parse(content: string): { frontmatter: Record<string, any>; body: string } {
    const { data, content: body } = matter(content);
    return {
      frontmatter: data,
      body,
    };
  }

  enhance(
    frontmatter: Record<string, any>,
    entityType: string
  ): Record<string, any> {
    const result = { ...frontmatter };

    if (!result.tags) {
      result.tags = [entityType];
    } else if (Array.isArray(result.tags)) {
      if (!result.tags.includes(entityType)) {
        result.tags = [...result.tags, entityType];
      }
    } else if (typeof result.tags === 'string') {
      result.tags = result.tags === entityType
        ? [result.tags]
        : [result.tags, entityType];
    }

    return result;
  }

  stringify(frontmatter: Record<string, any>, body: string): string {
    const result = matter.stringify(body, frontmatter);
    return result;
  }
}