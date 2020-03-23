import { Parser } from '../src/Parser';
import { Builder } from '../src/Builder';
import { template, schema, parsed, getBuilders } from './shared';
import { IfBlock } from '../src/block/IfBlock';

type RandomParams = any;

describe('Parser', () => {
  (() => {
    const tpl = 'I am [if myself is stupid]stupid [myself name][else]ok[end if].';
    const sch = {
      myself: {
        pro: true,
      },
      ignored: 'yes',
    };
    for (const builder of getBuilders(tpl, sch)) {
      const parser = new Parser(builder);
      if (builder.strict) {
        it('ignores unavailable props strict', () => {
          expect(builder.blocks.length).toBe(1);
          expect(
            parser.parse({
              myself: {
                pro: true,
                stupid: true,
                name: 'Plastic',
              },
              ignored: 'yes',
            } as RandomParams),
          ).toBe('I am [if myself is stupid]stupid [myself name][else]ok[end if].');
        });
        continue;
      }
      it('respects all props dynamic', () => {
        expect(builder.blocks.length).toBe(3);
        expect(
          parser.parse({
            myself: {
              pro: true,
              stupid: true,
              name: 'Plastic',
            },
            ignored: 'yes',
          } as RandomParams),
        ).toBe('I am stupid Plastic.');
      });
    }
  })();

  (() => {
    const tpl =
      'I am [if myself is pro]a pro[else]not a pro[end if]. My Skills:[repeat skills] [skill name][end repeat].';
    const sch = {
      myself: {
        pro: true,
      },
      skills: [
        {
          skill: {
            name: 'JavaScript',
          },
        },
      ],
    };
    for (const builder of getBuilders(tpl, sch)) {
      const parser = new Parser(builder);
      it('ignores non-provided params ' + builder.type, () => {
        expect(builder.blocks.length).toBe(5);
        expect(builder.blocks[0].type).toBe('literal');
        expect(builder.blocks[1].type).toBe('if');
        expect(builder.blocks[2].type).toBe('literal');
        expect(builder.blocks[3].type).toBe('repeat');
        expect(builder.blocks[4].type).toBe('literal');
        const ifBlock = builder.blocks[1] as IfBlock;
        expect(ifBlock.key).toBe('myself');
        expect(ifBlock.subkey).toBe('pro');
        expect(ifBlock.children[0].content).toBe('a pro');
        expect(ifBlock.elseChildren[0].content).toBe('not a pro');
        expect(builder.blocks[3].content).toBe(' [skill name]');
        expect(
          parser.parse({
            myself: {},
          } as RandomParams),
        ).toBe(tpl);
      });
    }
  })();

  it('parses multiple', () => {
    const tpl = 'Hey[if myself is pro], I am a pro[end if]![if myself is pro] Yes![end if]!';
    const sch = {
      myself: {
        pro: true,
      },
    };
    for (const builder of getBuilders(tpl, sch)) {
      expect(builder.blocks.length).toBe(5);
      const parser = new Parser(builder);
      expect(
        parser.parse({
          myself: {
            pro: true,
            another: 'ignored',
          },
          something: 'ignored',
        } as RandomParams),
      ).toBe('Hey, I am a pro! Yes!!');
      expect(
        parser.parse({
          myself: {
            pro: false,
            another: 'ignored',
          },
          something: 'ignored',
        } as RandomParams),
      ).toBe('Hey!!');
    }
  });
  it('parses complex template & schema', () => {
    const builder = new Builder(template, schema);
    const parser = new Parser(builder);
    expect(parser.parse(schema)).toBe(parsed);
  });
  it('parses complex template', () => {
    const builder = new Builder(template);
    const parser = new Parser(builder);
    expect(parser.parse(schema)).toBe(parsed);
  });
});
