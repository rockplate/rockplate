import { BlockType, Block, BlockParams } from './Block';
import { IfBlock } from './IfBlock';
import { RepeatBlock } from './RepeatBlock';
import { LiteralBlock } from './LiteralBlock';
import { CommentBlock } from './CommentBlock';

export { BlockType, Block, IfBlock, RepeatBlock, LiteralBlock, CommentBlock };

export const createBlock = (type: BlockType, params: BlockParams = {}): Block => {
  let block: Block;
  if (type === 'comment') {
    block = new CommentBlock();
  } else if (type === 'if') {
    block = new IfBlock();
  } else if (type === 'repeat') {
    block = new RepeatBlock();
  } else {
    block = new LiteralBlock();
  }
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      (block as any)[key] = (params as any)[key];
    }
  }
  return block;
};
