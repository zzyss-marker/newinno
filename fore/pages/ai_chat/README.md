# AI助手配置与功能指南

## 功能概述

AI助手是一个智能对话系统，可以帮助用户完成以下任务：

1. **智能对话**：回答用户问题，提供信息和建议
2. **资源预约**：帮助用户预约场地、设备和打印机
3. **信息整理**：从对话中提取关键信息，自动填写预约表单
4. **状态跟踪**：记录预约状态，提供预约确认和反馈

## 预约功能说明

### 预约流程

1. 用户与AI助手对话，表达预约需求
2. AI助手提取关键信息（预约类型、时间、用途等）
3. 用户确认"提交预约"意图
4. 系统显示预约确认窗口，展示从AI对话中提取的最新信息
5. 用户确认后，系统提交预约到后端
6. AI助手显示预约成功消息，包含预约详情

### 支持的预约类型

1. **场地预约**
   - 场地类型：会议室、讲座厅、研讨室等
   - 必填信息：预约日期、时间段、用途
   - 可选信息：设备需求（屏幕、笔记本、麦克风、投影仪）

2. **设备预约**
   - 设备名称：根据系统可用设备列表
   - 必填信息：借用时间、用途说明、使用类型
   - 使用类型：现场使用（无需归还时间）或带走使用（需要归还时间）
   - 可选信息：指导老师姓名

3. **打印机预约**
   - 打印机名称：根据系统可用打印机列表
   - 必填信息：预约日期、开始时间、结束时间
   - 可选信息：预计时长、模型名称、指导老师

### 关键功能实现

1. **信息提取**：使用正则表达式从AI消息中提取关键信息
2. **时间处理**：支持多种时间格式，包括"明天"、"下周五"等自然语言表述
3. **使用类型判断**：根据关键词判断设备是现场使用还是带走使用
4. **数据一致性**：确保确认窗口、提交数据和成功消息中的信息一致
5. **错误处理**：提供友好的错误提示，引导用户提供完整信息

## 后端配置

1. 创建`.env`文件添加DeepSeek API密钥
   在项目根目录创建`.env`文件，添加以下内容：

   ```
   # DeepSeek AI配置
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-chat
   ```

   将`your_deepseek_api_key_here`替换为您的实际DeepSeek API密钥。

2. 重启FastAPI服务
   ```
   python runme.py
   ```

## 前端配置

1. 更新`fore/utils/ai_config.js`文件：

   ```javascript
   // AI助手配置文件
   const config = require('../config.js'); // 导入现有系统配置

   // 动态获取配置
   const loadConfig = async () => {
     try {
       const token = wx.getStorageSync('token');
       const response = await wx.request({
         url: `${config.apiBaseUrl}/api/ai/config`,
         method: 'GET',
         header: {
           'Authorization': `Bearer ${token}`
         }
       });

       if (response.statusCode === 200 && response.data) {
         return {
           deepseek: {
             apiKey: response.data.apiKey,
             baseUrl: response.data.baseUrl,
             model: response.data.model
           }
         };
       }
       throw new Error('无法获取API配置');
     } catch (error) {
       console.error('获取AI配置失败:', error);
       // 返回默认配置
       return {
         deepseek: {
           apiKey: '',
           baseUrl: 'https://api.deepseek.com',
           model: 'deepseek-chat'
         }
       };
     }
   };

   /**
    * AI助手配置
    * 所有与AI助手相关的配置参数都集中在这里
    */
   const aiConfig = {
     // 将从后端获取配置的方法暴露出去
     loadConfig,

     // 后端代理服务配置
     backendProxy: {
       // 后端代理服务的基础URL (使用与系统相同的基础URL)
       baseUrl: `${config.apiBaseUrl}/ai`, // 添加/ai前缀以区分普通API
       // 聊天接口
       chatEndpoint: '/chat',
       // 流式聊天接口
       streamChatEndpoint: '/chat/stream',
     },

     // 系统资源API配置（使用现有系统中的API）
     resourceApi: {
       // 使用系统API基础URL
       baseUrl: config.apiBaseUrl,
       // 场地列表API
       venueListUrl: '/management/items', // 过滤参数?category=venue
       // 设备列表API
       deviceListUrl: '/management/items', // 过滤参数?category=device
       // 打印机列表API
       printerListUrl: '/management/devices/status', // 过滤参数?category=printer
     }
   };

   module.exports = aiConfig;
   ```

