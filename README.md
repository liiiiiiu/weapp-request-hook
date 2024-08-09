# Weapp Request Hook

🌞 微信小程序发起网络请求时的辅助函数

> 更多微信小程序开发工具，查看 [微信小程序开发全家桶](https://www.liiiiiiu.com/dev/weapp-dev-bucket)

## 安装

```bash
npm i weapp-request-hook
```

> 注意：在小程序中使用npm包前，需先[构建 npm](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)

## 使用

Request Hook 提供以下函数

### lock

添加、解除、追加请求锁 `lock` `unlock` `addLock`

```javascript
import requestHook from 'weapp-request-hook'

const [testHook] = requestHook.init('test')

Page({
  data: {
    flag: false
  },

  foo() {
    // 在锁定期间，foo 函数将无法再次执行
    testHook.lock(() => {
      setTimeout(() => {
        testHook.unlock() // 2秒后解除内置锁
      }, 2000)
    })
  }

  bar() {
    testHook.addLock(this.data.flag) // 添加自定义锁，当满足锁条件时，lock 的回调函数将不会执行
    testHook.lock(() => {
      setTimeout(() => {
        testHook.unlock() // 2秒后解除内置锁以及自定义锁
      }, 2000)
    })
  }
})
```

### loading

打开、关闭加载交互 `loading` `unloading`

```javascript
import requestHook from 'weapp-request-hook'

const [testHook] = requestHook.init('test')

Page({
  data: {
  },

  foo() {
    testHook.lock(() => {
      testHook.loading()

      setTimeout(() => {
        testHook.unloading()
        testHook.unlock()
      }, 2000)
    })
  }

  bar() {
    testHook.lock(() => {
      // 完整配置
      testHook.loading({
        type: 2 // 加载类型  1 => wx.showLoading 2 => wx.showNavigationBarLoading 3 => wx.startPullDownRefresh
        title: '', // type 为 1 时生效，提示的内容
        mask: true, // type 为 1 时生效，是否显示透明蒙层，防止触摸穿透
        success: () => {}, // 加载交互接口调用成功的回调函数
        fail: () => {}, // 加载交互接口调用失败的回调函数
        complete: () => {} // 加载交互接口调用结束的回调函数（调用成功、失败都会执行）
      })

      setTimeout(() => {
        testHook.unloading({
          noConflict: false, // 目前 toast 和 loading 相关接口可以相互混用，此参数可用于取消混用特性
          success: () => {}, // 加载交互接口调用成功的回调函数
          fail: () => {}, // 加载交互接口调用失败的回调函数
          complete: () => {} // 加载交互接口调用结束的回调函数（调用成功、失败都会执行）
        })
        testHook.unlock()
      }, 2000)
    })
  }
})
```

### success

请求成功事件 `success`

```javascript
import requestHook from 'weapp-request-hook'

const [testHook] = requestHook.init('test')

Page({
  data: {
  },

  foo() {
    testHook.lock(() => {
      testHook.loading()

      setTimeout(() => {
        // 调用 success 函数后，无需调用 unloading 以及 unlock
        testHook.success(() => {
          // 请求成功后的回调
        })
      }, 2000)
    })
  }
})
```

### fail

请求失败事件 `fail`

```javascript
import requestHook from 'weapp-request-hook'

const [testHook] = requestHook.init('test')

Page({
  data: {
  },

  foo() {
    testHook.lock(() => {
      testHook.loading()

      setTimeout(() => {
        // 调用 fail 函数后，无需调用 unloading 以及 unlock
        testHook.fail(() => {
          // 请求失败后的回调
        }, {
          // 可传入 Toast 配置，与 wx.showToast 一致的配置项
        })
      }, 2000)
    })
  }
})
```

### page

用于分页请求，可自动管理分页数

```javascript
import requestHook from 'weapp-request-hook'

const [testHook] = requestHook.init('test')

Page({
  data: {
  },

  foo() {
    testHook.lock(async () => {
      testHook.loading()

      await api({
        page: testHook.page // 1
      })

      testHook.unloading()
      testHook.unlock()
    }, 1) // 可在 lock 函数中设置 page 值，默认为 1
  },

  onReachBottom() {
    testHook.lock(async() => {
      testHook.loading()

      await api({
        page: testHook.page // 2
      })

      testHook.unloading()
      testHook.unlock()
    }, testHook.page + 1)
  },
})
```

### 最佳实践

```javascript
// index.ts
import requestHook from 'weapp-request-hook'

// 首页需要请求两个接口的数据（热门商品、普通商品）
const [hotGoodsHook, goodsHook] = requestHook.init('hotGoods', 'goods')

Page({
  data: {
    hotGoods: [] as any[]

    goods: [] as any[],
    last: false
  },

  onLoad() {
    this.fetchHotGoodsData()

    this.fetchGoodsData()
  },

  // 页面上拉触底事件的处理函数
  onReachBottom() {
    goodsHook.addLock(this.data.last) // 追加锁，如果已无更多数据，则无需请求接口
    goodsHook.lock(async() => {
      goodsHook.loading()

      // 分页请求更多的商品数据
      await api({
        page: goodsHook.page
      })

      goodsHook.unloading()
      goodsHook.unlock()
    }, goodsHook.page + 1) // 传入分页数
  },

  fetchHotGoodsData() {
    hotGoodsHook.lock(async() => {
      hotGoodsHook.loading()

      // 发起 GET 请求
      await ...

      hotGoodsHook.unloading()
      hotGoodsHook.unlock()
    })
  },

  fetchGoodsData() {
    goodsHook.lock(async() => {
      goodsHook.loading({
        type: 2 // 使用 showNavigationBarLoading
      })

      // 发起 GET 请求
      await ...

      goodsHook.unloading()
      goodsHook.unlock()
    })
  }

  submitForm() {
    const [formHook] = requestHook.init('form')

    formHook.lock(async() => {
      formHook.loading()

      // 发起 POST 请求
      const res = await ...

      if (res) {
        formHook.success(() => {
          console.log('提交成功')
        })
      } else {
        formHook.fail(() => {
          console.log('提交失败')
        })
      }
    })
  }
})
```
