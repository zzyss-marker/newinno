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
  onLoad(options) {
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
  onShow() {
    this.checkLoginStatus()
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
    if (token) {
      try {
        const userInfo = await get('/users/me')
        this.setData({ 
          isLoggedIn: true,
          userInfo: userInfo
        })
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

  handleLogout() {
    wx.removeStorageSync('token')
    this.setData({
      isLoggedIn: false,
      userInfo: null
    })
  },

  goToRecords() {
    wx.navigateTo({
      url: '/pages/records/records'
    })
  },

  goToAdmin() {
    if (this.data.userInfo.role !== 'admin') {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/admin/admin'
    })
  }
})