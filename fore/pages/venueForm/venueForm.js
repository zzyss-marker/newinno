import config from '../../config'
import { post, get } from '../../utils/request'

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
      { id: 'morning', name: '上午 (8:00-12:00)', disabled: false },
      { id: 'afternoon', name: '下午 (13:00-17:00)', disabled: false },
      { id: 'evening', name: '晚上 (18:00-22:00)', disabled: false }
    ],
    occupiedTimes: [], // 存储已占用的时间段
    loading: false
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
    const date = e.detail.value;
    this.setData({
      date: date,
      selectedTimeIndex: -1 // 日期变更时重置时间段选择
    });
    console.log('选择的日期:', date);
    
    // 获取该日期已占用的时间段
    this.getOccupiedTimeSlots(date);
  },

  /**
   * 获取指定日期已占用的时间段
   */
  async getOccupiedTimeSlots(date) {
    if (!date || !this.data.venueType) return;
    
    // 直接使用原始场地类型，不进行转换
    let venueType = this.data.venueType;
    
    this.setData({ loading: true });
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
      
      this.setData({ 
        businessTimes: updatedBusinessTimes,
        loading: false
      });
      
      console.log('已占用时间段:', occupiedTimes);
    } catch (error) {
      console.error('获取已占用时间段失败:', error);
      this.setData({ loading: false });
      this.showToast('获取时间段信息失败');
    }
  },

  /**
   * 时间段选择变更处理
   */
  onTimeChange(e) {
    const index = parseInt(e.detail.value);
    // 检查所选时间段是否被禁用
    if (this.data.businessTimes[index].disabled) {
      this.showToast('该时间段已被预约，请选择其他时间');
      return;
    }
    
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
    
    console.log('提交前表单数据:', {
      venueId, 
      venueName, 
      venueType, 
      date, 
      selectedTimeIndex,
      selectedDevices,
      purpose
    });
    
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
    
    // 直接使用原始场地类型，不进行转换
    const formData = {
      venue_id: venueId,
      venue_name: venueName,
      venue_type: venueType,
      reservation_date: date,
      business_time: selectedTime.id,
      purpose: purpose,
      devices_needed: {
        screen: selectedDevices.includes('screen'),
        projector: selectedDevices.includes('projector'),
        mic: selectedDevices.includes('mic'),
        laptop: selectedDevices.includes('laptop')
      }
    };
    
    console.log('准备提交的场地预约数据:', formData);
    
    try {
      // 发送预约请求到后端API
      const result = await post('reservations/venue', formData);
      
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