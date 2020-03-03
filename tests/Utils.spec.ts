import { Utils } from '../src/Utils';
import { RepeatBlock } from '../src/block/RepeatBlock';
import { LiteralBlock } from '../src/block/LiteralBlock';

describe('Utils', () => {
  const params = {
    hello: 'world',
    items: [
      {
        item: {
          name: 'cool',
        },
      },
    ],
  };
  it('merges params for repeat block', () => {
    const block = new RepeatBlock();
    block.key = 'items';
    expect(params.hello).toBe('world');
    expect(Array.isArray(params.items)).toBe(true);
    expect('item' in params).toBe(false);
    const mergedParams = Utils.getParamsMergedForBlock(block, params);
    expect(mergedParams.hello).toBe('world');
    expect(Array.isArray(mergedParams.items)).toBe(true);
    expect('item' in mergedParams).toBe(true);
  });
  it('will not merge params for other block', () => {
    const block = new LiteralBlock();
    const mergedParams = Utils.getParamsMergedForBlock(block, params);
    expect(mergedParams.hello).toBe('world');
    expect(Array.isArray(mergedParams.items)).toBe(true);
    expect('item' in mergedParams).toBe(false);
  });
});
