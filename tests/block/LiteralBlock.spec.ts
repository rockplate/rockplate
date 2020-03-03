import { Builder } from '../../src/Builder';
import { Parser } from '../../src/Parser';
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

describe('LiteralBlock', () => {
  const tpl = 'My name is [my name] and my expertise is in [my expertise]';

  for (const builder of getBuilders(tpl, sch)) {
    it('is built ' + builder.type, () => {
      expect(builder.blocks.length).toBe(1);

      const block = builder.blocks[0];
      expect(block.children.length).toBe(0);
      expect(block).toBeInstanceOf(LiteralBlock);
      expect(block.content).toBe('My name is [my name] and my expertise is in [my expertise]');
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
      ).toBe('My name is Safraz and my expertise is in Programming');
      expect(
        parser.parse({
          my: {
            name: 'Safraz',
            expertise: 'Designing',
          },
        } as MySchema),
      ).toBe('My name is Safraz and my expertise is in Designing');
    });
  }
});
