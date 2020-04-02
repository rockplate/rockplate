import { Block } from './block/index';

export class Utils {

  public static getParamsMerged(params: any, childParams: any) {
    const mergedParams: any = {};
    for (const k in params) {
      if (params.hasOwnProperty(k)) {
        mergedParams[k] = params[k];
      }
    }
    for (const k in childParams) {
      if (childParams.hasOwnProperty(k)) {
        mergedParams[k] = childParams[k];
      }
    }
    return mergedParams;
  }

  public static getParamsMergedForBlock(block: Block, params: any, childParams?: any) {
    if (!params) {
      return params;
    }
    if (!childParams && !(block.key && params[block.key] && params[block.key][0])) {
      return params;
    }

    if (!childParams) {
      childParams = params[block.key][0];
    }

    return Utils.getParamsMerged(params, childParams);
  }

  public static getLines(text: string) {
    return text
      .split('\r\n')
      .join('\r')
      .split('\n')
      .join('\r')
      .split('\r');
  }

  public static getPositionAt(template: string, offset: number) {
    const lines = Utils.getLines(template.substr(0, offset + 1));
    const line = lines.length;
    const column = lines[lines.length - 1].length - 1;
    return { line, column };
  }

}
