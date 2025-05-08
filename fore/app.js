// 导入请求工具
import { get } from './utils/request'

App({
  globalData: {
    aiFeatureEnabled: false, // 默认禁用AI功能
    userInfo: null, // 用户信息
    useCustomTabBar: true, // 默认使用自定义TabBar（不包含AI选项）
    tabBarList: [
      {
        pagePath: "pages/index/index",
        text: "首页",
        iconPath: "images/home.png",
        selectedIconPath: "images/home_selected.png"
      },
      {
        pagePath: "pages/ai_chat/ai_chat",
        text: "AI助手",
        iconPath: "images/ai.png",
        selectedIconPath: "images/ai_selected.png"
      },
      {
        pagePath: "pages/my/my",
        text: "我的",
        iconPath: "images/user.png",
        selectedIconPath: "images/user_selected.png"
      }
    ],
    // 不包含AI选项的TabBar列表
    tabBarListWithoutAI: [
      {
        pagePath: "pages/index/index",
        text: "首页",
        iconPath: "images/home.png",
        selectedIconPath: "images/home_selected.png"
      },
      {
        pagePath: "pages/my/my",
        text: "我的",
        iconPath: "images/user.png",
        selectedIconPath: "images/user_selected.png"
      }
    ]
  },

  onLaunch() {
    console.log('App onLaunch');
    // 检查登录状态和用户角色
    this.checkLoginStatus()
    // 检查AI功能状态
    this.checkAIFeatureStatus()

    // 初始化TabBar刷新回调
    this.tabBarRefreshCallback = null;
  },

  // 当小程序从后台切换到前台时触发
  onShow() {
    console.log('App onShow - 刷新用户状态');
    // 强制刷新用户状态，确保权限变更能够及时反映
    this.checkLoginStatus(true);
  },

  async checkLoginStatus(forceRefresh = false) {
    const token = wx.getStorageSync('token')
    if (token) {
      try {
        // 如果强制刷新或者没有用户信息，则从服务器获取
        if (forceRefresh || !this.globalData.userInfo) {
          const userInfo = await get('/users/me')
          // 保存用户信息到全局数据
          this.globalData.userInfo = userInfo;
          console.log('用户信息已更新:', userInfo);
        }
        return this.globalData.userInfo;
      } catch (error) {
        console.error('获取用户信息失败:', error)
        wx.removeStorageSync('token')
        this.globalData.userInfo = null;
        return null;
      }
    } else {
      this.globalData.userInfo = null;
      return null;
    }
  },

  // forceRefresh: 是否强制从服务器刷新AI功能状态
  async checkAIFeatureStatus(forceRefresh = false) {
    // 如果不是强制刷新，并且已经有缓存的状态，则直接返回缓存的状态
    if (!forceRefresh && typeof this.globalData.aiFeatureEnabled !== 'undefined') {
      return this.globalData.aiFeatureEnabled;
    }

    try {
      // 获取AI功能状态
      const result = await get('/settings/ai-feature')

      // 确保result是一个有效的对象并且包含enabled属性
      if (result && typeof result === 'object' && 'enabled' in result) {


        // 更新全局状态
        this.globalData.aiFeatureEnabled = result.enabled

        // 根据AI功能状态控制tabBar
        this.updateTabBarForAIFeature(result.enabled)

        // 返回AI功能状态，方便外部调用
        return result.enabled;
      } else {
        // 默认禁用AI功能
        this.globalData.aiFeatureEnabled = false
        this.updateTabBarForAIFeature(false)
        return false;
      }
    } catch (error) {
      // 默认禁用AI功能
      this.globalData.aiFeatureEnabled = false
      this.updateTabBarForAIFeature(false)
      return false;
    }
  },

  updateTabBarForAIFeature(enabled) {
    // 更新全局状态
    this.globalData.aiFeatureEnabled = enabled;

    // 使用自定义TabBar来处理AI功能的显示/隐藏
    if (enabled) {
      // 如果AI功能启用，使用默认TabBar
      this.globalData.useCustomTabBar = false;
    } else {
      // 如果AI功能禁用，使用自定义TabBar（不包含AI选项）
      this.globalData.useCustomTabBar = true;
    }

    // 通知页面刷新TabBar
    if (this.tabBarRefreshCallback) {
      this.tabBarRefreshCallback(enabled);
    }
  },

  // 注册TabBar刷新回调
  registerTabBarRefreshCallback(callback) {
    this.tabBarRefreshCallback = callback;
  },

  // 刷新用户权限状态并通知所有页面
  async refreshUserPermissions() {
    console.log('刷新用户权限状态');
    // 强制从服务器获取最新的用户信息
    await this.checkLoginStatus(true);

    // 获取当前所有页面
    const pages = getCurrentPages();

    // 遍历所有页面，如果页面有checkLoginStatus方法，则调用
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (page && typeof page.checkLoginStatus === 'function') {
        console.log(`刷新页面 ${page.route} 的用户状态`);
        page.checkLoginStatus();
      }
    }

    return this.globalData.userInfo;
  }
})