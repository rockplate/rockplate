import { Linter, Lint, LinterResult } from '../src/Linter';
import { Utils } from '../src/Utils';
import { schema } from './shared';
import { BlockType } from '../src/block';

type RandomParams = any;

const getLinters = <T = any>(tpl: string, sch: T, testStrictOverride?: boolean): Linter<T>[] => {
  return [new Linter<T>(tpl, sch), new Linter(tpl)].concat(
    testStrictOverride ? [new Linter(tpl, sch, true), new Linter(tpl, sch, false)] : [],
  );
};

describe('Linter', () => {
  it('lints simple identifiers', () => {
    for (const linter of getLinters(
      'Linting [should be] fun and [should work] fine for simple expression',
      {
        should: {
          work: 'SHOULD WORK',
        },
      },
      true,
    )) {
      let result = linter.lint({
        should: {
          be: 'something',
          work: 'YES',
        },
      } as RandomParams);
      expect(result.lints.length).toBe(linter.strict ? 1 : 0);
      if (linter.strict) {
        //
      }

      result = linter.lint({} as RandomParams);
      expect(result.lints.length).toBe(linter.strict ? 2 : 2);
      for (let i = 0; i < 2; i++) {
        const res = result.lints[i];
        const identifier = ['should be', 'should work'][i];
        expect(res.blockType).toBe('literal');
        expect(res.expression).toBe('[' + identifier + ']');
        expect(res.message).toBe(
          (linter.strict && identifier === 'should work' ? '(STRICT) ' : '') +
            'Unavailable: Identifier "' +
            identifier +
            '"',
        );
        expect(res.offset.begin).toBe(
          (identifier === 'should work' ? 'Linting [should be] fun and [' : 'Linting [').length,
        );
        expect(res.offset.end).toBe(res.offset.begin + identifier.length);
      }
    }
  });
  it('lints syntax error', () => {
    for (const linter of getLinters('Linting [should not work fine for wrong expression', {
      should: {
        work: 'SHOULD WORK',
      },
    })) {
      const result = linter.lint({} as RandomParams);
      expect(result.lints.length).toBe(1);
      const res = result.lints[0];
      expect(res.blockType).toBe('literal');
      expect(res.expression).toBe('[should no...');
      expect(res.message).toBe('Invalid: Expression "[should no..."');
      expect(res.offset.begin).toBe('Linting ['.length);
      expect(res.offset.end).toBe('Linting [should not work fine for wrong expression'.length);
    }
  });
  it('lints without params', () => {
    for (const linter of getLinters('Linting [should work] and [should be] fun [-- with a comment too --].', {
      should: {
        be: 'fun',
      },
    })) {
      const result = linter.lint();
      expect(result.lints.length).toBe(linter.strict ? 1 : 2);
      const res = result.lints[0];
      expect(res.blockType).toBe('literal');
      expect(res.expression).toBe('[should work]');
      if (linter.strict) {
        expect(res.message).toBe('Unavailable: Property "work" on Object "should"');
        expect(res.offset.begin).toBe('Linting [should '.length);
        expect(res.offset.end).toBe(res.offset.begin + 'work'.length);
      } else {
        expect(res.message).toBe('Unavailable: Identifier "should work"');
        expect(res.offset.begin).toBe('Linting ['.length);
        expect(res.offset.end).toBe(res.offset.begin + 'should work'.length);
      }
    }
  });
  it('lints invalid property', () => {
    for (const linter of getLinters('Linting [should work] and [should be] fun [-- with a comment too --].', {
      should: {
        be: 'fun',
      },
    })) {
      const result = linter.lint({
        should: {
          be: 'fun',
        },
      });
      expect(result.lints.length).toBe(1);
      const res = result.lints[0];
      expect(res.blockType).toBe('literal');
      expect(res.expression).toBe('[should work]');
      expect(res.message).toBe('Unavailable: Property "work" on Object "should"');
      expect(res.offset.begin).toBe('Linting [should '.length);
      expect(res.offset.end).toBe(res.offset.begin + 'work'.length);
    }
  });
  it('lints if condition', () => {
    for (const linter of getLinters('I eat[if vegetables are fresh] fresh[end if] vegetables', {
      vegetables: {
        fresh: true,
      },
    })) {
      expect(
        linter.lint({
          vegetables: {
            fresh: true,
          },
        }).lints.length,
      ).toBe(0);
      const result = linter.lint({} as RandomParams);
      expect(result.lints.length).toBe(1);
      const res = result.lints[0];
      expect(res.blockType).toBe('if');
      expect(res.expression).toBe('[if vegetables are fresh]');
      expect(res.message).toBe(
        (linter.strict ? '(STRICT) ' : '') + 'Unavailable: Object "vegetables" and Boolean "fresh"',
      );
      expect(res.offset.begin).toBe('I eat[if '.length);
      expect(res.offset.end).toBe(res.offset.begin + 'vegetables are fresh'.length);
    }
  });
  it('lints repeat array', () => {
    const sch = {
      vegetables: [
        {
          vegetable: {
            color: 'Orange',
            name: 'Carrot',
          },
        },
      ],
    };
    for (const linter of getLinters('Vegetables are good. [repeat vegetables][vegetable name][end repeat].', sch)) {
      expect(linter.lint(sch).lints.length).toBe(0);
      const result = linter.lint({} as RandomParams);
      expect(result.lints.length).toBe(2);
      const res = result.lints[0];
      expect(res.blockType).toBe('repeat');
      expect(res.expression).toBe('[repeat vegetables]');
      expect(res.message).toBe((linter.strict ? '(STRICT) ' : '') + 'Unavailable: Array "vegetables"');
      expect(res.offset.begin).toBe('Vegetables are good. [repeat '.length);
      expect(res.offset.end).toBe(res.offset.begin + 'vegetables'.length);

      const res1 = result.lints[1];
      expect(res1.blockType).toBe('literal');
      expect(res1.expression).toBe('[vegetable name]');
      expect(res1.message).toBe((linter.strict ? '(STRICT) ' : '') + 'Unavailable: Identifier "vegetable name"');
      expect(res1.offset.begin).toBe('Vegetables are good. [repeat vegetables]['.length);
      expect(res1.offset.end).toBe(res1.offset.begin + 'vegetable name'.length);
    }
  });
  (() => {
    const tpl = `Dear [customer name],

Thank you for your order. Your items will be shipped soon:

[repeat customer]
[end repeat]
[repeat options]
[end repeat]

[repeat items]

  [item name]: [item price]

  [if discount is available]
      (Discount: [discount amount])
      [if customer is vip]
        VIP Customer [vip customer]
      [else]
        Not a VIP customer [if something is unavailable]unavailable[end if]
      [end if]
  [else]
    No Discount
    hum
  [end if]

[end repeat]

Total: [order total] [if coupon is applied]Coupon applied[end if]
[if order is paid]Paid[end if]

Thanks
[business name]`;

    const params: typeof schema = {} as any;
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        if (Array.isArray((schema as any)[key])) {
          (params as any)[key] = (schema as any)[key].concat([]);
          continue;
        }
        (params as any)[key === 'brand' ? 'business' : key] = Utils.getParamsMerged({}, (schema as any)[key]);
      }
    }

    (params as any).options = [];
    (params as any).coupon = { applied: true };
    (params as any).order.paid = undefined;

    const expectLintResult = (
      lint: Lint,
      expected: {
        severity?: 'error' | 'warning';
        offset: { begin: number; end: number };
        line: { begin: number; end: number };
        column: { begin: number; end: number };
        expression: string;
        message: string;
        blockType: BlockType;
      },
    ) => {
      expect(lint.blockType).toBe(expected.blockType);
      expect(lint.offset.begin).toBe(expected.offset.begin);
      expect(lint.offset.end).toBe(expected.offset.end);
      expect(lint.position.begin.line).toBe(expected.line.begin);
      expect(lint.position.end.line).toBe(expected.line.end);
      expect(lint.position.begin.column).toBe(expected.column.begin);
      expect(lint.position.end.column).toBe(expected.column.end);
      expect(lint.message).toBe(expected.message);
      expect(lint.severity).toBe(expected.severity);
    };
    for (const linter of getLinters(tpl, schema)) {
      it('lints complex scenario: ' + (linter.strict ? 'strict' : 'dynamic'), () => {
        const result = linter.lint(params);
        const resultNoLines = linter.lint(params, false);
        const lints = result.lints;
        expect(lints.length).toBe(linter.strict ? 9 : 6);
        if (linter.strict) {
          //   return;
        }

        // heavily tested with CodeMirror lint

        let index = 0;

        expectLintResult(lints[index], {
          offset: { begin: 91, end: 99 },
          line: { begin: 5, end: 5 },
          column: { begin: 8, end: 16 },
          severity: 'error',
          expression: '[repeat customer]',
          message: 'Unavailable: Array "customer"',
          blockType: 'repeat',
        });

        expectLintResult(resultNoLines.lints[index], {
          offset: { begin: 91, end: 99 },
          line: { begin: 1, end: 1 }, // lines won't be resolved
          column: { begin: 0, end: 0 }, // lines won't be resolved
          severity: 'error',
          expression: '[repeat customer]',
          message: 'Unavailable: Array "customer"',
          blockType: 'repeat',
        });

        index++;
        if (linter.strict) {
          expectLintResult(lints[index], {
            offset: { begin: 122, end: 129 },
            line: { begin: 7, end: 7 },
            column: { begin: 8, end: 15 },
            severity: 'warning',
            expression: '[repeat options]',
            message: '(STRICT) Illegal: Array "options"',
            blockType: 'repeat',
          });
          index++;
        }

        expectLintResult(lints[index], {
          offset: { begin: 246, end: 252 },
          line: { begin: 15, end: 15 },
          column: { begin: 27, end: 33 },
          severity: 'error',
          expression: '[discount amount]',
          message: 'Unavailable: Property "amount" on Object "discount"',
          blockType: 'literal',
        });

        index++;

        expectLintResult(lints[index], {
          offset: { begin: 277, end: 280 },
          line: { begin: 16, end: 16 },
          column: { begin: 22, end: 25 },
          severity: 'error',
          expression: '[if customer is vip]',
          message: 'Unavailable: Boolean "vip"',
          blockType: 'if',
        });

        index++;

        expectLintResult(lints[index], {
          offset: { begin: 304, end: 316 },
          line: { begin: 17, end: 17 },
          column: { begin: 22, end: 34 },
          severity: 'error',
          expression: '[vip customer]',
          message: 'Unavailable: Identifier "vip customer"',
          blockType: 'literal',
        });

        index++;

        expectLintResult(lints[index], {
          offset: { begin: 362, end: 386 },
          line: { begin: 19, end: 19 },
          column: { begin: 31, end: 55 },
          severity: 'error',
          expression: '[if something is unavailable]',
          message: 'Unavailable: Object "something" and Boolean "unavailable"',
          blockType: 'if',
        });

        index++;

        if (linter.strict) {
          expectLintResult(lints[index], {
            offset: { begin: 506, end: 523 },
            line: { begin: 28, end: 28 },
            column: { begin: 25, end: 42 },
            severity: 'warning',
            expression: '[if coupon is applied]',
            message: '(STRICT) Illegal: Condition "coupon is applied"',
            blockType: 'if',
          });
          index++;
        }

        expectLintResult(lints[index], {
          offset: { begin: 560, end: 564 },
          line: { begin: 29, end: 29 },
          column: { begin: 13, end: 17 },
          severity: linter.strict ? 'warning' : 'error',
          expression: '[if order is paid]',
          message: (linter.strict ? '(STRICT) ' : '') + 'Unavailable: Boolean "paid"',
          blockType: 'if',
        });

        index++;

        if (linter.strict) {
          expectLintResult(lints[index], {
            offset: { begin: 587, end: 600 },
            line: { begin: 32, end: 32 },
            column: { begin: 1, end: 14 },
            severity: 'warning',
            expression: '[business name]',
            message: '(STRICT) Illegal: Identifier "business name"',
            blockType: 'literal',
          });
          index++;
        }
      });
    }
  })();
});
