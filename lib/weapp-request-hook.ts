// RequestHook 参数类型
interface RequestHookParamsType {
  // 请求数据分页
  page: number
  // 请求锁
  lock: boolean
  // 追加的请求
  extraLock: boolean

  [key: string]: any
}

// 加载交互类型
interface RequestHookLoadingType {
  // 1 wx.showLoading
  // 2 showNavigationBarLoading
  // 3 startPullDownRefresh
  type?: 1 | 2 | 3
  // type 为 1 时生效
  title?: string
  mask?: boolean
  // 接口调用成功的回调函数
  success?: Function
  // 接口调用失败的回调函数
  fail?: Function
  // 接口调用结束的回调函数（调用成功、失败都会执行）
  complete?: Function
}

// 请求成功类型
interface RequestHookToastType {
  // 是否显示消息提示框
  show?: boolean
  // 图标
  icon?: 'success' | 'none' | 'error'
  // 自定义图标的本地路径，image 的优先级高于 icon
  image?: string
  // 提示的内容
  title?: string
  // 提示的延迟时间
  duration?: number
  // 是否显示透明蒙层，防止触摸穿透
  mask?: boolean
  // 接口调用成功的回调函数
  success?: Function
  // 接口调用失败的回调函数
  fail?: Function
  // 接口调用结束的回调函数（调用成功、失败都会执行）
  complete?: Function
}

// 用于生成唯一 id
const seeds: number[] = []
let seed = 0

/**
 * RequestHook，微信小程序发起网络请求时的辅助函数
 */
class RequestHook {
  // 传入的钩子的初始名称
  protected rawName: string
  // 处理后的钩子名称
  protected name: string
  // 存储与视图交互的相关属性
  protected baseParams: RequestHookParamsType
  // 加载交互类型
  protected loadingType: number
  protected container: {
    [key: string]: RequestHookParamsType
  }

  constructor(name: string) {
    this.rawName = name
    this.name = ''
    this.baseParams = {
      page: 1,
      lock: false,
      extraLock: false
    }
    this.loadingType = 1
    this.container = {}

    this.init(name)
  }

  protected init(name: string) {
    seed++

    if (seeds.includes(seed)) {
      this.init(name)
    } else {
      seeds.push(seed)

      this.name = `${name}_${seed}`
      this.container = {
        [this.name]: new Proxy(this.baseParams, {
          get(target, key: string) {
            return target[key]
          },
          set(target, key, value) {
            if (key === 'page' && typeof value !== 'number') {
              throw Error('page 字段必须为 Number 类型！')
            }

            if (key === 'lock' && typeof value !== 'boolean') {
              throw Error(`lock 字段必须为 Boolean 类型！`)
            }

            return Reflect.set(target, key, value)
          }
        })
      }
    }
  }

  protected wxApiCallback(success?: Function, fail?: Function, complete?: Function) {
    const callbackObj: any = {}

    if (success && this.isFunc(success)) {
      Object.assign(callbackObj, {
        success
      })
    }
    if (fail && this.isFunc(fail)) {
      Object.assign(callbackObj, {
        fail
      })
    }
    if (complete && this.isFunc(complete)) {
      Object.assign(callbackObj, {
        complete
      })
    }

    return callbackObj
  }

  protected isFunc(value: unknown): boolean {
    return typeof value === 'function'
  }

  /**
   * 获取当前分页，用于 onReachBottom 等触底事件中
   */
  get page() {
    return this.container[this.name].page
  }

  /**
   * 追加请求锁
   *
   * @param flag 判断是否进行加锁的条件
   */
  addLock(flag: boolean) {
    this.container[this.name].extraLock = !!flag
  }

  /**
   * 打开请求锁，防止回调函数在执行完成前被重复调用
   *
   * @param func 回调函数
   * @param page 当前请求的分页数
   *
   */
  lock(func: (lock: boolean) => any, page?: number) {
    if (this.container[this.name].lock || this.container[this.name].extraLock) return

    this.container[this.name].lock = true

    this.container[this.name].page = page && +page && +page > 0 ? parseInt(`${+page}`) : 1

    func && this.isFunc(func) && func(this.container[this.name].lock)
  }

  /**
   * 解除请求锁
   *
   * @param func 解除请求锁后的回调函数
   *
   */
  unlock(func?: (flag: boolean) => any) {
    this.container[this.name].lock = this.container[this.name].extraLock = false

    func && this.isFunc(func) && func(this.container[this.name].lock)
  }

