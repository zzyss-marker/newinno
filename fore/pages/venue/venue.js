import { post } from '../../utils/request'
import config from '../../config'
import { getAvailableVenues } from '../../utils/api'

Page({
  data: {
    venueId: '',
    venueName: '',
    venueType: '',
    date: '',
    minDate: '',
    businessTime: '',
    businessTimes: config.businessTimes,
    selectedBusinessTime: '',
    deviceOptions: config.deviceOptions,
    selectedDevices: {},
    showDevices: true, // 控制是否显示设备选项
    venueList: [],
    venueTypes: [],
    categoryFilter: '',
    loading: true
  },

  onLoad(options) {
    const { id, name, type } = options
    
    // 根据场地类型决定是否显示设备选项
    const showDevices = type === '讲座厅'
    
    this.setData({
      venueId: id,
      venueName: name,
      venueType: type,
      businessTimes: config.businessTimes,
      showDevices
    })

    // 设置最小可选日期（三天后）
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 3)
    this.setData({
      minDate: minDate.toISOString().split('T')[0]
    })

    this.fetchVenueData()
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
    const { venueId, venueName, venueType, date, selectedBusinessTime, selectedDevices } = this.data

    if (!date || !selectedBusinessTime || !purpose) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    try {
      // 只有讲座厅才包含设备需求
      const devices_needed = venueType === '讲座厅' ? {
        screen: Boolean(selectedDevices.screen),
        laptop: Boolean(selectedDevices.laptop),
        mic_handheld: Boolean(selectedDevices.mic_handheld),
        mic_gooseneck: Boolean(selectedDevices.mic_gooseneck),
        projector: Boolean(selectedDevices.projector)
      } : {}

      // 转换场地类型为后端需要的格式
      let backendVenueType = venueType
      if (venueType === '会议室') backendVenueType = 'meeting_room'
      else if (venueType === '讲座厅') backendVenueType = 'lecture_hall'
      else if (venueType === '研讨室') backendVenueType = 'seminar_room'
      else if (venueType === '创新工坊') backendVenueType = 'innovation_space'
      // 其他类型保持原样

      const data = {
        venue_id: venueId,
        venue_name: venueName,
        venue_type: backendVenueType, // 使用转换后的类型
        reservation_date: date,
        business_time: selectedBusinessTime,
        purpose: purpose,
        devices_needed: devices_needed
      }

      console.log('提交预约数据:', data)

      const response = await post('reservations/venue', data)

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

  // 获取场地数据
  async fetchVenueData() {
    try {
      this.setData({ loading: true })
      
      // 从API获取场地数据
      const venues = await getAvailableVenues()
      
      if (venues && Array.isArray(venues)) {
        // 处理场地数据
        const processedVenues = venues.map(venue => {
          // 确保场地类型是中文
          let displayType = venue.type
          
          // 如果是英文ID，转换为对应的中文名称
          if (venue.type === 'meeting_room' || venue.type === 'meeting') displayType = '会议室'
          else if (venue.type === 'lecture_hall' || venue.type === 'lecture') displayType = '讲座厅'
          else if (venue.type === 'seminar_room' || venue.type === 'seminar') displayType = '研讨室'
          else if (venue.type === 'innovation_space' || venue.type === 'innovation') displayType = '创新工坊'
          // 其他类型保持原样，不设置默认值
          
          return {
            id: venue.id || '',
            name: venue.name || '',
            type: displayType,
            status: venue.status || '可用',
            available_quantity: venue.available_quantity || 1,
            quantity: venue.quantity || 1
          }
        }).filter(venue => venue.name && venue.type) // 过滤掉没有名称或类型的场地
        
        // 提取所有场地类型
        const types = [...new Set(processedVenues.map(venue => venue.type))]
        
        this.setData({
          venueList: processedVenues,
          venueTypes: types,
          loading: false
        })

        console.log('处理后的场地数据:', processedVenues)
        console.log('场地类型列表:', types)
      } else {
        // 使用静态数据
        const staticVenues = [
          { id: 'meeting_room_a', name: '会议室A', type: '会议室', status: '可用' },
          { id: 'meeting_room_b', name: '会议室B', type: '会议室', status: '可用' },
          { id: 'lecture_hall', name: '讲座厅', type: '讲座厅', status: '可用' },
          { id: 'seminar_room', name: '研讨室A', type: '研讨室', status: '可用' },
          { id: 'seminar_room_b', name: '研讨室B', type: '研讨室', status: '可用' },
          { id: 'innovation_space', name: '创新工坊', type: '创新工坊', status: '可用' }
        ]
        
        const types = [...new Set(staticVenues.map(venue => venue.type))]
        
        this.setData({
          venueList: staticVenues,
          venueTypes: types,
          loading: false
        })

        console.log('使用静态场地数据:', staticVenues)
        console.log('静态场地类型列表:', types)
      }
    } catch (error) {
      console.error('获取场地数据失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '获取场地数据失败',
        icon: 'none'
      })
    }
  },

  // 按类型筛选场地
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category || ''
    this.setData({ categoryFilter: category })
  },

  // 获取过滤后的场地列表
  getFilteredVenues() {
    const { venueList, categoryFilter } = this.data
    
    if (!categoryFilter) {
      return venueList
    }
    
    return venueList.filter(venue => venue.type === categoryFilter)
  },

  // 跳转到预约表单
  goToForm(e) {
    const venue = e.currentTarget.dataset.venue
    if (!venue) return
    
    wx.navigateTo({
      url: `/pages/venueForm/venueForm?id=${venue.id}&name=${venue.name}&type=${venue.type}`
    })
  }
}) 