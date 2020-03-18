import { Builder } from '../src/Builder';
import { template, schema, parsed, getBuilders } from './shared';
import { IfBlock } from '../src/block/IfBlock';
import { BlockType, Block } from '../src/block';

describe('Builder', () => {
  // const builder = new Builder(template);
  it('is getValidBlockDefinition literal', () => {
    const sch = { some: { name: 'My Name' } };
    const tpl = 'hello [some one] world';
    for (const builder of getBuilders(tpl, sch)) {
      const blkDef = builder.getValidBlockDefinition(6, 'literal', tpl, sch);
      // console.log('blkDef', blkDef);
      expect(blkDef).toBeUndefined();
    }
  });
  it('is getValidBlockDefinition if', () => {
    const sch = { some: { one: true } };
    const tpl = 'hello [if some is one]one[end if] world';
    for (const builder of getBuilders(tpl, sch)) {
      const blkDef = builder.getValidBlockDefinition(6, 'if', tpl, sch);
      // console.log('blkDef', blkDef);
      expect(blkDef).toBeDefined();
      if (blkDef) {
        expect(blkDef.key).toBe('some');
        expect(blkDef.operator).toBe('is');
        expect(blkDef.subkey).toBe('one');
      }
    }
  });
  it('is getValidBlockDefinition repeat', () => {
    const sch = { things: [] };
    const tpl = 'hello [repeat things]thing[end repeat] world';
    for (const builder of getBuilders(tpl, sch)) {
      const blkDef = builder.getValidBlockDefinition(6, 'repeat', tpl, sch);
      // console.log('blkDef', blkDef);
      expect(blkDef).toBeDefined();
      if (blkDef) {
        expect(blkDef.key).toBe('things');
        // expect(blkDef.subkey).toBe('one');
      }
    }
  });
  it('is broken', () => {
    const tpl = 'this [-- should be [if myself is pro broken';
    const sch = {
      myself: {
        pro: true,
      },
    };
    for (const builder of getBuilders(tpl, sch, true)) {
      expect(builder.blocks.length).toBe(1);
      const block = builder.blocks[0];
      expect(block.type).toBe('literal');
      expect(block.content).toBe('this [-- should be [if myself is pro broken');
    }
  });
  it('is broken2', () => {
    const tpl = 'this [repeat be [if myself broken] oh no';
    const sch = {
      myself: {
        pro: true,
      },
    };
    for (const builder of getBuilders(tpl, sch)) {
      expect(builder.blocks.length).toBe(1);
      const block = builder.blocks[0];
      expect(block.type).toBe('literal');
      expect(block.content).toBe('this [repeat be [if myself broken] oh no');
    }
  });
  (() => {
    const tpl = 'I am [if myself is stupid]stupid [myself name][else]ok[end if].';
    const sch = {
      myself: {
        pro: true,
      },
      ignored: 'yes',
    };
    let i = 0;
    for (const builder of getBuilders(tpl, sch, true)) {
      i++;
      if (builder.strict) {
        it('ignores unavailable props strict ' + i, () => {
          expect(builder.blocks.length).toBe(1);
          const block = builder.blocks[0];
          expect(block.type).toBe('literal');
          expect(block.content).toBe('I am [if myself is stupid]stupid [myself name][else]ok[end if].');
        });
        continue;
      }
      it('respects all props dynamic', () => {
        expect(builder.blocks.length).toBe(3);
        expect(builder.blocks[0].type).toBe('literal');
        expect(builder.blocks[1].type).toBe('if');
        expect(builder.blocks[2].type).toBe('literal');
        const ifBlock = builder.blocks[1] as IfBlock;
        expect(ifBlock.key).toBe('myself');
        expect(ifBlock.subkey).toBe('stupid');
        expect(ifBlock.children[0].content).toBe('stupid [myself name]');
        expect(ifBlock.elseChildren[0].content).toBe('ok');
      });
    }
  })();
  it('builds multiple', () => {
    const tpl = 'Hey[if myself is pro], I am a pro[end if]![if myself is pro] Yes![end if]!';
    const sch = {
      myself: {
        pro: true,
      },
    };
    for (const builder of getBuilders(tpl, sch)) {
      expect(builder.blocks.length).toBe(5);
      expect(builder.blocks[0].content).toBe('Hey');
      expect(builder.blocks[1].children[0].content).toBe(', I am a pro');
      expect(builder.blocks[2].content).toBe('!');
      expect(builder.blocks[3].children[0].content).toBe(' Yes!');
      expect(builder.blocks[4].content).toBe('!');
      // const block = builder.blocks[0];
      // expect(block.type).toBe('literal');
      // expect(block.content).toBe('this should be [if myself is pro] broken');
    }
  });
  it('builds complex template', () => {
    // const builder = new Builder(template, schema);
    for (const builder of getBuilders(template, schema)) {
      expect(builder.blocks.length).toBe(5);
      expect(builder.blocks[0].type).toBe('literal');
      expect(builder.blocks[1].type).toBe('comment');
      const repeatBlock = builder.blocks[3];
      expect(repeatBlock.type).toBe('repeat');
      // expect(builder.blocks[2].type).toBe('literal');
      expect(repeatBlock.children.length).toBe(3);
      expect(repeatBlock.children[0].content.trim()).toBe('[item name]: [item price]');

      const ifBlock = repeatBlock.children[1] as IfBlock;
      expect(ifBlock.children.length).toBe(3);
      expect(ifBlock.children[1].type).toBe('comment');
      expect(ifBlock.children[2].type).toBe('literal');
      expect(ifBlock.children[2].content.trim()).toBe('(Discount: [discount value])');
      expect(ifBlock.elseChildren.length).toBe(1);
      expect(ifBlock.elseChildren[0].content.trim()).toBe('(No Discount)');
      // const innerIf = builder.blocks[1].children[1];
      // expect(innerIf.type).toBe('if');
      // expect(innerIf.children.length).toBe(3);
      // expect(builder.blocks[1].children[3].type).toBe('if');
    }
  });

  (() => {
    const expectBlock = (builder: Builder<typeof schema>, index: number, blockType: BlockType) => {
      const block = builder.getBlockAt(index);
      expect(block).toBeDefined();
      if (block === undefined) {
        return;
      }
      expect(block.type).toBe(blockType);
    };
    for (const builder of getBuilders(template, schema)) {
      let index: number;

      it('gets literal block at index' + (builder.strict ? ' (STRICT)' : ''), () => {
        expectBlock(builder, template.indexOf('Total: '), 'literal'); // in root

        expectBlock(builder, template.indexOf('[item name]'), 'literal'); // within repeat

        expectBlock(builder, template.indexOf('(Discount: '), 'literal'); // within if

        expectBlock(builder, template.indexOf('(No Discount)'), 'literal'); // within else
      });

      it('gets comment block at index' + (builder.strict ? ' (STRICT)' : ''), () => {
        index = template.indexOf('this is a comment');
        expectBlock(builder, index, 'comment');
      });

      it('gets repeat block at index' + (builder.strict ? ' (STRICT)' : ''), () => {
        index = template.indexOf('[repeat items]');
        expectBlock(builder, index + 4, 'repeat'); // at the word "repeat"
        expectBlock(builder, index + 11, 'repeat'); // at the word "items"
      });

      it('gets if block at index' + (builder.strict ? ' (STRICT)' : ''), () => {
        index = template.indexOf('[if discount is available]');
        expectBlock(builder, index + 2, 'if'); // at the word "if"
        expectBlock(builder, index + 8, 'if'); // at the word "discount"
        expectBlock(builder, index + 14, 'if'); // at the word "is"
        expectBlock(builder, index + 21, 'if'); // at the word "available"
      });
    }
  })();
});
