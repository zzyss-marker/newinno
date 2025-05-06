// AI助手配置文件
const config = require('../config.js'); // 导入现有系统配置

// 确保config正确加载并处理ES模块导出
const processedConfig = config.__esModule ? config.default : config;
console.log("处理后的config:", processedConfig);


// 获取安全的API基础URL
const getBaseUrl = () => {
  // 检查是否有ES模块导出
  if (processedConfig && processedConfig.apiBaseUrl) {
    return processedConfig.apiBaseUrl;
  }
  return "error";
};

// 动态获取配置
const loadConfig = async () => {
  try {
    const token = wx.getStorageSync('token');
    
    if (!token) {
      console.error('未找到认证Token，请先登录');
      throw new Error('用户未登录');
    }
    
    const baseUrl = getBaseUrl();
    console.log("loadConfig使用的baseUrl:", baseUrl);
    console.log("使用的token:", token);
    
    // 使用Promise包装wx.request以支持async/await
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}/api/ai/config`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (result) => {
          console.log('配置API响应:', result);
          resolve(result);
        },
        fail: (error) => {
          console.error('配置API请求失败:', error);
          reject(error);
        }
      });
    });

    if (res.statusCode === 200 && res.data) {
      console.log('成功从后端获取AI配置:', res.data);
       return {
        // Include the fetched deepseek config
        deepseek: {
          apiKey: res.data.apiKey,
          baseUrl: res.data.baseUrl,
          model: res.data.model
        },
        // Also include the statically defined resourceApi config
        resourceApi: {
          baseUrl: getBaseUrl(), // Re-evaluate baseUrl in case it changed
          venueListUrl: '/management/items',
          deviceListUrl: '/management/items',
          printerListUrl: '/management/devices/status',
        }
      };
    } else {
      console.error('后端返回的状态码不是200:', res.statusCode);
      throw new Error(`API返回错误: ${res.statusCode}`);
    }
  } catch (error) {
    console.error('获取AI配置失败:', error);
    // 返回默认配置
    return {
      deepseek: {
        apiKey: '',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      },
      resourceApi: {
        baseUrl: getBaseUrl(),
        venueListUrl: '/management/items',
        deviceListUrl: '/management/items',
        printerListUrl: '/management/devices/status',
      }
    };
  }
};

/**
 * AI助手配置
 * 所有与AI助手相关的配置参数都集中在这里
 */
const aiConfig = {
  // 从后端获取配置的方法
  loadConfig,
  
  // DeepSeek API配置 - 这些值将在调用loadConfig后被更新
  deepseek: {
    apiKey: '', // 初始为空，将从后端获取
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  
  // 系统资源API配置（使用现有系统中的API）
  resourceApi: {
    // 使用系统API基础URL，添加fallback
    baseUrl: getBaseUrl(),
    // 场地列表API
    venueListUrl: '/management/items', // 过滤参数?category=venue
    // 设备列表API
    deviceListUrl: '/management/items', // 过滤参数?category=device
    // 打印机列表API
    printerListUrl: '/management/devices/status', // 过滤参数?category=printer
  }
};

module.exports = aiConfig; 