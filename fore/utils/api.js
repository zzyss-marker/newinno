import config from '../config'
import { get } from './request'

// 固定场地数据（用于API失败时的备选数据）
export const staticVenues = [
  {
    id: 'venue1',
    name: '会议室A',
    type: '会议室',
    category: 'venue',
    available_quantity: 1,
    quantity: 1,
    status: '可用'
  },
  {
    id: 'venue2',
    name: '会议室B',
    type: '会议室',
    category: 'venue',
    available_quantity: 0,
    quantity: 1,
    status: '已预约'
  },
  {
    id: 'venue3',
    name: '讲座厅',
    type: '讲座',
    category: 'venue',
    available_quantity: 1,
    quantity: 1,
    status: '可用'
  },
  {
    id: 'venue4',
    name: '研讨室A',
    type: '研讨室',
    category: 'venue',
    available_quantity: 1,
    quantity: 1,
    status: '可用'
  },
  {
    id: 'venue5',
    name: '创新工坊',
    type: '创新空间',
    category: 'venue',
    available_quantity: 1,
    quantity: 1,
    status: '可用'
  }
];

// 固定设备数据（用于API失败时的备选数据）
export const staticDevices = [
  {
    id: 'device1',
    name: '电动螺丝刀',
    type: '工具',
    category: 'device',
    available_quantity: 5,
    quantity: 10,
    status: '可用'
  },
  {
    id: 'device2',
    name: '万用表',
    type: '仪器',
    category: 'device',
    available_quantity: 3,
    quantity: 5,
    status: '可用'
  },
  {
    id: 'device3',
    name: '示波器',
    type: '仪器',
    category: 'device',
    available_quantity: 2,
    quantity: 3,
    status: '可用'
  },
  {
    id: 'device4',
    name: '烙铁',
    type: '工具',
    category: 'device',
    available_quantity: 0,
    quantity: 8,
    status: '已借出'
  },
  {
    id: 'device5',
    name: 'Arduino套件',
    type: '开发板',
    category: 'device',
    available_quantity: 10,
    quantity: 15,
    status: '可用'
  },
  {
    id: 'device6',
    name: '树莓派',
    type: '开发板',
    category: 'device',
    available_quantity: 0,
    quantity: 5,
    status: '已借出'
  }
];

// 获取场地列表
export const getVenueList = async () => {
  try {
    // 如果配置为使用静态数据，直接返回
    if (config.useStaticData) {
      console.log('根据配置使用静态场地数据');
      return config.venues || staticVenues;
    }

    // 从FastAPI后端获取场地数据
    console.log('正在从FastAPI后端获取场地数据');
    const result = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/items`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          console.log('场地数据API响应:', res);
          if (res.statusCode === 200 && res.data) {
            // 过滤并处理返回的场地数据
            const venues = res.data
              .filter(item => item.category === 'venue')
              .map(item => ({
                id: item.id.toString(),
                name: item.name,
                type: item.type || determineVenueType(item.name),
                category: item.category,
                available_quantity: item.available_quantity,
                quantity: item.quantity,
                status: convertStatus(item.status)
              }));
            resolve(venues);
          } else {
            console.error('场地API返回异常状态码:', res.statusCode);
            reject(new Error(`获取场地数据失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('场地API请求失败:', err);
          reject(err);
        }
      });
    });
    return result;
  } catch (error) {
    console.error('API获取场地数据失败，使用静态数据', error);
    return config.venues || staticVenues;
  }
};

// 获取设备列表
export const getDeviceList = async () => {
  try {
    // 如果配置为使用静态数据，直接返回
    if (config.useStaticData) {
      console.log('根据配置使用静态设备数据');
      return config.devices || staticDevices;
    }

    // 从FastAPI后端获取设备数据
    console.log('正在从FastAPI后端获取设备数据');
    const result = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/items`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          console.log('设备数据API响应:', res);
          if (res.statusCode === 200 && res.data) {
            // 过滤并处理返回的设备数据
            const devices = res.data
              .filter(item => item.category === 'device')
              .map(item => ({
                id: item.id.toString(),
                name: item.name,
                type: item.type || determineDeviceType(item.name),
                category: item.category,
                available_quantity: item.available_quantity,
                quantity: item.quantity,
                status: convertStatus(item.status)
              }));
            resolve(devices);
          } else {
            console.error('设备API返回异常状态码:', res.statusCode);
            reject(new Error(`获取设备数据失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('设备API请求失败:', err);
          reject(err);
        }
      });
    });
    return result;
  } catch (error) {
    console.error('API获取设备数据失败，使用静态数据', error);
    return config.devices || staticDevices;
  }
};

