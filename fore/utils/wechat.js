/**
 * 微信订阅消息工具函数
 */

const { post } = require('./request.js');

/**
 * 请求订阅消息授权
 * @param {Array} templateIds - 模板ID数组
 * @returns {Promise}
 */
function requestSubscribeMessage(templateIds) {
  return new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds: templateIds,
      success(res) {
        console.log('订阅消息授权结果:', res);
        resolve(res);
      },
      fail(err) {
        console.error('订阅消息授权失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 保存用户openid到后端
 * @param {String} openid - 用户openid
 * @returns {Promise}
 */
function saveOpenid(openid) {
  return post('wechat/save-openid', { openid });
}

/**
 * 检查用户是否已保存openid
 * @returns {Promise}
 */
function checkOpenid() {
  const { get } = require('./request.js');
  return get('wechat/check-openid');
}

/**
 * 管理员登录后保存openid
 * 用于接收新预约通知
 */
async function saveAdminOpenidOnLogin() {
  try {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || userInfo.role !== 'admin') {
      return; // 非管理员不需要保存
    }

    // 检查是否已保存
    const checkResult = await checkOpenid();
    if (checkResult.has_openid) {
      console.log('管理员openid已保存');
      return;
    }

    // 获取openid (需要先调用wx.login)
    wx.login({
      success: async (loginRes) => {
        if (loginRes.code) {
          try {
            console.log('开始获取openid, code:', loginRes.code);
            
            // 调用后端接口,用code换取openid
            const openidRes = await post('auth/wx-login', { code: loginRes.code });
            
            if (openidRes.success && openidRes.openid) {
              console.log('获取openid成功:', openidRes.openid);
              
              // 保存openid到后端
              const saveRes = await saveOpenid(openidRes.openid);
              console.log('保存openid成功:', saveRes);
            } else {
              console.error('获取openid失败:', openidRes);
            }
          } catch (err) {
            console.error('获取或保存openid失败:', err);
          }
        }
      },
      fail: (err) => {
        console.error('wx.login失败:', err);
      }
    });
  } catch (err) {
    console.error('保存管理员openid失败:', err);
  }
}

/**
 * 提交预约前请求订阅消息
 * 用户订阅后才能接收审核结果通知
 */
async function requestReservationNotification() {
  const templateIds = [
    'KiTkGifr3cpXwS9Otu4xXEoPHbvr3jPnqn5phDs_e-c' // 审核通过提醒
  ];

  try {
    // 先确保用户已保存openid
    await ensureUserOpenid();
    
    // 请求订阅消息授权
    const res = await requestSubscribeMessage(templateIds);
    console.log('用户订阅消息成功');
    return true;
  } catch (err) {
    console.log('用户取消订阅或订阅失败');
    return false;
  }
}

/**
 * 确保用户已保存openid
 */
async function ensureUserOpenid() {
  try {
    // 检查是否已保存
    const checkResult = await checkOpenid();
    if (checkResult.has_openid) {
      return;
    }

    // 获取openid
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (loginRes) => {
          if (loginRes.code) {
            try {
              // 调用后端接口,用code换取openid
              const openidRes = await post('auth/wx-login', { code: loginRes.code });
              
              if (openidRes.success && openidRes.openid) {
                // 保存openid到后端
                await saveOpenid(openidRes.openid);
                console.log('用户openid保存成功');
                resolve();
              } else {
                reject(new Error('获取openid失败'));
              }
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('wx.login失败'));
          }
        },
        fail: reject
      });
    });
  } catch (err) {
    console.error('确保用户openid失败:', err);
    // 不抛出错误,允许继续流程
  }
}

/**
 * 管理员订阅新预约通知
 */
async function requestAdminNotification() {
  const templateIds = [
    '2B61tVjum-KF987XZt9HBfcZsE7EGvysP7AfKe2biQg' // 预约申请处理通知
  ];

  try {
    const res = await requestSubscribeMessage(templateIds);
    console.log('管理员订阅消息成功');
    return true;
  } catch (err) {
    console.log('管理员取消订阅或订阅失败');
    return false;
  }
}

module.exports = {
  requestSubscribeMessage,
  saveOpenid,
  checkOpenid,
  saveAdminOpenidOnLogin,
  requestReservationNotification,
  requestAdminNotification,
  ensureUserOpenid
};
