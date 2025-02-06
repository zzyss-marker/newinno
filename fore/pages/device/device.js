// pages/device/device.js
import { post } from '../../utils/request'
import config from '../../config'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceId: '',
    deviceName: '',
    dateTimeArray: null,
    dateTimeIndex: [0, 0, 0, 0, 0],
    returnDateTimeIndex: [0, 0, 0, 0, 0],
    borrowTime: '',
    returnTime: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const device = config.devices.find(d => d.id === options.device)
    this.setData({
      deviceId: device.id,
      deviceName: device.name
    })

    // 初始化时间选择器数据
    this.initDateTimePicker()
  },

  initDateTimePicker() {
    const date = new Date()
    const years = []
    const months = []
    const days = []
    const hours = []
    const minutes = []

    // 生成年月日时分数据
    for (let i = date.getFullYear(); i <= date.getFullYear() + 1; i++) {
      years.push(i + '年')
    }
    for (let i = 1; i <= 12; i++) {
      months.push(i + '月')
    }
    for (let i = 1; i <= 31; i++) {
      days.push(i + '日')
    }
    for (let i = 0; i < 24; i++) {
      hours.push(i + '时')
    }
    for (let i = 0; i < 60; i++) {
      minutes.push(i + '分')
    }

    this.setData({
      dateTimeArray: [years, months, days, hours, minutes]
    })
  },

  onDateTimeChange(e) {
    const { dateTimeArray } = this.data
    const value = e.detail.value
    const borrowTime = `${dateTimeArray[0][value[0]]}${dateTimeArray[1][value[1]]}${dateTimeArray[2][value[2]]} ${dateTimeArray[3][value[3]]}:${dateTimeArray[4][value[4]]}`
    
    this.setData({
      dateTimeIndex: value,
      borrowTime
    })
  },

  onReturnDateTimeChange(e) {
    const { dateTimeArray } = this.data
    const value = e.detail.value
    const returnTime = `${dateTimeArray[0][value[0]]}${dateTimeArray[1][value[1]]}${dateTimeArray[2][value[2]]} ${dateTimeArray[3][value[3]]}:${dateTimeArray[4][value[4]]}`
    
    this.setData({
      returnDateTimeIndex: value,
      returnTime
    })
  },

  onColumnChange(e) {
    // 处理年月日联动
    const { column, value } = e.detail
    const { dateTimeIndex, dateTimeArray } = this.data
    
    if (column === 1) {
      // 月份变化，更新日期
      const days = this.getDays(dateTimeArray[0][dateTimeIndex[0]], value + 1)
      dateTimeArray[2] = days.map(d => d + '日')
      this.setData({ dateTimeArray })
    }
  },

  onReturnColumnChange(e) {
    // 处理年月日联动
    const { column, value } = e.detail
    const { returnDateTimeIndex, dateTimeArray } = this.data
    
    if (column === 1) {
      const days = this.getDays(dateTimeArray[0][returnDateTimeIndex[0]], value + 1)
      dateTimeArray[2] = days.map(d => d + '日')
      this.setData({ dateTimeArray })
    }
  },

  getDays(year, month) {
    const days = []
    const lastDay = new Date(parseInt(year), month, 0).getDate()
    for (let i = 1; i <= lastDay; i++) {
      days.push(i)
    }
    return days
  },

  async handleSubmit(e) {
    const { reason } = e.detail.value
    const { deviceId, borrowTime, returnTime } = this.data

    if (!borrowTime || !returnTime || !reason) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    // 转换时间格式为ISO
    const formatTime = (timeStr) => {
      const date = new Date(timeStr.replace(/[年月日时分]/g, (match) => {
        return { '年': '-', '月': '-', '日': 'T', '时': ':', '分': '' }[match]
      }))
      return date.toISOString()
    }

    try {
      const response = await post('/reservations/device', {
        device_name: deviceId,
        borrow_time: formatTime(borrowTime),
        return_time: formatTime(returnTime),
        reason
      })

      wx.showToast({
        title: '预约成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.showToast({
        title: error.message || '预约失败',
        icon: 'none'
      })
    }
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

  }
})