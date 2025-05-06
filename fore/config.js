const config = {
  baseUrl: 'http://localhost:8001/api',
  apiUrl: 'http://localhost:8001/api',  
  apiBaseUrl: 'http://localhost:8001',
  
  // 添加标志来强制使用静态数据
  useStaticData: false,
  
  // 场地类型定义
  venueTypes: [
    { id: 'meeting_room', name: '会议室', type: '会议室' },
    { id: 'lecture_hall', name: '讲座厅', type: '讲座' },
    { id: 'seminar_room', name: '研讨室', type: '研讨室' },
    { id: 'innovation_space', name: '创新工坊', type: '创新空间' }
  ],
  
  // 时间段
  businessTimes: [
    { id: 'morning', name: '上午' },
    { id: 'afternoon', name: '下午' },
    { id: 'evening', name: '晚上' }
  ],
  
  // 设备列表
  devices: [
    { id: 'electric_screwdriver', name: '电动螺丝刀', type: '工具', available_quantity: 5, quantity: 10, status: '可用' },
    { id: 'multimeter', name: '万用表', type: '仪器', available_quantity: 3, quantity: 5, status: '可用' },
    { id: 'oscilloscope', name: '示波器', type: '仪器', available_quantity: 2, quantity: 3, status: '可用' },
    { id: 'soldering_iron', name: '烙铁', type: '工具', available_quantity: 8, quantity: 10, status: '可用' },
    { id: 'arduino_kit', name: 'Arduino套件', type: '开发板', available_quantity: 10, quantity: 15, status: '可用' },
    { id: 'raspberry_pi', name: '树莓派', type: '开发板', available_quantity: 5, quantity: 5, status: '可用' }
  ],
  
  // 打印机列表
  printers: [
    { id: 'printer_1', name: '3D打印机1号' },
    { id: 'printer_2', name: '3D打印机2号' },
    { id: 'printer_3', name: '3D打印机3号' }
  ],

  // 设备需求选项
  deviceOptions: [
    { id: 'screen', name: '大屏' },
    { id: 'laptop', name: '笔记本' },
    { id: 'mic_handheld', name: '手持麦' },
    { id: 'mic_gooseneck', name: '鹅颈麦' },
    { id: 'projector', name: '投屏器' }
  ],
  
  // 场地列表
  venues: [
    { id: 'meeting_room_a', name: '会议室A', type: '会议室', available_quantity: 1, quantity: 1, status: '可用' },
    { id: 'meeting_room_b', name: '会议室B', type: '会议室', available_quantity: 1, quantity: 1, status: '可用' },
    { id: 'lecture_hall', name: '讲座厅', type: '讲座', available_quantity: 1, quantity: 1, status: '可用' },
    { id: 'seminar_room', name: '研讨室A', type: '研讨室', available_quantity: 1, quantity: 1, status: '可用' },
    { id: 'seminar_room_b', name: '研讨室B', type: '研讨室', available_quantity: 1, quantity: 1, status: '可用' },
    { id: 'innovation_space', name: '创新工坊', type: '创新空间', available_quantity: 1, quantity: 1, status: '可用' }
  ],
  
  // 认证Token
  token: '',
  
  // 请求超时时间（毫秒）
  timeout: 10000,
  
  // 调试模式（打印请求日志）
  debug: true,
  
  // 设备类型
  deviceTypes: ['工具', '仪器', '开发板', '展示设备', '音频设备', '其他']
}

// 支持CommonJS
module.exports = config;
// 支持ES模块
export default config; 