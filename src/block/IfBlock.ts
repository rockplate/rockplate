import { BlockType, Block } from './Block';

export class IfBlock extends Block {
  type: BlockType = 'if';
  subkey: string = '';
  // operator: string = '';
  operator: 'are not' | 'are' | 'is not' | 'is' | '' = '';
  elseChildren: Block[] = [];
}