2. 更新`fore/pages/ai_chat/ai_chat.js`中的初始化代码：

   在`onLoad`函数中添加加载配置的代码：

   ```javascript
   // 在初始化之前获取配置
   const aiConfigData = await aiConfig.loadConfig();
   console.log('获取到AI配置:', aiConfigData);

   // 更新deepseek配置
   Object.assign(aiConfig.deepseek, aiConfigData.deepseek);
   ```

## 预约功能关键代码说明

### 1. 提取预约信息

```javascript
// 从对话中提取预约数据
extractReservationData(aiContent, messages, type) {
  // 获取最新的AI消息内容
  const recentAIMessages = messages.filter(msg => msg.role === 'assistant').slice(-3);
  const latestAIContent = recentAIMessages.map(msg => msg.content).join(' ');

  // 根据预约类型提取不同的数据
  if (type === 'device') {
    // 提取设备名称、借用时间、归还时间、用途说明等
    const deviceNameMatch = latestAIContent.match(/设备名称[：:]\s*([^,，。\n]+)/);
    const borrowTimeMatch = latestAIContent.match(/借用时间[：:]\s*([^,，。\n]+)/);
    // ...其他信息提取
  }
  // ...其他预约类型处理
}
```

### 2. 确认窗口信息显示

```javascript
// 格式化预约确认信息
formatReservationConfirmation(data, type) {
  if (type === 'device') {
    // 从最新的AI消息中提取设备信息和使用类型
    // 创建一个新的数据对象，优先使用AI消息中提取的信息
    let displayData = {...data};

    // 如果从AI消息中提取到了设备信息，优先使用这些信息
    if (deviceInfoFromAI) {
      // 更新设备名称、借用时间、归还时间、用途说明等
      // 使用displayData替换原始data，确保后续处理使用最新信息
      data = displayData;
    }

    // 构建确认文本，使用最新的数据
    let confirmText = `设备名称: ${data.device_name}\n借用时间: ${data.borrow_time}\n...`;
    return confirmText;
  }
}
```

### 3. 使用类型判断

```javascript
// 检查是否包含现场使用的关键词
if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(content)) {
  usageTypeFromAI = 'onsite';
  console.log("【确认窗口】从AI消息识别为: 现场使用");
  break;
}
// 检查是否包含带走使用的关键词
else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(content)) {
  usageTypeFromAI = 'takeaway';
  console.log("【确认窗口】从AI消息识别为: 带走使用");
  break;
}
```

## 安全注意事项

1. API密钥仅在后端环境变量中保存，不会出现在前端代码中
2. 前端通过安全API获取密钥，请求需要有效的用户令牌
3. 建议为生产环境设置更严格的CORS策略，限制允许的来源
4. 定期轮换API密钥，提高安全性
5. 预约数据提交前进行验证，确保数据完整性和安全性

## 常见问题与解决方案

1. **问题**: 确认窗口信息与AI消息不一致
   **解决**: 确保从最新AI消息中提取信息，并完全替换原始数据

2. **问题**: 时间格式不正确
   **解决**: 使用改进的时间格式化函数，确保保留小时和分钟信息

3. **问题**: 使用类型判断错误
   **解决**: 扩展关键词列表，优化判断逻辑，确保一致性

4. **问题**: 指导老师信息无法正确提取
   **解决**: 改进正则表达式，正确处理特殊情况（如"无"、"可选"等）