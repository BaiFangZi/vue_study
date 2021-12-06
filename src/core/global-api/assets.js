/* @flow */

import { ASSET_TYPES } from "shared/constants";

import { isPlainObject, validateComponentName } from "../util/index";

export function initAssetRegisters(Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  //ASSET_TYPES=['component','directive','filter']
  ASSET_TYPES.forEach((type) => {
    Vue[type] = function (
      id: string, // 名称
      definition: Function | Object // 描述定义
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + "s"][id];
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== "production" && type === "component") {
          validateComponentName(id);
        }
        // 针对不同的api定义行为
        if (type === "component" && isPlainObject(definition)) {
          definition.name = definition.name || id;
        //生成该组件的构造函数
        //继承Vue对象 使用extend方法返回这个组件的构造函数，重新赋值给 definition
          definition = this.options._base.extend(definition);
        }
        if (type === "directive" && typeof definition === "function") {
          definition = { bind: definition, update: definition };
        }
        // 在全局中注册对应API中的配置
        this.options[type + "s"][id] = definition;
        return definition;
      }
    };
  });
}
