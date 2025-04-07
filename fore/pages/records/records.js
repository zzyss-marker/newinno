// pages/records/records.js
import { get } from '../../utils/request'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'pending',  // pending, approved, rejected
    records: [],
    tabs: [
      { key: 'pending', name: '待审批' },
      { key: 'approved', name: '已通过' },
      { key: 'rejected', name: '已拒绝' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadRecords()
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
    this.loadRecords()
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

  async loadRecords() {
    try {
      const response = await get('/reservations/my-reservations')
      console.log('API Response:', response)
      
      // 检查响应是否是数组
      const reservations = Array.isArray(response) ? response : []
      
      // 直接处理返回的预约记录数组
      const allRecords = reservations.map(item => {
        let typeText, resourceName, timeText, devicesText = ''
        
        switch(item.type) {
          case 'venue':
            typeText = '场地预约'
            resourceName = this.getVenueTypeName(item.venue_type)
            timeText = `${item.reservation_date} ${this.getBusinessTimeName(item.business_time)}`
            // 添加设备需求的处理和调试日志
            console.log('Venue devices_needed:', item.devices_needed)
            if (item.devices_needed) {
              try {
                // 如果 devices_needed 是字符串，尝试解析它
                const devicesObj = typeof item.devices_needed === 'string' 
                  ? JSON.parse(item.devices_needed) 
                  : item.devices_needed

                const devices = []
                if (devicesObj.screen) devices.push('大屏')
                if (devicesObj.laptop) devices.push('笔记本')
                if (devicesObj.mic_handheld) devices.push('手持麦')
                if (devicesObj.mic_gooseneck) devices.push('鹅颈麦')
                if (devicesObj.projector) devices.push('投屏器')
                devicesText = devices.length > 0 ? devices.join('、') : '无'
                console.log('Processed devices:', devices)
                console.log('Final devicesText:', devicesText)
              } catch (error) {
                console.error('Error processing devices:', error)
                devicesText = '无'
              }
            } else {
              devicesText = '无'
            }
            break
          case 'device':
            typeText = '设备预约'
            resourceName = this.getDeviceName(item.device_name)
            timeText = `${item.borrow_time} ~ ${item.return_time}`
            break
          case 'printer':
            typeText = '打印机预约'
            resourceName = this.getPrinterName(item.printer_name)
            timeText = item.print_time
            break
          default:
            typeText = '未知类型'
            resourceName = '未知'
            timeText = ''
        }

        const record = {
          ...item,
          typeText,
          resourceName,
          timeText,
          devicesText,
          created_at: this.formatDateTime(item.created_at || new Date())
        }
        console.log('Processed record:', record)
        return record
      })

      console.log('All Records:', allRecords)

      // 修改筛选逻辑，处理状态值的映射
      const records = allRecords.filter(record => {
        // 获取记录状态
        let recordStatus = String(record.status).toLowerCase()
        
        // 处理状态映射
        switch(recordStatus) {
          case 'pending':
          case 'approved':
          case 'rejected':
            return recordStatus === this.data.currentTab
          default:
            console.warn('Unknown status:', record.status)
            return false
        }
      })
      
      console.log('Filtered Records:', records)
      
      this.setData({ records })
    } catch (error) {
      console.error('加载预约记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ currentTab: tab }, () => {
      this.loadRecords()
    })
  },

  // 辅助函数：获取场地类型名称
  getVenueTypeName(type) {
    const venueTypes = {
      'lecture': '讲座厅',
      'lecture_hall': '讲座厅',
      'seminar': '研讨室',
      'seminar_room': '研讨室',
      'meeting_room': '会议室',
      'meeting': '会议室',
      'innovation_space': '创新工坊',
      'innovation': '创新工坊',
      'custom_venue': '自定义场地'
    }
    return venueTypes[type] || type
  },

  // 辅助函数：获取时间段名称
  getBusinessTimeName(time) {
    const businessTimes = {
      'morning': '上午',
      'afternoon': '下午',
      'evening': '晚上'
    }
    return businessTimes[time] || time
  },

  // 辅助函数：获取设备名称
  getDeviceName(device) {
    const devices = {
      'electric_screwdriver': '电动螺丝刀',
      'multimeter': '万用表'
    }
    return devices[device] || device
  },

  // 辅助函数：获取打印机名称
  getPrinterName(printer) {
    return printer.replace('printer_', '打印机')
  },

  // 辅助函数：格式化日期时间
  formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },
})