import { Block, LiteralBlock, IfBlock, RepeatBlock, CommentBlock, BlockType } from './block/index';
import { Builder } from './Builder';
import { Utils } from './Utils';

type Range = {
  start: number;
  finish: number;
};

export interface LintResult {
  index: Range;
  line: Range;
  column: Range;
  type: 'error' | 'warning';
  blockType: BlockType;
  expression: string;
  message: string;
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

  private lintResult(res: {
    startIndex: number;
    finishIndex: number;
    type: 'error' | 'warning';
    blockType: BlockType;
    expression: string;
    message: string;
  }): LintResult {
    return {
      index: { start: res.startIndex, finish: res.finishIndex },
      line: { start: 1, finish: 1 },
      column: { start: 0, finish: 0 },
      type: res.type,
      expression: res.expression,
      message: res.message,
      blockType: res.blockType,
    };
  }

  private scanLiteralBlock(block: LiteralBlock, schema: any, params: any, outerOffset: number) {
    const results: LintResult[] = [];
    const maxIterations = 1000;
    let tplInner = block.outerContent;
    let offset = 0 + outerOffset;
    for (let i = 0; i < maxIterations; i++) {
      const idx = tplInner.indexOf('[');
      const endIdx = tplInner.indexOf(']');
      if (idx === -1) {
        break;
      }
      let validIdentifier = false;
      let expression;
      let startIndex;
      let finishIndex;
      if (endIdx === -1) {
        expression = tplInner.substr(idx, 10) + '...';
        startIndex = offset + idx + 1;
        finishIndex = offset + tplInner.length;
        results.push(
          this.lintResult({
            type: 'error',
            blockType: 'literal',
            startIndex,
            finishIndex,
            expression,
            message: 'Invalid: Expression "' + expression + '"',
          }),
        );
        return results;
      }
      const identifier = tplInner.substring(idx + 1, endIdx);
      expression = '[' + identifier + ']';
      startIndex = offset + idx + 1;
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

      finishIndex = startIndex + identifier.length;

      const identifiers = this.strict && schema ? this.builder.getIdentifiers(schema) : false;
      const isValidIdentifier = identifiers && this.builder.isValidIdentifier(identifiers, identifier);

      if (keyFound && subkeyFound) {
        if (identifiers && !isValidIdentifier) {
          results.push(
            this.lintResult({
              type: 'warning',
              blockType: 'literal',
              startIndex,
              finishIndex,
              expression,
              message: '(STRICT) Illegal: Identifier "' + identifier + '"',
            }),
          );
        }
        continue;
      }

      if (identifiers && isValidIdentifier) {
        results.push(
          this.lintResult({
            type: 'warning',
            blockType: 'literal',
            startIndex,
            finishIndex,
            expression,
            message: '(STRICT) Unavailable: Identifier "' + identifier + '"',
          }),
        );
        continue;
      }

      startIndex += keyFound ? (keyFound + ' ').length : 0;
      finishIndex = startIndex + identifier.length - (keyFound ? (keyFound + ' ').length : 0);
      let message = 'un';
      message = keyFound
        ? 'Unavailable: Property "' + identifier.replace(keyFound + ' ', '') + '" on Object "' + keyFound + '"'
        : 'Unavailable: Identifier "' + identifier + '"';
      results.push(
        this.lintResult({
          type: keyFound ? 'error' : 'error',
          blockType: 'literal',
          startIndex,
          finishIndex,
          expression,
          message,
        }),
      );
    }
    return results;
  }

  private advanceOffset(block: LiteralBlock | CommentBlock, offset: number) {
    return offset + block.outerContent.length;
  }

