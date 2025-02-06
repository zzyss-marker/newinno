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
    returnTime: '',
    minDate: new Date().toISOString().split('T')[0]
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
    const currentYear = date.getFullYear()
    const currentMonth = date.getMonth() + 1
    const currentDay = date.getDate()
    const currentHour = date.getHours()
    const currentMinute = date.getMinutes()

    // 只显示当前年份和下一年
    years.push(currentYear + '年')
    years.push((currentYear + 1) + '年')

    // 如果是当前年份，则从当前月份开始
    for (let i = currentMonth; i <= 12; i++) {
      months.push(i + '月')
    }

    // 如果是当前月份，则从当前日期开始
    const lastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = currentDay; i <= lastDay; i++) {
      days.push(i + '日')
    }

    // 如果是当前日期，则从当前小时开始
    for (let i = currentHour; i < 24; i++) {
      hours.push(i + '时')
    }

    // 如果是当前小时，则从当前分钟开始（向上取整到5的倍数）
    const startMinute = Math.ceil(currentMinute / 5) * 5
    for (let i = startMinute; i < 60; i += 5) {
      minutes.push(i + '分')
    }

    this.setData({
      dateTimeArray: [years, months, days, hours, minutes],
      dateTimeIndex: [0, 0, 0, 0, 0] // 默认选中当前时间
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
    const { column, value } = e.detail
    const { dateTimeIndex, dateTimeArray } = this.data
    const currentDate = new Date()
    
    let needUpdate = false
    const newDateTimeArray = [...dateTimeArray]
    const newDateTimeIndex = [...dateTimeIndex]
    newDateTimeIndex[column] = value

    if (column === 0) { // 年份变化
      const selectedYear = parseInt(dateTimeArray[0][value])
      if (selectedYear === currentDate.getFullYear()) {
        // 当前年份，从当前月份开始
        newDateTimeArray[1] = Array.from(
          { length: 12 - currentDate.getMonth() },
          (_, i) => (currentDate.getMonth() + 1 + i) + '月'
        )
      } else {
        // 非当前年份，显示所有月份
        newDateTimeArray[1] = Array.from(
          { length: 12 },
          (_, i) => (i + 1) + '月'
        )
      }
      needUpdate = true
    }

    if (column === 1 || needUpdate) { // 月份变化
      const selectedYear = parseInt(dateTimeArray[0][newDateTimeIndex[0]])
      const selectedMonth = parseInt(dateTimeArray[1][newDateTimeIndex[1]])
      const isCurrentMonth = selectedYear === currentDate.getFullYear() && 
                            selectedMonth === currentDate.getMonth() + 1

      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      if (isCurrentMonth) {
        // 当前月份，从当前日期开始
        newDateTimeArray[2] = Array.from(
          { length: lastDay - currentDate.getDate() + 1 },
          (_, i) => (currentDate.getDate() + i) + '日'
        )
      } else {
        // 非当前月份，显示所有日期
        newDateTimeArray[2] = Array.from(
          { length: lastDay },
          (_, i) => (i + 1) + '日'
        )
      }
      needUpdate = true
    }

    if (needUpdate) {
      this.setData({
        dateTimeArray: newDateTimeArray,
        dateTimeIndex: newDateTimeIndex
      })
    }
  },

  onReturnColumnChange(e) {
    // 与 onColumnChange 类似的逻辑，但是起始时间是借用时间
    const { column, value } = e.detail
    const { returnDateTimeIndex, dateTimeArray, borrowTime } = this.data
    
    // 如果还没有选择借用时间，不允许选择归还时间
    if (!borrowTime) {
      wx.showToast({
        title: '请先选择借用时间',
        icon: 'none'
      })
      return
    }

    // 其余逻辑与 onColumnChange 类似，但是以借用时间为起点
    // ...（类似的更新逻辑）
  },

  getDays(year, month) {
    const days = []
    const lastDay = new Date(parseInt(year), month, 0).getDate()
    for (let i = 1; i <= lastDay; i++) {
      days.push(i)
    }
    return days
  },

  formatTimeToISO(timeStr) {
    try {
      // 解析中文日期时间格式
      const matches = timeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})时:?(\d{1,2})分/)
      if (!matches) {
        // 如果已经是ISO格式，直接返回
        if (timeStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
          return timeStr;
        }
        console.error('Invalid date format:', timeStr)
        throw new Error('Invalid date format')
      }

      const [_, year, month, day, hour, minute] = matches
      // 补齐单位数的月份、日期、小时、分钟
      const formattedMonth = month.padStart(2, '0')
      const formattedDay = day.padStart(2, '0')
      const formattedHour = hour.padStart(2, '0')
      const formattedMinute = minute.padStart(2, '0')
      
      // 使用标准的ISO格式
      return `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00`
    } catch (error) {
      console.error('时间格式转换出错:', error, timeStr)
      throw error
    }
  },

  validateTimeRange() {
    if (!this.data.borrowTime || !this.data.returnTime) return false

    try {
      // 转换为标准的ISO格式
      const borrowTime = this.formatTimeToISO(this.data.borrowTime)
      const returnTime = this.formatTimeToISO(this.data.returnTime)
      
      const borrowDate = new Date(borrowTime)
      const returnDate = new Date(returnTime)

      console.log('借用时间:', borrowTime, borrowDate)
      console.log('归还时间:', returnTime, returnDate)
      console.log('比较结果:', returnDate > borrowDate)

      if (isNaN(borrowDate.getTime()) || isNaN(returnDate.getTime())) {
        console.error('无效的日期格式')
        return false
      }

      return returnDate > borrowDate
    } catch (error) {
      console.error('时间比较出错:', error)
      return false
    }
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

    try {
      // 先验证时间格式
      const formattedBorrowTime = this.formatTimeToISO(borrowTime)
      const formattedReturnTime = this.formatTimeToISO(returnTime)

      // 验证时间范围
      const borrowDate = new Date(formattedBorrowTime)
      const returnDate = new Date(formattedReturnTime)

      if (isNaN(borrowDate.getTime()) || isNaN(returnDate.getTime())) {
        throw new Error('无效的日期格式')
      }

      if (returnDate <= borrowDate) {
        wx.showToast({
          title: '归还时间必须在借用时间之后',
          icon: 'none'
        })
        return
      }

      const response = await post('/reservations/device', {
        device_name: deviceId,
        borrow_time: formattedBorrowTime,
        return_time: formattedReturnTime,
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
      console.error('预约失败:', error)
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