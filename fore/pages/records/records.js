// pages/records/records.js
import { get, post } from '../../utils/request'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'pending',  // pending, approved, rejected, unreturned
    records: [],
    tabs: [
      { key: 'pending', name: '待审批' },
      { key: 'approved', name: '已通过' },
      { key: 'rejected', name: '已拒绝' },
      { key: 'unreturned', name: '未归还' }
    ],
    showReturnForm: false,
    showCompletionForm: false,
    currentId: null,
    deviceCondition: 'normal',
    returnNote: '',
    printerCondition: 'normal',
    completionNote: '',
    // 分页相关
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: 0,
    loading: false,
    hasMoreData: true
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
    // 每次显示页面时重新加载记录，确保数据最新
    this.loadRecords();
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
    // 如果不是未归还标签页，且有更多数据，加载下一页
    if (this.data.currentTab !== 'unreturned' && this.data.hasMoreData && !this.data.loading) {
      console.log('触发上拉加载更多');
      this.loadRecords(true);
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  async loadRecords(loadMore = false) {
    try {
      if (this.data.loading) return;

      this.setData({ loading: true });

      // 如果是加载更多，增加页码，否则重置为第一页
      const page = loadMore ? this.data.page + 1 : 1;

      // 构建请求参数
      const params = {
        page: page,
        page_size: this.data.pageSize
      };

      // 根据当前标签页设置不同的请求参数
      if (this.data.currentTab === 'unreturned') {
        // 对于未归还标签页，请求所有已通过的记录，不使用分页
        params.status = 'approved';
        // 设置一个较大的页面大小，一次性获取所有未归还记录
        params.page_size = 100; // 设置一个足够大的值，确保能获取所有未归还记录
        console.log('未归还标签页 - 请求参数:', params);
      } else {
        // 对于其他标签页，直接使用标签页的key作为status参数
        params.status = this.data.currentTab;
        console.log('普通标签页 - 请求参数:', params);
      }

      console.log('发送请求参数:', params);
      const response = await get('/reservations/my-reservations', { data: params });
      console.log('API Response:', response);

      // 检查响应格式
      if (!response || !response.data) {
        throw new Error('无效的响应数据');
      }

      // 更新分页信息
      this.setData({
        page: response.page,
        totalPages: response.total_pages,
        totalRecords: response.total,
        hasMoreData: response.page < response.total_pages
      });

      // 处理返回的预约记录数组
      const reservations = response.data || [];
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

        // 确保创建时间存在
        const createdAt = item.created_at || new Date().toISOString();

        // 添加状态信息
        let statusInfo = {}
        if (item.type === 'device') {
          // 读取设备状态 - 无论处于什么状态
          const deviceCondition = item.device_condition || 'normal'

          // 仅当设备已归还时显示状态信息
          if (item.status === 'returned') {
            statusInfo = {
              condition: deviceCondition,
              note: item.return_note || '',
              statusText: this.getStatusText(item.status, item.type),
              conditionText: deviceCondition === 'normal' ? '正常' : '故障'
            }
          } else if (item.status === 'approved') {
            // 对于已审批但未归还的设备
            statusInfo = {
              statusText: this.getStatusText(item.status, item.type),
              usage_type: item.usage_type === 'takeaway' ? '带走使用' : '现场使用',
              teacher_name: item.teacher_name || ''
            }

            // 为未归还设备增加额外的提示信息
            if (item.return_time) {
              const returnDate = new Date(item.return_time);
              const now = new Date();

              // 检查是否已超过预计归还时间
              if (returnDate < now) {
                statusInfo.isOverdue = true;

                // 计算超期天数
                const diffTime = Math.abs(now - returnDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                statusInfo.overdueDays = diffDays;
              }
            }
          }
        } else if (item.type === 'printer') {
          // 读取打印机状态 - 无论处于什么状态
          const printerCondition = item.printer_condition || 'normal'

          // 仅当打印机使用已完成时显示状态信息
          if (item.status === 'completed') {
            statusInfo = {
              condition: printerCondition,
              note: item.completion_note || '',
              statusText: this.getStatusText(item.status, item.type),
              conditionText: printerCondition === 'normal' ? '正常' : '故障'
            }
          } else if (item.status === 'approved') {
            // 对于已审批但未完成的打印
            statusInfo = {
              statusText: this.getStatusText(item.status, item.type),
              estimated_duration: item.estimated_duration ? `${item.estimated_duration}分钟` : '未知',
              model_name: item.model_name || '未指定',
              teacher_name: item.teacher_name || ''
            }

            // 为未完成打印添加过期检测
            if (item.end_time) {
              const endDate = new Date(item.end_time);
              const now = new Date();

              // 检查是否已超过预计结束时间
              if (endDate < now) {
                statusInfo.isOverdue = true;

                // 计算超期天数
                const diffTime = Math.abs(now - endDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                statusInfo.overdueDays = diffDays;
              }
            }
          }
        }

        // 创建记录对象，确保所有状态信息完整保存
        const record = {
          ...item,
          typeText,
          resourceName,
          timeText,
          devicesText,
          statusInfo,
          statusText: this.getStatusText(item.status, item.type),
          created_at: this.formatDateTime(createdAt),
          created_timestamp: new Date(createdAt).getTime(), // 添加时间戳方便排序
          // 将关键状态信息直接保存到记录的顶层以防被覆盖
          _device_condition: item.type === 'device' ? item.device_condition : undefined,
          _printer_condition: item.type === 'printer' ? item.printer_condition : undefined
        }

        return record
      })

      // 按创建时间排序（最新的在前面）
      allRecords.sort((a, b) => {
        return (b.created_timestamp || 0) - (a.created_timestamp || 0); // 降序排列
      });

      // 修改筛选逻辑，处理状态值的映射
      const records = allRecords.filter(record => {
        // 获取记录状态
        let recordStatus = String(record.status).toLowerCase();

        // 记录详细信息用于调试
        console.log(`记录ID: ${record.id}, 类型: ${record.type}, 状态: ${recordStatus}, 当前标签页: ${this.data.currentTab}`);

        // 对于未归还标签页，只显示已通过但未归还的设备或未完成的打印机
        if (this.data.currentTab === 'unreturned') {
          // 设备类型且状态为已通过但未归还
          if (record.type === 'device' && recordStatus === 'approved' && record.status !== 'returned') {
            console.log(`未归还设备记录: ID=${record.id}, 名称=${record.resourceName}`);
            return true;
          }

          // 打印机类型且状态为已通过但未完成
          if (record.type === 'printer' && recordStatus === 'approved' && record.status !== 'completed') {
            console.log(`未完成打印机记录: ID=${record.id}, 名称=${record.resourceName}`);
            return true;
          }

          return false;
        }

        // 处理状态映射
        switch(recordStatus) {
          case 'pending':
          case 'approved':
          case 'rejected':
            return recordStatus === this.data.currentTab;
          case 'completed':
          case 'returned':
            // 将completed和returned状态的记录显示在已通过的标签页中
            return this.data.currentTab === 'approved';
          default:
            console.warn('Unknown status:', record.status);
            return false;
        }
      })

      // 记录筛选后的结果数量
      console.log(`筛选后记录数量: ${records.length}, 当前标签页: ${this.data.currentTab}`);

      // 如果是未归还标签页，显示筛选后的未归还记录总数
      if (this.data.currentTab === 'unreturned' && records.length > 0) {
        console.log(`未归还记录总数: ${records.length}`);
      }

      // 如果是加载更多，追加记录，否则替换记录
      if (loadMore && this.data.currentTab !== 'unreturned') {
        // 仅在非未归还标签页使用加载更多功能
        this.setData({
          records: [...this.data.records, ...records]
        });
      } else {
        // 替换记录
        this.setData({ records });
      }
    } catch (error) {
      console.error('加载预约记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    console.log(`切换到标签页: ${tab}`);

    // 重置分页信息
    this.setData({
      currentTab: tab,
      page: 1,
      hasMoreData: true,
      records: [] // 清空当前记录，避免显示旧数据
    }, () => {
      // 设置完成后加载新数据
      this.loadRecords();
    });
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

  // 显示设备归还对话框
  showReturnDialog(e) {
    const { id } = e.currentTarget.dataset
    this.setData({
      showReturnForm: true,
      currentId: id,
      deviceCondition: 'normal',
      returnNote: ''
    })
  },

  // 隐藏设备归还对话框
  hideReturnDialog() {
    this.setData({
      showReturnForm: false
    })
  },

  // 显示打印机使用完成对话框
  showCompletionDialog(e) {
    const { id } = e.currentTarget.dataset
    this.setData({
      showCompletionForm: true,
      currentId: id,
      printerCondition: 'normal',
      completionNote: ''
    })
  },

  // 隐藏打印机使用完成对话框
  hideCompletionDialog() {
    this.setData({
      showCompletionForm: false
    })
  },

  // 设备状态改变
  onDeviceConditionChange(e) {
    this.setData({
      deviceCondition: e.detail.value
    })
  },

  // 归还备注改变
  onReturnNoteChange(e) {
    this.setData({
      returnNote: e.detail.value
    })
  },

  // 打印机状态改变
  onPrinterConditionChange(e) {
    this.setData({
      printerCondition: e.detail.value
    })
  },

  // 使用完成备注改变
  onCompletionNoteChange(e) {
    this.setData({
      completionNote: e.detail.value
    })
  },

  // 提交设备归还
  async submitDeviceReturn() {
    const { currentId, deviceCondition, returnNote } = this.data

    if (!currentId) {
      wx.showToast({
        title: '提交失败，预约ID丢失',
        icon: 'none'
      })
      return
    }

    // 如果是故障状态，必须填写备注
    if (deviceCondition === 'damaged' && !returnNote.trim()) {
      wx.showToast({
        title: '故障设备必须填写备注',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({
        title: '提交中',
        mask: true
      })

      // 添加更详细的日志
      console.log('====== 设备归还开始 ======')
      console.log(`提交设备归还 - ID: ${currentId}, 状态: ${deviceCondition}, 备注: ${returnNote}`)

      // 创建请求数据
      const requestData = {
        id: currentId,
        device_condition: deviceCondition,
        return_note: returnNote.trim() || null
      }

      console.log('发送归还请求数据:', JSON.stringify(requestData))

      // 直接归还，无需审批
      const response = await post('/reservations/device/return-direct', requestData)

      console.log('设备归还API响应:', JSON.stringify(response))

      wx.hideLoading()
      this.hideReturnDialog()

      // 检查响应中是否包含设备状态信息
      const responseCondition = response?.device_condition || deviceCondition
      console.log(`服务器返回的设备状态: ${responseCondition}`)

      wx.showToast({
        title: '归还成功',
        icon: 'success'
      })

      // 立即更新本地数据，确保状态正确展示
      const updatedRecords = this.data.records.map(record => {
        if (record.id === currentId) {
          // 更新状态为已归还，并添加设备状态信息
          const updatedRecord = {
            ...record,
            status: 'returned',
            statusText: this.getStatusText('returned', 'device'),
            device_condition: responseCondition, // 使用服务器返回的状态或表单提交的状态
            return_note: returnNote.trim() || '',
            _device_condition: responseCondition, // 备份状态信息到顶层
            statusInfo: {
              condition: responseCondition,
              note: returnNote.trim() || '',
              statusText: this.getStatusText('returned', 'device'),
              conditionText: responseCondition === 'normal' ? '正常' : '故障'
            }
          }
          console.log('本地更新设备记录:', JSON.stringify(updatedRecord))
          console.log(`设备ID ${currentId} 归还状态已设置为: ${responseCondition} (${responseCondition === 'normal' ? '正常' : '故障'})`)
          return updatedRecord
        }
        return record
      })

      this.setData({ records: updatedRecords })
      console.log('====== 设备归还完成 ======')

      // 延迟重新加载全部记录以获取最新数据
      setTimeout(() => {
        this.loadRecords()
      }, 1500)
    } catch (error) {
      wx.hideLoading()
      console.error('设备归还提交失败:', error)
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      })
    }
  },

  // 提交打印机使用完成
  async submitPrinterCompletion() {
    const { currentId, printerCondition, completionNote } = this.data

    if (!currentId) {
      wx.showToast({
        title: '提交失败，预约ID丢失',
        icon: 'none'
      })
      return
    }

    // 如果是故障状态，必须填写备注
    if (printerCondition === 'damaged' && !completionNote.trim()) {
      wx.showToast({
        title: '故障打印机必须填写备注',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({
        title: '提交中',
        mask: true
      })

      // 添加更详细的日志
      console.log('====== 打印机使用完成开始 ======')
      console.log(`提交打印机使用完成 - ID: ${currentId}, 状态: ${printerCondition}, 备注: ${completionNote}`)

      // 创建请求数据
      const requestData = {
        id: currentId,
        printer_condition: printerCondition,
        completion_note: completionNote.trim() || null
      }

      console.log('发送完成请求数据:', JSON.stringify(requestData))

      // 直接完成，无需审批
      const response = await post('/reservations/printer/complete-direct', requestData)

      console.log('打印机使用完成API响应:', JSON.stringify(response))

      wx.hideLoading()
      this.hideCompletionDialog()

      // 检查响应中是否包含打印机状态信息
      const responseCondition = response?.printer_condition || printerCondition
      console.log(`服务器返回的打印机状态: ${responseCondition}`)

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })

      // 立即更新本地数据，确保状态正确展示
      const updatedRecords = this.data.records.map(record => {
        if (record.id === currentId) {
          // 更新状态为已完成，并添加打印机状态信息
          const updatedRecord = {
            ...record,
            status: 'completed',
            statusText: this.getStatusText('completed', 'printer'),
            printer_condition: responseCondition, // 使用服务器返回的状态或表单提交的状态
            completion_note: completionNote.trim() || '',
            _printer_condition: responseCondition, // 备份状态信息到顶层
            statusInfo: {
              condition: responseCondition,
              note: completionNote.trim() || '',
              statusText: this.getStatusText('completed', 'printer'),
              conditionText: responseCondition === 'normal' ? '正常' : '故障'
            }
          }
          console.log('本地更新打印机记录:', JSON.stringify(updatedRecord))
          console.log(`打印机ID ${currentId} 完成状态已设置为: ${responseCondition} (${responseCondition === 'normal' ? '正常' : '故障'})`)
          return updatedRecord
        }
        return record
      })

      this.setData({ records: updatedRecords })
      console.log('====== 打印机使用完成完成 ======')

      // 延迟重新加载全部记录以获取最新数据
      setTimeout(() => {
        this.loadRecords()
      }, 1500)
    } catch (error) {
      wx.hideLoading()
      console.error('打印机使用完成提交失败:', error)
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      })
    }
  },

  // 获取状态文本
  getStatusText(status, type) {
    const statusMap = {
      'pending': '待审批',
      'approved': '已通过',
      'rejected': '已拒绝',
      'returned': '已归还',
      'completed': '已完成'
    }

    return statusMap[status] || status
  }
})