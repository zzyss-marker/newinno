import { post } from '../../utils/request'
import config from '../../config'

Page({
  data: {
    venueType: '',
    date: '',
    minDate: '',
    businessTime: '',
    businessTimes: config.businessTimes,
    selectedBusinessTime: '',
    deviceOptions: config.deviceOptions,
    selectedDevices: {},
    showDevices: true // 控制是否显示设备选项
  },

  onLoad(options) {
    // 设置场地类型
    const venueType = config.venueTypes.find(v => v.id === options.type)
    
    // 根据场地类型决定是否显示设备选项
    const showDevices = options.type === 'lecture' // 只有讲座才显示设备选项
    
    this.setData({
      venueType: venueType.name,
      businessTimes: config.businessTimes,
      showDevices
    })

    // 设置最小可选日期（三天后）
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 3)
    this.setData({
      minDate: minDate.toISOString().split('T')[0]
    })
  },

  onDateChange(e) {
    this.setData({
      date: e.detail.value
    })
  },

  onTimeChange(e) {
    const selectedTime = e.detail.value
    const businessTime = config.businessTimes[selectedTime]
    this.setData({
      selectedBusinessTime: businessTime.id
    })
  },

  onDevicesChange(e) {
    const selectedDevices = {}
    e.detail.value.forEach(deviceId => {
      selectedDevices[deviceId] = true
    })

    // 如果选择了笔记本，自动选中投屏器
    if (selectedDevices.laptop && !selectedDevices.projector) {
      selectedDevices.projector = true
      // 更新复选框状态
      const deviceOptions = this.data.deviceOptions.map(item => ({
        ...item,
        checked: item.id === 'projector' ? true : item.checked
      }))
      this.setData({ deviceOptions })
    }

    this.setData({ selectedDevices })
  },

  async handleSubmit(e) {
    const { purpose } = e.detail.value
    const { venueType, date, selectedBusinessTime, selectedDevices } = this.data

    if (!date || !selectedBusinessTime || !purpose) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    try {
      const venueTypeObj = config.venueTypes.find(v => v.name === venueType)
      if (!venueTypeObj) {
        throw new Error('无效的场地类型')
      }

      // 只有讲座才包含设备需求
      const devices_needed = venueTypeObj.id === 'lecture' ? {
        screen: Boolean(selectedDevices.screen),
        laptop: Boolean(selectedDevices.laptop),
        mic_handheld: Boolean(selectedDevices.mic_handheld),
        mic_gooseneck: Boolean(selectedDevices.mic_gooseneck),
        projector: Boolean(selectedDevices.projector)
      } : {}

      const data = {
        venue_type: venueTypeObj.id,
        reservation_date: date,
        business_time: selectedBusinessTime,
        purpose: purpose,
        devices_needed: devices_needed
      }

      const response = await post('/reservations/venue', data)

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
  }
}) 