App({
  onLaunch() {
    // 检查登录状态和用户角色
    this.checkLoginStatus()
  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token')
    if (token) {
      try {
        const userInfo = await get('/users/me')
        // 根据用户角色设置不同的tabBar
        if (userInfo.role === 'admin') {
          wx.setTabBarItem({
            index: 0,
            text: '审批',
            iconPath: 'images/approval.png',
            selectedIconPath: 'images/approval_selected.png'
          })
        } else {
          wx.setTabBarItem({
            index: 0,
            text: '首页',
            iconPath: 'images/home.png',
            selectedIconPath: 'images/home_selected.png'
          })
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        wx.removeStorageSync('token')
      }
    }
  }
}) 