import { BlockType, Block } from './Block';

export class LiteralBlock extends Block {
  type: BlockType = 'literal';
  identifiers: string[] = [];
  booleans: { key: string; subkey: string }[] = [];
  arrays: string[] = [];
}
