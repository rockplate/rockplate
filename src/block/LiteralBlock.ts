import { BlockType, Block } from './Block';

export class LiteralBlock extends Block {
  type: BlockType = 'literal';
  identifiers: string[] = [];
}
