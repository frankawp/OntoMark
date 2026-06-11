// src/types/mdast-util-to-string.d.ts
declare module 'mdast-util-to-string' {
  import type { Node } from 'unist';

  /**
   * 从 mdast 节点提取纯文本内容
   */
  function toString(node: Node): string;

  export default toString;
}
