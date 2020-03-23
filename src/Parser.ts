import { Block, IfBlock, CommentBlock, LiteralBlock } from './block/index';
import { Utils } from './Utils';
import { Builder } from './Builder';

export class Parser<T = any> {
  public builder: Builder<T>;
  public constructor(builder: Builder<T>) {
    this.builder = builder;
  }
  public parse(params: T) {
    const parsed = this.getBlocksParsed(this.builder.blocks, params);
    return parsed;
  }

  private getParamsMergedForBlock(block: Block, params: any, childParams?: any) {
    return Utils.getParamsMergedForBlock(block, params, childParams);
  }

  private getBlocksParsed(blocks: Block[], params: any) {
    let output = '';
    for (const block of blocks) {
      output += this.getBlockParsed(block, params);
    }
    return output;
  }
  private processBlock(block: CommentBlock | LiteralBlock, params: any) {
    if (block instanceof CommentBlock) {
      return '';
    }
    let result = block.content;
    if (result.indexOf('[') === -1 || result.indexOf(']') === -1) {
      return result;
    }
    for (const key in params) {
      if (!params.hasOwnProperty(key)) {
        continue;
      }
      if (result.indexOf('[' + key + ' ') === -1) {
        continue;
      }
      for (const subkey in params[key]) {
        if (!params[key].hasOwnProperty(subkey)) {
          continue;
        }
        const identifier = key + ' ' + subkey;
        const expression = '[' + identifier + ']';
        if (result.indexOf(expression) === -1) {
          continue;
        }
        if (this.builder.strict && !this.builder.isValidIdentifier(block.identifiers, identifier)) {
          continue;
        }
        result = result.split(expression).join(params[key][subkey]);
      }
    }
    return result;
  }
  private getBlockParsed(block: Block, params: any) {
    if (block instanceof IfBlock /*  block.type === 'if' */) {
      let result: boolean = false;
      if (!(params[block.key] && typeof params[block.key][block.subkey as string] === 'boolean')) {
        return block.outerContent;
      }
      const value = params[block.key][block.subkey as string];
      result = value === (block.operator === 'is not' || block.operator === 'are not' ? false : true);

      if (!result) {
        if (block.elseChildren.length) {
          return this.getBlocksParsed(block.elseChildren, params);
        }
        return '';
      }

      return this.getBlocksParsed(block.children, params);
    } else if (block.type === 'repeat') {
      if (!Array.isArray(params[block.key])) {
        return block.outerContent; // do not parse
      }
      let result = '';
      for (const childParams of params[block.key]) {
        const mergedParams = this.getParamsMergedForBlock(block, params, childParams);
        result += this.getBlocksParsed(block.children, mergedParams);
      }
      return result;
    }
    return this.processBlock(block, params);
  }
}
