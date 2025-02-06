import { get, post, put } from '../../../utils/request'

Page({
  data: {
    detail: null,
    typeIcons: {
      venue: 'https://img.icons8.com/windows/32/meeting-room.png',
      device: 'https://img.icons8.com/windows/32/electronics.png',
      printer: 'https://img.icons8.com/windows/32/3d-printer.png'
    },
    typeNames: {
      venue: '场地',
      device: '设备',
      printer: '打印机'
    }
  },

  onLoad(options) {
    const { type, id } = options
    this.loadDetail(type, id)
  },

  async loadDetail(type, id) {
    try {
      let url = ''
      switch (type) {
        case 'venue':
          url = `/admin/venue-reservations/${id}`
          break
        case 'device':
          url = `/admin/device-reservations/${id}`
          break
        case 'printer':
          url = `/admin/printer-reservations/${id}`
          break
      }
      const detail = await get(url)
      this.setData({ detail: { ...detail, type } })
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async handleApprove() {
    try {
      await post(`/admin/reservations/batch-approve`, {
        reservation_ids: [this.data.detail.id],
        reservation_type: this.data.detail.type,
        action: 'approve'
      })
      wx.showToast({
        title: '审批成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  async handleReject() {
    try {
      await post(`/admin/reservations/batch-approve`, {
        reservation_ids: [this.data.detail.id],
        reservation_type: this.data.detail.type,
        action: 'reject'
      })
      wx.showToast({
        title: '已拒绝',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  async handleReturn() {
    try {
      await put(`/admin/device-return/${this.data.detail.id}`)
      wx.showToast({
        title: '归还成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }
}) 