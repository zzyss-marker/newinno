import { get, post } from '../../utils/request'

// 添加设备名称映射
const deviceNameMap = {
  'electric_screwdriver': '电动螺丝刀',
  'multimeter': '万用表'
}

Page({
  data: {
    currentTab: 'pending',
    reservationType: 'all', // 新增：预约类型筛选，默认为全部
    pendingList: [],
    approvedList: [],
    rejectedList: [],
    isLoading: false,
    tabs: [
      { key: 'pending', name: '待审批' },
      { key: 'approved', name: '已通过' },
      { key: 'rejected', name: '已拒绝' }
    ],
    typeTabs: [
      { key: 'all', name: '全部' },
      { key: 'venue', name: '场地预约' },
      { key: 'device', name: '设备预约' },
      { key: 'printer', name: '打印预约' }
    ],
    deviceNameMap: deviceNameMap
  },

  onLoad() {
    this.checkAdminRole()
    this.loadData()
  },

  async checkAdminRole() {
    try {
      const userInfo = await get('/users/me')
      if (userInfo.role !== 'admin') {
        wx.showToast({
          title: '无权限访问',
          icon: 'none'
        })
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    } catch (error) {
      console.error('检查权限失败:', error)
      wx.switchTab({
        url: '/pages/my/my'
      })
    }
  },

  async loadData() {
    const { currentTab, reservationType } = this.data
    
    this.setData({ isLoading: true })
    
    try {
      let response
      if (currentTab === 'pending') {
        response = await get('/admin/reservations/pending')
      } else {
        response = await get('/admin/reservations/approved')
      }

      const formattedList = [
        ...response.venue_reservations.map(item => ({
          ...item,
          type: 'venue',
          created_at: this.formatDateTime(item.created_at)
        })),
        ...response.device_reservations.map(item => ({
          ...item,
          type: 'device',
          device_name: deviceNameMap[item.device_name] || item.device_name,
          created_at: this.formatDateTime(item.created_at),
          borrow_time: item.borrow_time,
          return_time: item.return_time
        })),
        ...response.printer_reservations.map(item => ({
          ...item,
          type: 'printer',
          created_at: this.formatDateTime(item.created_at),
          print_time: item.print_time
        }))
      ]

      // 根据当前标签筛选数据
      let filteredList = currentTab === 'pending' 
        ? formattedList.filter(item => item.status === 'pending')
        : currentTab === 'approved'
          ? formattedList.filter(item => item.status === 'approved')
          : formattedList.filter(item => item.status === 'rejected')
      
      // 根据预约类型进一步筛选
      if (reservationType !== 'all') {
        filteredList = filteredList.filter(item => item.type === reservationType)
      }

      this.setData({
        pendingList: filteredList
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    
    this.setData({ 
      currentTab: tab,
      pendingList: [] // 清空列表，等待新数据加载
    })
    
    this.loadData()
  },
  
  // 新增：切换预约类型
  switchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.reservationType) return
    
    this.setData({ 
      reservationType: type,
      pendingList: [] // 清空列表，等待新数据加载
    })
    
    this.loadData()
  },

  // 显示通过确认对话框
  showApproveConfirm(e) {
    const { id, type } = e.currentTarget.dataset
    wx.showModal({
      title: '确认通过',
      content: '确定要通过这条预约申请吗？',
      confirmText: '确定通过',
      confirmColor: '#52C41A',
      success: (res) => {
        if (res.confirm) {
          this.handleApprove(id, type)
        }
      }
    })
  },

  // 显示拒绝确认对话框
  showRejectConfirm(e) {
    const { id, type } = e.currentTarget.dataset
    wx.showModal({
      title: '确认拒绝',
      content: '确定要拒绝这条预约申请吗？',
      confirmText: '确定拒绝',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.handleReject(id, type)
        }
      }
    })
  },

  // 修改原有的处理函数
  async handleApprove(id, type) {
    try {
      this.setData({ isLoading: true })
      
      await post('/admin/reservations/approve', {
        id: parseInt(id),
        type: type,
        status: 'approved'
      })
      
      wx.showToast({
        title: '审批成功',
        icon: 'success'
      })
      
      // 重新加载当前页面数据
      this.loadData()
    } catch (error) {
      console.error('审批失败:', error)
      wx.showToast({
        title: error.message || '审批失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  async handleReject(id, type) {
    try {
      this.setData({ isLoading: true })
      
      await post('/admin/reservations/approve', {
        id: parseInt(id),
        type: type,
        status: 'rejected'
      })
      
      wx.showToast({
        title: '已拒绝申请',
        icon: 'success'
      })
      
      // 重新加载当前页面数据
      this.loadData()
    } catch (error) {
      console.error('操作失败:', error)
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  }
}) 