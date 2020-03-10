import { Block, LiteralBlock, IfBlock, RepeatBlock, CommentBlock, BlockType } from './block/index';
import { Builder } from './Builder';
import { Utils } from './Utils';
// import { Parser } from './Parser';

// interface LintResult {
//   // offset?: number;
//   startIndex: number;
//   finishIndex: number;
//   lineBegin: number;
//   columnBegin: number;
//   lineEnd: number;
//   columnEnd: number;
//   type: 'error' | 'warning';
//   expression: string;
//   message: string;
// }

// type Range = [number, number];
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

export class Linter {
  public builder: Builder;
  // public strictBuilder?: Builder;
  private lines: string[] = [];
  // public parser: Parser;

  public constructor(public template: string, public schema?: any, private strictOverride?: boolean) {
    this.builder = new Builder(template);
    // if (schema) {
    //   this.strictBuilder = new Builder(template, schema);
    // }
    // this.parser = new Parser(this.builder);
  }

  public get strict() {
    if (this.strictOverride !== undefined) {
      return this.strictOverride;
    }
    return !!this.schema;
  }

  protected getBlockPrefix(blockType: BlockType) {
    const prefixes = { comment: '[--', if: '[if ', repeat: '[repeat ', literal: '' };
    return prefixes[blockType];
  }

  private getParamsMergedForBlock(block: Block, params: any, childParams?: any) {
    return Utils.getParamsMergedForBlock(block, params, childParams);
  }

  // public build() {
  //   return this.builder.build();
  // }

  private getLines(text: string) {
    // return [text];
    return text
      .split('\r\n')
      .join('\n')
      .split('\n');
    // return text
    //   .split('\r\n')
    //   .join('\r')
    //   .split('\n')
    //   .join('\r')
    //   .split('\r');
  }

  private lintResult(res: {
    // index: Range;
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
        // continue;
        // return results;
        break;
      }
      // let identifier = '';
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
      // console.log('the expression', identifier);
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
          // const expression = expression;
          // if (tplInner.substr(key.length + ' '.length + subkey.length, 1) !== ']') {
          //   results.push({
          //     type: 'error',
          //     line: 1,
          //     column: 0,
          //     expression: '',
          //     message: '[' + key + ' ' + subkey + ': "]" expected',
          //   });
          // }
          //
          break;
        }
        break;
      }

      // startIndex += keyFound ? (keyFound + ' ').length : 0;
      // finishIndex += identifier.length;
      // }
      finishIndex = startIndex + identifier.length;

      const identifiers = schema ? this.builder.getIdentifiers(schema) : false;

      if (keyFound && subkeyFound) {
        if (identifiers && identifiers.indexOf(identifier) === -1) {
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

      if (identifiers && identifiers.indexOf(identifier) !== -1) {
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
      // if (!keyFound || !subkeyFound) {
      let message = 'un';
      // if (validIdentifier) {
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
      // }
    }
    return results;
  }
  // private scanBlock(block: Block) {
  //   return undefined;
  // }

  private advanceOffset(block: LiteralBlock | CommentBlock, offset: number) {
    return offset + block.outerContent.length;
  }

  private scanBlocks(blocks: Block[], schema: any, params: any, results: LintResult[], outerOffset: number) {
    const strict = this.strict;
    let startIndex;
    let finishIndex;
    for (const block of blocks) {
      if (block instanceof IfBlock) {
        if (!(params[block.key] && typeof params[block.key][block.subkey] === 'boolean')) {
          if (strict && schema[block.key] && typeof schema[block.key][block.subkey] === 'boolean') {
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
                // message:
                //   'STRICT: ' +
                //   (keyFound ? '' : '"' + block.key + '" is not provided and ') +
                //   '"' +
                //   block.subkey +
                //   '" is not provided',
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
                // message:
                //   (keyFound ? '' : '"' + block.key + '" is not an object and ') +
                //   '"' +
                //   block.subkey +
                //   '" is not boolean',
                message:
                  'Unavailable: ' +
                  (keyFound ? '' : 'Object "' + block.key + '" and ') +
                  'Boolean "' +
                  block.subkey +
                  '"',
              }),
            );
          }
        } else if (strict && !(schema[block.key] && typeof schema[block.key][block.subkey] === 'boolean')) {
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
          // outerOffset = this.advanceOffset(block, outerOffset);
          outerOffset = this.scanBlocks(block.elseChildren, schema, params, results, outerOffset);
        }
        outerOffset = outerOffset + block.expressionEnd.length;
        // outerOffset = this.advanceOffset(block, outerOffset);
        continue;
      } else if (block instanceof RepeatBlock) {
        if (!Array.isArray(params[block.key])) {
          if (strict && Array.isArray(schema[block.key])) {
            startIndex = outerOffset + this.getBlockPrefix('repeat').length;
            finishIndex = outerOffset + block.expression.length - 1;
            results.push(
              this.lintResult({
                type: 'warning',
                blockType: 'repeat',
                startIndex,
                finishIndex,
                expression: block.expression,
                // message: block.expression + ': [' + block.key + '] is not an array',
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
                // message: block.expression + ': [' + block.key + '] is not an array',
                message: 'Unavailable: Array "' + block.key + '"',
              }),
            );
          }
        } else if (strict && !Array.isArray(schema[block.key])) {
          startIndex = outerOffset + this.getBlockPrefix('repeat').length;
          finishIndex = outerOffset + block.expression.length - 1;
          results.push(
            this.lintResult({
              type: 'warning',
              blockType: 'repeat',
              startIndex,
              finishIndex,
              expression: block.expression,
              // message: block.expression + ': [' + block.key + '] is not an array',
              message: '(STRICT) Illegal: Array "' + block.key + '"',
            }),
          );
        }
        outerOffset = outerOffset + block.expression.length;
        const mergedSchema = this.getParamsMergedForBlock(block, schema);
        const mergedParams = this.getParamsMergedForBlock(block, params);
        outerOffset = this.scanBlocks(block.children, mergedSchema, mergedParams, results, outerOffset);
        outerOffset = outerOffset + block.expressionEnd.length;
        // outerOffset = this.advanceOffset(block, outerOffset);
        continue;
      } else if (block instanceof LiteralBlock) {
        results.push(...this.scanLiteralBlock(block, schema, params, outerOffset));
        outerOffset = this.advanceOffset(block, outerOffset);
        // what happens to the last offset?
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
    // const lthis.getLines(this.builder.template);
    res.line = { start: lines.length, finish: lines.length };
    const columnBegin = lines[lines.length - 1].length - 1;
    const columnEnd = columnBegin + (res.index.finish - res.index.start);
    res.column = { start: columnBegin, finish: columnEnd };
    // res.lineEnd = res.lineBegin;
    // res.columnEnd = res.;
    return res;
  }

  public lint(params: any) {
    const results: LintResult[] = [];
    // const blocks = this.builder.blocks;
    // const lines = this.getLines(this.builder.template);
    // console.log('lines: ', lines);
    // return this.parser.parse(params);
    // this.lines = this.getLines(this.builder.template);
    this.scanBlocks(this.builder.blocks, this.schema, params, results, 0);
    for (const res of results) {
      this.findLineAndColumn(res);
    }
    return results;
  }
}
