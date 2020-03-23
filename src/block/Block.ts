export type BlockType = 'repeat' | 'if' | 'literal' | 'comment';

export interface BlockParams {
  offsetBegin?: number;
  offsetEnd?: number;
  expression?: string;
  expressionEnd?: string;
  type?: BlockType;
  content?: string;
  outerContent?: string;
  children?: BlockParams[];
  key?: string;
  subkey?: string;
  operator?: string;
}

export class Block implements BlockParams {
  offsetBegin: number = 0;
  offsetEnd: number = 0;
  expression: string = '';
  expressionEnd: string = '';
  type: BlockType = 'literal';
  content: string = '';
  outerContent: string = '';
  children: Block[] = [];
  key: string = '';
  scope: any;
  thisIsClass = true;
}
