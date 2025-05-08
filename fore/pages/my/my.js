// pages/my/my.js
import { post, get } from '../../utils/request'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLoggedIn: false,
    userInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.checkLoginStatus()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    console.log('我的页面显示 - 强制刷新用户状态');
    // 强制刷新用户状态
    await this.checkLoginStatus()

    // 检查AI功能状态
    this.checkAIFeatureStatus()

    // 更新自定义TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      // 调用TabBar的checkAIFeatureStatus方法，确保每次切换页面时都会检测AI功能状态
      // 传入true表示强制刷新，无论AI功能是关闭还是打开状态
      this.getTabBar().checkAIFeatureStatus(true).then((showAI) => {
        // 如果AI功能禁用，我的页面是第1个选项（索引为1）
        // 如果AI功能启用，我的页面是第2个选项（索引为2）
        const selectedIndex = showAI ? 2 : 1;

        // 设置选中状态
        this.getTabBar().setData({
          selected: selectedIndex
        });
      }).catch(error => {
        console.error('TabBar状态更新失败:', error);
        // 即使出错也设置选中状态，使用全局状态
        const app = getApp();
        const showAI = app.globalData.aiFeatureEnabled;
        const selectedIndex = showAI ? 2 : 1;

        this.getTabBar().setData({
          selected: selectedIndex
        });
      });
    }

    // 检查当前用户角色是否有变化
    const app = getApp();
    if (app.globalData.userInfo && this.data.userInfo) {
      if (app.globalData.userInfo.role !== this.data.userInfo.role) {
        console.log('用户角色已变更，更新UI:', app.globalData.userInfo.role);
        this.setData({ userInfo: app.globalData.userInfo });
      }
    }
  },

  // 检查AI功能状态
  checkAIFeatureStatus() {
    const app = getApp()
    app.checkAIFeatureStatus()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const app = getApp()

    if (token) {
      try {
        // 强制从服务器获取最新的用户信息
        const userInfo = await app.checkLoginStatus(true)

        if (userInfo) {
          this.setData({
            isLoggedIn: true,
            userInfo: userInfo
          })
          console.log('我的页面更新用户状态:', userInfo.role)
        } else {
          this.handleLogout()
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        this.handleLogout()
      }
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null
      })
    }
  },

  async getUserInfo() {
    try {
      const userInfo = await get('/users/me')
      this.setData({ userInfo })
    } catch (error) {
      console.error('获取用户信息失败:', error)
      this.handleLogout()
    }
  },

  async handleLogin(e) {
    const { username, password } = e.detail.value

    if (!username || !password) {
      wx.showToast({
        title: '请输入账号和密码',
        icon: 'none'
      })
      return
    }

    try {
      const formData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&grant_type=password`

      const response = await post('/token', formData, {
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      // 先保存token
      wx.setStorageSync('token', response.access_token)

      // 获取用户信息
      const userInfo = await get('/users/me')
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      })

      // 获取app实例
      const app = getApp();
      // 更新全局用户信息
      app.globalData.userInfo = userInfo;

      // 刷新所有页面的用户权限状态
      await app.refreshUserPermissions();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 返回首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '账号或密码错误',
        icon: 'none'
      })
    }
  },

  async handleLogout() {
    wx.removeStorageSync('token')
    this.setData({
      isLoggedIn: false,
      userInfo: null
    })

    // 获取app实例
    const app = getApp();
    // 清除全局用户信息
    app.globalData.userInfo = null;

    // 刷新所有页面的用户权限状态
    await app.refreshUserPermissions();

    console.log('用户已登出，所有页面状态已刷新');
  },

  goToRecords() {
    wx.navigateTo({
      url: '/pages/records/records'
    })
  },

  goToAdmin() {
    // 检查是否为管理员或教师
    if (!this.data.userInfo || (this.data.userInfo.role !== 'admin' && this.data.userInfo.role !== 'teacher')) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/admin/admin'
    })
  },

  // 跳转到审批管理页面
  goToApproval() {
    // 检查是否为管理员或教师
    if (!this.data.userInfo || (this.data.userInfo.role !== 'admin' && this.data.userInfo.role !== 'teacher')) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/approval/approval'
    })
  }
})