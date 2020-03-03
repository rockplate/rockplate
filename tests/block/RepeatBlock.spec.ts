import { Builder } from '../../src/Builder';
import { Parser } from '../../src/Parser';
import { LiteralBlock } from '../../src/block/LiteralBlock';
import { RepeatBlock } from '../../src/block/RepeatBlock';
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

describe('RepeatBlock', () => {
  const tpl = 'My skills:[repeat skills] [skill name]:[skill expertise][end repeat].';
  for (const builder of getBuilders(tpl, sch)) {
    it('is broken ' + builder.type, () => {
      const builder2 = new Builder('My skills [repeat skills] broken', {
        skills: [],
      });
      expect(builder2.blocks.length).toBe(1);
      const block = builder2.blocks[0];
      expect(block.type).toBe('literal');
      expect(block.content).toBe('My skills [repeat skills] broken');
    });
    it('is invalid param ' + builder.type, () => {
      const builder2 = new Builder('My interests: [repeat interests]unavailable[end repeat].', {
        skills: [],
      });
      expect(builder2.blocks.length).toBe(1);
      const block = builder2.blocks[0];
      expect(block.type).toBe('literal');
      expect(block.content).toBe('My interests: [repeat interests]unavailable[end repeat].');
    });
    it('is built ' + builder.type, () => {
      // console.log(builder.blocks);
      expect(builder.blocks.length).toBe(3);
      expect(builder.blocks[0]).toBeInstanceOf(LiteralBlock);
      expect(builder.blocks[2]).toBeInstanceOf(LiteralBlock);

      const block = builder.blocks[1];
      expect(block).toBeInstanceOf(RepeatBlock);
      expect(block.children.length).toBe(1);
      expect(block.children[0]).toBeInstanceOf(LiteralBlock);
      expect(block.children[0].content).toBe(' [skill name]:[skill expertise]');
    });
    it('is parsed ' + builder.type, () => {
      const parser = new Parser(builder);
      expect(
        parser.parse({
          skills: [
            {
              skill: {
                name: 'JavaScript',
                expertise: 'expert',
              },
            },
            {
              skill: {
                name: 'PHP',
                expertise: 'expert',
              },
            },
          ],
        } as MySchema),
      ).toBe('My skills: JavaScript:expert PHP:expert.');
      expect(
        parser.parse({
          skills: [
            {
              skill: {
                name: 'Java',
                expertise: 'intermediate',
              },
            },
            {
              skill: {
                name: 'TypeScript',
                expertise: 'expert',
              },
            },
          ],
        } as MySchema),
      ).toBe('My skills: Java:intermediate TypeScript:expert.');
    });
  }
});
