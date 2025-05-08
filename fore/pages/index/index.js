import { get } from '../../utils/request'
import { getAvailableDevices, getAvailableVenues } from '../../utils/api'
import config from '../../config'

Page({
  data: {
    venues: [], // 动态场地列表
    devices: [], // 动态设备列表
    printers: config.printers, // 打印机保持不变
    isAdmin: false,
    user: null,
    loading: true,
    searchText: '', // 搜索文本
    filteredVenues: [], // 过滤后的场地列表
    filteredDevices: [], // 过滤后的设备列表
    isDeviceSectionExpanded: false, // 设备区域是否展开，默认收起
    isVenueSectionExpanded: true, // 场地区域是否展开，默认展开
    showSearchResults: false // 是否显示搜索结果
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadManagementData()
  },

  async onShow() {
    console.log('首页显示 - 强制刷新用户状态');
    // 强制刷新用户状态，确保管理员权限及时更新
    await this.checkLoginStatus()

    // 加载管理数据
    this.loadManagementData()

    // 检查AI功能状态
    this.checkAIFeatureStatus()

    // 更新自定义TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      // 调用TabBar的checkAIFeatureStatus方法，确保每次切换页面时都会检测AI功能状态
      // 传入true表示强制刷新，无论AI功能是关闭还是打开状态
      this.getTabBar().checkAIFeatureStatus(true).then(() => {
        // 设置选中状态
        this.getTabBar().setData({
          selected: 0
        })
      }).catch(error => {
        console.error('TabBar状态更新失败:', error);
        // 即使出错也设置选中状态
        this.getTabBar().setData({
          selected: 0
        })
      });
    }

    // 检查当前用户是否为管理员，并更新UI状态
    const app = getApp();
    if (app.globalData.userInfo) {
      const isAdmin = app.globalData.userInfo.role === 'admin';
      if (this.data.isAdmin !== isAdmin) {
        console.log('用户管理员状态已变更，更新UI:', isAdmin ? '是管理员' : '不是管理员');
        this.setData({ isAdmin: isAdmin });
      }
    }
  },

  // 检查AI功能状态
  checkAIFeatureStatus() {
    const app = getApp()
    app.checkAIFeatureStatus()
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
        venues: availableVenues,
        devices: filteredDevices,
        filteredVenues: availableVenues,
        filteredDevices: filteredDevices
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
      const app = getApp()

      if (token) {
        try {
          // 强制从服务器获取最新的用户信息，确保权限状态是最新的
          const userInfo = await app.checkLoginStatus(true)

          if (userInfo) {
            // 保存用户信息
            wx.setStorageSync('userInfo', JSON.stringify(userInfo))

            this.setData({
              user: userInfo,
              isAdmin: userInfo.role === 'admin'  // 只有管理员角色才显示管理功能
            })

            console.log('首页更新用户状态:', userInfo.role, '是否管理员:', userInfo.role === 'admin')
          } else {
            this.setData({
              user: null,
              isAdmin: false
            })
          }
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
    const { name, id } = e.currentTarget.dataset

    // 直接使用场地名称作为类型，前往预约页面
    wx.navigateTo({
      url: `/pages/venue/venue?id=${id}&name=${name}&type=${name}`
    })
  },

  // 前往设备预约页面
  async goToDevice(e) {
    const { device } = e.currentTarget.dataset

    // 统一处理设备ID，直接导航到设备预约页面
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
  },

  // 搜索框内容变化处理函数
  onSearchInput: function(e) {
    const searchText = e.detail.value.trim().toLowerCase();
    this.setData({ searchText });

    if (searchText === '') {
      // 如果搜索框为空，恢复原始数据
      this.setData({
        filteredVenues: this.data.venues,
        filteredDevices: this.data.devices,
        showSearchResults: false
      });
      return;
    }

    // 过滤场地
    const filteredVenues = this.data.venues.filter(venue =>
      venue.name.toLowerCase().includes(searchText)
    );

    // 过滤设备
    const filteredDevices = this.data.devices.filter(device =>
      device.name.toLowerCase().includes(searchText)
    );

    this.setData({
      filteredVenues,
      filteredDevices,
      showSearchResults: true,
      isDeviceSectionExpanded: true // 搜索时展开设备区域
    });
  },

  // 清除搜索内容
  clearSearch: function() {
    this.setData({
      searchText: '',
      filteredVenues: this.data.venues,
      filteredDevices: this.data.devices,
      showSearchResults: false
    });
  },

  // 切换设备区域的展开/收起状态
  toggleDeviceSection: function() {
    this.setData({
      isDeviceSectionExpanded: !this.data.isDeviceSectionExpanded
    });
  },

  // 切换场地区域的展开/收起状态
  toggleVenueSection: function() {
    this.setData({
      isVenueSectionExpanded: !this.data.isVenueSectionExpanded
    });
  }
})