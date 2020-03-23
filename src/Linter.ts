import { Block, LiteralBlock, IfBlock, RepeatBlock, CommentBlock, BlockType } from './block/index';
import { Builder } from './Builder';
import { Utils } from './Utils';

type Range = {
  begin: number;
  end: number;
};

type Position = {
  begin: { line: number; column: number };
  end: { line: number; column: number };
};

type LintResultType = 'error' | 'warning';

export interface Lint {
  offset: Range;
  position: Position;
  type: LintResultType;
  blockType: BlockType;
  block: Block;
  scope: any;
  expression: string;
  message: string;
}

export interface LinterResult {
  lints: Lint[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

export class Linter<T = any> {
  public builder: Builder<T>;
  private lines: string[] = [];

  public constructor(public template: string, schema?: T, private strictOverride?: boolean) {
    this.builder = new Builder(template, schema, false);
  }

  public get schema() {
    return this.builder.schema;
  }

  public get strict() {
    if (this.strictOverride !== undefined) {
      return this.strictOverride;
    }
    return !!this.builder.schema;
  }

  protected getBlockPrefix(blockType: BlockType) {
    const prefixes = { comment: '[--', if: '[if ', repeat: '[repeat ', literal: '' };
    return prefixes[blockType];
  }

  private getParamsMergedForBlock(block: Block, params: any, childParams?: any) {
    return Utils.getParamsMergedForBlock(block, params, childParams);
  }

  private getLines(text: string) {
    return text
      .split('\r\n')
      .join('\n')
      .split('\n');
  }

  private createLintResult(res: {
    offsetBegin: number;
    offsetEnd: number;
    type: LintResultType;
    block: Block;
    expression: string;
    message: string;
  }): Lint {
    return {
      offset: { begin: res.offsetBegin, end: res.offsetEnd },
      // line: { begin: 1, end: 1 },
      // column: { begin: 0, end: 0 },
      position: { begin: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
      type: res.type,
      expression: res.expression,
      message: res.message,
      blockType: res.block.type,
      block: res.block,
      scope: res.block.scope,
    };
  }

  private scanLiteralBlock(block: LiteralBlock, schema: any, params: any) {
    const results: Lint[] = [];
    const maxIterations = 10000;
    let tplInner = block.outerContent;
    let offset = 0 + block.offsetBegin;
    let offsetBegin: number;
    let offsetEnd: number;
    let expression: string;
    const getLintResult = (message: string, strict = false): Lint => {
      return this.createLintResult({
        type: strict ? 'warning' : 'error',
        block,
        offsetBegin,
        offsetEnd,
        expression,
        message,
      });
    };

    for (let i = 0; i < maxIterations; i++) {
      const idx = tplInner.indexOf('[');
      const endIdx = tplInner.indexOf(']');
      if (idx === -1) {
        break;
      }
      let validIdentifier = false;
      if (endIdx === -1) {
        expression = tplInner.substr(idx, 10) + '...';
        offsetBegin = offset + idx + 1;
        offsetEnd = offset + tplInner.length;
        results.push(getLintResult('Invalid: Expression "' + expression + '"'));
        return results;
      }
      const identifier = tplInner.substring(idx + 1, endIdx);
      expression = '[' + identifier + ']';
      offsetBegin = offset + idx + 1;
      validIdentifier = true;
      offset = offset + endIdx + 1;
      tplInner = tplInner.substr(endIdx + 1);
      let keyFound = '';
      let subkeyFound = '';
      for (const key in params) {
        if (identifier.indexOf(key + ' ') !== 0) {
          continue;
        }
        keyFound = key;
        for (const subkey in params[key]) {
          if ((identifier + ']').substr(key.length).indexOf(' ' + subkey + ']') !== 0) {
            continue;
          }
          subkeyFound = subkey;
          break;
        }
        break;
      }

      offsetEnd = offsetBegin + identifier.length;

      const identifiers = this.strict && schema ? this.builder.getIdentifiers(schema) : false;
      const isValidIdentifier = identifiers && this.builder.isValidIdentifier(identifiers, identifier);

      if (keyFound && subkeyFound) {
        if (identifiers && !isValidIdentifier) {
          results.push(getLintResult('(STRICT) Illegal: Identifier "' + identifier + '"', true));
        }
        continue;
      }

      if (identifiers && isValidIdentifier) {
        results.push(getLintResult('(STRICT) Unavailable: Identifier "' + identifier + '"', true));
        continue;
      }

      offsetBegin += keyFound ? (keyFound + ' ').length : 0;
      offsetEnd = offsetBegin + identifier.length - (keyFound ? (keyFound + ' ').length : 0);
      const message = keyFound
        ? 'Unavailable: Property "' + identifier.replace(keyFound + ' ', '') + '" on Object "' + keyFound + '"'
        : 'Unavailable: Identifier "' + identifier + '"';
      results.push(getLintResult(message));
    }
    return results;
  }

  private scanBlocks(blocks: Block[], schema: any, params: any, results: Lint[]) {
    let offsetBegin: number;
    let offsetEnd: number;
    for (const block of blocks) {
      const getLintResult = (message: string, strict = false): Lint => {
        return this.createLintResult({
          type: strict ? 'warning' : 'error',
          block,
          offsetBegin,
          offsetEnd,
          expression: block.expression,
          message,
        });
      };
      if (block instanceof IfBlock) {
        if (!(params[block.key] && typeof params[block.key][block.subkey] === 'boolean')) {
          if (this.strict && schema[block.key] && typeof schema[block.key][block.subkey] === 'boolean') {
            const keyFound = params[block.key] && typeof params[block.key] === 'object';
            offsetBegin =
              block.offsetBegin +
              this.getBlockPrefix('if').length +
              (keyFound ? (block.key + ' ' + block.operator + ' ').length : 0);
            offsetEnd = block.offsetBegin + block.expression.length - 1;
            results.push(
              getLintResult(
                '(STRICT) Unavailable: ' +
                  (keyFound ? '' : 'Object "' + block.key + '" and ') +
                  'Boolean "' +
                  block.subkey +
                  '"',
                true,
              ),
            );
          } else {
            const keyFound = params[block.key] && typeof params[block.key] === 'object';
            offsetBegin =
              block.offsetBegin +
              this.getBlockPrefix('if').length +
              (keyFound ? (block.key + ' ' + block.operator + ' ').length : 0);
            offsetEnd = block.offsetBegin + block.expression.length - 1;
            results.push(
              getLintResult(
                'Unavailable: ' +
                  (keyFound ? '' : 'Object "' + block.key + '" and ') +
                  'Boolean "' +
                  block.subkey +
                  '"',
              ),
            );
          }
        } else if (this.strict && !(schema[block.key] && typeof schema[block.key][block.subkey] === 'boolean')) {
          offsetBegin = block.offsetBegin + this.getBlockPrefix('if').length;
          offsetEnd = block.offsetBegin + block.expression.length - 1;
          results.push(
            getLintResult(
              '(STRICT) Illegal: Condition "' + (block.key + ' ' + block.operator + ' ' + block.subkey) + '"',
              true,
            ),
          );
        }
        this.scanBlocks(block.children, schema, params, results);
        if (block.elseChildren.length) {
          this.scanBlocks(block.elseChildren, schema, params, results);
        }
        continue;
      } else if (block instanceof RepeatBlock) {
        offsetBegin = block.offsetBegin + this.getBlockPrefix('repeat').length;
        offsetEnd = block.offsetBegin + block.expression.length - 1;
        if (!Array.isArray(params[block.key])) {
          if (this.strict && Array.isArray(schema[block.key])) {
            results.push(getLintResult('(STRICT) Unavailable: Array "' + block.key + '"', true));
          } else {
            results.push(getLintResult('Unavailable: Array "' + block.key + '"'));
          }
        } else if (this.strict && !Array.isArray(schema[block.key])) {
          results.push(getLintResult('(STRICT) Illegal: Array "' + block.key + '"', true));
        }
        const mergedSchema = this.getParamsMergedForBlock(block, schema);
        const mergedParams = this.getParamsMergedForBlock(block, params);
        this.scanBlocks(block.children, mergedSchema, mergedParams, results);
        continue;
      } else if (block instanceof LiteralBlock) {
        results.push(...this.scanLiteralBlock(block, schema, params));
        continue;
      } else {
        continue;
      }
    }
  }

  private resolveLineAndColumn(res: Lint) {
    const lines = this.getLines(this.builder.template.substr(0, res.offset.begin + 1));
    res.position.begin.line = lines.length;
    res.position.end.line = lines.length;
    const columnBegin = lines[lines.length - 1].length - 1;
    const columnEnd = columnBegin + (res.offset.end - res.offset.begin);
    res.position.begin.column = columnBegin;
    res.position.end.column = columnEnd;
    return res;
  }

  public lint(params?: T, resolveLines = true): LinterResult {
    const lints: Lint[] = [];
    const schema = this.schema || {};
    if (params === undefined) {
      params = schema as T;
    }
    this.scanBlocks(this.builder.blocks, schema, params, lints);
    let hasErrors = false;
    let hasWarnings = false;
    lints.map((lint) => {
      if (lint.type === 'error') {
        hasErrors = true;
      }
      if (lint.type === 'warning') {
        hasWarnings = true;
      }
      if (resolveLines) {
        this.resolveLineAndColumn(lint);
      }
    });
    return {
      lints,
      hasErrors,
      hasWarnings,
    };
  }
}
