import {
  Block,
  BlockType,
  /* IfBlock, CommentBlock, RepeatBlock, LiteralBlock, */ createBlock,
  IfBlock,
  LiteralBlock,
  RepeatBlock,
  CommentBlock,
} from './block/index';
import { Utils } from './Utils';

export interface BlockDefinition {
  blockType: BlockType;
  // expression?: string;
  key?: string;
  operator?: string;
  subkey?: string;
}

export class Builder<T> {
  private builtBlocks?: Block[];

  public constructor(public template: string, public schema?: T, private strictOverride?: boolean) {}

  public get strict() {
    if (this.strictOverride !== undefined) {
      return this.strictOverride;
    }
    return !!this.schema;
  }

  public get type() {
    return this.strict ? 'strict' : 'dynamic';
  }

  public get blocks(): Block[] {
    if (this.builtBlocks) {
      return this.builtBlocks;
    }
    return this.build();
  }

  public build() {
    const outerBlocks = this.findOuterBlocks(this.template, this.schema);
    this.repairOffsets(outerBlocks);
    this.builtBlocks = outerBlocks;
    return outerBlocks;
  }

  private getParamsMergedForBlock(block: Block, params: any, childParams?: any) {
    return Utils.getParamsMergedForBlock(block, params, childParams);
  }

  private findOuterBlocks(tpl: string, schema: any) {
    // return this.findOuterBlocksRecursively(tpl, schema);
    const outerBlocks = this.findOuterBlocksRecursively(tpl, schema);
    for (const block of outerBlocks) {
      if (block.type === 'repeat') {
        const mergedSchema = this.getParamsMergedForBlock(block, schema);
        block.children = this.findOuterBlocks(block.content, mergedSchema);
      } else if (block instanceof IfBlock /*  block.type === 'if' */) {
        // const idx = block.content.indexOf()
        const children = this.findOuterBlocks(block.content, schema);
        let positive: Block[] = [];
        let negative: Block[] = [];
        // let elseFound = false;
        let elseBlock: Block | undefined;
        for (const child of children.concat([]).reverse()) {
          if (child.type === 'literal') {
            const idx = child.content.indexOf('[else]');
            if (idx !== -1) {
              elseBlock = child;
              // negative = positive;
              continue;
            }
          }
          (elseBlock ? positive : negative).push(child);
        }
        positive.reverse();
        negative.reverse();
        if (elseBlock) {
          const parts = elseBlock.content.split('[else]');
          negative.unshift(this.getLiteralBlock(parts.pop() as string, schema));
          positive.push(this.getLiteralBlock(parts.join('[else]'), schema));
        } else {
          positive = negative;
          negative = [];
        }
        block.children = positive;
        block.elseChildren = negative;
      }
    }
    return outerBlocks;
  }

  // private addToOuterBlocks(outerBlocks: Block[], block: Block, schema: any) {
  //   // if (block.type === 'repeat') {
  //   //   const mergedSchema = this.getParamsMergedForBlock(block, schema);
  //   //   block.children = this.findOuterBlocks(block.content, mergedSchema);
  //   // } else if (block.type === 'if') {
  //   //   block.children = this.findOuterBlocks(block.content, schema);
  //   // }
  //   outerBlocks.push(block);
  // }

  private findOuterBlocksRecursively(tpl: string, schema: any) {
    const outerBlocks: Block[] = [];
    let nextBlock = this.findFirstBlock(tpl, schema);
    outerBlocks.push(this.getLiteralBlock(tpl, schema, undefined, nextBlock));
    // this.addToOuterBlocks(outerBlocks, this.getLiteralBlock(tpl, undefined, nextBlock), schema);
    // let i = 0;
    const maxIterations = 1000;
    for (let i = 0; i < maxIterations; i++) {
      // while (true) {
      //   if (i > maxIterations) {
      //     break;
      //   }
      if (!nextBlock) {
        break;
      }
      outerBlocks.push(nextBlock);
      // this.addToOuterBlocks(outerBlocks, nextBlock, schema);
      const prevBlock = nextBlock;
      nextBlock = this.findNextBlock(tpl, schema, nextBlock);
      outerBlocks.push(this.getLiteralBlock(tpl, schema, prevBlock, nextBlock));
      // this.addToOuterBlocks(outerBlocks, this.getLiteralBlock(tpl, prevBlock, nextBlock), schema);
      // i++;
    }
    return outerBlocks;
  }

