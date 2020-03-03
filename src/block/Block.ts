export type BlockType = 'repeat' | 'if' | 'literal' | 'comment';

export interface BlockParams {
  outerBeginIndex?: number;
  innerBeginIndex?: number;
  innerEndIndex?: number;
  outerEndIndex?: number;
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

// export interface IBlock extends BlockParams {
//   outerBeginIndex: number;
//   innerBeginIndex: number;
//   innerEndIndex: number;
//   outerEndIndex: number;
//   expression: string;
//   expressionEnd: string;
//   type: BlockType;
//   content: string;
//   outerContent: string;
//   children: IBlock[];
//   key: string;
//   keyFormatted: string;
//   subkey?: string;
//   subkeyFormatted?: string;
//   operator?: string;
// }

export class Block implements BlockParams {
  outerBeginIndex: number = 0;
  innerBeginIndex: number = 0;
  innerEndIndex: number = 0;
  outerEndIndex: number = 0;
  expression: string = '';
  expressionEnd: string = '';
  type: BlockType = 'literal';
  content: string = '';
  outerContent: string = '';
  children: Block[] = [];
  key: string = '';
  // subkey?: string;
  // operator?: string;
  thisIsClass = true;
}
