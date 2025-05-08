// components/ai-tab-bar/ai-tab-bar.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示AI功能
    showAI: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 组件内部数据
  },

  /**
   * 组件的生命周期
   */
  lifetimes: {
    attached: function() {
      // 在组件实例进入页面节点树时执行
      this.checkAIFeatureStatus();
    },
    detached: function() {
      // 在组件实例被从页面节点树移除时执行
    }
  },

  /**
   * 组件所在页面的生命周期
   */
  pageLifetimes: {
    show: function() {
      // 页面被展示时执行
      this.checkAIFeatureStatus();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 检查AI功能状态
    checkAIFeatureStatus: function() {
      const app = getApp();
      const enabled = app.globalData.aiFeatureEnabled;
      
      // 更新组件属性
      this.setData({
        showAI: enabled
      });
      
      console.log('AI Tab Bar 组件: AI功能状态为', enabled ? '启用' : '禁用');
    }
  }
})