  protected getBlockPrefix(blockType: BlockType) {
    const prefixes = {
      comment: '[--',
      if: '[if ',
      repeat: '[repeat ',
      literal: '',
    };
    return prefixes[blockType];
  }

  public getDynamicBlockDefinition(idx: number, blockType: BlockType, tpl: string): BlockDefinition | undefined {
    if (blockType !== 'if' && blockType !== 'repeat') {
      return;
    }
    const prefix = this.getBlockPrefix(blockType);
    const offset = idx + prefix.length;
    const tplInner = tpl.substr(offset);
    // if (blockType === 'repeat' || blockType === 'if') {
    const endIdx = tplInner.indexOf(']');
    if (endIdx === -1) {
      return;
    }
    const key = tplInner.substring(0, endIdx);
    if (blockType === 'if') {
      const operators = ['are not', 'are', 'is not', 'is' /* , 'has not', 'has' */];
      for (const operator of operators) {
        const operatorStr = ' ' + operator + ' ';
        const opIdx = key.indexOf(operatorStr);
        if (opIdx === -1) {
          continue;
        }
        return {
          blockType,
          key: key.substring(0, opIdx),
          operator,
          subkey: key.substr(opIdx + operatorStr.length),
        };
      }
      return;
    }
    return {
      blockType,
      key,
    };
    // }
    // }
  }

  private getStrictBlockDefinition(
    idx: number,
    blockType: BlockType,
    tpl: string,
    schema: any,
  ): BlockDefinition | undefined {
    if (blockType !== 'if' && blockType !== 'repeat') {
      return;
    }
    const prefix = this.getBlockPrefix(blockType);
    for (const key in schema) {
      if (!schema.hasOwnProperty(key)) {
        continue;
      }
      // console.log('params: ', blockType, key, Array.isArray(schema[key]));
      if (blockType === 'repeat' && Array.isArray(schema[key])) {
        const expression = prefix + '' + key + ']';
        if (tpl.substr(idx, expression.length) === expression) {
          // console.log('expression', expression, tpl.substr(idx, expression.length) === expression);
          return {
            blockType,
            // expression,
            key,
          };
        }
      }
      if (blockType === 'if' && !Array.isArray(schema[key])) {
        // if (prefix === prefixes.if) {
        for (const subkey in schema[key]) {
          if (!schema[key].hasOwnProperty(subkey)) {
            continue;
          }
          const operators = ['are not', 'are', 'is not', 'is' /* , 'has not', 'has' */];
          for (const operator of operators) {
            const expression = prefix + '' + key + ' ' + operator + ' ' + subkey + ']';
            // console.log('expression', expression, schema[key]);
            if (tpl.substr(idx, expression.length) === expression) {
              return {
                blockType,
                // prefix,
                // expression,
                key,
                operator,
                subkey,
              };
            }
          }
        }
        // }
      }
    }
  }

  public getValidBlockDefinition(
    idx: number,
    blockType: BlockType,
    tpl: string,
    schema: any,
  ): BlockDefinition | undefined {
    if (blockType === 'comment') {
      return {
        blockType,
      };
    }
    if (this.strict) {
      return this.getStrictBlockDefinition(idx, blockType, tpl, schema);
    }
    return this.getDynamicBlockDefinition(idx, blockType, tpl);
  }

  private findFirstBlock(tpl: string, schema: any): Block | undefined {
    let minIndex = Number.MAX_SAFE_INTEGER;
    // const found = { comment: false, if: false, repeat: false };
    const blockDefinitions: any = {};
    for (const blockType of ['comment', 'if', 'repeat'] as BlockType[]) {
      const idx = tpl.indexOf(this.getBlockPrefix(blockType));
      // if (!(idx !== -1 && idx < minIndex)) {
      if (idx === -1) {
        continue;
      }
      const blkDef = this.getValidBlockDefinition(idx, blockType, tpl, schema);
      if (!(blkDef && idx < minIndex)) {
        continue;
      }
      // console.log('idx : ', idx, blkDef);
      minIndex = idx;
      blockDefinitions[idx] = blkDef;
    }
    const blockDefinition = blockDefinitions[minIndex];
    if (!blockDefinition) {
      return;
    }
    if (blockDefinition.blockType === 'if') {
      return this.getIfBlock(
        tpl,
        schema,
        blockDefinition.operator,
        blockDefinition.key,
        blockDefinition.subkey,
        minIndex,
      );
      // return this.getRepeatBlock(tpl, blockDefinition.key);
    }
    if (blockDefinition.blockType === 'repeat') {
      // console.log('blockDefinition3', blockDefinition);
      return this.getRepeatBlock(tpl, schema, blockDefinition.key, minIndex);
    }
    return this.getCommentBlock(tpl, minIndex);
  }

