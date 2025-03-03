import config from '../../config'
import { post } from '../../utils/request'

Page({
  /**
   * 页面的初始数据
   */
  data: {
    venueId: '',
    venueName: '',
    venueType: '',
    date: '',
    minDate: '',
    selectedTimeIndex: -1,
    purpose: '',
    deviceOptions: [
      { id: 'screen', name: '大屏' },
      { id: 'projector', name: '投影仪' },
      { id: 'mic', name: '麦克风' },
      { id: 'laptop', name: '笔记本电脑' }
    ],
    selectedDevices: [],
    businessTimes: [
      { id: 1, name: '上午 (8:00-12:00)', value: 'morning' },
      { id: 2, name: '下午 (13:00-17:00)', value: 'afternoon' },
      { id: 3, name: '晚上 (18:00-22:00)', value: 'evening' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('场地预约表单接收参数:', options);
    const { id, name, type } = options;
    
    if (!id || !name || !type) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    // 设置最小可选日期（今天）
    const today = new Date();
    const minDateStr = this.formatDate(today);
    
    this.setData({
      venueId: id,
      venueName: name,
      venueType: type,
      minDate: minDateStr
    });
    
    console.log('场地预约表单初始化完成');
  },

  /**
   * 日期选择变更处理
   */
  onDateChange(e) {
    this.setData({
      date: e.detail.value
    });
    console.log('选择的日期:', e.detail.value);
  },

  /**
   * 时间段选择变更处理
   */
  onTimeChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedTimeIndex: index
    });
    console.log('选择的时间段:', this.data.businessTimes[index]);
  },

  /**
   * 设备选择变更处理
   */
  onDevicesChange(e) {
    this.setData({
      selectedDevices: e.detail.value
    });
    console.log('选择的设备:', e.detail.value);
  },

  /**
   * 提交表单
   */
  async handleSubmit(e) {
    const { venueId, venueName, venueType, date, selectedTimeIndex, selectedDevices } = this.data;
    const { purpose } = e.detail.value;
    
    // 表单验证
    if (!date) {
      this.showToast('请选择预约日期');
      return;
    }
    
    if (selectedTimeIndex === -1) {
      this.showToast('请选择时间段');
      return;
    }
    
    if (!purpose) {
      this.showToast('请填写用途说明');
      return;
    }
    
    // 准备提交的数据
    const selectedTime = this.data.businessTimes[selectedTimeIndex];
    
    const formData = {
      venue_id: venueId,
      venue_name: venueName,
      venue_type: venueType,
      reservation_date: date,
      time_slot: selectedTime.value,
      purpose: purpose,
      devices: selectedDevices
    };
    
    console.log('准备提交的场地预约数据:', formData);
    
    try {
      // 发送预约请求到后端API
      const result = await post('/api/reservations/venue', formData);
      
      this.showToast('预约申请已提交', 'success');
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('场地预约失败:', error);
      this.showToast(error.message || '预约失败，请稍后再试');
    }
  },

  /**
   * 显示提示信息
   */
  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  },

  /**
   * 格式化日期为YYYY-MM-DD格式
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}) 