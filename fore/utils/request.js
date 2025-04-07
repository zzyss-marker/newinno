import config from '../config'

const baseURL = config.baseUrl  // 使用配置文件中的baseUrl

export const request = async (url, options = {}) => {
  try {
    // 获取 token
    const token = wx.getStorageSync('token')
    
    // 合并 headers
    const headers = {
      ...options.header
    }
    
    // 如果有 token 且不是登录请求，添加 Authorization header
    if (token && !url.includes('/token')) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // 确保URL正确拼接
    const fullUrl = url.startsWith('/') ? baseURL + url : `${baseURL}/${url}`

    console.log('发起请求:', {
      url: fullUrl,
      ...options,
      header: headers
    })

    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: fullUrl,
        ...options,
        header: headers,
        success: (res) => {
          if (res.statusCode === 401) {
            // token过期，清除token并跳转到登录页
            wx.removeStorageSync('token')
            wx.switchTab({
              url: '/pages/my/my'
            })
            reject(new Error('登录已过期，请重新登录'))
          } else if (res.statusCode >= 400) {
            let errorMessage = '请求失败'
            if (res.data.detail) {
              errorMessage = typeof res.data.detail === 'string' 
                ? res.data.detail 
                : Array.isArray(res.data.detail) 
                  ? res.data.detail[0].msg 
                  : '请求失败'
            }
            reject({
              message: errorMessage,
              response: res.data,
              status: res.statusCode
            })
          } else {
            resolve(res.data)
          }
        },
        fail: reject
      })
    })

    return response
  } catch (error) {
    console.error('请求错误:', error)
    throw error
  }
}

export const get = async (url, config = {}) => {
  // 从config中提取data对象作为查询参数
  const { data, ...restConfig } = config;
  
  // 如果有查询参数，将它们添加到URL中
  let finalUrl = url;
  if (data && Object.keys(data).length > 0) {
    const queryParams = Object.entries(data)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    if (queryParams) {
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryParams}`;
    }
  }
  
  return request(finalUrl, {
    method: 'GET',
    ...restConfig
  });
}

export const post = async (url, data, config = {}) => {
  return request(url, {
    method: 'POST',
    data,
    ...config
  })
}

export const put = (url, data, options = {}) => {
  return request(url, {
    method: 'PUT',
    data,
    ...options
  })
}

// 获取可用设备列表
export const getAvailableDevices = async () => {
  return get('/management/devices/status?category=device')
}

// 获取可用场地列表
export const getAvailableVenues = async () => {
  return get('/management/devices/status?category=venue')
}

export default {
  get,
  post,
  put,
  getAvailableDevices,
  getAvailableVenues
} 