  /**
   * 打开加载交互
   *
   * @param config 加载交互配置项
   *
   * config.type 加载类型  1 => wx.showLoading 2 => wx.showNavigationBarLoading 3 => wx.startPullDownRefresh
   *
   * config.title type 为 1 时生效，提示的内容
   *
   * config.mask type 为 1 时生效，是否显示透明蒙层，防止触摸穿透
   *
   * config.success 加载交互接口调用成功的回调函数
   *
   * config.fail 加载交互接口调用失败的回调函数
   *
   * config.complete 加载交互调用结束的回调函数（调用成功、失败都会执行）
   *
   */
  loading(config?: RequestHookLoadingType) {
    const type: 1 | 2 | 3 = config?.type ?? 1
    const title: string = config && Reflect.has(config, 'title') ? (config?.title ?? '') : '加载中'
    const mask: boolean = config && Reflect.has(config, 'mask') ? (config?.mask ?? false) : true
    const wxApiCallbackObj = this.wxApiCallback(config?.success, config?.fail, config?.complete)

    this.loadingType = type

    if (type === 2) {
      wx.showNavigationBarLoading(wxApiCallbackObj)
    } else if (type === 3) {
      wx.startPullDownRefresh(wxApiCallbackObj)
    } else {
      wx.showLoading({
        title,
        mask,
        ...wxApiCallbackObj
      })
    }
  }

  /**
   * 关闭加载交互
   *
   * @param config 加载交互配置项
   *
   * config.noConflict 目前 toast 和 loading 相关接口可以相互混用，此参数可用于取消混用特性
   *
   * config.success 加载交互接口调用成功的回调函数
   *
   * config.fail 加载交互接口调用失败的回调函数
   *
   * config.complete 加载交互接口调用结束的回调函数（调用成功、失败都会执行）
   *
   */
  unloading(config?: {
    noConflict?: boolean
    success?: Function
    fail?: Function
    complete?: Function
  }) {
    const type = this.loadingType
    const wxApiCallbackObj = this.wxApiCallback(config?.success, config?.fail, config?.complete)

    if (type === 2) {
      wx.hideNavigationBarLoading(wxApiCallbackObj)
    } else if (type === 3) {
      wx.stopPullDownRefresh(wxApiCallbackObj)
    } else {
      wx.hideLoading({
        noConflict: config?.noConflict ?? false,
        ...wxApiCallbackObj
      })
    }
  }

  protected openToast(config?: RequestHookToastType, fail = false) {
    this.unloading()

    const show: boolean = config && Reflect.has(config, 'show') ? (config?.show ?? false) : true
    const icon = config?.icon ?? (!fail ? 'success' : 'error')
    const image: string = config?.image ?? ''
    const title: string = config && Reflect.has(config, 'title') ? (config?.title ?? '') : (!fail ? '提交成功' : '提交失败')
    const duration: number = config && Reflect.has(config, 'duration') ? (config?.duration ?? 0) : 1500
    const mask: boolean = config && Reflect.has(config, 'mask') ? (config?.mask ?? false) : true
    const wxApiCallbackObj = this.wxApiCallback(config?.success, config?.fail, config?.complete)

    if (show) {
      wx.showToast({
        icon,
        image,
        title,
        duration,
        mask,
        ...wxApiCallbackObj
      })
    }

    return {
      show,
      duration
    }
  }

  /**
   * 请求成功后执行的事件
   *
   * @param func 请求成功后的回调函数，如配置了 Toast，将在 Toast 消失后执行
   * @param config 与 wx.showToast 一致的配置项
   *
   */
  success(func?: () => any, config?: RequestHookToastType) {
    const { show, duration } = this.openToast(config)

    setTimeout(() => {
      func && this.isFunc(func) && func()

      this.unlock()
    }, show && duration ? duration : 0)
  }

  /**
   * 请求失败后执行的事件
   *
   * @param func 请求失败后的回调函数，如配置了 Toast，将在 Toast 消失后执行
   * @param config 与 wx.showToast 一致的配置项
   *
   */
  fail(func?: () => any, config?: RequestHookToastType) {
    const { show, duration } = this.openToast(config, true)

    setTimeout(() => {
      func && this.isFunc(func) && func()

      this.unlock()
    }, show && duration ? duration : 0)
  }
}

/**
 * 初始化 Request Hook
 *
 * @param name 钩子名称
 */
function init(name: string, ...args: string[]) {
  if (!name) {
    throw Error(`初始化失败，未传入 name 参数！`)
  }

  const names: string[] = [name.toString().trim()]
  const results: RequestHook[] = []

  args.forEach(arg => {
    names.push(arg.toString().trim())
  })

  names.forEach(name => {
    results.push(new RequestHook(name))
  })

  return results
}

const hook = {
  init,
  RequestHook
}

export default hook