import { createBlock } from '../../src/block/index';
import { CommentBlock } from '../../src/block/CommentBlock';
import { LiteralBlock } from '../../src/block/LiteralBlock';

describe('index', () => {
  it('creates Block with params', () => {
    const block = createBlock('comment', {
      content: 'Hello World',
    });
    expect(block).toBeInstanceOf(CommentBlock);
  });
  it('creates Block without params', () => {
    const block = createBlock('literal');
    expect(block).toBeInstanceOf(LiteralBlock);
  });
});
