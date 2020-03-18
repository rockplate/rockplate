import { BlockType, Block } from './Block';

export class LiteralBlock extends Block {
  type: BlockType = 'literal';
  identifiers: { key: string; subkey: string }[] = [];
  booleans: { key: string; subkey: string }[] = [];
  arrays: string[] = [];
}
