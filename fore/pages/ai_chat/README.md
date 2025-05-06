# AI助手配置指南

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

## 安全注意事项

1. API密钥仅在后端环境变量中保存，不会出现在前端代码中
2. 前端通过安全API获取密钥，请求需要有效的用户令牌
3. 建议为生产环境设置更严格的CORS策略，限制允许的来源
4. 定期轮换API密钥，提高安全性 