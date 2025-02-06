// pages/printer/printer.js
import { get, post } from '../../utils/request'
import config from '../../config'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    printers: [],
    selectedPrinter: null,
    date: '',
    time: '',
    minDate: '',
    showForm: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    // 设置最小可选日期（明天）
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    this.setData({
      minDate: tomorrow.toISOString().split('T')[0],
      // 初始化打印机列表，默认状态为loading
      printers: config.printers.map(printer => ({
        ...printer,
        status: 'loading'
      }))
    })

    // 获取打印机状态
    await this.getPrinterStatus()
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
      
      // 所有打印机默认可用，管理员审核时才会改变状态
      const printers = config.printers.map(printer => ({
        ...printer,
        status: 'available'  // 默认都是可用的
      }))
      
      this.setData({ printers })
    } catch (error) {
      console.error('获取打印机状态失败:', error)
      // 即使获取状态失败，也设置为可用
      const printers = config.printers.map(printer => ({
        ...printer,
        status: 'available'
      }))
      this.setData({ printers })
    }
  },

  goToReserve(e) {
    const printerId = e.currentTarget.dataset.printer
    const printer = this.data.printers.find(p => p.id === printerId)
    this.setData({
      selectedPrinter: printer,
      showForm: true
    })
  },

  hideForm() {
    this.setData({
      showForm: false,
      date: '',
      time: ''
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

  async handleSubmit() {
    const { selectedPrinter, date, time } = this.data
    
    if (!selectedPrinter || !date || !time) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    try {
      // 格式化日期和时间
      const formattedDateTime = `${date}T${time}:00`

      const requestData = {
        printer_name: selectedPrinter.id,
        reservation_date: date,
        print_time: formattedDateTime
      }

      console.log('预约请求数据:', requestData)

      await post('/reservations/printer', requestData)

      wx.showToast({
        title: '预约成功，等待审核',
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