/* @flow */

import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

type CacheEntry = {
  name: ?string;
  tag: ?string;
  componentInstance: Component;
};

type CacheEntryMap = { [key: string]: ?CacheEntry };

//  获取name 组件名，组件设置name就用name ，否则使用标签名
function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

//  是否匹配name
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const entry: ?CacheEntry = cache[key]
    if (entry) {
      const name: ?string = entry.name
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

//  清理缓存，移除key并销毁组件
function pruneCacheEntry (
  cache: CacheEntryMap,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const entry: ?CacheEntry = cache[key] // 获取缓存项
  // 前提是存在该缓存项
  // 不传current值表示要销毁keep-alive组件，相应的也会销毁已缓存的项
  // 传current值表示已经超过max最大缓存数，此时需要删除最旧的缓存，其中会有一个隐患就是最旧的缓存跟当前要存入的缓存是同一个，所以根据标签判断二者是否为同一个组件
  if (entry && (!current || entry.tag !== current.tag)) {
    entry.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}

const patternTypes: Array<Function> = [String, RegExp, Array]

export default {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes, // 缓存的组件
    exclude: patternTypes, // 不缓存的组件
    max: [String, Number] // 最大缓存组件的个数
  },

  methods: {
    //  更新缓存
    cacheVNode() {
      const { cache, keys, vnodeToCache, keyToCache } = this
      //  如果存在还未缓存的组件
      if (vnodeToCache) {
        const { tag, componentInstance, componentOptions } = vnodeToCache
        // 推入到缓存数组中并且保存缓存组件的key
        cache[keyToCache] = {
          name: getComponentName(componentOptions),
          tag,
          componentInstance,
        }
        
        keys.push(keyToCache)
        // prune oldest entry
        //  如果设置了最大缓存数，则移除最老（缓存时间最长）的组件
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
        this.vnodeToCache = null // 重置要缓存的组件变量
      }
    }
  },

  created () {
    this.cache = Object.create(null) // 缓存项
    this.keys = [] // 缓存的key，与缓存项对应，方便遍历查找
  },

//  销毁keep-alive  组件时，遍历缓存然后清理
  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    this.cacheVNode() 
    //  为include 和exclude设置监听器
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  updated () {
    // keep-alive更新时重新收集缓存
    this.cacheVNode()
  },

  render () {
    const slot = this.$slots.default
    const vnode: VNode = getFirstComponentChild(slot)
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      const name: ?string = getComponentName(componentOptions)
      const { include, exclude } = this
      //  没有匹配到name ，也就是该组件不被缓存，直接返回vnode
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }
      //  组件需要被缓存
      const { cache, keys } = this
      // 获取key,使用vnode.key或者  根据组件的cid和标签tag生成key，
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
        //  在cache中查找key，判断是否已经缓存过该组件
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
        //  先移除再添加，保持最新位置
        remove(keys, key)
        keys.push(key)
      } else {
        //  没有缓存过该组件则，定义两个变量保存，等到更新推入到缓存的队列中
        // delay setting the cache until update
        this.vnodeToCache = vnode
        this.keyToCache = key
      }
      // 设置缓存标志
      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}
