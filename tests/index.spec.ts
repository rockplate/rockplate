import { Builder, Parser, Rockplate } from '../src/index';

describe('index', () => {
  it('exports all classes', () => {
    const builder = new Builder('', {});
    const parser = new Parser(builder);
    expect(new Rockplate('', {})).toBeInstanceOf(Rockplate);
    expect(builder).toBeInstanceOf(Builder);
    expect(parser).toBeInstanceOf(Parser);
  });
});