  private findNextBlock(tpl: string, schema: any, block: Block) {
    tpl = tpl.substr(block.outerEndIndex);
    const nextBlock = this.findFirstBlock(tpl, schema);
    if (nextBlock) {
      nextBlock.outerBeginIndex += block.outerEndIndex;
      // nextBlock.innerBeginIndex += block.outerEndIndex;
      // nextBlock.innerEndIndex += block.outerEndIndex;
      nextBlock.outerEndIndex += block.outerEndIndex;
    }
    return nextBlock;
  }

  public getIdentifiers(schema: any) {
    return this.getVariables(schema)
      .filter((varialbe) => varialbe.type !== 'array')
      .map((variable) => variable.key + ' ' + variable.subkey);
  }

  public getVariables(schema: any) {
    const variables: {
      key: string;
      type: 'identifier' | 'boolean' | 'array';
      subkey: string;
    }[] = [];
    for (const key in schema) {
      if (!schema.hasOwnProperty(key)) {
        continue;
      }
      if (Array.isArray(schema[key])) {
        variables.push({ key, subkey: '', type: 'array' });
        continue;
      }
      if (typeof schema[key] !== 'object') {
        continue;
      }
      for (const subkey in schema[key]) {
        if (!schema[key].hasOwnProperty(subkey)) {
          continue;
        }
        if (typeof schema[key][subkey] === 'boolean') {
          variables.push({ key, subkey, type: 'boolean' });
        } else {
          variables.push({ key, subkey, type: 'identifier' });
        }
      }
    }
    return variables;
  }

  private getLiteralBlock(tpl: string, schema: any, prevBlock?: Block, nextBlock?: Block): Block {
    const block = createBlock('literal', {
      outerBeginIndex: prevBlock ? prevBlock.outerEndIndex : 0,
      // innerBeginIndex: prevBlock ? prevBlock.outerEndIndex : 0,
      // innerEndIndex: nextBlock ? nextBlock.outerBeginIndex : tpl.length,
      outerEndIndex: nextBlock ? nextBlock.outerBeginIndex : tpl.length,
    }) as LiteralBlock;
    block.content = tpl.substring(block.outerBeginIndex, block.outerEndIndex);
    block.outerContent = block.content;
    if (this.strict) {
      block.identifiers = [];
      block.booleans = [];
      block.arrays = [];
      for (const variable of this.getVariables(schema)) {
        if (variable.type === 'array') {
          block.arrays.push(variable.key);
          continue;
        }
        if (variable.type === 'boolean') {
          block.booleans.push({
            key: variable.key,
            subkey: variable.subkey,
          });
        }
        block.identifiers.push(variable.key + ' ' + variable.subkey); // booleans are valid identifiers
      }
      // block.identifiers = this.getVariables(schema);
    }
    return block;
  }

