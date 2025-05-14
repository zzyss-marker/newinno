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
    startTime: '',
    endTime: '',
    duration: '',
    modelName: '',
    teacherName: '',
    minDate: '',
    showForm: false,
    isSubmitting: false // 添加提交状态标记，防止重复提交
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
      startTime: '',
      endTime: '',
      duration: '',
      modelName: '',
      teacherName: ''
    })
  },

  handleDateChange(e) {
    this.setData({
      date: e.detail.value
    })
  },

  handleStartTimeChange(e) {
    this.setData({
      startTime: e.detail.value
    })
  },

  handleEndTimeChange(e) {
    this.setData({
      endTime: e.detail.value
    })

    // 如果开始时间和结束时间都已设置，自动计算持续时间
    if (this.data.startTime && this.data.endTime) {
      const start = new Date(`2000-01-01T${this.data.startTime}:00`)
      const end = new Date(`2000-01-01T${this.data.endTime}:00`)

      // 如果结束时间早于开始时间，假设跨越了一天
      if (end < start) {
        end.setDate(end.getDate() + 1)
      }

      const durationMinutes = Math.round((end - start) / 60000)

      this.setData({
        duration: durationMinutes.toString()
      })
    }
  },

  handleDurationChange(e) {
    this.setData({
      duration: e.detail.value
    })
  },

  handleModelNameChange(e) {
    this.setData({
      modelName: e.detail.value
    })
  },

  handleTeacherNameChange(e) {
    this.setData({
      teacherName: e.detail.value
    })
  },

  async handleSubmit() {
    // 防止重复提交
    if (this.data.isSubmitting) {
      console.log('阻止重复提交');
      return;
    }

    const { selectedPrinter, date, startTime, endTime, duration, modelName, teacherName } = this.data

    if (!selectedPrinter || !date || !startTime || !endTime) {
      wx.showToast({
        title: '请填写必要信息（日期、开始和结束时间）',
        icon: 'none'
      })
      return
    }

    try {
      // 设置提交状态为true，防止重复提交
      this.setData({ isSubmitting: true });

      wx.showLoading({
        title: '提交中...',
        mask: true
      })

      // 格式化日期和时间
      const formattedStartTime = `${date}T${startTime}:00`
      const formattedEndTime = `${date}T${endTime}:00`

      const requestData = {
        printer_name: selectedPrinter.id,
        reservation_date: date,
        print_time: formattedStartTime,
        end_time: formattedEndTime,
        estimated_duration: duration ? parseInt(duration) : null,
        model_name: modelName || null,
        teacher_name: teacherName || null
      }

      console.log('预约请求数据:', requestData)

      await post('/reservations/printer', requestData)

      wx.hideLoading()
      wx.showToast({
        title: '预约成功，等待审核',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.hideLoading()
      console.error('预约失败:', error)
      wx.showToast({
        title: error.message || '预约失败',
        icon: 'none'
      })
      // 重置提交状态，允许用户再次尝试提交
      this.setData({ isSubmitting: false });
    }
  }
})