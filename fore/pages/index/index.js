import { get } from '../../utils/request'
import { getAvailableDevices, getAvailableVenues } from '../../utils/api'
import config from '../../config'
import api from '../../utils/api'

Page({
  data: {
    venues: [], // 动态场地列表
    devices: [], // 动态设备列表
    printers: config.printers, // 打印机保持不变
    isAdmin: false,
    user: null,
    loading: true
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadManagementData()
  },

  onShow() {
    this.checkLoginStatus()
    this.loadManagementData()
  },

  // 加载设备和场地数据
  async loadManagementData() {
    try {
      // 获取场地数据
      const venues = await getAvailableVenues()
      // 获取设备数据
      const devices = await getAvailableDevices()
      
      // 过滤掉场地中包含的设备（如大屏、麦克风等）
      const filteredDevices = devices.filter(device => {
        // 检查设备名称是否在场地设备选项中
        const isVenueDevice = config.deviceOptions.some(option => 
          option.name === device.name
        )
        return !isVenueDevice && device.status === '可用'
      })
      
      // 过滤可用的场地
      const availableVenues = venues.filter(venue => venue.status === '可用')
      
      this.setData({
        venues: availableVenues.map(venue => ({
          id: venue.id,
          name: venue.name,
          type: this.getVenueType(venue.name)
        })),
        devices: filteredDevices
      })
    } catch (error) {
      console.error('获取设备和场地数据失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    }
  },

  // 根据场地名称判断场地类型
  getVenueType(venueName) {
    if (venueName.includes('讲座')) return 'lecture'
    if (venueName.includes('研讨')) return 'seminar'
    if (venueName.includes('会议室')) return 'meeting_room'
    if (venueName.includes('东南大学')) return 'custom_venue'
    if (venueName.includes('工坊')) return 'innovation'
    return 'custom_venue'
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token')
      
      if (token) {
        try {
          // 获取用户信息
          const userInfo = await get('/users/me')
          
          // 保存用户信息
          wx.setStorageSync('userInfo', JSON.stringify(userInfo))
          
          this.setData({
            user: userInfo,
            isAdmin: userInfo.role === 'admin' || userInfo.role === 'teacher'
          })
        } catch (error) {
          console.error('获取用户信息失败:', error)
          this.setData({
            user: null,
            isAdmin: false
          })
        }
      } else {
        this.setData({
          user: null,
          isAdmin: false
        })
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      this.setData({
        user: null,
        isAdmin: false
      })
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const userInfo = await get('/users/me')
      return userInfo
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  },

  // 前往场地预约页面
  async goToVenue(e) {
    const { type, name } = e.currentTarget.dataset
    
    // 如果有name参数，说明是自定义场地
    if (name) {
      wx.navigateTo({
        url: `/pages/venue/venue?id=${name}&name=${name}&type=${type}`
      })
      return
    }
    
    // 标准场地类型直接使用中文类型名
    wx.navigateTo({
      url: `/pages/venue/venue?type=${type}`
    })
  },

  // 前往设备预约页面
  async goToDevice(e) {
    const { device } = e.currentTarget.dataset
    
    // 如果是预定义的设备ID（字符串），直接使用
    if (typeof device === 'string' && !device.startsWith('device')) {
      wx.navigateTo({
        url: `/pages/device/device?device=${device}`
      })
      return
    }
    
    // 否则作为动态设备ID处理
    wx.navigateTo({
      url: `/pages/device/device?device=${device}`
    })
  },

  // 前往3D打印机预约页面
  async goToPrinter() {
    // 前往打印机预约页面
    wx.navigateTo({
      url: '/pages/printer/printer'
    })
  },

  // 前往审批管理页面（仅管理员可用）
  goToApproval() {
    wx.navigateTo({
      url: '/pages/approval/approval'
    })
  },

  onVenueTypeClick: function(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/venue/venue?type=${id}`
    })
  },
  
  onDeviceTypeClick: function(e) {
    const { id } = e.currentTarget.dataset
    const type = id === 'tool' ? '工具' : id === 'instrument' ? '仪器' : id === 'development' ? '开发板' : ''
    
    wx.navigateTo({
      url: `/pages/device/device?category=${type}`
    })
  },
  
  onPullDownRefresh: function() {
    this.loadManagementData().then(() => {
      wx.stopPullDownRefresh()
    })
  },
  
  gotoPrinter: function() {
    wx.navigateTo({
      url: '/pages/printer/printer'
    })
  }
}) 