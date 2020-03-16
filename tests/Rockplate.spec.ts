import { Rockplate } from '../src/Rockplate';
import { template, schema, parsed } from './shared';

const getRockplateParsed = (tpl: string, params: any) => {
  const rockplate = new Rockplate(tpl, params);
  return rockplate.parse(params);
};

describe('parser', () => {
  const rockplate = new Rockplate(template, schema);
  const builder = rockplate.builder;
  const parser = rockplate.parser;
  it('validates template', () => {
    expect(rockplate.validateTemplate()).toBe(true);
  });
  it('parses complex template & schema', () => {
    expect(rockplate.parse(schema)).toBe(parsed);
  });
  it('parses simple variables', () => {
    expect(
      getRockplateParsed('My name is [my name]', {
        my: {
          name: 'Safraz',
          username: 'safrazik',
        },
      }),
    ).toBe('My name is Safraz');
  });
  it('builds nested', () => {
    const rockplate2 = new Rockplate(
      'Pro? [if myself is pro]=[if myself is pro]=[if myself is pro]=[else]![end if][else]![end if][else]![end if].',
      {
        myself: {
          pro: true,
        },
      },
    );
    expect(
      rockplate2.parse({
        myself: {
          pro: true,
        },
      }),
    ).toBe('Pro? ===.');
    expect(
      rockplate2.parse({
        myself: {
          pro: false,
        },
      }),
    ).toBe('Pro? !.');
  });
});
