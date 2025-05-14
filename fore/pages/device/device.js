// pages/device/device.js
import { post, get } from '../../utils/request'
import { getAvailableDevices } from '../../utils/api'
import config from '../../config'
import api from '../../utils/api'
import adminApi from '../../utils/admin'

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
    deviceList: [],
    deviceTypes: [],
    categoryFilter: '',
    loading: true,
    isListPage: true, // 默认显示列表页面
    usageType: 'onsite', // 默认为现场使用
    teacherName: '',  // 添加指导老师字段
    isSubmitting: false, // 添加提交状态标记，防止重复提交
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    this.setData({
      loading: true
    });

    // 判断是列表页面还是详情页面
    if (options.device) {
      // 如果有device参数，则显示详情页面
      this.setData({
        isListPage: false
      });

      // 从API获取设备信息
      try {
        const devices = await getAvailableDevices();
        const device = devices.find(d => d.id === options.device || d.id === parseInt(options.device));
        if (device) {
          this.setData({
            deviceId: device.id,
            deviceName: device.name
          });
        } else {
          wx.showToast({
            title: '设备不存在',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error('获取设备信息失败:', error);
        wx.showToast({
          title: '获取设备信息失败',
          icon: 'none'
        });
      }

      // 初始化时间选择器数据
      this.initDateTimePicker()
    } else {
      // 如果没有device参数，则显示列表页面
      this.setData({
        isListPage: true
      });
      this.fetchDeviceData();
    }
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

    // 处理日期跨天情况
    const isEndOfDay = currentHour >= 23 && currentMinute >= 55

    if (isEndOfDay) {
      // 如果是一天的最后几分钟，需要准备第二天的数据
      // 清空当天的时间数组，因为当天已经没有可选时间了
      hours.length = 0
      minutes.length = 0

      // 检查是否需要切换到下个月
      const nextDay = new Date(date)
      nextDay.setDate(currentDay + 1)

      // 如果当前已经是当月最后一天，添加下个月
      if (currentDay === lastDay && months.length === 1) {
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
        months.push(nextMonth + '月')
      }

      // 如果当前日期已经是当前显示的最后一天，添加下一天
      if (days.length === 0 || parseInt(days[days.length - 1]) === lastDay) {
        const nextDayDate = nextDay.getDate()
        days.push(nextDayDate + '日')
      }

      // 添加第二天的所有小时
      for (let i = 0; i < 24; i++) {
        hours.push(i + '时')
      }

      // 添加所有分钟选项
      for (let i = 0; i < 60; i += 5) {
        minutes.push(i + '分')
      }
    } else {
      // 如果是当前日期，则从当前小时开始
      for (let i = currentHour; i < 24; i++) {
        hours.push(i + '时')
      }

      // 如果是当前小时，则从当前分钟开始（向上取整到5的倍数）
      const startMinute = Math.ceil(currentMinute / 5) * 5
      for (let i = startMinute; i < 60; i += 5) {
        minutes.push(i + '分')
      }

      // 确保分钟列表不为空，如果没有分钟选项（例如在55分以后），添加下一个小时的0分
      if (minutes.length === 0) {
        minutes.push('0分')
        // 调整小时，如果已经是23时，则需要调整到明天
        if (hours.length === 0 || parseInt(hours[hours.length - 1]) === 23) {
          // 如果没有可选小时，添加下一天的0时
          if (hours.length === 0) {
            hours.push('0时')
          }
          // 需要更新日期到明天
          const nextDay = new Date(currentYear, currentMonth - 1, currentDay + 1)
          const nextDayDate = nextDay.getDate()
          // 如果日期数组为空，添加下一天的日期
          if (days.length === 0) {
            days.push(nextDayDate + '日')
          }
        } else {
          // 添加下一个小时
          hours.push((currentHour + 1) + '时')
        }
      }
    }

    this.setData({
      dateTimeArray: [years, months, days, hours, minutes],
      dateTimeIndex: [0, 0, 0, 0, 0], // 默认选中当前时间
      returnDateTimeIndex: [0, 0, 0, 0, 0] // 默认选中当前时间
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
      const selectedYear = parseInt(dateTimeArray[0][value].replace('年', ''))
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
      // 重置月份索引
      newDateTimeIndex[1] = 0
    }

    if (column === 1 || needUpdate) { // 月份变化
      const selectedYear = parseInt(dateTimeArray[0][newDateTimeIndex[0]].replace('年', ''))
      const selectedMonth = parseInt(dateTimeArray[1][newDateTimeIndex[1]].replace('月', ''))
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
      // 重置日期索引
      newDateTimeIndex[2] = 0
    }

    if (column === 2 || needUpdate) { // 日期变化
      const selectedYear = parseInt(dateTimeArray[0][newDateTimeIndex[0]].replace('年', ''))
      const selectedMonth = parseInt(dateTimeArray[1][newDateTimeIndex[1]].replace('月', ''))
      const selectedDay = parseInt(dateTimeArray[2][newDateTimeIndex[2]].replace('日', ''))

      const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay)
      const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

      if (selectedDate.getTime() === today.getTime()) {
        // 如果选择的是今天，从当前小时开始
        const currentHour = currentDate.getHours()
        newDateTimeArray[3] = Array.from(
          { length: 24 - currentHour },
          (_, i) => (currentHour + i) + '时'
        )

        // 如果当前小时已经是23时且分钟超过55分，则没有可选时间，需要强制切换到下一天
        if (currentHour === 23 && currentDate.getMinutes() >= 55) {
          // 显示明天所有小时
          newDateTimeArray[3] = Array.from(
            { length: 24 },
            (_, i) => i + '时'
          )
        }
      } else {
        // 非当前日期，显示所有小时
        newDateTimeArray[3] = Array.from(
          { length: 24 },
          (_, i) => i + '时'
        )
      }
      needUpdate = true
      // 重置小时索引
      newDateTimeIndex[3] = 0
    }

    if (column === 3 || needUpdate) { // 小时变化
      const selectedYear = parseInt(dateTimeArray[0][newDateTimeIndex[0]].replace('年', ''))
      const selectedMonth = parseInt(dateTimeArray[1][newDateTimeIndex[1]].replace('月', ''))
      const selectedDay = parseInt(dateTimeArray[2][newDateTimeIndex[2]].replace('日', ''))
      const selectedHour = parseInt(dateTimeArray[3][newDateTimeIndex[3]].replace('时', ''))

      const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay)
      const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

      if (selectedDate.getTime() === today.getTime() && selectedHour === currentDate.getHours()) {
        // 如果选择的是今天的当前小时，从当前分钟开始（向上取整到5的倍数）
        const currentMinute = currentDate.getMinutes()
        const startMinute = Math.ceil(currentMinute / 5) * 5

        if (startMinute >= 60) {
          // 如果已经没有可选分钟，显示下一小时的分钟
          newDateTimeArray[4] = Array.from(
            { length: 12 },
            (_, i) => (i * 5) + '分'
          )
        } else {
          newDateTimeArray[4] = Array.from(
            { length: Math.floor((60 - startMinute) / 5) },
            (_, i) => (startMinute + i * 5) + '分'
          )
        }
      } else {
        // 非当前小时，显示所有分钟（5分钟间隔）
        newDateTimeArray[4] = Array.from(
          { length: 12 },
          (_, i) => (i * 5) + '分'
        )
      }
      // 重置分钟索引
      newDateTimeIndex[4] = 0
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
    const currentDate = new Date()

    // 如果还没有选择借用时间，不允许选择归还时间
    if (!borrowTime) {
      wx.showToast({
        title: '请先选择借用时间',
        icon: 'none'
      })
      return
    }

    // 解析借用时间作为基准
    let borrowDateTime
    try {
      borrowDateTime = new Date(this.formatTimeToISO(borrowTime))
    } catch (error) {
      console.error('解析借用时间出错:', error)
      borrowDateTime = new Date() // 如果解析出错，使用当前时间作为基准
    }

    let needUpdate = false
    const newDateTimeArray = [...dateTimeArray]
    const newReturnDateTimeIndex = [...returnDateTimeIndex]
    newReturnDateTimeIndex[column] = value

    if (column === 0) { // 年份变化
      const selectedYear = parseInt(dateTimeArray[0][value].replace('年', ''))
      if (selectedYear === borrowDateTime.getFullYear()) {
        // 与借用时间相同的年份，从借用时间的月份开始
        newDateTimeArray[1] = Array.from(
          { length: 12 - borrowDateTime.getMonth() },
          (_, i) => (borrowDateTime.getMonth() + 1 + i) + '月'
        )
      } else {
        // 非借用时间的年份，显示所有月份
        newDateTimeArray[1] = Array.from(
          { length: 12 },
          (_, i) => (i + 1) + '月'
        )
      }
      needUpdate = true
      // 重置月份索引
      newReturnDateTimeIndex[1] = 0
    }

    if (column === 1 || needUpdate) { // 月份变化
      const selectedYear = parseInt(dateTimeArray[0][newReturnDateTimeIndex[0]].replace('年', ''))
      const selectedMonth = parseInt(dateTimeArray[1][newReturnDateTimeIndex[1]].replace('月', ''))

      const isSameYearMonth = selectedYear === borrowDateTime.getFullYear() &&
                            selectedMonth === borrowDateTime.getMonth() + 1

      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()

      if (isSameYearMonth) {
        // 与借用时间相同的年月，从借用时间的日期开始
        newDateTimeArray[2] = Array.from(
          { length: lastDay - borrowDateTime.getDate() + 1 },
          (_, i) => (borrowDateTime.getDate() + i) + '日'
        )
      } else {
        // 非借用时间的年月，显示所有日期
        newDateTimeArray[2] = Array.from(
          { length: lastDay },
          (_, i) => (i + 1) + '日'
        )
      }
      needUpdate = true
      // 重置日期索引
      newReturnDateTimeIndex[2] = 0
    }

    if (column === 2 || needUpdate) { // 日期变化
      const selectedYear = parseInt(dateTimeArray[0][newReturnDateTimeIndex[0]].replace('年', ''))
      const selectedMonth = parseInt(dateTimeArray[1][newReturnDateTimeIndex[1]].replace('月', ''))
      const selectedDay = parseInt(dateTimeArray[2][newReturnDateTimeIndex[2]].replace('日', ''))

      const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay)
      const borrowDate = new Date(
        borrowDateTime.getFullYear(),
        borrowDateTime.getMonth(),
        borrowDateTime.getDate()
      )

      if (selectedDate.getTime() === borrowDate.getTime()) {
        // 如果选择的是借用时间的同一天，从借用时间的下一个小时开始
        const borrowHour = borrowDateTime.getHours()
        newDateTimeArray[3] = Array.from(
          { length: 24 - borrowHour - 1 },
          (_, i) => (borrowHour + i + 1) + '时'
        )
      } else {
        // 非借用时间的日期，显示所有小时
        newDateTimeArray[3] = Array.from(
          { length: 24 },
          (_, i) => i + '时'
        )
      }
      needUpdate = true
      // 重置小时索引
      newReturnDateTimeIndex[3] = 0
    }

    if (column === 3 || needUpdate) { // 小时变化
      const selectedYear = parseInt(dateTimeArray[0][newReturnDateTimeIndex[0]].replace('年', ''))
      const selectedMonth = parseInt(dateTimeArray[1][newReturnDateTimeIndex[1]].replace('月', ''))
      const selectedDay = parseInt(dateTimeArray[2][newReturnDateTimeIndex[2]].replace('日', ''))
      const selectedHour = parseInt(dateTimeArray[3][newReturnDateTimeIndex[3]].replace('时', ''))

      const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay)
      const borrowDate = new Date(
        borrowDateTime.getFullYear(),
        borrowDateTime.getMonth(),
        borrowDateTime.getDate()
      )

      if (selectedDate.getTime() === borrowDate.getTime() && selectedHour === borrowDateTime.getHours()) {
        // 如果选择的是借用时间的同一天同一小时，从借用时间的下一个5分钟开始
        const borrowMinute = borrowDateTime.getMinutes()
        const startMinute = Math.ceil(borrowMinute / 5) * 5 + 5 // 借用时间的下一个5分钟

        if (startMinute >= 60) {
          // 如果已经没有可选分钟，应该强制选择下一小时
          newDateTimeArray[4] = Array.from(
            { length: 12 },
            (_, i) => (i * 5) + '分'
          )
        } else {
          newDateTimeArray[4] = Array.from(
            { length: Math.floor((60 - startMinute) / 5) },
            (_, i) => (startMinute + i * 5) + '分'
          )
        }
      } else {
        // 非借用时间的小时，显示所有分钟（5分钟间隔）
        newDateTimeArray[4] = Array.from(
          { length: 12 },
          (_, i) => (i * 5) + '分'
        )
      }
      // 重置分钟索引
      newReturnDateTimeIndex[4] = 0
      needUpdate = true
    }

    // 更新索引
    if (needUpdate) {
      this.setData({
        dateTimeArray: newDateTimeArray,
        returnDateTimeIndex: newReturnDateTimeIndex
      })
    }
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
    const { borrowTime, returnTime, usageType } = this.data;

    // 如果是现场使用模式，不需要验证归还时间
    if (usageType === 'onsite') {
      return true;
    }

    // 解析时间
    const borrowDateTime = new Date(this.formatTimeToISO(borrowTime));
    const returnDateTime = new Date(this.formatTimeToISO(returnTime));

    // 借用时间必须在归还时间之前
    if (borrowDateTime >= returnDateTime) {
      wx.showToast({
        title: '归还时间必须晚于借用时间',
        icon: 'none'
      });
      return false;
    }

    // 借用时间必须在当前时间之后
    const now = new Date();
    if (borrowDateTime <= now) {
      wx.showToast({
        title: '借用时间必须是未来时间',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  onUsageTypeChange(e) {
    this.setData({
      usageType: e.detail.value
    });
  },

  // 处理指导老师输入
  handleTeacherNameChange(e) {
    this.setData({
      teacherName: e.detail.value
    });
  },

  // 处理表单提交
  async handleSubmit(e) {
    const formData = e.detail.value;

    // 防止重复提交
    if (this.data.isSubmitting) {
      console.log('阻止重复提交');
      return;
    }

    // 表单验证
    if (!this.data.deviceName) {
      wx.showToast({
        title: '请选择设备',
        icon: 'none'
      });
      return;
    }

    if (!this.data.borrowTime) {
      wx.showToast({
        title: '请选择借用时间',
        icon: 'none'
      });
      return;
    }

    if (this.data.usageType === 'takeaway' && !this.data.returnTime) {
      wx.showToast({
        title: '请选择归还时间',
        icon: 'none'
      });
      return;
    }

    if (!formData.reason) {
      wx.showToast({
        title: '请输入借用原因',
        icon: 'none'
      });
      return;
    }

    try {
      // 设置提交状态为true，防止重复提交
      this.setData({ isSubmitting: true });

      wx.showLoading({
        title: '提交中',
        mask: true
      });

      // 检查时间是否有效
      if (!this.validateTimeRange()) {
        wx.hideLoading();
        this.setData({ isSubmitting: false }); // 重置提交状态
        return;
      }

      // 组装请求数据
      const reservation = {
        device_name: this.data.deviceName,
        borrow_time: this.formatTimeToISO(this.data.borrowTime),
        return_time: this.data.usageType === 'takeaway' ? this.formatTimeToISO(this.data.returnTime) : null,
        reason: formData.reason,
        usage_type: this.data.usageType,
        teacher_name: this.data.teacherName || null  // 添加指导老师信息
      };

      console.log('预约请求数据:', reservation);

      // 提交预约
      await post('/reservations/device', reservation);

      wx.hideLoading();
      wx.showToast({
        title: '预约成功，等待审核',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      console.error('预约失败:', error);
      wx.showToast({
        title: error.message || '预约失败',
        icon: 'none'
      });
      // 重置提交状态，允许用户再次尝试提交
      this.setData({ isSubmitting: false });
    }
  },

  // 获取设备数据
  async fetchDeviceData() {
    try {
      this.setData({
        loading: true
      });

      console.log('开始获取设备数据');

      // 尝试多种方式获取设备数据
      let devices = [];
      let success = false;

      // 方式1: 尝试从管理系统获取实时数据
      try {
        console.log('尝试从管理系统获取数据');
        const managementData = await adminApi.getManagementItems();
        if (managementData && Array.isArray(managementData)) {
          // 过滤出设备类型的数据
          const filteredDevices = managementData.filter(item =>
            item.category === 'device'
          );

          if (filteredDevices.length > 0) {
            console.log('从管理系统成功获取设备数据', filteredDevices);
            devices = filteredDevices;
            success = true;
          }
        }
      } catch (managementError) {
        console.error('从管理系统获取数据失败', managementError);
      }

      // 方式2: 如果管理系统获取失败，尝试从API获取数据
      if (!success) {
        try {
          console.log('尝试从API获取设备数据');
          const apiDevices = await getAvailableDevices();
          if (apiDevices && Array.isArray(apiDevices) && apiDevices.length > 0) {
            // 过滤出设备数据
            const filteredDevices = apiDevices.filter(device =>
              device.category === 'device'
            );

            if (filteredDevices.length > 0) {
              console.log('从API成功获取设备数据', filteredDevices);
              devices = filteredDevices;
              success = true;
            }
          }
        } catch (apiError) {
          console.error('从API获取设备数据失败', apiError);
        }
      }

      // 如果所有方式都失败，使用静态数据
      if (!success || devices.length === 0) {
        console.log('所有API方式都失败，使用静态数据');
        devices = config.devices || [
          {
            id: 'device1',
            name: '电动螺丝刀',
            type: '工具',
            category: 'device',
            available_quantity: 5,
            quantity: 10,
            status: '可用'
          },
          {
            id: 'device2',
            name: '万用表',
            type: '仪器',
            category: 'device',
            available_quantity: 3,
            quantity: 5,
            status: '可用'
          }
        ];
      }

      // 处理设备数据
      this.processDeviceData(devices);
    } catch (error) {
      console.error('获取设备数据失败:', error);
      wx.showToast({
        title: '获取设备数据失败',
        icon: 'none',
        duration: 2000
      });

      // 在出错的情况下也处理一些默认数据
      this.processDeviceData([
        {
          id: 'default1',
          name: '电动螺丝刀',
          type: '工具',
          category: 'device',
          available_quantity: 5,
          quantity: 10,
          status: '可用'
        },
        {
          id: 'default2',
          name: '万用表',
          type: '仪器',
          category: 'device',
          available_quantity: 3,
          quantity: 5,
          status: '可用'
        }
      ]);
    }
  },

  // 处理设备数据
  processDeviceData(devices) {
    if (!devices || !Array.isArray(devices)) {
      devices = [];
    }

    // 规范化设备数据格式
    const normalizedDevices = devices.map(device => {
      // 如果是数组而不是对象，则创建对象
      if (Array.isArray(device)) {
        return {
          id: device[0] || this.generateUniqueId(),
          name: device[1] || '未命名设备',
          type: device[2] || '其他',
          category: 'device',
          available_quantity: parseInt(device[3]) || 0,
          quantity: parseInt(device[4]) || 0,
          status: device[5] || '未知'
        };
      }

      // 确保设备有有效的ID
      if (!device.id) {
        device.id = this.generateUniqueId();
      }

      // 确保设备有类型
      if (!device.type) {
        device.type = this.determineDeviceType(device.name || '');
      }

      // 确保设备有类别
      if (!device.category) {
        device.category = 'device';
      }

      return device;
    });

    // 提取所有设备类型
    const types = [...new Set(normalizedDevices.map(device => device.type || '其他'))];

    this.setData({
      deviceList: normalizedDevices,
      deviceTypes: types,
      loading: false
    });
  },

  // 生成唯一ID
  generateUniqueId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  },

  // 根据设备名称判断设备类型
  determineDeviceType(name) {
    if (!name) return '其他';

    const typeMap = {
      '电动': '工具',
      '螺丝': '工具',
      '万用表': '仪器',
      '示波器': '仪器',
      '烙铁': '工具',
      'Arduino': '开发板',
      '树莓派': '开发板',
      '打印': '打印设备',
      '大屏': '会议设备',
      '投屏': '会议设备',
      '麦': '会议设备',
      '笔记本': '会议设备'
    };

    for (const [keyword, type] of Object.entries(typeMap)) {
      if (name.includes(keyword)) {
        return type;
      }
    }

    return '其他';
  },

  // 按类型筛选设备
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category || '';
    this.setData({
      categoryFilter: category
    });
  },

  // 获取过滤后的设备列表
  getFilteredDevices() {
    const { deviceList, categoryFilter } = this.data;

    if (!categoryFilter) {
      return deviceList;
    }

    return deviceList.filter(device => (device.type || '其他') === categoryFilter);
  },

  // 跳转到设备详情页
  goToDeviceDetail(e) {
    const device = e.currentTarget.dataset.device;
    if (!device) return;

    wx.navigateTo({
      url: `/pages/device/device?device=${device.id}`
    });
  }
});