  private scanBlocks(blocks: Block[], schema: any, params: any, results: LintResult[], outerOffset: number) {
    let startIndex;
    let finishIndex;
    for (const block of blocks) {
      if (block instanceof IfBlock) {
        if (!(params[block.key] && typeof params[block.key][block.subkey] === 'boolean')) {
          if (this.strict && schema[block.key] && typeof schema[block.key][block.subkey] === 'boolean') {
            const keyFound = params[block.key] && typeof params[block.key] === 'object';
            startIndex =
              outerOffset +
              this.getBlockPrefix('if').length +
              (keyFound ? (block.key + ' ' + block.operator + ' ').length : 0);
            finishIndex = outerOffset + block.expression.length - 1;
            results.push(
              this.lintResult({
                type: 'warning',
                blockType: 'if',
                startIndex,
                finishIndex,
                expression: block.expression,
                message:
                  '(STRICT) Unavailable: ' +
                  (keyFound ? '' : 'Object "' + block.key + '" and ') +
                  'Boolean "' +
                  block.subkey +
                  '"',
              }),
            );
          } else {
            const keyFound = params[block.key] && typeof params[block.key] === 'object';
            startIndex =
              outerOffset +
              this.getBlockPrefix('if').length +
              (keyFound ? (block.key + ' ' + block.operator + ' ').length : 0);
            finishIndex = outerOffset + block.expression.length - 1;
            results.push(
              this.lintResult({
                type: 'error',
                blockType: 'if',
                startIndex,
                finishIndex,
                expression: block.expression,
                message:
                  'Unavailable: ' +
                  (keyFound ? '' : 'Object "' + block.key + '" and ') +
                  'Boolean "' +
                  block.subkey +
                  '"',
              }),
            );
          }
        } else if (this.strict && !(schema[block.key] && typeof schema[block.key][block.subkey] === 'boolean')) {
          startIndex = outerOffset + this.getBlockPrefix('if').length;
          finishIndex = outerOffset + block.expression.length - 1;
          results.push(
            this.lintResult({
              type: 'warning',
              blockType: 'if',
              startIndex,
              finishIndex,
              expression: block.expression,
              message: '(STRICT) Illegal: Condition "' + (block.key + ' ' + block.operator + ' ' + block.subkey) + '"',
            }),
          );
        }
        outerOffset = outerOffset + block.expression.length;
        outerOffset = this.scanBlocks(block.children, schema, params, results, outerOffset);
        if (block.elseChildren.length) {
          outerOffset = outerOffset + '[else]'.length;
          outerOffset = this.scanBlocks(block.elseChildren, schema, params, results, outerOffset);
        }
        outerOffset = outerOffset + block.expressionEnd.length;
        continue;
      } else if (block instanceof RepeatBlock) {
        if (!Array.isArray(params[block.key])) {
          if (this.strict && Array.isArray(schema[block.key])) {
            startIndex = outerOffset + this.getBlockPrefix('repeat').length;
            finishIndex = outerOffset + block.expression.length - 1;
            results.push(
              this.lintResult({
                type: 'warning',
                blockType: 'repeat',
                startIndex,
                finishIndex,
                expression: block.expression,
                message: '(STRICT) Unavailable: Array "' + block.key + '"',
              }),
            );
          } else {
            startIndex = outerOffset + this.getBlockPrefix('repeat').length;
            finishIndex = outerOffset + block.expression.length - 1;
            results.push(
              this.lintResult({
                type: 'error',
                blockType: 'repeat',
                startIndex,
                finishIndex,
                expression: block.expression,
                message: 'Unavailable: Array "' + block.key + '"',
              }),
            );
          }
        } else if (this.strict && !Array.isArray(schema[block.key])) {
          startIndex = outerOffset + this.getBlockPrefix('repeat').length;
          finishIndex = outerOffset + block.expression.length - 1;
          results.push(
            this.lintResult({
              type: 'warning',
              blockType: 'repeat',
              startIndex,
              finishIndex,
              expression: block.expression,
              message: '(STRICT) Illegal: Array "' + block.key + '"',
            }),
          );
        }
        outerOffset = outerOffset + block.expression.length;
        const mergedSchema = this.getParamsMergedForBlock(block, schema);
        const mergedParams = this.getParamsMergedForBlock(block, params);
        outerOffset = this.scanBlocks(block.children, mergedSchema, mergedParams, results, outerOffset);
        outerOffset = outerOffset + block.expressionEnd.length;
        continue;
      } else if (block instanceof LiteralBlock) {
        results.push(...this.scanLiteralBlock(block, schema, params, outerOffset));
        outerOffset = this.advanceOffset(block, outerOffset);
        continue;
      } else {
        outerOffset = this.advanceOffset(block, outerOffset);
        continue;
      }
    }
    return outerOffset;
  }

  private findLineAndColumn(res: LintResult) {
    const lines = this.getLines(this.builder.template.substr(0, res.index.start + 1));
    res.line = { start: lines.length, finish: lines.length };
    const columnBegin = lines[lines.length - 1].length - 1;
    const columnEnd = columnBegin + (res.index.finish - res.index.start);
    res.column = { start: columnBegin, finish: columnEnd };
    return res;
  }

  public lint(params?: T) {
    const results: LintResult[] = [];
    const schema = this.schema || {};
    if (params === undefined) {
      params = schema as T;
    }
    this.scanBlocks(this.builder.blocks, schema, params, results, this.builder.blocks[0].offsetBegin);
    for (const res of results) {
      this.findLineAndColumn(res);
    }
    return results;
  }
}
