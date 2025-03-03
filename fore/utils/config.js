// API配置
const config = {

  // 是否使用静态数据（用于开发测试）
  useStaticData: false,

  // 设备类型
  deviceTypes: {
    SCREEN: '大屏',
    LAPTOP: '笔记本',
    MICROPHONE: '手持麦',
    GOOSENECK_MIC: '鹅颈麦',
    PROJECTOR: '投屏器',
    SCREWDRIVER: '电动螺丝刀',
    MULTIMETER: '万用表'
  },

  // 场地类型
  venueTypes: {
    LECTURE_HALL: '讲座厅',
    SEMINAR_ROOM: '研讨室',
    MEETING_ROOM: '会议室'
  },

  // 预约状态
  reservationStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    RETURNED: 'returned'
  },

  // 时间段
  timeSlots: {
    MORNING: '上午',
    AFTERNOON: '下午',
    EVENING: '晚上'
  }
};

module.exports = config; 