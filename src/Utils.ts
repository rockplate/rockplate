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
    // const mergedParams: any = {};
    // for (const k in params) {
    //   if (params.hasOwnProperty(k)) {
    //     mergedParams[k] = params[k];
    //   }
    // }
    if (!childParams) {
      childParams = params[block.key][0];
    }
    // for (const k in childParams) {
    //   if (childParams.hasOwnProperty(k)) {
    //     mergedParams[k] = childParams[k];
    //   }
    // }
    // return mergedParams;
    return Utils.getParamsMerged(params, childParams);
  }
}
