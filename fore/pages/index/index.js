import { get } from '../../utils/request'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    isAdmin: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token')
    if (token) {
      try {
        const userInfo = await get('/users/me')
        this.setData({ 
          isLoggedIn: true,
          userInfo: userInfo,
          isAdmin: userInfo.role === 'admin'
        })
      } catch (error) {
        console.error('获取用户信息失败:', error)
        this.setData({ 
          isLoggedIn: false,
          userInfo: null,
          isAdmin: false
        })
      }
    } else {
      this.setData({ 
        isLoggedIn: false,
        userInfo: null,
        isAdmin: false
      })
    }
  },

  async getUserInfo() {
    try {
      const userInfo = await get('/users/me')
      this.setData({ userInfo })
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  async goToVenue(e) {
    const { type } = e.currentTarget.dataset
    const token = wx.getStorageSync('token')
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/my/my'
        })
      }, 1500)
      return
    }
    
    wx.navigateTo({
      url: `/pages/venue/venue?type=${type}`
    })
  },

  async goToDevice(e) {
    const { device } = e.currentTarget.dataset
    const token = wx.getStorageSync('token')
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/my/my'
        })
      }, 1500)
      return
    }
    
    wx.navigateTo({
      url: `/pages/device/device?device=${device}`
    })
  },

  async goToPrinter() {
    const token = wx.getStorageSync('token')
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/my/my'
        })
      }, 1500)
      return
    }
    
    wx.navigateTo({
      url: '/pages/printer/printer'
    })
  },

  goToApproval() {
    if (!this.data.isAdmin) {
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