  private getBlock(
    tpl: string,
    schema: any,
    idx: number,
    blockType: BlockType,
    expression: string,
    end: string,
    key?: string,
    subkey?: string,
    operator?: string,
  ) {
    // idx = idx || tpl.indexOf(expression);
    // if (idx === -1) {
    //   return;
    // }
    let idxEnd = -1;
    // tpl = tpl.substr(idx);
    const prefix = this.getBlockPrefix(blockType);
    let offset = idx + expression.length;
    let tplInner = tpl.substr(offset);
    // let tplPartial = tpl.substr(idx + expression.length);
    if (blockType === 'comment') {
      idxEnd = tplInner.indexOf(end);
      if (idxEnd !== -1) {
        idxEnd = offset + idxEnd;
      }
    } else {
      const maxIterations = 1000;
      // let nextIdx;
      // idxEnd = tplPartial.lastIndexOf(end);
      let nextIdx;
      let nextEndIdx;
      let level = 0;
      // const levelEnds = [];
      for (let i = 0; i < maxIterations; i++) {
        nextIdx = tplInner.indexOf(prefix);
        nextEndIdx = tplInner.indexOf(end);
        // levelEnds.push(offset + nextEndIdx);
        if (nextEndIdx !== -1 && (nextIdx === -1 || nextEndIdx < nextIdx)) {
          // idxEnd = nextEndIdx;
          break;
        }
        if (nextIdx !== -1 && nextIdx < nextEndIdx) {
          level++;
          tplInner = tplInner.substr(nextIdx + prefix.length);
          // offset = offset + nextIdx + prefix.length;
          //
        }
      }
      tplInner = tpl.substr(offset);
      const levelEnds = [];
      // let
      for (let i = 0; i <= level; i++) {
        nextEndIdx = tplInner.indexOf(end);
        if (nextEndIdx !== -1) {
          tplInner = tplInner.substr(nextEndIdx + end.length);
          levelEnds.push(offset + nextEndIdx);
          offset = offset + nextEndIdx + end.length;
        } else {
          levelEnds.push(-1);
        }
      }
      if (levelEnds[level] !== undefined && levelEnds[level] !== -1) {
        // levelEnds;
        idxEnd = levelEnds[level];
      }
      // console.log('level', 'level', levelEnds);
      // if (idxEnd === -1) {
      //   for (let i = 0; i <= level; i++) {
      //     idxEnd = tplInner.indexOf(end);
      //     if (idxEnd !== -1) {
      //       tplInner = tplInner.substr(idxEnd + prefix.length);
      //       offset = offset + nextIdx;
      //     }
      //   }
      // }
      // idxEnd = idxEnd + offset;
    }
    if (idxEnd === -1) {
      return;
    }
    // idxEnd = offset + idxEnd;
    const block = createBlock(blockType, {
      outerBeginIndex: idx,
      // innerBeginIndex: idx + expression.length,
      // innerEndIndex: idxEnd,
      outerEndIndex: idxEnd + end.length,
      expression,
      expressionEnd: end,
      key,
      subkey,
      operator,
    });
    block.content = tpl.substring(idx + expression.length, idxEnd);
    block.outerContent = tpl.substring(block.outerBeginIndex, block.outerEndIndex);
    return block;
  }

  private getCommentBlock(tpl: string, idx: number) {
    return this.getBlock(tpl, null, idx, 'comment', '[--', '--]');
  }

  private getRepeatBlock(tpl: string, schema: any, key: string, idx: number) {
    return this.getBlock(tpl, schema, idx, 'repeat', '[repeat ' + key + ']', '[end repeat]', key);
  }

  private getIfBlock(tpl: string, schema: any, operator: string, key: string, subkey: string, idx: number) {
    return this.getBlock(
      tpl,
      schema,
      idx,
      'if',
      '[if ' + key + ' ' + operator + ' ' + subkey + ']',
      '[end if]',
      key,
      subkey,
      operator,
    );
  }

  private advanceOffset(block: LiteralBlock | CommentBlock, offset: number) {
    return offset + block.outerContent.length;
  }

  private repairOffsets(blocks: Block[], outerOffset = 0) {
    for (const block of blocks) {
      block.outerBeginIndex = outerOffset;
      if (block instanceof IfBlock) {
        outerOffset = outerOffset + block.expression.length;
        outerOffset = this.repairOffsets(block.children, outerOffset);
        if (block.elseChildren.length) {
          outerOffset = outerOffset + '[else]'.length;
          outerOffset = this.repairOffsets(block.elseChildren, outerOffset);
        }
        outerOffset = outerOffset + block.expressionEnd.length;
        // continue;
      } else if (block instanceof RepeatBlock) {
        outerOffset = outerOffset + block.expression.length;
        outerOffset = this.repairOffsets(block.children, outerOffset);
        outerOffset = outerOffset + block.expressionEnd.length;
        // continue;
      } else if (block instanceof LiteralBlock) {
        outerOffset = this.advanceOffset(block, outerOffset);
        // continue;
      } else {
        outerOffset = this.advanceOffset(block, outerOffset);
        // continue;
      }
      block.outerEndIndex = outerOffset;
    }
    return outerOffset;
  }

  private getBlockAtIndex(blocks: Block[], index: number): Block | undefined {
    let foundBlock: Block | undefined;
    for (const block of blocks) {
      if (!(index >= block.outerBeginIndex && index <= block.outerEndIndex)) {
        continue;
      }
      if (block instanceof IfBlock) {
        foundBlock = this.getBlockAtIndex(block.children.concat(block.elseChildren), index);
      } else if (block instanceof RepeatBlock) {
        foundBlock = this.getBlockAtIndex(block.children, index);
      } else {
        return block;
      }
      if (!foundBlock) {
        foundBlock = block;
      }
    }
    return foundBlock;
  }

  public getBlockAt(index: number): Block | undefined {
    return this.getBlockAtIndex(this.blocks, index);
  }
}
