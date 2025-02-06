import config from '../config'

const baseURL = 'http://localhost:8001/api'  // 确保端口号与后端一致

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

    console.log('发起请求:', {
      url: baseURL + url,
      ...options,
      header: headers
    })

    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: baseURL + url,
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
  return request(url, {
    method: 'GET',
    ...config
  })
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

export default {
  get,
  post,
  put
} 