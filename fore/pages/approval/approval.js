import { get, post } from '../../utils/request'

// 添加设备名称映射
const deviceNameMap = {
  'electric_screwdriver': '电动螺丝刀',
  'multimeter': '万用表'
}

Page({
  data: {
    currentTab: 'pending',
    pendingList: [],
    approvedList: [],
    rejectedList: [],
    isLoading: false,
    tabs: [
      { key: 'pending', name: '待审批' },
      { key: 'approved', name: '已通过' },
      { key: 'rejected', name: '已拒绝' }
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
    const { currentTab } = this.data
    
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
      const filteredList = currentTab === 'pending' 
        ? formattedList.filter(item => item.status === 'pending')
        : currentTab === 'approved'
          ? formattedList.filter(item => item.status === 'approved')
          : formattedList.filter(item => item.status === 'rejected')

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

  async handleApprove(e) {
    const { id, type } = e.currentTarget.dataset
    
    try {
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
    }
  },

  async handleReject(e) {
    const { id, type } = e.currentTarget.dataset
    
    try {
      await post('/admin/reservations/approve', {
        id: parseInt(id),
        type: type,
        status: 'rejected'
      })
      
      wx.showToast({
        title: '已拒绝',
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
    }
  }
}) 