// 从FastAPI后端获取所有资源
export const getResourcesFromManagement = async () => {
  try {
    // 如果配置为使用静态数据，直接返回合并的列表
    if (config.useStaticData) {
      console.log('根据配置使用静态资源数据');
      const allResources = [...(config.devices || staticDevices), ...(config.venues || staticVenues)];
      return allResources;
    }

    // 从FastAPI后端获取所有资源
    console.log('正在从FastAPI后端获取所有资源');
    const result = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.apiBaseUrl}/management/items`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          console.log('管理系统API响应:', res);
          if (res.statusCode === 200 && res.data) {
            // 处理返回的资源数据
            const resources = res.data.map(item => ({
              id: item.id.toString(),
              name: item.name,
              type: item.type || (item.category === 'device' ? determineDeviceType(item.name) : determineVenueType(item.name)),
              category: item.category,
              available_quantity: item.available_quantity,
              quantity: item.quantity,
              status: convertStatus(item.status)
            }));
            resolve(resources);
          } else {
            console.error('管理系统API返回异常状态码:', res.statusCode);
            reject(new Error(`获取管理系统数据失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('管理系统API请求失败:', err);
          reject(err);
        }
      });
    });
    return result;
  } catch (error) {
    console.error('API获取资源数据失败，使用静态数据', error);
    const allResources = [...(config.devices || staticDevices), ...(config.venues || staticVenues)];
    return allResources;
  }
};

// 根据设备名称判断设备类型
function determineDeviceType(name) {
  if (!name) return '其他';
  
  if (name.includes('电动') || name.includes('螺丝')) return '工具';
  if (name.includes('万用表') || name.includes('示波器')) return '仪器';
  if (name.includes('烙铁')) return '工具';
  if (name.includes('Arduino')) return '开发板';
  if (name.includes('树莓派')) return '开发板';
  if (name.includes('麦') || name.includes('屏') || name.includes('投影')) return '会议设备';
  
  return '其他';
}

// 根据场地名称判断场地类型
function determineVenueType(name) {
  if (!name) return '其他';
  
  const typeMap = {
    '会议室': '会议室',
    '讲座': '讲座',
    '研讨': '研讨室',
    '创新': '创新空间',
    '工坊': '创新空间',
    '东南大学': '学院场地',
    '学院': '学院场地'
  };
  
  for (const [keyword, type] of Object.entries(typeMap)) {
    if (name.includes(keyword)) {
      return type;
    }
  }
  
  return '其他';
}

// 转换状态为中文
function convertStatus(status) {
  if (status === 'available') return '可用';
  if (status === 'maintenance') return '维护中';
  if (status === 'reserved') return '已预约';
  if (status === 'borrowed') return '已借出';
  return status;
}

// 根据类型获取可用设备
export const getAvailableDevices = async (type) => {
  try {
    const devices = await getDeviceList();
    if (type) {
      return devices.filter(device => device.type === type && device.available_quantity > 0);
    }
    return devices.filter(device => device.available_quantity > 0);
  } catch (error) {
    console.error('获取可用设备失败', error);
    // 如果API失败，使用静态数据
    if (type) {
      return staticDevices.filter(device => device.type === type && device.available_quantity > 0);
    }
    return staticDevices.filter(device => device.available_quantity > 0);
  }
};

// 根据类型获取可用场地
export const getAvailableVenues = async (type) => {
  try {
    const venues = await getVenueList();
    if (type) {
      return venues.filter(venue => venue.type === type && venue.available_quantity > 0);
    }
    return venues.filter(venue => venue.available_quantity > 0);
  } catch (error) {
    console.error('获取可用场地失败', error);
    // 如果API失败，使用静态数据
    if (type) {
      return staticVenues.filter(venue => venue.type === type && venue.available_quantity > 0);
    }
    return staticVenues.filter(venue => venue.available_quantity > 0);
  }
};

export default {
  getVenueList,
  getDeviceList,
  getAvailableDevices,
  getAvailableVenues,
  getResourcesFromManagement,
  staticVenues,
  staticDevices
} 