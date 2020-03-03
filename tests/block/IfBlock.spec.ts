import { Builder } from '../../src/Builder';
import { Parser } from '../../src/Parser';
import { LiteralBlock } from '../../src/block/LiteralBlock';
import { IfBlock } from '../../src/block/IfBlock';
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

const ifSuite = (
  title: string,
  tpl: string,
  key: string,
  subkey: string,
  innerText: string,
  trueResult: string,
  falseResult: string,
  elseInnerText?: string,
) => {
  describe(title, () => {
    // const builder = new Builder(tpl, sch);
    for (const builder of getBuilders(tpl, sch)) {
      it('is built ' + builder.type, () => {
        expect(builder.blocks.length).toBe(3);
        expect(builder.blocks[0]).toBeInstanceOf(LiteralBlock);
        expect(builder.blocks[2]).toBeInstanceOf(LiteralBlock);

        const block = builder.blocks[1] as IfBlock;
        expect(block).toBeInstanceOf(IfBlock);

        expect(block.key).toBe(key);
        expect(block.subkey).toBe(subkey);
        expect(block.children.length).toBe(1);
        expect(block.children[0]).toBeInstanceOf(LiteralBlock);
        expect(block.children[0].content).toBe(innerText);

        if (elseInnerText) {
          expect(block.elseChildren.length).toBe(1);
          expect(block.elseChildren[0]).toBeInstanceOf(LiteralBlock);
          expect(block.elseChildren[0].content).toBe(elseInnerText);
        } else {
          expect(block.elseChildren.length).toBe(0);
        }
      });
      it('is parsed ' + builder.type, () => {
        const parser = new Parser(builder);
        expect(
          parser.parse({
            myself: {
              pro: true,
            },
          } as MySchema),
        ).toBe(trueResult);
        expect(
          parser.parse({
            myself: {
              pro: false,
            },
          } as MySchema),
        ).toBe(falseResult);
      });
    }
  });
};

ifSuite(
  'IfBlock with else',
  'I am [if myself is pro]a pro[else]not a pro[end if] developer.',
  'myself',
  'pro',
  'a pro',
  'I am a pro developer.',
  'I am not a pro developer.',
  'not a pro',
);

ifSuite(
  'IfBlock without else',
  'I am a[if myself is pro] pro[end if] developer.',
  'myself',
  'pro',
  ' pro',
  'I am a pro developer.',
  'I am a developer.',
);

ifSuite(
  'IfBlock with not',
  'I am[if myself is not pro] not[end if] a pro developer.',
  'myself',
  'pro',
  ' not',
  'I am a pro developer.',
  'I am not a pro developer.',
);
