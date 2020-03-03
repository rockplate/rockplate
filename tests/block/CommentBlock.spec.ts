import { Builder } from '../../src/Builder';
import { Parser } from '../../src/Parser';
import { CommentBlock } from '../../src/block/CommentBlock';
import { LiteralBlock } from '../../src/block/LiteralBlock';
import { getBuilders } from '../shared';

// import { template, schema, parsed } from './shared';

const sch = {
  my: {
    name: 'My Name',
    expertise: 'My Skills',
  },
  skills: [
    {
      skill: {
        name: 'Skill 1',
        expertise: 'expert',
      },
    },
    {
      skill: {
        name: 'Skill 2',
        expertise: 'beginner',
      },
    },
  ],
  myself: {
    pro: true,
  },
};
type MySchema = typeof sch;

describe('CommentBlock', () => {
  const tpl = 'My [-- name is [my name] and my --]expertise is in [my expertise]';
  for (const builder of getBuilders(tpl, sch)) {
    it('is built ' + builder.type, () => {
      expect(builder.blocks.length).toBe(3);
      expect(builder.blocks[0]).toBeInstanceOf(LiteralBlock);
      expect(builder.blocks[2]).toBeInstanceOf(LiteralBlock);

      const block = builder.blocks[1];
      expect(block).toBeInstanceOf(CommentBlock);
      expect(block.children.length).toBe(0);
      expect(block.content).toBe(' name is [my name] and my ');
    });
    it('is parsed ' + builder.type, () => {
      const parser = new Parser(builder);
      expect(
        parser.parse({
          my: {
            name: 'Safraz',
            expertise: 'Programming',
          },
        } as MySchema),
      ).toBe('My expertise is in Programming');
      expect(
        parser.parse({
          my: {
            name: 'Safraz',
            expertise: 'Designing',
          },
        } as MySchema),
      ).toBe('My expertise is in Designing');
    });
  }
});
