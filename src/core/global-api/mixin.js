/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 合并实例的options 与要混入mixin对象的options
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
