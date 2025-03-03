// 管理员相关的工具函数

const config = require('./config.js');

// 获取所有设备和场地信息
const getManagementItems = async () => {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/items`,
        method: 'GET',
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200) {
      return response.data;
    } else {
      throw new Error('获取设备和场地信息失败');
    }
  } catch (error) {
    console.error('获取设备和场地信息出错:', error);
    throw error;
  }
};

// 更新设备/场地状态
const updateItemStatus = async (itemId, status) => {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/devices/${itemId}/status`,
        method: 'PUT',
        data: { status },
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200) {
      return response.data;
    } else {
      throw new Error('更新状态失败');
    }
  } catch (error) {
    console.error('更新设备/场地状态出错:', error);
    throw error;
  }
};

// 更新设备/场地数量
const updateItemQuantity = async (itemId, quantity) => {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/devices/${itemId}/quantity`,
        method: 'PUT',
        data: { quantity },
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200) {
      return response.data;
    } else {
      throw new Error('更新数量失败');
    }
  } catch (error) {
    console.error('更新设备/场地数量出错:', error);
    throw error;
  }
};

// 获取设备/场地使用统计
const getUsageStats = async (startDate, endDate) => {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/usage-stats`,
        method: 'GET',
        data: {
          start_date: startDate,
          end_date: endDate
        },
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200) {
      return response.data;
    } else {
      throw new Error('获取使用统计失败');
    }
  } catch (error) {
    console.error('获取使用统计出错:', error);
    throw error;
  }
};

module.exports = {
  getManagementItems,
  updateItemStatus,
  updateItemQuantity,
  getUsageStats
}; 