import { Linter, LintResult } from '../src/Linter';
import { Utils } from '../src/Utils';
import { schema } from './shared';
import { BlockType } from '../src/block';

const getLinters = (tpl: string, sch: any, strict?: boolean) => {
  return [new Linter(tpl, sch, strict), new Linter(tpl)];
};

describe('Linter', () => {
  it('lints simple identifiers', () => {
    for (const linter of getLinters('Linting [should be] fun and [should work] fine for simple expression', {
      should: {
        work: 'SHOULD WORK',
      },
    })) {
      let results = linter.lint({
        should: {
          be: 'something',
          work: 'YES',
        },
      });
      expect(results.length).toBe(linter.strict ? 1 : 0);
      if (linter.strict) {
        //
      }

      results = linter.lint({});
      //   console.log('all results', results);
      expect(results.length).toBe(linter.strict ? 2 : 2);
      for (let i = 0; i < 2; i++) {
        const res = results[i];
        const identifier = ['should be', 'should work'][i];
        expect(res.blockType).toBe('literal');
        expect(res.expression).toBe('[' + identifier + ']');
        expect(res.message).toBe(
          (linter.strict && identifier === 'should work' ? '(STRICT) ' : '') +
            'Unavailable: Identifier "' +
            identifier +
            '"',
        );
        expect(res.index.start).toBe(
          (identifier === 'should work' ? 'Linting [should be] fun and [' : 'Linting [').length,
        );
        expect(res.index.finish).toBe(res.index.start + identifier.length);
      }
    }
  });
  it('lints syntax error', () => {
    for (const linter of getLinters('Linting [should not work fine for wrong expression', {
      should: {
        work: 'SHOULD WORK',
      },
    })) {
      //   expect(
      //     linter.lint({
      //       should: {
      //         work: 'YES',
      //       },
      //     }).length,
      //   ).toBe(0);
      const results = linter.lint({});
      expect(results.length).toBe(1);
      const res = results[0];
      expect(res.blockType).toBe('literal');
      expect(res.expression).toBe('[should no...');
      expect(res.message).toBe(
        // (linter.strict ? '(STRICT) ' : '') + 'Unavailable: Identifier "should work"',
        'Invalid: Expression "[should no..."',
        //   : 'Unavailable identifier "should work"',
      );
      expect(res.index.start).toBe('Linting ['.length);
      expect(res.index.finish).toBe('Linting [should not work fine for wrong expression'.length);
    }
  });
  it('lints invalid property', () => {
    for (const linter of getLinters(
      'Linting [should work] and [should be] fun [-- with a comment too --].',
      {
        should: {
          be: 'fun',
        },
      },
      true,
    )) {
      const results = linter.lint({
        should: {
          be: 'fun',
        },
      });
      expect(results.length).toBe(1);
      const res = results[0];
      expect(res.blockType).toBe('literal');
      expect(res.expression).toBe('[should work]');
      expect(res.message).toBe(
        'Unavailable: Property "work" on Object "should"',
        // (linter.strict ? '(STRICT) ' : '') + 'Unavailable: Identifier "should work"',
        // 'Invalid: Expression "[should no..."',
        //   : 'Unavailable identifier "should work"',
      );
      expect(res.index.start).toBe('Linting [should '.length);
      expect(res.index.finish).toBe(res.index.start + 'work'.length);
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
        }).length,
      ).toBe(0);
      const results = linter.lint({});
      expect(results.length).toBe(1);
      const res = results[0];
      expect(res.blockType).toBe('if');
      expect(res.expression).toBe('[if vegetables are fresh]');
      expect(res.message).toBe(
        (linter.strict ? '(STRICT) ' : '') + 'Unavailable: Object "vegetables" and Boolean "fresh"',
      );
      expect(res.index.start).toBe('I eat[if '.length);
      expect(res.index.finish).toBe(res.index.start + 'vegetables are fresh'.length);
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
      expect(linter.lint(sch).length).toBe(0);
      const results = linter.lint({});
      //   console.log('the res: ', results);
      expect(results.length).toBe(2);
      const res = results[0];
      expect(res.blockType).toBe('repeat');
      expect(res.expression).toBe('[repeat vegetables]');
      expect(res.message).toBe((linter.strict ? '(STRICT) ' : '') + 'Unavailable: Array "vegetables"');
      expect(res.index.start).toBe('Vegetables are good. [repeat '.length);
      expect(res.index.finish).toBe(res.index.start + 'vegetables'.length);

      const res1 = results[1];
      expect(res1.blockType).toBe('literal');
      expect(res1.expression).toBe('[vegetable name]');
      //   expect(res1.message).toBe((linter.strict ? '(STRICT) ' : '') + 'Unavailable: Array "vegetables"');
      expect(res1.message).toBe((linter.strict ? '(STRICT) ' : '') + 'Unavailable: Identifier "vegetable name"');
      expect(res1.index.start).toBe('Vegetables are good. [repeat vegetables]['.length);
      expect(res1.index.finish).toBe(res1.index.start + 'vegetable name'.length);
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
      res: LintResult,
      expected: {
        type?: string;
        index: { start: number; finish: number };
        line: { start: number; finish: number };
        column: { start: number; finish: number };
        expression: string;
        message: string;
        blockType: BlockType;
      },
    ) => {
      expect(res.blockType).toBe(expected.blockType);
      expect(res.index.start).toBe(expected.index.start);
      expect(res.index.finish).toBe(expected.index.finish);
      expect(res.line.start).toBe(expected.line.start);
      expect(res.line.finish).toBe(expected.line.finish);
      expect(res.column.start).toBe(expected.column.start);
      expect(res.column.finish).toBe(expected.column.finish);
      expect(res.message).toBe(expected.message);
    };
    for (const linter of getLinters(tpl, schema)) {
      it('lints complex scenario: ' + (linter.strict ? 'strict' : 'dynamic'), () => {
        const results = linter.lint(params);
        expect(results.length).toBe(linter.strict ? 9 : 6);
        if (linter.strict) {
          //   return;
        }

        // heavily tested with CodeMirror lint

        // console.log(results);

        let index = 0;

        expectLintResult(results[index], {
          index: { start: 91, finish: 99 },
          line: { start: 5, finish: 5 },
          column: { start: 8, finish: 16 },
          type: 'error',
          expression: '[repeat customer]',
          message: 'Unavailable: Array "customer"',
          blockType: 'repeat',
        });

        index++;
        if (linter.strict) {
          expectLintResult(results[index], {
            index: { start: 122, finish: 129 },
            line: { start: 7, finish: 7 },
            column: { start: 8, finish: 15 },
            type: 'warning',
            expression: '[repeat options]',
            message: '(STRICT) Illegal: Array "options"',
            blockType: 'repeat',
          });
          index++;
        }

        expectLintResult(results[index], {
          index: { start: 246, finish: 252 },
          line: { start: 15, finish: 15 },
          column: { start: 27, finish: 33 },
          type: 'error',
          expression: '[discount amount]',
          message: 'Unavailable: Property "amount" on Object "discount"',
          blockType: 'literal',
        });

        index++;

        expectLintResult(results[index], {
          index: { start: 277, finish: 280 },
          line: { start: 16, finish: 16 },
          column: { start: 22, finish: 25 },
          type: 'error',
          expression: '[if customer is vip]',
          message: 'Unavailable: Boolean "vip"',
          blockType: 'if',
        });

        index++;

        expectLintResult(results[index], {
          index: { start: 304, finish: 316 },
          line: { start: 17, finish: 17 },
          column: { start: 22, finish: 34 },
          type: 'error',
          expression: '[vip customer]',
          message: 'Unavailable: Identifier "vip customer"',
          blockType: 'literal',
        });

        index++;

        expectLintResult(results[index], {
          index: { start: 362, finish: 386 },
          line: { start: 19, finish: 19 },
          column: { start: 31, finish: 55 },
          type: 'error',
          expression: '[if something is unavailable]',
          message: 'Unavailable: Object "something" and Boolean "unavailable"',
          blockType: 'if',
        });

        index++;

        if (linter.strict) {
          expectLintResult(results[index], {
            index: { start: 506, finish: 523 },
            line: { start: 28, finish: 28 },
            column: { start: 25, finish: 42 },
            type: 'warning',
            expression: '[if coupon is applied]',
            message: '(STRICT) Illegal: Condition "coupon is applied"',
            blockType: 'if',
          });
          index++;
        }

        expectLintResult(results[index], {
          index: { start: 560, finish: 564 },
          line: { start: 29, finish: 29 },
          column: { start: 13, finish: 17 },
          type: linter.strict ? 'warning' : 'error',
          expression: '[if order is paid]',
          message: (linter.strict ? '(STRICT) ' : '') + 'Unavailable: Boolean "paid"',
          blockType: 'if',
        });

        index++;

        if (linter.strict) {
          expectLintResult(results[index], {
            index: { start: 587, finish: 600 },
            line: { start: 32, finish: 32 },
            column: { start: 1, finish: 14 },
            type: 'warning',
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
