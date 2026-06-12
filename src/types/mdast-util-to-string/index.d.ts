declare module 'mdast-util-to-string' {
  import type { Node } from 'unist';

  function toString(node: Node): string;

  export default toString;
}
