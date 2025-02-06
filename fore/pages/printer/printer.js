// pages/printer/printer.js
import { get, post } from '../../utils/request'
import config from '../../config'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    printers: [
      { id: 'printer_1', name: '3D打印机1号' },
      { id: 'printer_2', name: '3D打印机2号' },
      { id: 'printer_3', name: '3D打印机3号' }
    ],
    printerIndex: -1,
    date: '',
    time: '',
    minDate: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    // 获取打印机状态
    await this.getPrinterStatus()
    
    // 设置最小可选日期（明天）
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 1)
    this.setData({
      minDate: minDate.toISOString().split('T')[0]
    })
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

  async getPrinterStatus() {
    try {
      const response = await get('/management/devices/status', {
        params: { category: 'printer' }
      })
      
      const printers = config.printers.map(printer => {
        const status = response.find(item => item.device_or_venue_name === printer.name)
        return {
          ...printer,
          status: status ? status.status : 'unavailable'
        }
      })
      
      this.setData({ printers })
    } catch (error) {
      console.error('获取打印机状态失败:', error)
    }
  },

  handlePrinterChange(e) {
    this.setData({
      printerIndex: e.detail.value
    })
  },

  handleDateChange(e) {
    this.setData({
      date: e.detail.value
    })
  },

  handleTimeChange(e) {
    this.setData({
      time: e.detail.value
    })
  },

  async handleSubmit(e) {
    const { printerIndex, date, time } = this.data
    
    if (printerIndex === -1) {
      wx.showToast({
        title: '请选择打印机',
        icon: 'none'
      })
      return
    }
    
    if (!date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }
    
    if (!time) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      })
      return
    }

    try {
      const printer = this.data.printers[printerIndex]
      await post('/reservations/printer', {
        printer_name: printer.id,
        reservation_date: date,
        print_time: `${date}T${time}:00`
      })

      wx.showToast({
        title: '预约成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('预约失败:', error)
      wx.showToast({
        title: error.message || '预约失败',
        icon: 'none'
      })
    }
  }
})