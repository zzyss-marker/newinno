// pages/records/records.js
import { get } from '../../utils/request'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'pending',  // pending, approved, rejected
    records: [],
    tabs: [
      { key: 'pending', name: '待审批' },
      { key: 'approved', name: '已通过' },
      { key: 'rejected', name: '已拒绝' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadRecords()
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
    this.loadRecords()
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

  async loadRecords() {
    try {
      const response = await get('/reservations/my-reservations')
      
      // 整合所有类型的预约记录
      const allRecords = [
        ...response.venue_reservations.map(item => ({
          ...item,
          type: 'venue',
          typeText: '场地预约',
          resourceName: this.getVenueTypeName(item.venue_type),
          timeText: `${item.reservation_date} ${this.getBusinessTimeName(item.business_time)}`,
          created_at: this.formatDateTime(item.created_at || new Date())
        })),
        ...response.device_reservations.map(item => ({
          ...item,
          type: 'device',
          typeText: '设备预约',
          resourceName: this.getDeviceName(item.device_name),
          timeText: `${this.formatDateTime(item.borrow_time)} ~ ${this.formatDateTime(item.return_time)}`,
          created_at: this.formatDateTime(item.created_at || new Date())
        })),
        ...response.printer_reservations.map(item => ({
          ...item,
          type: 'printer',
          typeText: '打印机预约',
          resourceName: this.getPrinterName(item.printer_name),
          timeText: this.formatDateTime(item.print_time),
          created_at: this.formatDateTime(item.created_at || new Date())
        }))
      ]

      // 根据当前tab筛选记录
      const records = allRecords.filter(record => record.status === this.data.currentTab)
      
      this.setData({ records })
    } catch (error) {
      console.error('加载预约记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ currentTab: tab }, () => {
      this.loadRecords()
    })
  },

  // 辅助函数：获取场地类型名称
  getVenueTypeName(type) {
    const venueTypes = {
      'lecture': '讲座',
      'seminar': '研讨室',
      'meeting_room': '会议室'
    }
    return venueTypes[type] || type
  },

  // 辅助函数：获取时间段名称
  getBusinessTimeName(time) {
    const businessTimes = {
      'morning': '上午',
      'afternoon': '下午',
      'evening': '晚上'
    }
    return businessTimes[time] || time
  },

  // 辅助函数：获取设备名称
  getDeviceName(device) {
    const devices = {
      'electric_screwdriver': '电动螺丝刀',
      'multimeter': '万用表'
    }
    return devices[device] || device
  },

  // 辅助函数：获取打印机名称
  getPrinterName(printer) {
    return printer.replace('printer_', '打印机')
  },

  // 辅助函数：格式化日期时间
  formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  // 查看预约详情
  viewDetail(e) {
    const { id, type } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/records/detail/detail?id=${id}&type=${type}`
    })
  }
})