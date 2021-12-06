/* @flow */

import { toArray } from "../util/index";

export function initUse(Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = []);
    // 判断插件集合中是否已经存在该插件，防止重复注册
    if (installedPlugins.indexOf(plugin) > -1) {
      return this;
    }

    //获取额外的参数
    const args = toArray(arguments, 1);
    // 在参数数组的开头追加Vue实例
    args.unshift(this);
    // 如果plugin是对象的形式，并且设置了一会用于注册的install方法
    if (typeof plugin.install === "function") {
      plugin.install.apply(plugin, args);
    } 
    // 如果plugin直接就是一个函数，那么这个函数就相当于install方法
    else if (typeof plugin === "function") {
      plugin.apply(null, args);
    }
    // 注册成功之后保存插件
    installedPlugins.push(plugin);
    return this;
  };
}
