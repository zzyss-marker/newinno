import { post, get } from '../../utils/request'
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
    businessTimes: config.businessTimes.map(time => ({...time, disabled: false})),
    selectedBusinessTime: '',
    deviceOptions: config.deviceOptions,
    selectedDevices: {},
    showDevices: true, // 控制是否显示设备选项
    venueList: [],
    venueTypes: [],
    categoryFilter: '',
    loading: true,
    occupiedTimes: [], // 存储已占用的时间段
    isSubmitting: false // 添加提交状态标记，防止重复提交
  },

  onLoad(options) {
    const { id, name, type } = options

    // 所有场地类型都显示设备选项
    const showDevices = true

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
    const date = e.detail.value;

    // 存储当前选择的时间段
    const currentBusinessTime = this.data.selectedBusinessTime;

    this.setData({
      date: date
      // 不再重置时间段选择
      // selectedBusinessTime: ''
    });

    // 获取该日期已占用的时间段
    this.getOccupiedTimeSlots(date).then(() => {
      // 获取时间段后检查已选时间段是否可用
      if (currentBusinessTime) {
        const timeStillAvailable = this.data.businessTimes.find(
          time => time.id === currentBusinessTime && !time.disabled
        );

        if (!timeStillAvailable) {
          // 如果之前选择的时间段在新日期不可用，则重置选择
          this.setData({ selectedBusinessTime: '' });
          wx.removeStorageSync('selectedVenueBusinessTime');
          wx.showToast({
            title: '已选时间段在该日期不可用，请重新选择',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 获取指定日期已占用的时间段
   */
  async getOccupiedTimeSlots(date) {
    if (!date || !this.data.venueType) return Promise.resolve();

    // 直接使用原始场地类型，不进行转换
    let venueType = this.data.venueType;

    wx.showLoading({ title: '加载中' });
    try {
      const response = await get('reservations/venue/occupied-times', {
        data: {
          venue_type: venueType,
          date: date
        }
      });

      // 更新占用状态
      const occupiedTimes = response.occupied_times || [];
      this.setData({ occupiedTimes });

      // 更新时间段状态
      const updatedBusinessTimes = this.data.businessTimes.map(time => {
        return {
          ...time,
          disabled: occupiedTimes.includes(time.id)
        };
      });

      this.setData({ businessTimes: updatedBusinessTimes });

      console.log('已占用时间段:', occupiedTimes);
      wx.hideLoading();
      return Promise.resolve();
    } catch (error) {
      console.error('获取已占用时间段失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '获取时间段信息失败',
        icon: 'none'
      });
      return Promise.reject(error);
    }
  },

  onTimeChange(e) {
    const selectedTime = e.detail.value;
    console.log('选择的时间段索引:', selectedTime);

    // 确保选择的索引有效
    if (selectedTime === '' || isNaN(parseInt(selectedTime))) {
      console.log('选择的时间段索引无效');
      return;
    }

    const timeIndex = parseInt(selectedTime);
    const time = this.data.businessTimes[timeIndex];
    console.log('选择的时间段对象:', time);

    // 检查时间对象是否存在
    if (!time) {
      console.log('找不到对应的时间段对象');
      return;
    }

    // 检查所选时间段是否被禁用
    if (time.disabled) {
      wx.showToast({
        title: '该时间段已被预约，请选择其他时间',
        icon: 'none'
      });
      return;
    }

    // 使用id作为值，而不是访问不存在的value属性
    this.setData({
      selectedBusinessTime: time.id,
      businessTime: time.name // 同时保存时间段名称，用于显示
    });

    console.log('设置selectedBusinessTime为:', time.id);
    // 立即保存选中的时间段到本地，防止丢失
    wx.setStorageSync('selectedVenueBusinessTime', time.id);
  },

  onDevicesChange(e) {
    // 当前用户通过UI操作选择的设备ID列表
    const currentSelection = e.detail.value

    // 检查是否新选中了笔记本
    const hadLaptop = this.data.selectedDevices.laptop
    const hasLaptopNow = currentSelection.includes('laptop')
    const newlySelectedLaptop = !hadLaptop && hasLaptopNow

    // 创建最终的设备选择对象 (复制当前选中状态)
    const finalSelection = [...currentSelection]

    // 如果选择了笔记本，确保投屏器也被选中
    if (hasLaptopNow && !finalSelection.includes('projector')) {
      finalSelection.push('projector')
    }

    // 将最终选择转换为对象形式
    const selectedDevices = {}
    this.data.deviceOptions.forEach(device => {
      selectedDevices[device.id] = finalSelection.includes(device.id)
    })

    // 如果新选中了笔记本，更新UI显示投屏器为选中状态
    if (newlySelectedLaptop || (hasLaptopNow && !currentSelection.includes('projector'))) {
      // 更新复选框状态，确保投屏器显示为选中
      const updatedDeviceOptions = this.data.deviceOptions.map(item => ({
        ...item,
        checked: item.id === 'projector' ? true :
                (finalSelection.includes(item.id) ? true : false)
      }))

      this.setData({
        deviceOptions: updatedDeviceOptions,
        selectedDevices
      })
    } else {
      // 没有特殊情况，直接更新选择状态
      this.setData({ selectedDevices })
    }

    console.log('最终选择的设备:', selectedDevices)
  },

  async handleSubmit(e) {
    // 防止重复提交
    if (this.data.isSubmitting) {
      console.log('阻止重复提交');
      return;
    }

    const { purpose } = e.detail.value
    let { venueId, venueName, venueType, date, selectedBusinessTime, selectedDevices } = this.data

    // 尝试从本地存储获取时间段，以防丢失
    if (!selectedBusinessTime) {
      selectedBusinessTime = wx.getStorageSync('selectedVenueBusinessTime');
      console.log('从本地存储恢复selectedBusinessTime:', selectedBusinessTime);
      this.setData({ selectedBusinessTime });
    }

    console.log('提交前表单数据:', {
      venueId,
      venueName,
      venueType,
      date,
      selectedBusinessTime,
      selectedDevices,
      purpose
    });

    if (!date || !selectedBusinessTime || !purpose) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      console.log('表单验证失败，缺少必填字段:', {
        date: Boolean(date),
        selectedBusinessTime: Boolean(selectedBusinessTime),
        purpose: Boolean(purpose)
      });
      return
    }

    try {
      // 设置提交状态为true，防止重复提交
      this.setData({ isSubmitting: true });

      wx.showLoading({
        title: '提交中',
        mask: true
      });

      // 构建设备需求对象，无论场地类型如何都包含设备需求
      const devices_needed = {
        screen: Boolean(selectedDevices.screen),
        laptop: Boolean(selectedDevices.laptop),
        mic_handheld: Boolean(selectedDevices.mic_handheld),
        mic_gooseneck: Boolean(selectedDevices.mic_gooseneck),
        projector: Boolean(selectedDevices.projector)
      }

      // 直接使用原始场地名称，不进行转换
      const data = {
        venue_id: venueId,
        venue_name: venueName,
        venue_type: venueType, // 直接使用管理系统中的名称
        reservation_date: date,
        business_time: selectedBusinessTime,
        purpose: purpose,
        devices_needed: devices_needed
      }

      console.log('提交预约数据:', data)

      const response = await post('reservations/venue', data)

      wx.hideLoading();
      wx.showToast({
        title: '预约成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.hideLoading();
      console.error('预约失败:', error)
      wx.showToast({
        title: error.message || '预约失败',
        icon: 'none'
      })
      // 重置提交状态，允许用户再次尝试提交
      this.setData({ isSubmitting: false });
    }
  },

  // 获取场地数据
  async fetchVenueData() {
    try {
      this.setData({ loading: true })

      // 从API获取场地数据
      const venues = await getAvailableVenues()

      if (venues && Array.isArray(venues)) {
        // 处理场地数据 - 直接使用名称，不使用类型
        const processedVenues = venues.map(venue => {
          return {
            id: venue.id || '',
            name: venue.name || '',
            type: venue.name || '', // 直接使用场地名称作为类型
            status: venue.status || '可用',
            available_quantity: venue.available_quantity || 1,
            quantity: venue.quantity || 1
          }
        }).filter(venue => venue.name) // 过滤掉没有名称的场地

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
          { id: 'meeting_room_a', name: '会议室', type: '会议室', status: '可用' },
          { id: 'lecture_hall', name: '讲座厅', type: '讲座厅', status: '可用' },
          { id: 'seminar_room', name: '研讨室', type: '研讨室', status: '可用' }
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