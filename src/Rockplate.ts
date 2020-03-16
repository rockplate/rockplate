import { Block, IfBlock } from './block/index';
import { Builder } from './Builder';
import { Parser } from './Parser';

export class Rockplate<T = any> {
  public builder: Builder<T>;
  public parser: Parser;

  public constructor(template: string, schema: T, strict?: boolean) {
    this.builder = new Builder(template, schema, strict);
    this.parser = new Parser(this.builder);
  }

  // public build() {
  //   return this.builder.build();
  // }

  public parse(params: T) {
    return this.parser.parse(params);
  }

  public validateTemplate() {
    return this.builder.template === this.getTemplateFromBlocks(this.builder.blocks);
  }

  private getTemplateFromBlocks(blocks: Block[]) {
    let output = '';
    for (const block of blocks) {
      if (block.children.length) {
        output += block.expression;
        output += this.getTemplateFromBlocks(block.children);
        if (block instanceof IfBlock && block.elseChildren.length) {
          output += '[else]';
          output += this.getTemplateFromBlocks(block.elseChildren);
        }
        output += block.expressionEnd;
      } else {
        output += block.outerContent;
      }
    }
    return output;
  }
}
