import { Block, BlockType, createBlock, IfBlock, LiteralBlock, RepeatBlock, CommentBlock } from './block/index';
import { Utils } from './Utils';

export interface BlockDefinition {
  blockType: BlockType;
  key?: string;
  operator?: string;
  subkey?: string;
}

export class Builder<T> {
  private builtBlocks?: Block[];

  public constructor(
    public template: string,
    public schema?: T | ((path: string) => T | Promise<T>),
    private strictOverride?: boolean,
  ) {}

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
    if (!this.builtBlocks) {
      this.builtBlocks = [];
      this.build();
    }
    return this.builtBlocks;
  }

  public build() {
    const sch = this.getSchemaFromString(this.template);
    let offset = 0;
    if (sch) {
      offset = sch.offset;
      const schema = sch.schema;
      let schemaUrl;
      const keys = Object.keys(schema);
      if (keys.length === 1 && keys[0] === 'schema') {
        schemaUrl = schema.schema;
      }
      if (schemaUrl && this.schema instanceof Function) {
        const schResult = this.schema(schemaUrl);
        if (schResult && (schResult as Promise<T>).then) {
          return new Promise<Block[]>((resolve, reject) => {
            (schResult as Promise<T>).then((schemaFound) => {
              this.schema = schemaFound;
              const blocks = this.findOuterBlocks(this.template.substr(offset), this.schema);
              this.repairOffsets(blocks, offset);
              this.builtBlocks = blocks;
              resolve(blocks);
            });
          });
        } else if (schResult) {
          this.schema = schResult as T;
        } else {
          this.schema = undefined;
        }
      } else {
        this.schema = schema;
      }
    }
    const outerBlocks = this.findOuterBlocks(this.template.substr(offset), this.schema);
    this.repairOffsets(outerBlocks, offset);
    this.builtBlocks = outerBlocks;
    return Promise.resolve(outerBlocks);
  }

  private getParamsMergedForBlock(block: Block, params: any, childParams?: any) {
    return Utils.getParamsMergedForBlock(block, params, childParams);
  }

  private getSchemaFromString(str: string) {
    const idx = str.indexOf('{');
    if (idx === -1) {
      return false;
    }
    let endIdx = idx;
    for (let i = 0; i < 10000; i++) {
      const ix = str.substr(endIdx + 1).indexOf('}');
      if (ix === -1) {
        return false;
      }
      endIdx += ix + 1;
      let json;
      try {
        json = JSON.parse(str.substring(idx, endIdx + 1));
        return { schema: json, startIndex: idx, endIndex: endIdx, offset: endIdx + 1 };
      } catch (e) {
        /**/
      }
    }
  }

  private findOuterBlocks(tpl: string, schema: any) {
    const outerBlocks = this.findOuterBlocksRecursively(tpl, schema);
    for (const block of outerBlocks) {
      if (block.type === 'repeat') {
        const mergedSchema = this.getParamsMergedForBlock(block, schema);
        block.children = this.findOuterBlocks(block.content, mergedSchema);
      } else if (block instanceof IfBlock) {
        const children = this.findOuterBlocks(block.content, schema);
        let positive: Block[] = [];
        let negative: Block[] = [];
        let elseBlock: Block | undefined;
        for (const child of children.concat([]).reverse()) {
          if (child.type === 'literal') {
            const idx = child.content.indexOf('[else]');
            if (idx !== -1) {
              elseBlock = child;
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

  private findOuterBlocksRecursively(tpl: string, schema: any) {
    const outerBlocks: Block[] = [];
    let nextBlock = this.findFirstBlock(tpl, schema);
    outerBlocks.push(this.getLiteralBlock(tpl, schema, undefined, nextBlock));
    const maxIterations = 1000;
    for (let i = 0; i < maxIterations; i++) {
      if (!nextBlock) {
        break;
      }
      outerBlocks.push(nextBlock);
      const prevBlock = nextBlock;
      nextBlock = this.findNextBlock(tpl, schema, nextBlock);
      outerBlocks.push(this.getLiteralBlock(tpl, schema, prevBlock, nextBlock));
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
    const endIdx = tplInner.indexOf(']');
    if (endIdx === -1) {
      return;
    }
    const key = tplInner.substring(0, endIdx);
    if (blockType === 'if') {
      const operators = ['are not', 'are', 'is not', 'is'];
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
      if (blockType === 'repeat' && Array.isArray(schema[key])) {
        const expression = prefix + '' + key + ']';
        if (tpl.substr(idx, expression.length) === expression) {
          return {
            blockType,
            key,
          };
        }
      }
      if (blockType === 'if' && !Array.isArray(schema[key])) {
        for (const subkey in schema[key]) {
          if (!schema[key].hasOwnProperty(subkey)) {
            continue;
          }
          const operators = ['are not', 'are', 'is not', 'is'];
          for (const operator of operators) {
            const expression = prefix + '' + key + ' ' + operator + ' ' + subkey + ']';
            if (tpl.substr(idx, expression.length) === expression) {
              return {
                blockType,
                key,
                operator,
                subkey,
              };
            }
          }
        }
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
    const blockDefinitions: any = {};
    for (const blockType of ['comment', 'if', 'repeat'] as BlockType[]) {
      const idx = tpl.indexOf(this.getBlockPrefix(blockType));
      if (idx === -1) {
        continue;
      }
      const blkDef = this.getValidBlockDefinition(idx, blockType, tpl, schema);
      if (!(blkDef && idx < minIndex)) {
        continue;
      }
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
    }
    if (blockDefinition.blockType === 'repeat') {
      return this.getRepeatBlock(tpl, schema, blockDefinition.key, minIndex);
    }
    return this.getCommentBlock(tpl, minIndex);
  }

  private findNextBlock(tpl: string, schema: any, block: Block) {
    tpl = tpl.substr(block.offsetEnd);
    const nextBlock = this.findFirstBlock(tpl, schema);
    if (nextBlock) {
      nextBlock.offsetBegin += block.offsetEnd;
      nextBlock.offsetEnd += block.offsetEnd;
    }
    return nextBlock;
  }

  public isValidIdentifier(identifiers: { key: string; subkey: string }[], identifier: string) {
    return identifiers.map((idf) => idf.key + ' ' + idf.subkey).indexOf(identifier) !== -1;
  }

  public getIdentifiers(schema: any) {
    return this.getVariables(schema)
      .filter((varialbe) => varialbe.type !== 'array')
      .map((variable) => {
        return { key: variable.key, subkey: variable.subkey };
      });
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
      offsetBegin: prevBlock ? prevBlock.offsetEnd : 0,
      offsetEnd: nextBlock ? nextBlock.offsetBegin : tpl.length,
    }) as LiteralBlock;
    block.content = tpl.substring(block.offsetBegin, block.offsetEnd);
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
        block.identifiers.push({
          key: variable.key,
          subkey: variable.subkey,
        });
      }
    }
    block.scope = schema;
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
    let idxEnd = -1;
    const prefix = this.getBlockPrefix(blockType);
    let offset = idx + expression.length;
    let tplInner = tpl.substr(offset);
    if (blockType === 'comment') {
      idxEnd = tplInner.indexOf(end);
      if (idxEnd !== -1) {
        idxEnd = offset + idxEnd;
      }
    } else {
      const maxIterations = 1000;
      let nextIdx;
      let nextEndIdx;
      let level = 0;
      for (let i = 0; i < maxIterations; i++) {
        nextIdx = tplInner.indexOf(prefix);
        nextEndIdx = tplInner.indexOf(end);
        if (nextEndIdx !== -1 && (nextIdx === -1 || nextEndIdx < nextIdx)) {
          break;
        }
        if (nextIdx !== -1 && nextIdx < nextEndIdx) {
          level++;
          tplInner = tplInner.substr(nextIdx + prefix.length);
        }
      }
      tplInner = tpl.substr(offset);
      const levelEnds = [];
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
        idxEnd = levelEnds[level];
      }
    }
    if (idxEnd === -1) {
      return;
    }
    const block = createBlock(blockType, {
      offsetBegin: idx,
      offsetEnd: idxEnd + end.length,
      expression,
      expressionEnd: end,
      key,
      subkey,
      operator,
    });
    block.content = tpl.substring(idx + expression.length, idxEnd);
    block.outerContent = tpl.substring(block.offsetBegin, block.offsetEnd);
    block.scope = schema;
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

  private repairOffsets(blocks: Block[], outerOffset: number) {
    for (const block of blocks) {
      block.offsetBegin = outerOffset;
      if (block instanceof IfBlock) {
        outerOffset = outerOffset + block.expression.length;
        outerOffset = this.repairOffsets(block.children, outerOffset);
        if (block.elseChildren.length) {
          outerOffset = outerOffset + '[else]'.length;
          outerOffset = this.repairOffsets(block.elseChildren, outerOffset);
        }
        outerOffset = outerOffset + block.expressionEnd.length;
      } else if (block instanceof RepeatBlock) {
        outerOffset = outerOffset + block.expression.length;
        outerOffset = this.repairOffsets(block.children, outerOffset);
        outerOffset = outerOffset + block.expressionEnd.length;
      } else if (block instanceof LiteralBlock) {
        outerOffset = this.advanceOffset(block, outerOffset);
      } else {
        outerOffset = this.advanceOffset(block, outerOffset);
      }
      block.offsetEnd = outerOffset;
    }
    return outerOffset;
  }

  private getBlockAtIndex(blocks: Block[], index: number): Block | undefined {
    let foundBlock: Block | undefined;
    for (const block of blocks) {
      if (!(index >= block.offsetBegin && index <= block.offsetEnd)) {
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
