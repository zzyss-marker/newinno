const config = {
  baseUrl: 'http://localhost:8001/api',
  
  // 预约类型
  venueTypes: [
    { id: 'lecture', name: '讲座' },
    { id: 'seminar', name: '研讨室' },
    { id: 'meeting_room', name: '会议室' }
  ],
  
  // 时间段
  businessTimes: [
    { id: 'morning', name: '上午' },
    { id: 'afternoon', name: '下午' },
    { id: 'evening', name: '晚上' }
  ],
  
  // 设备列表
  devices: [
    { id: 'electric_screwdriver', name: '电动螺丝刀' },
    { id: 'multimeter', name: '万用表' }
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
  ]
}

export default config 