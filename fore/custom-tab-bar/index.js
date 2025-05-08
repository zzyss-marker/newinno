// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#1AAD19",
    list: [],
    showAI: false
  },

  lifetimes: {
    attached: function() {
      this.initTabBar();
    }
  },

  pageLifetimes: {
    show: function() {
      // 每次显示页面时，强制重新检测AI功能状态
      // 无论AI功能是关闭还是打开状态，都重新获取
      this.checkAIFeatureStatus(true); // 传入true表示强制刷新
    }
  },

  methods: {
    // 检查AI功能状态并更新TabBar
    // forceRefresh: 是否强制从服务器刷新AI功能状态
    checkAIFeatureStatus: async function(forceRefresh = false) {
      const app = getApp();

      try {
        // 调用app中的方法重新检查AI功能状态，传入forceRefresh参数
        await app.checkAIFeatureStatus(forceRefresh);

        // 获取最新的AI功能状态
        const showAI = app.globalData.aiFeatureEnabled;
        console.log('TabBar检测到AI功能状态:', showAI ? '开启' : '关闭');

        // 确保TabBar列表与AI功能状态一致
        this.refreshTabBar(showAI);

        // 获取当前页面路径，设置选中状态
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        const route = currentPage.route;

        const tabList = this.data.list;
        const index = tabList.findIndex(item => item.pagePath === route || '/' + item.pagePath === route);

        if (index !== -1) {
          this.setData({
            selected: index
          });
        }

        return showAI; // 返回AI功能状态
      } catch (error) {
        console.error('检查AI功能状态失败:', error);
        return app.globalData.aiFeatureEnabled; // 出错时返回当前全局状态
      }
    },

    initTabBar: function() {
      const app = getApp();
      const showAI = app.globalData.aiFeatureEnabled;

      // 根据AI功能状态选择不同的TabBar列表
      let list = showAI ? app.globalData.tabBarList : app.globalData.tabBarListWithoutAI;

      // 修正图片路径，确保使用绝对路径
      list = list.map(item => {
        return {
          ...item,
          iconPath: `/${item.iconPath}`,
          selectedIconPath: `/${item.selectedIconPath}`
        };
      });

      this.setData({
        list: list,
        showAI: showAI
      });

      // 注册TabBar刷新回调
      app.registerTabBarRefreshCallback(this.refreshTabBar.bind(this));
    },

    refreshTabBar: function(showAI) {
      const app = getApp();
      let list = showAI ? app.globalData.tabBarList : app.globalData.tabBarListWithoutAI;

      // 修正图片路径，确保使用绝对路径
      list = list.map(item => {
        return {
          ...item,
          iconPath: `/${item.iconPath}`,
          selectedIconPath: `/${item.selectedIconPath}`
        };
      });

      this.setData({
        list: list,
        showAI: showAI
      });
    },

    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;

      wx.switchTab({
        url: '/' + url
      });

      this.setData({
        selected: data.index
      });
    }
  }
})
