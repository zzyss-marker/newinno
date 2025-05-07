// pages/ai_chat/ai_chat.js
const app = getApp(); // 获取全局应用实例
const config = require('../../config.js'); // 导入系统配置
const aiConfig = require('../../utils/ai_config.js'); // 导入AI助手配置
const { post, get } = require('../../utils/request.js'); // 导入请求工具

// 确保config正确加载
console.log("加载的config:", config);
Page({
  /**
   * 页面初始数据
   */
  data: {
    messages: [], // 存储对话历史 { role: 'user' | 'assistant', content: '...' }
    inputValue: '', // 当前用户输入
    inputFocus: false, // 输入框是否获取焦点
    isLoading: false, // AI是否正在响应
    scrollToView: '', // 要滚动到的视图ID
    isLoggedIn: false, // 用户是否登录
    aiCredentialsReady: false, // AI凭证是否准备好
    maxRetries: 3, // 最大重试次数
    retryDelay: 2000, // 重试延迟（毫秒）
    retryCount: 0, // 当前重试次数
    configLoadAttempted: false, // 是否已尝试加载配置
    // 当前时间相关
    currentDate: '', // 当前日期，格式：YYYY-MM-DD
    currentTime: '', // 当前时间，格式：HH:MM:SS
    currentDateTime: '', // 当前日期时间，格式：YYYY-MM-DDThh:mm:ss
    // 可用资源列表
    availableResources: {
      venues: [], // 可用场地列表
      equipment: [], // 可用设备列表
      printers: [] // 可用打印机列表
    },
    // 预约相关状态
    reservationState: {
      isCollecting: false, // 是否正在收集预约信息
      type: '', // 预约类型：venue, device, printer
      data: {}, // 收集到的预约数据
      step: '', // 当前收集步骤
      complete: false // 是否收集完成
    },
    systemPrompt: `你是一只可爱的小猫咪，是创新工坊的场地和设备使用助手，喵～
1.你的主要任务是根据用户的需求,提供创新工坊的场地、设备和3D打印机使用的建议与相关信息,尽可能满足用户的请求。
2.你需要回答与创新工坊的场地使用、设备使用、3D打印机使用、预约流程以及相关设备场地有关知识点的问题喵～
3.你的语气要可爱、亲切，让用户感到轻松愉快喵～
4.回答要简洁明了，不要太长哦，但可以适度加点可爱小尾巴或者语气助词，比如"喵"、"呐"、"嘿嘿"等～
5.当用户表示有预约意图时，你可以帮助他们收集预约信息，并提供两种选择：
   a. 引导用户使用预约功能：告诉用户可以点击首页的相应预约入口自行操作
   b. 帮助用户提交预约：你可以收集必要的预约信息，然后告诉用户你可以帮他们提交预约
6.如果用户希望你帮忙提交预约，请收集以下信息：
   - 场地预约：
     * 场地类型：必须是系统中存在的场地名称，请参考下方的"可用场地列表"
     * 预约日期：格式为YYYY-MM-DD
     * 时间段：必须是上午/下午/晚上中的一个
     * 用途说明：简要描述用途
     * 是否需要设备：屏幕/笔记本/麦克风等，回答是/否
   - 设备预约：
     * 设备名称：必须是系统中存在的设备名称，请参考下方的"可用设备列表"
     * 借用时间：格式为YYYY-MM-DD hh:mm:ss
     * 归还时间：格式为YYYY-MM-DD hh:mm:ss（如果是现场使用则不需要填写）
     * 用途说明：简要描述用途
     * 使用类型：必须是带走使用或现场使用
     * 指导老师姓名：可选
   - 打印机预约：
     * 打印机名称：必须是系统中存在的打印机名称，请参考下方的"可用打印机列表"
     * 预约日期：格式为YYYY-MM-DD
     * 开始时间：格式为YYYY-MM-DD hh:mm:ss
     * 结束时间：格式为YYYY-MM-DD hh:mm:ss
     * 预计打印时长：分钟数
     * 打印模型名称：可选
     * 指导老师姓名：可选
7.收集信息时，请严格使用系统提供的可用资源列表中的名称，不要使用不存在的资源名称。
8.收集完信息后，请将所有收集到的信息整理成表格形式展示给用户，并询问"这些信息是否正确？如果正确，请回复'确认提交'，我会帮你提交预约。"
9.除了创新工坊的事情，你还可以和用户聊点轻松的话题哦～
10.请用纯文本回答，不要用markdown格式，也不要加特殊符号喵～
11.重要：系统可以识别多种确认提交的表述，包括"确认提交"、"确定提交"、"提交预约"、"确认预约"等，用户只需表达确认的意思即可。
12.对于设备预约，如果用户选择"现场使用"，则不需要提供归还时间。
`,
    loadedAiConfig: null, // 将加载的配置存储在这里
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function(options) {
    console.log("AI Chat Page: onLoad triggered.");
    // 初始化当前时间
    this.updateCurrentTime();
    // 设置定时器，每分钟更新一次时间
    this.timeUpdateInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 60000); // 每分钟更新一次
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 清除定时器
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  },

  /**
   * 更新当前时间
   */
  updateCurrentTime: function() {
    const now = new Date();

    // 格式化日期：YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // 格式化时间：HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    // 格式化日期时间：YYYY-MM-DDThh:mm:ss
    const formattedDateTime = `${formattedDate}T${formattedTime}`;

    console.log("更新当前时间:", formattedDateTime);

    this.setData({
      currentDate: formattedDate,
      currentTime: formattedTime,
      currentDateTime: formattedDateTime
    });

    // 更新系统提示词中的当前时间信息
    this.updateSystemPromptWithTime();
  },

  /**
   * 更新系统提示词中的时间信息
   */
  updateSystemPromptWithTime: function() {
    // 获取基础系统提示词
    let basePrompt = this.data.systemPrompt;

    // 保留资源列表信息（如果存在）
    let resourceInfo = '';
    if (basePrompt.includes("以下是当前可用的资源参考：")) {
      const parts = basePrompt.split("\n\n以下是当前可用的资源参考：");
      basePrompt = parts[0];
      if (parts.length > 1) {
        // 如果资源信息后面还有时间信息，需要再次分割
        const resourcePart = parts[1].split("\n\n当前时间信息：")[0];
        resourceInfo = "\n\n以下是当前可用的资源参考：" + resourcePart;
      }
    }

    // 如果已经包含时间信息，先移除
    if (basePrompt.includes("当前时间信息：")) {
      basePrompt = basePrompt.split("\n\n当前时间信息：")[0];
    }

    // 添加当前时间信息
    const timeInfo = `\n\n当前时间信息：\n- 当前日期：${this.data.currentDate}\n- 当前时间：${this.data.currentTime}`;

    // 更新系统提示词，保留资源列表信息
    this.setData({
      systemPrompt: basePrompt + resourceInfo + timeInfo
    });

    console.log("系统提示词中的时间信息已更新");
  },

  /**
   * 生命周期函数--监听页面显示
   * 每次页面显示时都会调用，适合检查登录状态和获取配置
   */
  async onShow() {
    console.log("AI Chat Page: onShow triggered.");
    // 检查是否已成功加载配置，如果已加载则不再重复执行
    if (this.data.aiCredentialsReady) {
        console.log("AI Chat Page: AI credentials already loaded, skipping initialization.");
        // 如果需要，可以在这里刷新消息或其他UI元素
        this.scrollToBottom(); // 确保滚动到底部
        return;
    }

    // 重置尝试加载配置的标志
    this.setData({ configLoadAttempted: false, retryCount: 0 });

    // 检查登录状态
    const token = wx.getStorageSync('token');
    const isLoggedIn = !!token;
    this.setData({ isLoggedIn: isLoggedIn });

    if (isLoggedIn) {
        console.log("AI Chat Page: User is logged in.");
        if (!this.data.configLoadAttempted) {
            this.setData({ configLoadAttempted: true }); // 标记已尝试加载
            await this.loadAiConfiguration();
        }
    } else {
        console.warn("AI Chat Page: User not logged in. AI features disabled.");
        this.setData({ aiCredentialsReady: false }); // 确保凭证状态为 false
        this.showLoginPrompt();
    }
     // 每次显示时初始化或确保欢迎消息存在
    this.initWelcomeMessage();
    this.scrollToBottom(); // 确保显示时滚动到底部
  },

  // 初始化欢迎消息 (如果还没有消息)
  initWelcomeMessage() {
      if (this.data.messages.length === 0) {
          this.setData({
              messages: [{ role: 'assistant', content: '喵好呀！我是创新工坊的AI小助手喵～有什么可以帮你的吗？嘿嘿～' }],
          });
           // 确保初始消息显示后滚动到底部
          this.scrollToBottom(50); // 稍作延迟以等待渲染
      }
  },

  // 加载 AI 配置
  async loadAiConfiguration(isRetry = false) {
    if (!isRetry) {
      this.setData({ isLoading: true, retryCount: 0 }); // 首次加载时显示加载状态并重置计数
    } else {
      this.setData({ isLoading: true }); // 重试时仅显示加载状态
    }
    console.log(`AI Chat Page: Attempting to load AI configuration (Attempt ${this.data.retryCount + 1})...`);

    try {
      // 调用 loadConfig 并存储结果
      const loadedConfigData = await aiConfig.loadConfig();

      // 检查返回的配置是否有效 (例如, 包含 deepseek apiKey)
      if (loadedConfigData && loadedConfigData.deepseek && loadedConfigData.deepseek.apiKey) {
        console.log("AI Chat Page: AI configuration loaded successfully.", loadedConfigData);

        // 将加载的配置存储在页面数据中
        this.setData({
          loadedAiConfig: loadedConfigData, // 存储配置
          aiCredentialsReady: true,
          isLoading: false,
          retryCount: 0 // 成功后重置重试计数
        });
        // 配置加载成功，可以移除提示或进行其他操作

        // 配置加载成功后，获取资源列表并更新系统提示
        await this.fetchResourcesAndUpdatePrompt();
        console.log("AI Chat Page: Finished calling fetchResourcesAndUpdatePrompt."); // Log after the call

      } else {
        throw new Error("loadConfig returned false"); // 主动抛出错误以便捕获和重试
      }
    } catch (error) {
      console.error("AI Chat Page: Failed to load AI configuration:", error);
      const currentRetryCount = this.data.retryCount;
      if (currentRetryCount < this.data.maxRetries) {
        this.setData({ retryCount: currentRetryCount + 1 });
        console.log(`AI Chat Page: Retrying AI config load in ${this.data.retryDelay / 1000} seconds...`);
        setTimeout(() => this.loadAiConfiguration(true), this.data.retryDelay); // 进行重试
      } else {
        console.error(`AI Chat Page: AI config load failed after ${this.data.maxRetries + 1} attempts.`);
        this.setData({
          isLoading: false,
          aiCredentialsReady: false, // 确保凭证状态为 false
        });
        this.showConfigError();
      }
    }
  },

  // 显示登录提示
  showLoginPrompt() {
    wx.showModal({
      title: '请先登录',
      content: 'AI聊天功能需要登录后才能使用。',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页面或个人中心页面
          wx.switchTab({ // 假设登录入口在 '我的' 页面
            url: '/pages/profile/profile'
          });
        }
      }
    });
  },

  // 显示配置加载错误
  showConfigError() {
    wx.showToast({
      title: '无法加载AI配置',
      icon: 'error',
      duration: 3000
    });
     // 可选：添加更详细的提示
     this.addMessage('system', '抱歉，无法连接到AI服务。请检查网络或稍后再试。');
  },

  // 获取资源列表并更新系统提示词
  async fetchResourcesAndUpdatePrompt() {
     console.log("AI Chat Page: Fetching resources to update system prompt...");
     wx.showLoading({ title: '加载资源列表...' }); // 显示加载提示

     try {
         // 确保配置已加载
         if (!this.data.loadedAiConfig) {
             throw new Error("AI configuration not loaded before fetching resources.");
         }

         // 尝试从API获取资源列表
         let venues = [], equipment = [], printers = [];

         try {
             // 并行获取所有资源列表
             [venues, equipment, printers] = await Promise.all([
                 this.getVenueList(),
                 this.getEquipmentList(),
                 this.getPrinterList()
             ]);
         } catch (apiError) {
             console.error("API获取资源列表失败，将使用静态数据:", apiError);
             // 如果API请求失败，使用配置文件中的静态列表
             const config = require('../../config.js');

             // 从配置文件获取场地列表
             if (config.venues && Array.isArray(config.venues)) {
                 venues = config.venues.map(venue => ({
                     id: venue.id,
                     name: venue.name
                 }));
             }

             // 从配置文件获取设备列表
             if (config.devices && Array.isArray(config.devices)) {
                 equipment = config.devices.map(device => ({
                     id: device.id,
                     name: device.name
                 }));
             }

             // 从配置文件获取打印机列表
             if (config.printers && Array.isArray(config.printers)) {
                 printers = config.printers.map(printer => ({
                     id: printer.id,
                     name: printer.name
                 }));
             }
         }

         // 将资源列表存储在页面数据中，以便在预约验证时使用
         this.setData({
             availableResources: {
                 venues: venues,
                 equipment: equipment,
                 printers: printers
             }
         });

         console.log("存储可用资源列表:", {
             venues: venues.length,
             equipment: equipment.length,
             printers: printers.length
         });

         // 格式化资源列表，使其更加清晰易读
         let venueNames = '暂无场地信息';
         if (venues.length > 0) {
             venueNames = venues.map(v => v.name).join('、');
         }

         let equipmentNames = '暂无设备信息';
         if (equipment.length > 0) {
             equipmentNames = equipment.map(e => e.name).join('、');
         }

         let printerNames = '暂无打印机信息';
         if (printers.length > 0) {
             printerNames = printers.map(p => p.name).join('、');
         }

         console.log("格式化后的资源列表:", { venueNames, equipmentNames, printerNames });

         // 获取基础系统提示 (从 data 中获取初始定义的 prompt)
         let baseSystemPrompt = this.data.systemPrompt;

         // 移除已有的资源列表信息（如果存在）
         if (baseSystemPrompt.includes('以下是当前可用的资源参考：')) {
             baseSystemPrompt = baseSystemPrompt.split('\n\n以下是当前可用的资源参考：')[0];
         }

         // 移除已有的当前时间信息（如果存在），稍后会重新添加
         if (baseSystemPrompt.includes('当前时间信息：')) {
             baseSystemPrompt = baseSystemPrompt.split('\n\n当前时间信息：')[0];
         }

         // 动态添加资源列表信息，使用更明确的格式
         const resourceInfo = `\n\n以下是当前可用的资源参考：\n- 可用场地列表：${venueNames}\n- 可用设备列表：${equipmentNames}\n- 可用打印机列表：${printerNames}\n\n重要提示：预约时必须使用上述列表中的确切名称，不要使用不存在的资源名称。`;

         // 添加资源ID映射信息（用于系统内部使用）
         const mappingInfo = this.createResourceMappingInfo();

         // 添加当前时间信息
         const timeInfo = `\n\n当前时间信息：\n- 当前日期：${this.data.currentDate}\n- 当前时间：${this.data.currentTime}`;

         // 更新 data 中的 systemPrompt
         const finalPrompt = baseSystemPrompt + resourceInfo + mappingInfo + timeInfo;
         this.setData({
             systemPrompt: finalPrompt
         });

         console.log("系统提示词已更新，包含资源列表和时间信息");
         wx.hideLoading(); // 隐藏加载提示

     } catch (error) {
         console.error("AI Chat Page: Failed to fetch resources or update prompt:", error);
         wx.hideLoading(); // 隐藏加载提示
         wx.showToast({
             title: '资源列表加载失败',
             icon: 'none',
             duration: 2000
         });

         // 即使失败，也确保使用基础提示词和静态资源列表
         try {
             // 获取配置文件中的静态列表
             const config = require('../../config.js');
             let staticVenues = '暂无场地信息';
             let staticEquipment = '暂无设备信息';
             let staticPrinters = '暂无打印机信息';

             if (config.venues && Array.isArray(config.venues)) {
                 staticVenues = config.venues.map(venue => venue.name).join('、');
             }

             if (config.devices && Array.isArray(config.devices)) {
                 staticEquipment = config.devices.map(device => device.name).join('、');
             }

             if (config.printers && Array.isArray(config.printers)) {
                 staticPrinters = config.printers.map(printer => printer.name).join('、');
             }

             // 获取基础系统提示
             let baseSystemPrompt = this.data.systemPrompt;
             if (baseSystemPrompt.includes('以下是当前可用的资源参考：')) {
                 baseSystemPrompt = baseSystemPrompt.split('\n\n以下是当前可用的资源参考：')[0];
             }
             if (baseSystemPrompt.includes('当前时间信息：')) {
                 baseSystemPrompt = baseSystemPrompt.split('\n\n当前时间信息：')[0];
             }

             // 添加静态资源列表
             const staticResourceInfo = `\n\n以下是当前可用的资源参考：\n- 可用场地列表：${staticVenues}\n- 可用设备列表：${staticEquipment}\n- 可用打印机列表：${staticPrinters}\n\n重要提示：预约时必须使用上述列表中的确切名称，不要使用不存在的资源名称。`;

             // 先更新可用资源列表
             this.setData({
                 availableResources: {
                     venues: config.venues || [],
                     equipment: config.devices || [],
                     printers: config.printers || []
                 }
             });

             // 添加资源ID映射信息
             const mappingInfo = this.createResourceMappingInfo();

             // 添加当前时间信息
             const timeInfo = `\n\n当前时间信息：\n- 当前日期：${this.data.currentDate}\n- 当前时间：${this.data.currentTime}`;

             // 更新系统提示词
             this.setData({
                 systemPrompt: baseSystemPrompt + staticResourceInfo + mappingInfo + timeInfo
             });

             console.log("使用静态资源列表更新系统提示词");
         } catch (fallbackError) {
             console.error("使用静态资源列表失败:", fallbackError);
             // 如果连静态列表也失败了，只使用基础提示词
             let baseSystemPrompt = this.data.systemPrompt;
             if (baseSystemPrompt.includes('以下是当前可用的资源参考：')) {
                 baseSystemPrompt = baseSystemPrompt.split('\n\n以下是当前可用的资源参考：')[0];
             }

             // 添加当前时间信息
             const timeInfo = `\n\n当前时间信息：\n- 当前日期：${this.data.currentDate}\n- 当前时间：${this.data.currentTime}`;

             this.setData({
                 systemPrompt: baseSystemPrompt + timeInfo,
                 availableResources: {
                     venues: [],
                     equipment: [],
                     printers: []
                 }
             });
         }
     }
 },

 /**
  * 获取场地列表 - 使用系统实际API
  */
 getVenueList() {
   console.log("AI Chat Page: getVenueList called."); // Log function entry
   // 从 this.data 获取配置
   const resourceApiConfig = this.data.loadedAiConfig?.resourceApi;
   if (!resourceApiConfig || !resourceApiConfig.baseUrl || !resourceApiConfig.venueListUrl) {
       console.error("Missing resource API config for venues");
       return Promise.resolve([]); // 返回空数组
   }
   const token = wx.getStorageSync('token');
   return new Promise((resolve, reject) => {
     wx.request({
       url: `${resourceApiConfig.baseUrl}${resourceApiConfig.venueListUrl}`,
       method: 'GET',
       header: {
         'Content-Type': 'application/json',
         'Authorization': token ? `Bearer ${token}` : ''
       },
       success: (res) => {
         console.log("Venue List API Response:", res); // Log API success response
         if (res.statusCode === 200 && Array.isArray(res.data)) {
           const venues = res.data
             .filter(item => item.category === 'venue') // 确保只包含场地
             .map(item => ({
               id: item.id?.toString() || 'unknown',
               name: item.name || '未知场地',
               // 添加其他可能需要的字段...
             }));
           console.log("Fetched Venues:", venues);
           resolve(venues);
         } else {
           console.error('Venue API returned non-array or error:', res);
           resolve([]); // 出错时返回空数组
         }
       },
       fail: (err) => {
         console.error('Venue request failed:', err);
         console.error("Detailed Venue API Fail Error:", err); // Log detailed API failure
         reject(err); // Promise失败
       }
     });
   });
 },

 /**
  * 获取设备列表 - 使用系统实际API
  */
 getEquipmentList() {
    console.log("AI Chat Page: getEquipmentList called."); // Log function entry
    // 从 this.data 获取配置
    const resourceApiConfig = this.data.loadedAiConfig?.resourceApi;
    if (!resourceApiConfig || !resourceApiConfig.baseUrl || !resourceApiConfig.deviceListUrl) {
        console.error("Missing resource API config for equipment");
        return Promise.resolve([]);
    }
    const token = wx.getStorageSync('token');
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${resourceApiConfig.baseUrl}${resourceApiConfig.deviceListUrl}`, // 使用正确的设备URL
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          console.log("Equipment List API Response:", res); // Log API success response
          if (res.statusCode === 200 && Array.isArray(res.data)) {
            const equipment = res.data
              .filter(item => item.category === 'device') // 确保只包含设备
              .map(item => ({
                id: item.id?.toString() || 'unknown',
                name: item.name || '未知设备',
              }));
            console.log("Fetched Equipment:", equipment);
            resolve(equipment);
          } else {
            console.error('Equipment API returned non-array or error:', res);
            resolve([]);
          }
        },
        fail: (err) => {
          console.error('Equipment request failed:', err);
          console.error("Detailed Equipment API Fail Error:", err); // Log detailed API failure
          reject(err);
        }
      });
    });
 },

 /**
  * 获取打印机列表 - 使用系统实际API
  */
 getPrinterList() {
     console.log("AI Chat Page: getPrinterList called."); // Log function entry
     // 从 this.data 获取配置
     const resourceApiConfig = this.data.loadedAiConfig?.resourceApi;
     // 注意：打印机可能和设备使用相同的API端点，但用 category 区分
     const urlToUse = resourceApiConfig?.printerListUrl || resourceApiConfig?.deviceListUrl;
     if (!resourceApiConfig || !resourceApiConfig.baseUrl || !urlToUse) {
         console.error("Missing resource API config for printers");
         return Promise.resolve([]);
     }
     const token = wx.getStorageSync('token');
     return new Promise((resolve, reject) => {
         // 附加查询参数以明确请求打印机类别（如果API支持）
         const requestUrl = `${resourceApiConfig.baseUrl}${urlToUse}?category=printer`;
         console.log("Requesting Printers from URL:", requestUrl);

         wx.request({
             url: requestUrl,
             method: 'GET',
             header: {
                 'Content-Type': 'application/json',
                 'Authorization': token ? `Bearer ${token}` : ''
             },
             success: (res) => {
                 console.log("Printer List API Response:", res); // Log API success response
                 if (res.statusCode === 200 && Array.isArray(res.data)) {
                      // 再次过滤确保是打印机
                     const printers = res.data
                         .filter(item => item.category === 'printer')
                         .map(item => ({
                             id: item.id?.toString() || 'unknown',
                             name: item.name || '未知打印机',
                             // 添加其他可能需要的字段...
                         }));
                      console.log("Fetched Printers:", printers);
                      resolve(printers);
                 } else {
                     console.error('Printer API returned non-array or error:', res);
                      // 即使API没返回预期数据，也尝试从设备列表过滤 (如果 printerListUrl 未定义)
                      if (!resourceApiConfig.printerListUrl && Array.isArray(res.data)) {
                         const printersFromDevices = res.data
                              .filter(item => item.category === 'printer') // 假设设备API也返回打印机
                              .map(item => ({ id: item.id?.toString() || 'unknown', name: item.name || '未知打印机' }));
                          if (printersFromDevices.length > 0) {
                              console.log("Fetched Printers (fallback from device list):", printersFromDevices);
                              resolve(printersFromDevices);
                              return;
                          }
                      }
                     resolve([]); // 最终返回空列表
                 }
             },
             fail: (err) => {
                 console.error('Printer request failed:', err);
                 console.error("Detailed Printer API Fail Error:", err); // Log detailed API failure
                 reject(err);
             }
         });
     });
 },

  // 添加消息到列表（包括系统消息）
  addMessage(role, content) {
    const newMessage = { role, content };
    this.setData({
      messages: [...this.data.messages, newMessage]
    });
    this.scrollToBottom();
  },

  // 更新输入值
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 输入框获取焦点
  onInputFocus() {
    this.setData({
      inputFocus: true
    });
    this.scrollToBottom(100); // 输入框聚焦时尝试滚动，给键盘弹出留点时间
  },

  // 输入框失去焦点
  onInputBlur() {
    this.setData({
      inputFocus: false
    });
  },

  // 发送消息逻辑
  async sendMessage() {
    const userMessageContent = this.data.inputValue.trim();
    if (!userMessageContent || this.data.isLoading) {
      return; // 不发送空消息或在加载时发送
    }

    // 检查是否登录和 AI 配置是否就绪
    if (!this.data.isLoggedIn) {
      this.showLoginPrompt();
      return;
    }
    if (!this.data.aiCredentialsReady) {
      console.warn("AI Chat Page: Attempting to send message but AI credentials are not ready.");
      // 尝试重新加载配置或提示用户
      wx.showToast({ title: 'AI服务准备中...', icon: 'loading' });
      // 可以选择再次尝试加载配置
      await this.loadAiConfiguration();
      // 如果加载仍然失败，则 loadAiConfiguration 内部会处理错误提示
      if (!this.data.aiCredentialsReady) {
           wx.showToast({ title: 'AI服务不可用', icon: 'error' });
           return; // 如果重试后仍然失败，则阻止发送
      }
       // 如果重试成功，则继续发送消息
       console.log("AI Chat Page: Credentials reloaded successfully, proceeding with send.");
    }

    // 检查用户是否明确表示要提交预约 - 支持多种表述方式
    const confirmKeywords = ['确认提交', '确定提交', '提交预约', '确认预约', '确定预约', '提交确认', '提交确定', '是的提交', '可以提交'];
    const isConfirmSubmission = confirmKeywords.some(keyword => userMessageContent.includes(keyword));

    console.log("检查确认提交:", userMessageContent, "是否确认:", isConfirmSubmission);

    // 将用户消息添加到列表
    const userMessage = { role: 'user', content: userMessageContent };
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '', // 清空输入框
      isLoading: true, // 开始加载
    });
    this.scrollToBottom(); // 滚动到底部显示新消息

    // 如果用户确认提交预约，则处理预约提交
    if (isConfirmSubmission) {
      try {
        // 从对话历史中提取预约信息
        await this.processReservationSubmission();
        return; // 预约处理完成后返回，不再调用AI
      } catch (error) {
        console.error("处理预约提交时出错:", error);
        this.addMessage('assistant', `预约处理失败了喵～错误信息: ${error.message || '未知错误'}。要不要检查一下信息是否正确，或者稍后再试试看？`);
        this.setData({ isLoading: false });
        return;
      }
    }

    // 构建发送给 AI 的消息历史
    const historyMessages = this.data.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 调用 AI API
    try {
      const aiResponse = await this.callAiApi(historyMessages);

      // 将 AI 响应添加到列表
      const assistantMessage = { role: 'assistant', content: aiResponse };
      this.setData({
        messages: [...this.data.messages, assistantMessage],
        isLoading: false, // 结束加载
      });
      this.scrollToBottom(); // 滚动到底部

    } catch (error) {
      console.error("AI Chat Page: Error calling AI API:", error);
      // 显示错误消息给用户
       const errorMessage = `抱歉，与AI通信时出错: ${error.message || '请稍后再试'}`;
       const systemErrorMessage = { role: 'system', content: errorMessage }; // 使用 system 角色或 assistant 角色均可
       this.setData({
           messages: [...this.data.messages, systemErrorMessage],
           isLoading: false // 结束加载
       });
      this.scrollToBottom();
      wx.showToast({
        title: 'AI响应失败',
        icon: 'error'
      });
    }
  },

  // 调用 DeepSeek API (或其他 AI 服务)
  async callAiApi(messages) {
    // 从 this.data 获取 DeepSeek 配置
    const deepseekConfig = this.data.loadedAiConfig?.deepseek;

    if (!deepseekConfig || !deepseekConfig.apiKey || !deepseekConfig.baseUrl || !deepseekConfig.model) {
        console.error("AI Chat Page: Missing necessary DeepSeek configuration.", deepseekConfig);
        // 在调用前再次检查，以防万一
        if (!this.data.aiCredentialsReady) {
             await this.loadAiConfiguration(); // 尝试最后一次加载
             if (!this.data.aiCredentialsReady) {
                 throw new Error("AI 配置无效或缺失。");
             }
             // 更新配置引用 (从 this.data 重新获取)
             deepseekConfig = this.data.loadedAiConfig?.deepseek;
             if (!deepseekConfig || !deepseekConfig.apiKey || !deepseekConfig.baseUrl || !deepseekConfig.model){
                  throw new Error("重新加载后 AI 配置仍然无效。");
             }
        } else {
             throw new Error("AI 配置无效或缺失。"); // 如果凭证是 ready 但配置却缺失，这是个问题
        }
    }

    // 使用存储在 data 中的、可能已更新的 systemPrompt
    const systemPrompt = this.data.systemPrompt;
    console.log("Using system prompt for API call:", systemPrompt);

    // 准备请求体
    const requestBody = {
      model: deepseekConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages // 添加历史消息
      ],
      // stream: false, // 明确设置为 false，因为我们不处理流
      max_tokens: 1024, // 根据需要调整
      temperature: 0.7, // 根据需要调整
    };

    console.log("AI Chat Page: Sending request to DeepSeek:", JSON.stringify(requestBody, null, 2));

    return new Promise((resolve, reject) => {
      wx.request({
        url: deepseekConfig.baseUrl + '/v1/chat/completions', // DeepSeek API endpoint
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekConfig.apiKey}`
        },
        data: requestBody,
        success: async (res) => {
          console.log("AI Chat Page: Received response from DeepSeek:", res);
          if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices.length > 0) {
            const aiContent = res.data.choices[0].message.content;
            resolve(aiContent.trim());
          } else {
            // 处理 API 返回的错误信息
            const errorMsg = res.data?.error?.message || `API请求失败，状态码：${res.statusCode}`;
            console.error("AI Chat Page: DeepSeek API Error -", errorMsg, "Full response:", res.data);
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          console.error("AI Chat Page: wx.request failed:", err);
          reject(new Error(`网络请求失败: ${err.errMsg || '未知错误'}`));
        }
      });
    });
  },

  // 滚动到底部
  scrollToBottom(delay = 0) {
     // 使用 setTimeout 确保在 DOM 更新后执行滚动
    setTimeout(() => {
        const lastMessageIndex = this.data.messages.length - 1;
        if (lastMessageIndex >= 0) {
        // 滚动到最后一条消息的下一个占位元素，确保最后一条消息完全可见
        this.setData({ scrollToView: `msg-${lastMessageIndex + 1}` });
        } else {
        // 如果没有消息，可以滚动到欢迎头部的某个元素，或者只是滚动到顶部附近
        // 这里我们直接滚动到最新可能的消息ID，如果没有消息则是 'msg-0'
        this.setData({ scrollToView: `msg-0` });
        }
         console.log("AI Chat Page: Scrolling to view:", this.data.scrollToView);
    }, delay); // 延迟执行
  },

  // 调试认证状态 (如果还需要可以保留，暂时注释掉减少干扰)
  // async debugAuthentication() { ... }

  // 处理用户确认的预约提交
  async processReservationSubmission() {
    console.log("AI Chat Page: Processing confirmed reservation submission");

    try {
      // 清除之前可能存在的预约数据缓存
      this.clearReservationCache();

      // 获取最近的对话历史
      const recentMessages = this.data.messages.slice(-15); // 获取最近15条消息，增加上下文范围
      const allContent = recentMessages.map(msg => msg.content).join(' ');

      console.log("预约提交 - 分析对话内容:", allContent);

      // 记录当前时间戳，用于标识本次预约请求
      const requestTimestamp = new Date().getTime();
      this.setData({
        currentRequestTimestamp: requestTimestamp
      });
      console.log("当前预约请求时间戳:", requestTimestamp);

      // 更精确地解析预约类型，使用更严格的模式匹配
      let reservationType = '';

      // 首先检查是否包含打印机相关关键词，优先识别为打印机预约
      if (allContent.includes('printer_') ||
          allContent.includes('打印机1') ||
          allContent.includes('打印机2') ||
          allContent.includes('打印机3') ||
          (allContent.includes('打印机') && (allContent.includes('模型') || allContent.includes('打印时间')))) {
        reservationType = 'printer';
        console.log("根据打印机关键词识别为: 打印机预约");
      }
      // 然后检查是否有打印机名称的明确指定
      else if (allContent.match(/打印机名称[：:]\s*([^,，。\n]+)/) || allContent.match(/打印机[：:]\s*([^,，。\n]+)/)) {
        reservationType = 'printer';
        console.log("根据明确指定的打印机名称识别为: 打印机预约");
      }
      // 然后检查是否有场地类型的明确指定
      else if (allContent.match(/场地类型[：:]\s*([^,，。\n]+)/)) {
        reservationType = 'venue';
        console.log("根据明确指定的场地类型识别为: 场地预约");
      }
      // 最后检查是否有设备名称的明确指定
      else if (allContent.match(/设备名称[：:]\s*([^,，。\n]+)/)) {
        reservationType = 'device';
        console.log("根据明确指定的设备名称识别为: 设备预约");
      }
      // 如果没有明确指定，检查是否明确提到了预约类型
      else if (/场地预约|预约场地|预约.*?场地|预约.*?会议室|预约.*?讲座厅|预约.*?研讨室/.test(allContent)) {
        reservationType = 'venue';
        console.log("预约类型识别为: 场地预约");
      } else if (/设备预约|预约设备|预约.*?设备|预约.*?工具|预约.*?仪器|借用.*?设备/.test(allContent)) {
        reservationType = 'device';
        console.log("预约类型识别为: 设备预约");
      } else if (/打印机预约|预约打印机|预约.*?打印机|预约.*?3D打印|3D打印预约/.test(allContent)) {
        reservationType = 'printer';
        console.log("预约类型识别为: 打印机预约");
      }
      // 如果没有明确提到预约类型，检查是否有特定设备或打印机的名称
      else if (allContent.includes('3D打印机1号') || allContent.includes('3D打印机2号') ||
                allContent.includes('3D打印机3号') || allContent.includes('打印机1') ||
                allContent.includes('打印机2') || allContent.includes('打印机3') ||
                allContent.includes('printer_1') || allContent.includes('printer_2') ||
                allContent.includes('printer_3')) {
        reservationType = 'printer';
        console.log("根据具体打印机名称识别为: 打印机预约");
      } else if (allContent.includes('电动螺丝刀') || allContent.includes('万用表') ||
          allContent.includes('示波器') || allContent.includes('烙铁') ||
          allContent.includes('Arduino') || allContent.includes('树莓派')) {
        reservationType = 'device';
        console.log("根据具体设备名称识别为: 设备预约");
      }
      // 检查是否有打印机预约的关键字段 - 优先检查打印机
      else if (allContent.includes('打印时间') || allContent.includes('开始时间') ||
                allContent.includes('结束时间') || allContent.includes('预计时长') ||
                allContent.includes('模型名称') || allContent.includes('打印模型')) {
        reservationType = 'printer';
        console.log("根据打印机预约关键字段识别为: 打印机预约");
      }
      // 检查是否有设备预约的关键字段
      else if (allContent.includes('借用时间') || allContent.includes('归还时间') ||
          allContent.includes('使用类型') || allContent.includes('带走') ||
          allContent.includes('现场使用')) {
        reservationType = 'device';
        console.log("根据设备预约关键字段识别为: 设备预约");
      }
      // 如果仍然没有识别出类型，尝试从上下文推断
      else if (/会议室|讲座厅|研讨室|场地/.test(allContent)) {
        reservationType = 'venue';
        console.log("从上下文推断预约类型为: 场地预约");
      } else if (/设备|工具|仪器/.test(allContent)) {
        reservationType = 'device';
        console.log("从上下文推断预约类型为: 设备预约");
      } else if (/打印机|3D打印/.test(allContent)) {
        reservationType = 'printer';
        console.log("从上下文推断预约类型为: 打印机预约");
      }

      if (!reservationType) {
        throw new Error("无法确定预约类型，请先与AI助手明确讨论您想预约的具体类型（场地、设备或打印机）");
      }

      // 从对话历史中提取预约信息
      const reservationData = this.extractReservationData('', recentMessages, reservationType);

      if (!reservationData) {
        throw new Error("无法提取完整的预约信息，请确保您已提供所有必要信息");
      }

      console.log(`提取到的${reservationType}预约数据:`, reservationData);

      // 验证预约数据的完整性
      this.validateReservationData(reservationData, reservationType);

      // 保存当前预约数据和类型，并使用之前记录的时间戳
      this.setData({
        currentReservationData: reservationData,
        currentReservationType: reservationType,
        currentReservationTimestamp: this.data.currentRequestTimestamp
      });

      console.log(`保存当前预约数据(${this.data.currentRequestTimestamp}):`, reservationData);

      // 确认用户是否要提交预约
      wx.showModal({
        title: '确认提交预约',
        content: this.formatReservationConfirmation(reservationData, reservationType),
        confirmText: '确认提交',
        cancelText: '取消',
        success: async (res) => {
          // 检查时间戳是否匹配，确保是最新的预约请求
          if (this.data.currentReservationTimestamp !== requestTimestamp) {
            console.error("时间戳不匹配，可能是旧的预约请求");
            this.addMessage('assistant', '抱歉喵～预约信息已过期，请重新发起预约请求～');
            this.setData({ isLoading: false });
            return;
          }

          if (res.confirm) {
            // 使用保存的预约数据和类型，但确保使用最新的数据
            console.log("【提交预约】使用当前预约数据:", this.data.currentReservationData);
            await this.submitReservation(
              this.data.currentReservationData,
              this.data.currentReservationType
            );
          } else {
            // 用户取消，添加系统消息
            this.addMessage('assistant', '好的喵～已取消预约提交。如果你改变主意或者需要修改信息，随时告诉我哦～');
            this.setData({ isLoading: false });
          }
        }
      });
    } catch (error) {
      console.error("处理预约提交时出错:", error);
      this.addMessage('assistant', `预约处理失败了喵～错误信息: ${error.message || '未知错误'}。要不要检查一下信息是否正确，或者稍后再试试看？`);
      this.setData({ isLoading: false });
    }
  },

  // 验证预约数据的完整性
  validateReservationData(data, type) {
    console.log(`验证${type}预约数据:`, data);

    if (!data) {
      throw new Error("预约数据为空");
    }

    // 获取可用资源列表
    const availableResources = this.data.availableResources || { venues: [], equipment: [], printers: [] };
    console.log("可用资源列表:", {
      venues: availableResources.venues.length,
      equipment: availableResources.equipment.length,
      printers: availableResources.printers.length
    });

    if (type === 'venue') {
      if (!data.venue_type || data.venue_type.trim() === '') {
        throw new Error("场地类型不能为空");
      }

      // 验证场地类型是否在可用列表中
      const venueType = data.venue_type.trim();
      const availableVenues = availableResources.venues.map(v => v.name.trim());
      console.log("验证场地类型:", venueType, "可用场地:", availableVenues);

      if (availableVenues.length > 0 && !availableVenues.some(v => v === venueType || venueType.includes(v) || v.includes(venueType))) {
        throw new Error(`场地类型"${venueType}"不在可用列表中，请选择以下场地之一: ${availableVenues.join(', ')}`);
      }

      if (!data.reservation_date || data.reservation_date.trim() === '') {
        throw new Error("预约日期不能为空");
      }
      if (!data.business_time || data.business_time.trim() === '') {
        throw new Error("时间段不能为空");
      }
      if (!data.purpose || data.purpose.trim() === '') {
        throw new Error("用途说明不能为空");
      }
      if (!data.devices_needed) {
        data.devices_needed = {
          screen: false,
          laptop: false,
          mic_handheld: false,
          mic_gooseneck: false,
          projector: false
        };
      }

      // 确保设备需求字段名称正确
      const deviceFields = {
        screen: 'screen',
        laptop: 'laptop',
        mic_handheld: 'mic_handheld',
        mic_gooseneck: 'mic_gooseneck',
        projector: 'projector'
      };

      // 规范化设备需求字段
      const normalizedDevices = {};
      for (const [key, apiKey] of Object.entries(deviceFields)) {
        normalizedDevices[apiKey] = !!data.devices_needed[key];
      }
      data.devices_needed = normalizedDevices;
    } else if (type === 'device') {
      if (!data.device_name || data.device_name.trim() === '') {
        throw new Error("设备名称不能为空");
      }

      // 验证设备名称是否在可用列表中
      const deviceName = data.device_name.trim();
      const availableEquipment = availableResources.equipment.map(e => e.name.trim());
      console.log("验证设备名称:", deviceName, "可用设备:", availableEquipment);

      if (availableEquipment.length > 0 && !availableEquipment.some(e => e === deviceName || deviceName.includes(e) || e.includes(deviceName))) {
        throw new Error(`设备名称"${deviceName}"不在可用列表中，请选择以下设备之一: ${availableEquipment.join(', ')}`);
      }

      if (!data.borrow_time || data.borrow_time.trim() === '') {
        throw new Error("借用时间不能为空");
      }
      if (data.usage_type === 'takeaway' && (!data.return_time || data.return_time.trim() === '')) {
        throw new Error("带走使用时必须提供归还时间");
      }
      if (!data.reason || data.reason.trim() === '') {
        throw new Error("用途说明不能为空");
      }
      // 确保使用类型有值
      if (!data.usage_type || (data.usage_type !== 'takeaway' && data.usage_type !== 'onsite')) {
        data.usage_type = 'takeaway'; // 默认为带走
      }
    } else if (type === 'printer') {
      if (!data.printer_name || data.printer_name.trim() === '') {
        throw new Error("打印机名称不能为空");
      }

      // 验证打印机名称是否在可用列表中
      let printerName = data.printer_name.trim();
      const availablePrinters = availableResources.printers.map(p => p.name.trim());
      console.log("验证打印机名称:", printerName, "可用打印机:", availablePrinters);

      // 处理常见的打印机名称映射
      const printerMappings = {
        '打印机1': 'printer_1',
        '打印机2': 'printer_2',
        '打印机3': 'printer_3',
        '3D打印机1号': 'printer_1',
        '3D打印机2号': 'printer_2',
        '3D打印机3号': 'printer_3',
        '1号打印机': 'printer_1',
        '2号打印机': 'printer_2',
        '3号打印机': 'printer_3'
      };

      // 如果打印机名称在映射表中，使用映射后的名称
      if (printerMappings[printerName]) {
        const originalName = printerName;
        printerName = printerMappings[printerName];
        console.log(`打印机名称映射: ${originalName} => ${printerName}`);
        // 更新数据中的打印机名称
        data.printer_name = printerName;
        // 保存原始名称用于显示
        data.original_printer_name = originalName;
      }

      if (availablePrinters.length > 0 && !availablePrinters.some(p => p === printerName || printerName.includes(p) || p.includes(printerName))) {
        throw new Error(`打印机名称"${printerName}"不在可用列表中，请选择以下打印机之一: ${availablePrinters.join(', ')}`);
      }

      if (!data.reservation_date || data.reservation_date.trim() === '') {
        throw new Error("预约日期不能为空");
      }
      if (!data.print_time || data.print_time.trim() === '') {
        throw new Error("开始时间不能为空");
      }
      if (!data.end_time || data.end_time.trim() === '') {
        throw new Error("结束时间不能为空");
      }
      // 确保预计时长有值
      if (!data.estimated_duration) {
        // 尝试从开始和结束时间计算时长
        try {
          const startTime = new Date(data.print_time);
          const endTime = new Date(data.end_time);
          const durationMs = endTime - startTime;
          if (durationMs > 0) {
            data.estimated_duration = Math.ceil(durationMs / (1000 * 60)); // 转换为分钟并向上取整
          } else {
            data.estimated_duration = 60; // 默认1小时
          }
        } catch (e) {
          data.estimated_duration = 60; // 默认1小时
        }
      }
    }

    return true;
  },

  // 从对话中提取预约数据
  extractReservationData(aiContent, messages, type) {
    console.log("提取预约数据，类型:", type);

    // 清除上次提取的数据，确保每次都重新提取
    this._lastExtractedData = null;
    this._lastReservationType = null;

    // 获取最新的AI消息内容（最后3条）
    const recentAIMessages = messages.filter(msg => msg.role === 'assistant').slice(-3);
    const latestAIContent = recentAIMessages.map(msg => msg.content).join(' ');
    console.log("最新AI消息内容(前100字符):", latestAIContent.substring(0, 100) + "...");

    // 合并所有消息内容以便分析，但给最新的AI消息更高的权重
    const allContent = messages.map(msg => msg.content).join(' ') + ' ' + aiContent + ' ' + latestAIContent + ' ' + latestAIContent;

    try {
      // 根据预约类型提取不同的数据
      if (type === 'venue') {
        // 获取可用资源列表
        const availableResources = this.data.availableResources || { venues: [], equipment: [], printers: [] };
        const availableVenues = availableResources.venues.map(v => v.name.trim());
        console.log("可用场地列表:", availableVenues);

        // 场地预约数据提取 - 使用更宽松的匹配模式
        let venueTypeMatch = allContent.match(/场地类型[：:]\s*([^,，。\n]+)/);

        // 如果没有直接找到场地类型，尝试从对话中识别可用场地名称
        if (!venueTypeMatch) {
          // 尝试识别常见场地类型
          if (allContent.includes('讲座厅')) {
            venueTypeMatch = [null, '讲座厅'];
            console.log("从对话中识别到场地类型: 讲座厅");
          } else if (allContent.includes('会议室')) {
            venueTypeMatch = [null, '会议室'];
            console.log("从对话中识别到场地类型: 会议室");
          } else if (allContent.includes('研讨室')) {
            venueTypeMatch = [null, '研讨室'];
            console.log("从对话中识别到场地类型: 研讨室");
          } else if (allContent.includes('创新工坊')) {
            venueTypeMatch = [null, '创新工坊'];
            console.log("从对话中识别到场地类型: 创新工坊");
          } else if (availableVenues.length > 0) {
            // 如果仍然没有找到，尝试从可用场地列表中匹配
            for (const venue of availableVenues) {
              if (allContent.includes(venue)) {
                venueTypeMatch = [null, venue];
                console.log("从对话中识别到场地名称:", venue);
                break;
              }
            }

            // 如果仍然没有找到，使用第一个可用场地
            if (!venueTypeMatch && availableVenues.length > 0) {
              venueTypeMatch = [null, availableVenues[0]];
              console.log("使用默认场地类型:", availableVenues[0]);
            }
          }
        }

        const dateMatch = allContent.match(/预约日期[：:]\s*([^,，。\n]+)/);
        const timeMatch = allContent.match(/时间段[：:]\s*([^,，。\n]+)/);

        // 用途提取 - 尝试多种可能的表述方式
        let purposeMatch = allContent.match(/用途[：:]\s*([^,，。\n]+)/);
        if (!purposeMatch) {
          purposeMatch = allContent.match(/用途说明[：:]\s*([^,，。\n]+)/);
        }
        if (!purposeMatch) {
          purposeMatch = allContent.match(/预约目的[：:]\s*([^,，。\n]+)/);
        }
        if (!purposeMatch) {
          purposeMatch = allContent.match(/预约用途[：:]\s*([^,，。\n]+)/);
        }
        if (!purposeMatch) {
          purposeMatch = allContent.match(/使用目的[：:]\s*([^,，。\n]+)/);
        }

        // 如果仍然没有找到用途，尝试从对话中提取可能的用途描述
        if (!purposeMatch) {
          // 查找包含"用于"、"用来"、"目的是"等关键词的句子
          const purposeKeywords = ["用于", "用来", "目的是", "打算", "计划", "想要"];
          for (const keyword of purposeKeywords) {
            const regex = new RegExp(`[^,，。\n]*${keyword}([^,，。\n]+)`, 'i');
            const match = allContent.match(regex);
            if (match) {
              purposeMatch = [null, match[1].trim()];
              console.log("从上下文提取到的用途:", purposeMatch[1]);
              break;
            }
          }
        }

        // 如果仍然没有找到用途，使用默认值
        if (!purposeMatch) {
          purposeMatch = [null, "预约使用"];
          console.log("使用默认用途");
        }

        console.log("提取到的用途:", purposeMatch ? purposeMatch[1] : "未找到");

        // 设备需求提取 - 使用更宽松的匹配模式，同时支持中英文设备名称
        const needsScreen = /屏幕|大屏|screen[：:]\s*(是|需要|true|yes|√)/i.test(allContent) || /需要.*(屏幕|大屏|screen)/.test(allContent);
        const needsLaptop = /笔记本|laptop[：:]\s*(是|需要|true|yes|√)/i.test(allContent) || /需要.*(笔记本|laptop)/.test(allContent);
        const needsMicHandheld = /手持麦|手持麦克风|mic_handheld|mic handheld[：:]\s*(是|需要|true|yes|√)/i.test(allContent) || /需要.*(手持麦|手持麦克风|mic)/.test(allContent);
        const needsMicGooseneck = /鹅颈麦|鹅颈麦克风|mic_gooseneck|mic gooseneck[：:]\s*(是|需要|true|yes|√)/i.test(allContent) || /需要.*(鹅颈麦|鹅颈麦克风|gooseneck)/.test(allContent);
        const needsProjector = /投影仪|投屏器|projector[：:]\s*(是|需要|true|yes|√)/i.test(allContent) || /需要.*(投影仪|投屏器|projector)/.test(allContent);

        // 转换时间段
        let businessTime = '';
        if (timeMatch && timeMatch[1]) {
          const timeText = timeMatch[1].trim().toLowerCase();
          console.log("解析时间段文本:", timeText);

          // 确保只选择一个时间段
          if (/上午|早上|morning/.test(timeText)) {
            businessTime = 'morning';
          } else if (/下午|afternoon/.test(timeText)) {
            businessTime = 'afternoon';
          } else if (/晚上|evening/.test(timeText)) {
            businessTime = 'evening';
          } else if (/全天|整天|all day/.test(timeText)) {
            // 如果用户说全天，默认选择下午
            businessTime = 'afternoon';
          } else {
            // 如果无法识别，根据当前时间选择默认值
            const currentHour = new Date().getHours();
            if (currentHour < 12) {
              businessTime = 'morning';
            } else if (currentHour < 18) {
              businessTime = 'afternoon';
            } else {
              businessTime = 'evening';
            }
          }

          console.log("解析后的时间段:", businessTime);
        } else {
          // 如果没有提供时间段，根据当前时间选择默认值
          const currentHour = new Date().getHours();
          if (currentHour < 12) {
            businessTime = 'morning';
          } else if (currentHour < 18) {
            businessTime = 'afternoon';
          } else {
            businessTime = 'evening';
          }
          console.log("未提供时间段，使用默认值:", businessTime);
        }

        // 格式化日期
        let formattedDate = '';
        if (dateMatch && dateMatch[1]) {
          const dateText = dateMatch[1].trim();
          console.log("解析日期文本:", dateText);

          // 尝试解析各种日期格式
          if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateText)) {
            formattedDate = dateText.replace(/\//g, '-');
            console.log("识别到标准日期格式:", formattedDate);
          } else {
            // 使用页面中存储的当前时间
            const today = new Date(this.data.currentDateTime || new Date());
            console.log("当前日期用于解析:", this.formatDate(today));

            // 检查是否包含"下周"或"下星期"的表述
            if (/下周|下星期/.test(dateText)) {
              console.log("检测到下周/下星期表述");

              // 检查是否包含具体的星期几
              if (/下周五|下周5|下星期五|下星期5/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 5);
                console.log("识别到下周五，日期为:", formattedDate);
              } else if (/下周一|下周1|下星期一|下星期1/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 1);
                console.log("识别到下周一，日期为:", formattedDate);
              } else if (/下周二|下周2|下星期二|下星期2/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 2);
                console.log("识别到下周二，日期为:", formattedDate);
              } else if (/下周三|下周3|下星期三|下星期3/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 3);
                console.log("识别到下周三，日期为:", formattedDate);
              } else if (/下周四|下周4|下星期四|下星期4/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 4);
                console.log("识别到下周四，日期为:", formattedDate);
              } else if (/下周六|下周6|下星期六|下星期6/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 6);
                console.log("识别到下周六，日期为:", formattedDate);
              } else if (/下周日|下周天|下周7|下周七|下星期日|下星期天|下星期7|下星期七/.test(dateText)) {
                formattedDate = this.getNextWeekday(today, 0);
                console.log("识别到下周日，日期为:", formattedDate);
              }
            }

            if (formattedDate) {
              console.log("已经识别到日期:", formattedDate);
            } else if (/今天/.test(dateText)) {
              formattedDate = this.formatDate(today);
            } else if (/明天/.test(dateText)) {
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              formattedDate = this.formatDate(tomorrow);
            } else if (/后天/.test(dateText)) {
              const dayAfterTomorrow = new Date(today);
              dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
              formattedDate = this.formatDate(dayAfterTomorrow);
            } else if (/大后天/.test(dateText)) {
              const threeDaysLater = new Date(today);
              threeDaysLater.setDate(threeDaysLater.getDate() + 3);
              formattedDate = this.formatDate(threeDaysLater);
            } else if (/下周一|下周1/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 1);
            } else if (/下周二|下周2/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 2);
            } else if (/下周三|下周3/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 3);
            } else if (/下周四|下周4/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 4);
            } else if (/下周五|下周5|下星期五|下星期5/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 5);
              console.log("识别到下周五，日期为:", formattedDate);
            } else if (/下周六|下周6|下星期六|下星期6/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 6);
              console.log("识别到下周六，日期为:", formattedDate);
            } else if (/下周日|下周天|下周7|下周七|下星期日|下星期天|下星期7|下星期七/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 0);
              console.log("识别到下周日，日期为:", formattedDate);
            } else {
              // 尝试从月日描述中提取
              const monthDayMatch = dateText.match(/(\d{1,2})月(\d{1,2})日/);
              if (monthDayMatch) {
                const month = parseInt(monthDayMatch[1]);
                const day = parseInt(monthDayMatch[2]);
                const year = today.getFullYear();
                formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              } else {
                // 如果无法解析，使用当前日期
                formattedDate = this.data.currentDate;
              }
            }
          }
        } else {
          // 如果没有提供日期，使用当前日期
          formattedDate = this.data.currentDate;
        }

        return {
          venue_type: venueTypeMatch ? venueTypeMatch[1].trim() : '',
          reservation_date: formattedDate,
          business_time: businessTime,
          purpose: purposeMatch ? purposeMatch[1].trim() : '',
          devices_needed: {
            screen: needsScreen,
            laptop: needsLaptop,
            mic_handheld: needsMicHandheld,
            mic_gooseneck: needsMicGooseneck,
            projector: needsProjector
          }
        };
      } else if (type === 'device') {
        // 获取可用资源列表
        const availableResources = this.data.availableResources || { venues: [], equipment: [], printers: [] };
        const availableEquipment = availableResources.equipment.map(e => e.name.trim());
        console.log("可用设备列表:", availableEquipment);

        // 设备预约数据提取 - 使用更宽松的匹配模式
        let deviceNameMatch = allContent.match(/设备名称[：:]\s*([^,，。\n]+)/);

        // 如果没有直接找到设备名称，尝试从对话中识别可用设备名称
        if (!deviceNameMatch && availableEquipment.length > 0) {
          for (const equipment of availableEquipment) {
            if (allContent.includes(equipment)) {
              deviceNameMatch = [null, equipment];
              console.log("从对话中识别到设备名称:", equipment);
              break;
            }
          }
        }

        // 如果仍然没有找到设备名称，但有可用设备列表，使用第一个
        if (!deviceNameMatch && availableEquipment.length > 0) {
          deviceNameMatch = [null, availableEquipment[0]];
          console.log("使用默认设备名称:", availableEquipment[0]);
        }

        // 如果设备名称包含多个选项或提示选择，选择第一个可用的设备
        if (deviceNameMatch && deviceNameMatch[1] &&
            (deviceNameMatch[1].includes('选一个') ||
             deviceNameMatch[1].includes('/') ||
             deviceNameMatch[1].includes('请选择'))) {
          // 尝试从可用设备列表中选择第一个
          if (availableEquipment.length > 0) {
            deviceNameMatch = [null, availableEquipment[0]];
            console.log("从多个选项中选择第一个设备:", availableEquipment[0]);
          }
        }

        const borrowTimeMatch = allContent.match(/借用时间[：:]\s*([^,，。\n]+)/);
        const returnTimeMatch = allContent.match(/归还时间[：:]\s*([^,，。\n]+)/);

        // 用途提取 - 尝试多种可能的表述方式
        let reasonMatch = allContent.match(/用途说明[：:]\s*([^,，。\n]+)/);
        if (!reasonMatch) {
          reasonMatch = allContent.match(/用途[：:]\s*([^,，。\n]+)/);
        }
        if (!reasonMatch) {
          reasonMatch = allContent.match(/借用目的[：:]\s*([^,，。\n]+)/);
        }
        if (!reasonMatch) {
          reasonMatch = allContent.match(/借用用途[：:]\s*([^,，。\n]+)/);
        }
        if (!reasonMatch) {
          reasonMatch = allContent.match(/使用目的[：:]\s*([^,，。\n]+)/);
        }

        // 如果仍然没有找到用途，尝试从对话中提取可能的用途描述
        if (!reasonMatch) {
          // 查找包含"用于"、"用来"、"目的是"等关键词的句子
          const purposeKeywords = ["用于", "用来", "目的是", "打算", "计划", "想要"];
          for (const keyword of purposeKeywords) {
            const regex = new RegExp(`[^,，。\n]*${keyword}([^,，。\n]+)`, 'i');
            const match = allContent.match(regex);
            if (match) {
              reasonMatch = [null, match[1].trim()];
              console.log("从上下文提取到的设备用途:", reasonMatch[1]);
              break;
            }
          }
        }

        // 如果仍然没有找到用途，使用默认值
        if (!reasonMatch) {
          reasonMatch = [null, "设备使用"];
          console.log("使用默认设备用途");
        }

        console.log("提取到的设备用途:", reasonMatch ? reasonMatch[1] : "未找到");

        const usageTypeMatch = allContent.match(/使用类型[：:]\s*([^,，。\n]+)/);
        const teacherNameMatch = allContent.match(/指导老师[：:]\s*([^,，。\n]+)/);

        // 确定使用类型
        let usageType = 'takeaway'; // 默认带走

        // 获取最新的AI消息内容 - 这是最重要的判断依据
        // 获取最近的AI消息，按时间倒序排列（最新的在前）
        const recentAIMessages = messages.filter(msg => msg.role === 'assistant').slice(-5).reverse();

        // 优先分析最新的消息
        let usageTypeFromAI = null;

        // 记录最新消息内容，用于调试
        if (recentAIMessages.length > 0) {
            console.log("最新AI消息内容:", recentAIMessages[0].content);
        }

        // 逐条分析最近的AI消息，优先使用最新的判断结果
        for (const msg of recentAIMessages) {
            const content = msg.content || '';
            console.log("分析单条AI消息判断使用类型:", content.substring(0, 100) + "...");

            // 检查是否包含现场使用的关键词 - 扩展关键词列表
            if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(content)) {
                usageTypeFromAI = 'onsite';
                console.log("从最新AI消息识别为: 现场使用");
                // 记录匹配到的关键词
                const match = content.match(/(现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊)/);
                if (match) {
                    console.log("匹配到的现场使用关键词:", match[0]);
                }
                break; // 找到结果后立即退出循环
            }
            // 检查是否包含带走使用的关键词
            else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(content)) {
                usageTypeFromAI = 'takeaway';
                console.log("从最新AI消息识别为: 带走使用");
                // 记录匹配到的关键词
                const match = content.match(/(带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊)/);
                if (match) {
                    console.log("匹配到的带走使用关键词:", match[0]);
                }
                break; // 找到结果后立即退出循环
            }
        }

        // 如果在单条消息中没有找到明确指示，尝试在所有最近消息中查找
        if (!usageTypeFromAI) {
            const latestAIContent = recentAIMessages.map(msg => msg.content).join(' ');
            console.log("在所有最近AI消息中查找使用类型指示");

            // 检查是否包含现场使用的关键词 - 扩展关键词列表
            if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(latestAIContent)) {
                usageTypeFromAI = 'onsite';
                console.log("从所有最近AI消息识别为: 现场使用");
                // 记录匹配到的关键词
                const match = latestAIContent.match(/(现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊)/);
                if (match) {
                    console.log("匹配到的现场使用关键词:", match[0]);
                }
            } else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(latestAIContent)) {
                usageTypeFromAI = 'takeaway';
                console.log("从所有最近AI消息识别为: 带走使用");
                // 记录匹配到的关键词
                const match = latestAIContent.match(/(带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊)/);
                if (match) {
                    console.log("匹配到的带走使用关键词:", match[0]);
                }
            }
        }

        // 如果从AI内容中找到了使用类型，则使用它（优先级最高）
        if (usageTypeFromAI) {
            usageType = usageTypeFromAI;
            console.log("最终从AI内容确定使用类型为:", usageType);

            // 如果是现场使用，记录日志但不直接修改returnTimeMatch
            if (usageType === 'onsite') {
                console.log("现场使用，稍后将忽略归还时间");
                // 不直接修改returnTimeMatch，因为它可能是只读的
            }
        }

        // 创建设备预约数据对象时处理归还时间
        // 如果最新AI回复中没有明确指示，再检查是否有明确指定的使用类型
        else if (usageTypeMatch && usageTypeMatch[1]) {
          const usageText = usageTypeMatch[1].trim().toLowerCase();
          if (/现场|onsite|on-site|on site/.test(usageText)) {
            usageType = 'onsite';
            console.log("从使用类型字段识别为: 现场使用");
          } else if (/带走|takeaway|take-away|take away/.test(usageText)) {
            usageType = 'takeaway';
            console.log("从使用类型字段识别为: 带走使用");
          }
        }
        // 如果仍然没有明确指示，从整个对话上下文推断
        else if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用/.test(allContent)) {
          usageType = 'onsite';
          console.log("从上下文推断使用类型为: 现场使用");
        } else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(allContent)) {
          usageType = 'takeaway';
          console.log("从上下文推断使用类型为: 带走使用");
        }

        // 如果有归还时间，则一定是带走使用
        if (returnTimeMatch && returnTimeMatch[1]) {
          usageType = 'takeaway';
          console.log("检测到归还时间，确定为: 带走使用");
        }

        console.log("最终确定的使用类型:", usageType);

        // 格式化时间
        const formatTimeStr = (timeStr) => {
          if (!timeStr) return '';

          // 如果已经是ISO格式，直接返回
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
            return timeStr;
          }

          try {
            // 尝试解析时间字符串
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              // 格式化为ISO字符串
              const isoStr = date.toISOString().replace('Z', '').replace(/\.\d+/, '');
              console.log(`时间格式化: ${timeStr} => ${isoStr}`);
              return isoStr;
            }
          } catch (e) {
            console.error("时间格式化错误:", e);
            // 如果解析失败，继续使用下面的方法
          }

          // 使用页面中存储的当前时间
          const today = new Date(this.data.currentDateTime || new Date());
          console.log("设备预约 - 当前时间用于解析:", this.data.currentDateTime);

          // 尝试解析相对时间表述
          if (/今天/.test(timeStr)) {
            const todayDate = this.formatDate(today);
            const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2].padStart(2, '0');
              return `${todayDate}T${hours}:${minutes}:00`;
            } else {
              // 如果没有具体时间，使用当前时间
              const hours = today.getHours().toString().padStart(2, '0');
              const minutes = today.getMinutes().toString().padStart(2, '0');
              return `${todayDate}T${hours}:${minutes}:00`;
            }
          } else if (/明天/.test(timeStr)) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = this.formatDate(tomorrow);
            const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2].padStart(2, '0');
              return `${tomorrowDate}T${hours}:${minutes}:00`;
            } else {
              // 默认时间为上午9点
              return `${tomorrowDate}T09:00:00`;
            }
          } else if (/后天/.test(timeStr)) {
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            const dayAfterTomorrowDate = this.formatDate(dayAfterTomorrow);
            const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2].padStart(2, '0');
              return `${dayAfterTomorrowDate}T${hours}:${minutes}:00`;
            } else {
              // 默认时间为上午9点
              return `${dayAfterTomorrowDate}T09:00:00`;
            }
          }

          // 尝试解析日期和时间
          const dateMatch = timeStr.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
          const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);

          if (dateMatch && timeMatch) {
            const date = dateMatch[1].replace(/\//g, '-');
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = timeMatch[2].padStart(2, '0');
            return `${date}T${hours}:${minutes}:00`;
          } else if (dateMatch) {
            // 有日期但没有时间，默认为上午9点
            const date = dateMatch[1].replace(/\//g, '-');
            return `${date}T09:00:00`;
          } else if (timeMatch) {
            // 有时间但没有日期，使用当前日期
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = timeMatch[2].padStart(2, '0');
            return `${this.data.currentDate}T${hours}:${minutes}:00`;
          }

          // 如果无法解析，返回当前时间
          return this.data.currentDateTime;
        };

        // 构建设备预约数据对象
        const deviceData = {
          device_name: deviceNameMatch ? deviceNameMatch[1].trim() : '',
          borrow_time: borrowTimeMatch ? formatTimeStr(borrowTimeMatch[1].trim()) : '',
          reason: reasonMatch ? reasonMatch[1].trim() : '',
          usage_type: usageType,
          teacher_name: teacherNameMatch ? teacherNameMatch[1].trim() : null
        };

        // 始终提取归还时间（无论使用类型）
        if (returnTimeMatch && returnTimeMatch[1]) {
          try {
            deviceData.return_time = formatTimeStr(returnTimeMatch[1].trim());
            console.log("提取到归还时间:", deviceData.return_time);
          } catch (e) {
            console.error("格式化归还时间失败:", e);
            deviceData.return_time = null;
          }
        } else {
          // 如果没有提取到归还时间，但有借用时间，设置默认归还时间（借用时间+24小时）
          if (deviceData.borrow_time) {
            try {
              const borrowDate = new Date(deviceData.borrow_time);
              borrowDate.setHours(borrowDate.getHours() + 24); // 默认借用24小时
              deviceData.return_time = borrowDate.toISOString().replace('Z', '').replace(/\.\d+/, '');
              console.log("设置默认归还时间:", deviceData.return_time);
            } catch (e) {
              console.error("设置默认归还时间失败:", e);
              deviceData.return_time = null;
            }
          } else {
            deviceData.return_time = null;
          }
        }

        // 注意：此时我们已经提取了归还时间，但最终是否使用它将在提交时根据使用类型决定

        // 最终检查
        if (deviceData.usage_type === 'onsite' && deviceData.return_time !== null) {
          console.log("【返回数据最终检查】现场使用但归还时间不为null，强制修正");
          deviceData.return_time = null;
        }

        console.log("最终返回的设备预约数据:", deviceData);
        return deviceData;
      } else if (type === 'printer') {
        // 获取可用资源列表
        const availableResources = this.data.availableResources || { venues: [], equipment: [], printers: [] };
        const availablePrinters = availableResources.printers.map(p => p.name.trim());
        console.log("可用打印机列表:", availablePrinters);

        // 打印机预约数据提取 - 使用更宽松的匹配模式
        let printerNameMatch = allContent.match(/打印机名称[：:]\s*([^,，。\n]+)/);
        if (!printerNameMatch) {
          printerNameMatch = allContent.match(/打印机[：:]\s*([^,，。\n]+)/);
        }

        // 如果没有直接找到打印机名称，尝试从对话中识别可用打印机名称
        if (!printerNameMatch && availablePrinters.length > 0) {
          for (const printer of availablePrinters) {
            if (allContent.includes(printer)) {
              printerNameMatch = [null, printer];
              console.log("从对话中识别到打印机名称:", printer);
              break;
            }
          }
        }

        const dateMatch = allContent.match(/预约日期[：:]\s*([^,，。\n]+)/);

        let startTimeMatch = allContent.match(/开始时间[：:]\s*([^,，。\n]+)/);
        if (!startTimeMatch) {
          startTimeMatch = allContent.match(/打印时间[：:]\s*([^,，。\n]+)/);
        }

        let endTimeMatch = allContent.match(/结束时间[：:]\s*([^,，。\n]+)/);
        if (!endTimeMatch) {
          endTimeMatch = allContent.match(/完成时间[：:]\s*([^,，。\n]+)/);
        }

        let durationMatch = allContent.match(/预计时长[：:]\s*(\d+)/);
        if (!durationMatch) {
          durationMatch = allContent.match(/打印时长[：:]\s*(\d+)/);
        }
        if (!durationMatch) {
          durationMatch = allContent.match(/时长[：:]\s*(\d+)/);
        }

        let modelNameMatch = allContent.match(/模型名称[：:]\s*([^,，。\n]+)/);
        if (!modelNameMatch) {
          modelNameMatch = allContent.match(/打印模型[：:]\s*([^,，。\n]+)/);
        }
        if (!modelNameMatch) {
          modelNameMatch = allContent.match(/模型[：:]\s*([^,，。\n]+)/);
        }

        let teacherNameMatch = allContent.match(/指导老师[：:]\s*([^,，。\n]+)/);
        if (!teacherNameMatch) {
          teacherNameMatch = allContent.match(/老师[：:]\s*([^,，。\n]+)/);
        }

        // 如果没有找到打印机名称，尝试从上下文中提取
        if (!printerNameMatch) {
          const printerKeywords = ["打印机", "3D打印机"];
          for (const keyword of printerKeywords) {
            const regex = new RegExp(`${keyword}[^,，。\n]*?([A-Za-z0-9_\\-\\s]+)`, 'i');
            const match = allContent.match(regex);
            if (match) {
              const extractedName = match[1].trim();
              // 验证提取的名称是否在可用列表中
              if (availablePrinters.length > 0) {
                for (const printer of availablePrinters) {
                  if (printer.includes(extractedName) || extractedName.includes(printer)) {
                    printerNameMatch = [null, printer]; // 使用可用列表中的准确名称
                    console.log("从上下文提取并匹配到打印机名称:", printer);
                    break;
                  }
                }
              } else {
                printerNameMatch = [null, extractedName];
                console.log("从上下文提取到的打印机名称(未验证):", extractedName);
              }
              if (printerNameMatch) break;
            }
          }
        }

        // 如果仍然没有找到打印机名称，但有可用打印机列表，使用第一个
        if (!printerNameMatch && availablePrinters.length > 0) {
          printerNameMatch = [null, availablePrinters[0]];
          console.log("使用默认打印机名称:", availablePrinters[0]);
        }

        // 检查是否有明确指定的打印机编号
        const printer1Match = allContent.match(/打印机1|打印机一|printer[_\s]*1/i);
        const printer2Match = allContent.match(/打印机2|打印机二|printer[_\s]*2/i);
        const printer3Match = allContent.match(/打印机3|打印机三|printer[_\s]*3/i);

        if (printer2Match) {
          // 用户明确指定了打印机2
          printerNameMatch = [null, 'printer_2'];
          console.log("用户明确指定了打印机2:", printerNameMatch[1]);
        } else if (printer3Match) {
          // 用户明确指定了打印机3
          printerNameMatch = [null, 'printer_3'];
          console.log("用户明确指定了打印机3:", printerNameMatch[1]);
        } else if (printer1Match) {
          // 用户明确指定了打印机1
          printerNameMatch = [null, 'printer_1'];
          console.log("用户明确指定了打印机1:", printerNameMatch[1]);
        }
        // 如果打印机名称包含多个选项或提示选择，选择第一个可用的打印机
        else if (printerNameMatch && printerNameMatch[1] &&
            (printerNameMatch[1].includes('选一个') ||
             printerNameMatch[1].includes('/') ||
             printerNameMatch[1].includes('请选择'))) {
          // 尝试从可用打印机列表中选择第一个
          if (availablePrinters.length > 0) {
            printerNameMatch = [null, availablePrinters[0]];
            console.log("从多个选项中选择第一个打印机:", availablePrinters[0]);
          }
        }

        console.log("提取到的打印机信息:", {
          printer: printerNameMatch ? printerNameMatch[1] : "未找到",
          date: dateMatch ? dateMatch[1] : "未找到",
          startTime: startTimeMatch ? startTimeMatch[1] : "未找到",
          endTime: endTimeMatch ? endTimeMatch[1] : "未找到",
          duration: durationMatch ? durationMatch[1] : "未找到",
          model: modelNameMatch ? modelNameMatch[1] : "未找到",
          teacher: teacherNameMatch ? teacherNameMatch[1] : "未找到"
        });
        // 格式化日期
        let formattedDate = '';
        if (dateMatch && dateMatch[1]) {
          const dateText = dateMatch[1].trim();
          if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateText)) {
            formattedDate = dateText.replace(/\//g, '-');
          } else {
            // 使用页面中存储的当前时间
            const today = new Date(this.data.currentDateTime || new Date());
            console.log("打印机预约 - 当前日期用于解析:", this.formatDate(today));

            if (/今天/.test(dateText)) {
              formattedDate = this.formatDate(today);
            } else if (/明天/.test(dateText)) {
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              formattedDate = this.formatDate(tomorrow);
            } else if (/后天/.test(dateText)) {
              const dayAfterTomorrow = new Date(today);
              dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
              formattedDate = this.formatDate(dayAfterTomorrow);
            } else if (/大后天/.test(dateText)) {
              const threeDaysLater = new Date(today);
              threeDaysLater.setDate(threeDaysLater.getDate() + 3);
              formattedDate = this.formatDate(threeDaysLater);
            } else if (/下周一|下周1/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 1);
            } else if (/下周二|下周2/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 2);
            } else if (/下周三|下周3/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 3);
            } else if (/下周四|下周4/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 4);
            } else if (/下周五|下周5/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 5);
            } else if (/下周六|下周6/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 6);
            } else if (/下周日|下周天|下周7|下周七/.test(dateText)) {
              formattedDate = this.getNextWeekday(today, 0);
            } else {
              // 尝试从月日描述中提取
              const monthDayMatch = dateText.match(/(\d{1,2})月(\d{1,2})日/);
              if (monthDayMatch) {
                const month = parseInt(monthDayMatch[1]);
                const day = parseInt(monthDayMatch[2]);
                const year = today.getFullYear();
                formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              } else {
                // 如果无法解析，使用当前日期
                formattedDate = this.data.currentDate;
              }
            }
          }
        } else {
          // 如果没有提供日期，使用当前日期
          formattedDate = this.data.currentDate;
        }

        // 格式化时间
        const formatTimeString = (timeStr, date) => {
          if (!timeStr) return '';
          if (!date) date = this.data.currentDate;

          // 如果已经是ISO格式，直接返回
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
            return timeStr;
          }

          // 使用页面中存储的当前时间
          const today = new Date(this.data.currentDateTime || new Date());
          console.log("打印机时间 - 当前时间用于解析:", this.data.currentDateTime);

          // 尝试解析相对时间表述
          if (/今天/.test(timeStr)) {
            const todayDate = this.formatDate(today);
            const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2].padStart(2, '0');
              return `${todayDate}T${hours}:${minutes}:00`;
            } else {
              // 如果没有具体时间，使用当前时间
              const hours = today.getHours().toString().padStart(2, '0');
              const minutes = today.getMinutes().toString().padStart(2, '0');
              return `${todayDate}T${hours}:${minutes}:00`;
            }
          } else if (/明天/.test(timeStr)) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = this.formatDate(tomorrow);
            const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2].padStart(2, '0');
              return `${tomorrowDate}T${hours}:${minutes}:00`;
            } else {
              // 默认时间为上午9点
              return `${tomorrowDate}T09:00:00`;
            }
          } else if (/后天/.test(timeStr)) {
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            const dayAfterTomorrowDate = this.formatDate(dayAfterTomorrow);
            const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2].padStart(2, '0');
              return `${dayAfterTomorrowDate}T${hours}:${minutes}:00`;
            } else {
              // 默认时间为上午9点
              return `${dayAfterTomorrowDate}T09:00:00`;
            }
          }

          // 尝试解析时间
          const timeMatch = timeStr.match(/(\d{1,2})[:.：](\d{1,2})/);

          if (timeMatch) {
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = timeMatch[2].padStart(2, '0');
            return `${date}T${hours}:${minutes}:00`;
          }

          // 如果无法解析，返回当前时间
          return `${date}T09:00:00`;
        };

        return {
          printer_name: printerNameMatch ? printerNameMatch[1].trim() : '',
          reservation_date: formattedDate,
          print_time: startTimeMatch ? formatTimeString(startTimeMatch[1].trim(), formattedDate) : '',
          end_time: endTimeMatch ? formatTimeString(endTimeMatch[1].trim(), formattedDate) : '',
          estimated_duration: durationMatch ? parseInt(durationMatch[1]) : null,
          model_name: modelNameMatch ? modelNameMatch[1].trim() : null,
          teacher_name: teacherNameMatch ? teacherNameMatch[1].trim() : null
        };
      }
    } catch (error) {
      console.error("提取预约数据时出错:", error);
      return null;
    }

    return null;
  },

  // 清除预约数据缓存
  clearReservationCache() {
    console.log("清除预约数据缓存");
    // 清除可能存在的预约数据缓存
    this.setData({
      reservationData: null,
      reservationType: null,
      currentReservationData: null,
      currentReservationType: null,
      currentReservationTimestamp: null,
      currentRequestTimestamp: null // 确保请求时间戳也被清除
    });

    // 清除本地存储中的预约数据
    try {
      wx.removeStorageSync('reservationData');
      wx.removeStorageSync('reservationType');
      wx.removeStorageSync('currentReservationData');
      wx.removeStorageSync('currentReservationType');
      wx.removeStorageSync('currentReservationTimestamp');
      wx.removeStorageSync('currentRequestTimestamp');
    } catch (e) {
      console.error("清除本地存储预约数据失败:", e);
    }

    // 重置预约状态
    this.setData({
      reservationState: {
        isCollecting: false,
        type: '',
        data: {},
        step: '',
        complete: false
      }
    });

    // 清除临时变量
    this._lastExtractedData = null;
    this._lastReservationType = null;

    console.log("预约数据缓存已完全清除");
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取下周某一天的日期
  getNextWeekday(date, dayOfWeek) {
    // dayOfWeek: 0-6，对应周日到周六
    const resultDate = new Date(date);
    resultDate.setDate(date.getDate() + (7 - date.getDay() + dayOfWeek) % 7 + 7);
    return this.formatDate(resultDate);
  },

  // 格式化预约确认信息
  formatReservationConfirmation(data, type) {
    if (type === 'venue') {
      return `场地类型: ${data.venue_type}\n预约日期: ${data.reservation_date}\n时间段: ${this.translateBusinessTime(data.business_time)}\n用途: ${data.purpose}\n\n是否需要设备:\n屏幕: ${data.devices_needed.screen ? '是' : '否'}\n笔记本: ${data.devices_needed.laptop ? '是' : '否'}\n手持麦克风: ${data.devices_needed.mic_handheld ? '是' : '否'}\n鹅颈麦克风: ${data.devices_needed.mic_gooseneck ? '是' : '否'}\n投影仪: ${data.devices_needed.projector ? '是' : '否'}`;
    } else if (type === 'device') {
      // 记录确认窗口中的使用类型，用于调试
      console.log("确认窗口中的使用类型:", data.usage_type);

      // 从最新的AI消息中提取设备信息和使用类型
      let usageTypeFromAI = null;
      let deviceInfoFromAI = null;

      try {
        // 获取最新的AI消息
        const recentMessages = this.data.messages.filter(msg => msg.role === 'assistant').slice(-5).reverse();

        // 记录最新消息内容，用于调试
        if (recentMessages.length > 0) {
          console.log("【确认窗口】最新AI消息内容:", recentMessages[0].content);

          // 尝试从最新消息中提取设备信息
          const latestContent = recentMessages[0].content;

          // 提取设备名称
          const deviceNameMatch = latestContent.match(/设备名称[：:]\s*([^,，。\n]+)/);
          if (deviceNameMatch && deviceNameMatch[1]) {
            const extractedDeviceName = deviceNameMatch[1].trim();
            console.log("【确认窗口】从最新AI消息提取到设备名称:", extractedDeviceName);

            // 检查提取的设备名称是否与当前设备名称不同
            if (extractedDeviceName !== data.device_name) {
              deviceInfoFromAI = {
                device_name: extractedDeviceName
              };
              console.log("【确认窗口】更新设备名称:", extractedDeviceName);
            }
          }

          // 提取借用时间
          const borrowTimeMatch = latestContent.match(/借用时间[：:]\s*([^,，。\n]+)/);
          if (borrowTimeMatch && borrowTimeMatch[1]) {
            const extractedBorrowTime = borrowTimeMatch[1].trim();
            console.log("【确认窗口】从最新AI消息提取到借用时间:", extractedBorrowTime);

            if (deviceInfoFromAI) {
              deviceInfoFromAI.borrow_time = extractedBorrowTime;
            } else {
              deviceInfoFromAI = {
                borrow_time: extractedBorrowTime
              };
            }
          }

          // 提取归还时间
          const returnTimeMatch = latestContent.match(/归还时间[：:]\s*([^,，。\n]+)/);
          if (returnTimeMatch && returnTimeMatch[1] && !returnTimeMatch[1].includes('现场使用不需要')) {
            const extractedReturnTime = returnTimeMatch[1].trim();
            console.log("【确认窗口】从最新AI消息提取到归还时间:", extractedReturnTime);

            if (deviceInfoFromAI) {
              deviceInfoFromAI.return_time = extractedReturnTime;
            } else {
              deviceInfoFromAI = {
                return_time: extractedReturnTime
              };
            }
          }

          // 提取用途说明
          const reasonMatch = latestContent.match(/用途说明[：:]\s*([^,，。\n]+)/);
          if (reasonMatch && reasonMatch[1]) {
            const extractedReason = reasonMatch[1].trim();
            console.log("【确认窗口】从最新AI消息提取到用途说明:", extractedReason);

            if (deviceInfoFromAI) {
              deviceInfoFromAI.reason = extractedReason;
            } else {
              deviceInfoFromAI = {
                reason: extractedReason
              };
            }
          }

          // 提取指导老师
          const teacherMatch = latestContent.match(/指导老师(?:姓名)?[：:]\s*([^,，。\n]+)/);
          if (teacherMatch && teacherMatch[1]) {
            const extractedTeacher = teacherMatch[1].trim();
            // 如果包含"可选"或为空，则设为null
            if (extractedTeacher.includes('可选') || extractedTeacher === '' || extractedTeacher === '无') {
              console.log("【确认窗口】指导老师为可选或空，设为null");
              if (deviceInfoFromAI) {
                deviceInfoFromAI.teacher_name = null;
              } else {
                deviceInfoFromAI = {
                  teacher_name: null
                };
              }
            } else {
              console.log("【确认窗口】从最新AI消息提取到指导老师:", extractedTeacher);
              if (deviceInfoFromAI) {
                deviceInfoFromAI.teacher_name = extractedTeacher;
              } else {
                deviceInfoFromAI = {
                  teacher_name: extractedTeacher
                };
              }
            }
          }
        }

        // 定义格式化时间的函数
        const formatTimeStr = (timeStr) => {
          if (!timeStr) return '';

          // 检查是否是常见的日期时间格式 YYYY-MM-DD HH:MM:SS
          const dateTimeRegex = /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/;
          const match = timeStr.match(dateTimeRegex);

          if (match) {
            // 提取日期和时间部分
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // 月份从0开始
            const day = parseInt(match[3]);
            const hours = parseInt(match[4]);
            const minutes = parseInt(match[5]);
            const seconds = match[6] ? parseInt(match[6]) : 0;

            // 创建日期对象
            const date = new Date(year, month, day, hours, minutes, seconds);

            // 格式化为ISO字符串，确保保留时间部分
            const formattedDate = date.getFullYear() + '-' +
                                 String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                 String(date.getDate()).padStart(2, '0');
            const formattedTime = String(date.getHours()).padStart(2, '0') + ':' +
                                 String(date.getMinutes()).padStart(2, '0') + ':' +
                                 String(date.getSeconds()).padStart(2, '0');

            return `${formattedDate}T${formattedTime}`;
          }

          // 如果不是特定格式，尝试通用解析
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const formattedDate = date.getFullYear() + '-' +
                                   String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                   String(date.getDate()).padStart(2, '0');
              const formattedTime = String(date.getHours()).padStart(2, '0') + ':' +
                                   String(date.getMinutes()).padStart(2, '0') + ':' +
                                   String(date.getSeconds()).padStart(2, '0');

              return `${formattedDate}T${formattedTime}`;
            }
          } catch (e) {}

          return timeStr;
        };

        // 创建一个新的数据对象，优先使用AI消息中提取的信息
        let displayData = {...data}; // 先复制原始数据

        // 如果从AI消息中提取到了设备信息，优先使用这些信息
        if (deviceInfoFromAI) {
          console.log("【确认窗口】从AI消息提取到设备信息:", deviceInfoFromAI);

          // 更新设备名称
          if (deviceInfoFromAI.device_name) {
            displayData.device_name = deviceInfoFromAI.device_name;
            console.log("【确认窗口】更新设备名称为:", deviceInfoFromAI.device_name);
          }

          // 更新借用时间
          if (deviceInfoFromAI.borrow_time) {
            displayData.borrow_time = formatTimeStr(deviceInfoFromAI.borrow_time);
            console.log("【确认窗口】更新借用时间为:", displayData.borrow_time);
          }

          // 更新归还时间
          if (deviceInfoFromAI.return_time) {
            displayData.return_time = formatTimeStr(deviceInfoFromAI.return_time);
            console.log("【确认窗口】更新归还时间为:", displayData.return_time);
          }

          // 更新用途说明
          if (deviceInfoFromAI.reason) {
            displayData.reason = deviceInfoFromAI.reason;
            console.log("【确认窗口】更新用途说明为:", deviceInfoFromAI.reason);
          }

          // 更新指导老师
          if (deviceInfoFromAI.teacher_name !== undefined) {
            displayData.teacher_name = deviceInfoFromAI.teacher_name;
            console.log("【确认窗口】更新指导老师为:", deviceInfoFromAI.teacher_name);
          }

          // 使用displayData替换原始data，确保后续处理使用最新信息
          data = displayData;
        }

        // 逐条分析最近的AI消息，优先使用最新的判断结果
        for (const msg of recentMessages) {
          const content = msg.content || '';

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
        }

        // 如果单条消息没找到，尝试在所有最近消息中查找
        if (!usageTypeFromAI) {
          const latestAIContent = recentMessages.map(msg => msg.content).join(' ');

          if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(latestAIContent)) {
            usageTypeFromAI = 'onsite';
            console.log("【确认窗口】从所有AI消息识别为: 现场使用");
          } else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(latestAIContent)) {
            usageTypeFromAI = 'takeaway';
            console.log("【确认窗口】从所有AI消息识别为: 带走使用");
          }
        }
      } catch (e) {
        console.error("【确认窗口】分析AI消息出错:", e);
      }

      // 如果从AI消息中识别到了使用类型，使用它
      let usageType;
      if (usageTypeFromAI) {
        usageType = usageTypeFromAI;
        console.log("【确认窗口】最终使用类型设置为:", usageTypeFromAI);

        // 更新data中的使用类型，确保后续处理一致
        data.usage_type = usageType;
      } else {
        // 如果没有识别到，使用data中的值，确保值为 'onsite' 或 'takeaway'
        usageType = (data.usage_type === 'onsite') ? 'onsite' : 'takeaway';
        console.log("【确认窗口】未从AI消息识别到使用类型，使用数据中的值:", usageType);
      }

      // 使用类型显示，加粗显示以引起注意
      let usageTypeDisplay = usageType === 'onsite' ? '【现场使用】' : '【带走使用】';

      // 记录最终确认窗口数据
      console.log("【确认窗口】最终显示数据:", {
        device_name: data.device_name,
        borrow_time: data.borrow_time,
        reason: data.reason,
        usage_type: usageType,
        return_time: data.return_time,
        teacher_name: data.teacher_name
      });

      // 构建确认文本，使用最新的数据
      let confirmText = `设备名称: ${data.device_name}\n借用时间: ${data.borrow_time}\n用途说明: ${data.reason}\n使用类型: ${usageTypeDisplay}`;

      // 根据使用类型决定是否显示归还时间
      if (usageType === 'takeaway') {
        // 带走使用，显示归还时间
        if (data.return_time) {
          confirmText += `\n归还时间: ${data.return_time}`;
          console.log("【确认窗口】带走使用，显示归还时间:", data.return_time);
        } else {
          // 带走使用但没有归还时间，添加提示
          confirmText += `\n归还时间: 未指定（将自动设置为借用时间后24小时）`;
          console.log("【确认窗口】带走使用但无归还时间，显示提示");
        }
      } else {
        // 现场使用，明确说明不需要归还时间
        confirmText += `\n归还时间: 现场使用无需归还`;
        console.log("【确认窗口】现场使用，显示无需归还");
      }

      // 添加指导老师信息（如果有）
      if (data.teacher_name) {
        confirmText += `\n指导老师: ${data.teacher_name}`;
        console.log("【确认窗口】显示指导老师:", data.teacher_name);
      } else {
        confirmText += `\n指导老师: 无`;
        console.log("【确认窗口】无指导老师");
      }

      return confirmText;
    } else if (type === 'printer') {
      // 使用原始打印机名称（如果有）或当前打印机名称
      const displayPrinterName = data.original_printer_name || data.printer_name;
      return `打印机名称: ${displayPrinterName}\n预约日期: ${data.reservation_date}\n开始时间: ${data.print_time}\n结束时间: ${data.end_time}\n预计时长: ${data.estimated_duration || '未指定'} 分钟\n模型名称: ${data.model_name || '未指定'}\n指导老师: ${data.teacher_name || '无'}`;
    }
    return '无法显示预约信息';
  },

  // 翻译时间段
  translateBusinessTime(time) {
    switch (time) {
      case 'morning': return '上午';
      case 'afternoon': return '下午';
      case 'evening': return '晚上';
      default: return time;
    }
  },

  // 创建资源ID到名称的映射信息
  createResourceMappingInfo() {
    const availableResources = this.data.availableResources || { venues: [], equipment: [], printers: [] };

    // 创建ID到名称的映射
    const venueMap = {};
    const equipmentMap = {};
    const printerMap = {};

    availableResources.venues.forEach(venue => {
      if (venue.id && venue.name) {
        venueMap[venue.id] = venue.name;
      }
    });

    availableResources.equipment.forEach(equipment => {
      if (equipment.id && equipment.name) {
        equipmentMap[equipment.id] = equipment.name;
      }
    });

    availableResources.printers.forEach(printer => {
      if (printer.id && printer.name) {
        printerMap[printer.id] = printer.name;
      }
    });

    // 格式化为文本
    let mappingInfo = "\n\n资源ID映射信息（系统内部使用）：";

    if (Object.keys(venueMap).length > 0) {
      mappingInfo += "\n场地映射：\n";
      for (const [id, name] of Object.entries(venueMap)) {
        mappingInfo += `${id} => ${name}\n`;
      }
    }

    if (Object.keys(equipmentMap).length > 0) {
      mappingInfo += "\n设备映射：\n";
      for (const [id, name] of Object.entries(equipmentMap)) {
        mappingInfo += `${id} => ${name}\n`;
      }
    }

    if (Object.keys(printerMap).length > 0) {
      mappingInfo += "\n打印机映射：\n";
      for (const [id, name] of Object.entries(printerMap)) {
        mappingInfo += `${id} => ${name}\n`;
      }
    }

    return mappingInfo;
  },

  // 提交预约
  async submitReservation(data, type) {
    console.log(`提交${type}预约:`, data);

    try {
      // 再次验证数据
      this.validateReservationData(data, type);

      // 保存原始数据，用于显示给用户
      const originalData = JSON.parse(JSON.stringify(data));

      wx.showLoading({
        title: '提交预约中...',
        mask: true
      });

      let result;
      let apiPath = '';

      // 根据类型调用不同的API
      if (type === 'venue') {
        // 确保场地预约数据格式正确
        // 确保场地类型符合后端要求
        let venueType = data.venue_type.trim();
        // 保存原始场地类型，用于显示给用户
        originalData.venue_type = venueType;

        // 不进行场地类型映射，直接使用原始类型
        console.log("使用原始场地类型，不进行映射:", venueType);

        console.log("映射后的场地类型:", venueType);

        const venueData = {
          venue_type: venueType,
          reservation_date: data.reservation_date.trim(),
          business_time: data.business_time.trim(),
          purpose: data.purpose.trim(),
          devices_needed: data.devices_needed
        };

        console.log("提交场地预约数据:", venueData);
        apiPath = 'reservations/venue';
        result = await post(apiPath, venueData);
      } else if (type === 'device') {
        // 确保设备预约数据格式正确
        // 确保设备名称符合后端要求
        let deviceName = data.device_name.trim();
        // 保存原始设备名称，用于显示给用户
        originalData.device_name = deviceName;

        // 不进行设备名称映射，直接使用原始名称
        console.log("使用原始设备名称，不进行映射:", deviceName);

        // 保存原始设备名称，用于后续显示
        const originalDeviceName = deviceName;

        // 更新原始数据中的设备名称，确保显示给用户的是原始名称
        originalData.device_name = originalDeviceName;

        console.log("映射后的设备名称:", deviceName);

        // 确定使用类型 - 确保值为 'onsite' 或 'takeaway'
        let usageType = (data.usage_type || 'takeaway').trim();
        // 规范化使用类型值
        if (usageType !== 'onsite' && usageType !== 'takeaway') {
          // 如果值不是预期的两个值之一，根据内容判断
          if (usageType.includes('现场') || usageType.toLowerCase().includes('onsite')) {
            usageType = 'onsite';
          } else if (usageType.includes('带走') || usageType.toLowerCase().includes('takeaway')) {
            usageType = 'takeaway';
          } else {
            // 检查是否有归还时间，如果有则为带走使用
            if (data.return_time) {
              usageType = 'takeaway';
              console.log("检测到归还时间，确定为带走使用");
            } else {
              // 从最近的AI消息中分析使用类型
              try {
                // 获取最新的AI消息，按时间倒序排列（最新的在前）
                const recentMessages = this.data.messages.filter(msg => msg.role === 'assistant').slice(-5).reverse();

                // 记录最新消息内容，用于调试
                if (recentMessages.length > 0) {
                    console.log("提交时最新AI消息内容:", recentMessages[0].content);
                }

                // 优先分析最新的消息
                let usageTypeFromAI = null;

                // 逐条分析最近的AI消息，优先使用最新的判断结果
                for (const msg of recentMessages) {
                    const content = msg.content || '';
                    console.log("提交时分析单条AI消息判断使用类型:", content.substring(0, 100) + "...");

                    // 检查是否包含现场使用的关键词 - 扩展关键词列表
                    if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(content)) {
                        usageTypeFromAI = 'onsite';
                        console.log("提交时从最新AI消息识别为: 现场使用");
                        // 记录匹配到的关键词
                        const match = content.match(/(现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊)/);
                        if (match) {
                            console.log("提交时匹配到的现场使用关键词:", match[0]);
                        }
                        break; // 找到结果后立即退出循环
                    }
                    // 检查是否包含带走使用的关键词
                    else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(content)) {
                        usageTypeFromAI = 'takeaway';
                        console.log("提交时从最新AI消息识别为: 带走使用");
                        // 记录匹配到的关键词
                        const match = content.match(/(带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊)/);
                        if (match) {
                            console.log("提交时匹配到的带走使用关键词:", match[0]);
                        }
                        break; // 找到结果后立即退出循环
                    }
                }

                // 如果在单条消息中没有找到明确指示，尝试在所有最近消息中查找
                if (!usageTypeFromAI) {
                    const latestAIContent = recentMessages.map(msg => msg.content).join(' ');
                    console.log("提交时在所有最近AI消息中查找使用类型指示");

                    // 检查是否包含现场使用的关键词 - 扩展关键词列表
                    if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(latestAIContent)) {
                        usageTypeFromAI = 'onsite';
                        console.log("提交时从所有最近AI消息识别为: 现场使用");
                        // 记录匹配到的关键词
                        const match = latestAIContent.match(/(现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊)/);
                        if (match) {
                            console.log("提交时匹配到的现场使用关键词:", match[0]);
                        }
                    } else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(latestAIContent)) {
                        usageTypeFromAI = 'takeaway';
                        console.log("提交时从所有最近AI消息识别为: 带走使用");
                        // 记录匹配到的关键词
                        const match = latestAIContent.match(/(带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊)/);
                        if (match) {
                            console.log("提交时匹配到的带走使用关键词:", match[0]);
                        }
                    }
                }

                // 如果从AI内容中找到了使用类型，则使用它
                if (usageTypeFromAI) {
                    // 强制覆盖之前的使用类型设置
                    usageType = usageTypeFromAI;
                    console.log("提交时最终从AI内容确定使用类型为:", usageType);

                    // 根据使用类型处理归还时间
                    if (usageType === 'onsite') {
                        // 如果是现场使用，确保归还时间为null
                        data.return_time = null;
                        console.log("现场使用，清除归还时间");

                        // 强制更新原始数据中的使用类型和归还时间
                        originalData.usage_type = 'onsite';
                        originalData.return_time = null;
                        console.log("强制更新原始数据为现场使用，清除归还时间");
                    } else if (usageType === 'takeaway') {
                        console.log("确认为带走使用");
                        // 如果是带走使用但没有归还时间，设置一个默认归还时间（借用时间+24小时）
                        if (!data.return_time && data.borrow_time) {
                            try {
                                const borrowDate = new Date(data.borrow_time);
                                borrowDate.setHours(borrowDate.getHours() + 24); // 默认借用24小时
                                data.return_time = borrowDate.toISOString().replace('Z', '').replace(/\.\d+/, '');
                                console.log("带走使用但无归还时间，设置默认归还时间:", data.return_time);

                                // 更新原始数据中的归还时间
                                originalData.return_time = data.return_time;
                            } catch (e) {
                                console.error("设置默认归还时间失败:", e);
                            }
                        }

                        // 强制更新原始数据中的使用类型
                        originalData.usage_type = 'takeaway';
                    }

                    // 再次检查使用类型和归还时间的一致性
                    if (usageType === 'onsite' && data.return_time !== null) {
                        console.log("【检测到不一致】现场使用但归还时间不为null，强制修正");
                        data.return_time = null;
                        originalData.return_time = null;
                    }
                } else {
                    // 如果无法从AI回复中判断，使用默认值
                    usageType = 'takeaway'; // 默认为带走
                    console.log("提交时未从AI返回内容识别到使用类型，默认为: 带走使用");
                }
              } catch (error) {
                console.error("分析AI返回内容时出错:", error);
                usageType = 'takeaway'; // 出错时默认为带走
              }
            }
          }
        }
        console.log("规范化后的使用类型:", usageType);

        // 确保原始数据中的使用类型与最终确定的一致
        originalData.usage_type = usageType;
        console.log("最终确定的使用类型:", usageType, "原始数据中的使用类型:", originalData.usage_type);

        // 首先确保使用类型是正确的
        if (usageType !== 'onsite' && usageType !== 'takeaway') {
          console.log("【警告】使用类型不是onsite或takeaway，强制设为takeaway");
          usageType = 'takeaway';
        }

        // 如果是现场使用，确保没有归还时间
        if (usageType === 'onsite') {
          data.return_time = null;
          originalData.return_time = null;
          console.log("【重要】现场使用，强制清除return_time");
        }

        // 格式化时间字符串，确保格式一致
        const formatTimeStr = (timeStr) => {
          if (!timeStr) return null;

          // 如果已经是ISO格式，直接返回
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
            return timeStr;
          }

          try {
            // 检查是否是常见的日期时间格式 YYYY-MM-DD HH:MM:SS
            const dateTimeRegex = /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/;
            const match = timeStr.match(dateTimeRegex);

            if (match) {
              // 提取日期和时间部分
              const year = parseInt(match[1]);
              const month = parseInt(match[2]) - 1; // 月份从0开始
              const day = parseInt(match[3]);
              const hours = parseInt(match[4]);
              const minutes = parseInt(match[5]);
              const seconds = match[6] ? parseInt(match[6]) : 0;

              // 创建日期对象
              const date = new Date(year, month, day, hours, minutes, seconds);

              // 格式化为ISO字符串，确保保留时间部分
              const formattedDate = date.getFullYear() + '-' +
                                   String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                   String(date.getDate()).padStart(2, '0');
              const formattedTime = String(date.getHours()).padStart(2, '0') + ':' +
                                   String(date.getMinutes()).padStart(2, '0') + ':' +
                                   String(date.getSeconds()).padStart(2, '0');

              const isoStr = `${formattedDate}T${formattedTime}`;
              console.log(`时间格式化(精确): ${timeStr} => ${isoStr}`);
              return isoStr;
            }

            // 如果不是特定格式，尝试通用解析
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) {
              console.log("无法解析时间字符串:", timeStr);
              return timeStr.trim(); // 如果无法解析，返回原始字符串
            }

            // 格式化为ISO字符串，确保保留时间部分
            const formattedDate = date.getFullYear() + '-' +
                                 String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                 String(date.getDate()).padStart(2, '0');
            const formattedTime = String(date.getHours()).padStart(2, '0') + ':' +
                                 String(date.getMinutes()).padStart(2, '0') + ':' +
                                 String(date.getSeconds()).padStart(2, '0');

            const isoStr = `${formattedDate}T${formattedTime}`;
            console.log(`时间格式化(通用): ${timeStr} => ${isoStr}`);
            return isoStr;
          } catch (e) {
            console.error("时间格式化错误:", e);
            return timeStr.trim();
          }
        };

        // 构建设备预约数据
        const deviceData = {
          device_name: deviceName,
          borrow_time: formatTimeStr(data.borrow_time),
          reason: data.reason.trim(),
          usage_type: usageType, // 使用最终确定的使用类型
          // 可选字段 - 确保指导老师信息正确处理
          teacher_name: data.teacher_name ? (data.teacher_name.trim() === '无' ? null : data.teacher_name.trim()) : null
        };

        // 记录指导老师信息
        console.log("设备预约数据中的指导老师:", deviceData.teacher_name);

        // 根据使用类型处理归还时间 - 强制执行
        if (usageType === 'onsite') {
          // 现场使用不需要归还时间 - 强制设为null
          deviceData.return_time = null;
          // 确保原始数据中也没有归还时间，避免在确认窗口中显示
          originalData.return_time = null;
          console.log("【重要】现场使用，强制设置return_time为null");

          // 再次确认使用类型
          deviceData.usage_type = 'onsite';
          originalData.usage_type = 'onsite';
          console.log("【重要】再次确认使用类型为现场使用");

          // 记录最终提交的数据
          console.log("【最终提交】现场使用设备预约数据:", JSON.stringify(deviceData));
        } else if (usageType === 'takeaway') {
          if (data.return_time) {
            // 带走使用且有归还时间
            deviceData.return_time = formatTimeStr(data.return_time);
            // 同步更新原始数据，确保显示一致
            originalData.return_time = deviceData.return_time;
            console.log("带走使用，设置归还时间:", deviceData.return_time);
          } else {
            // 带走使用但没有归还时间 - 设置默认归还时间
            try {
              // 使用格式化后的借用时间
              const borrowDate = new Date(deviceData.borrow_time);
              if (isNaN(borrowDate.getTime())) {
                throw new Error("无法解析借用时间");
              }

              borrowDate.setHours(borrowDate.getHours() + 24); // 默认借用24小时
              const defaultReturnTime = borrowDate.toISOString().replace('Z', '').replace(/\.\d+/, '');
              deviceData.return_time = defaultReturnTime;
              originalData.return_time = defaultReturnTime;
              console.log("带走使用但无归还时间，设置默认归还时间:", defaultReturnTime);
            } catch (e) {
              console.error("设置默认归还时间失败:", e);
              // 如果无法设置默认归还时间，使用借用时间加一天的简单字符串
              try {
                const borrowTimeStr = deviceData.borrow_time;
                if (borrowTimeStr && borrowTimeStr.includes('T')) {
                  const datePart = borrowTimeStr.split('T')[0];
                  const timePart = borrowTimeStr.split('T')[1];
                  // 简单地将日期部分的日加1
                  const dateComponents = datePart.split('-');
                  const year = parseInt(dateComponents[0]);
                  const month = parseInt(dateComponents[1]);
                  const day = parseInt(dateComponents[2]) + 1;
                  const nextDay = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const defaultReturnTime = `${nextDay}T${timePart}`;
                  deviceData.return_time = defaultReturnTime;
                  originalData.return_time = defaultReturnTime;
                  console.log("使用简单方法设置默认归还时间:", defaultReturnTime);
                } else {
                  deviceData.return_time = null;
                  originalData.return_time = null;
                }
              } catch (e2) {
                console.error("简单设置归还时间也失败:", e2);
                deviceData.return_time = null;
                originalData.return_time = null;
              }
            }
          }

          // 再次确认使用类型
          deviceData.usage_type = 'takeaway';
          originalData.usage_type = 'takeaway';
          console.log("【重要】再次确认使用类型为带走使用");

          // 记录最终提交的数据
          console.log("【最终提交】带走使用设备预约数据:", JSON.stringify(deviceData));
        }

        // 最终检查 - 确保使用类型和归还时间一致
        if (deviceData.usage_type === 'onsite' && deviceData.return_time !== null) {
          console.log("【错误】现场使用但归还时间不为null，强制修正");
          deviceData.return_time = null;
          originalData.return_time = null;
        }

        // 再次检查使用类型是否正确
        console.log("【最终检查】使用类型:", deviceData.usage_type, "归还时间:", deviceData.return_time);

        console.log("最终设备预约数据中的使用类型:", deviceData.usage_type);

        console.log("提交设备预约数据:", deviceData);

        // 从最新的AI消息中提取设备信息和使用类型
        let usageTypeFromAI = null;
        let deviceInfoFromAI = null;

        try {
          // 获取最新的AI消息
          const recentMessages = this.data.messages.filter(msg => msg.role === 'assistant').slice(-5).reverse();

          // 记录最新消息内容，用于调试
          if (recentMessages.length > 0) {
            console.log("【API提交前】最新AI消息内容:", recentMessages[0].content);

            // 尝试从最新消息中提取设备信息
            const latestContent = recentMessages[0].content;

            // 提取设备名称
            const deviceNameMatch = latestContent.match(/设备名称[：:]\s*([^,，。\n]+)/);
            if (deviceNameMatch && deviceNameMatch[1]) {
              const extractedDeviceName = deviceNameMatch[1].trim();
              console.log("【API提交前】从最新AI消息提取到设备名称:", extractedDeviceName);

              // 检查提取的设备名称是否与当前设备名称不同
              if (extractedDeviceName !== deviceName) {
                deviceInfoFromAI = {
                  device_name: extractedDeviceName
                };
                console.log("【API提交前】更新设备名称:", extractedDeviceName);
              }
            }

            // 提取借用时间
            const borrowTimeMatch = latestContent.match(/借用时间[：:]\s*([^,，。\n]+)/);
            if (borrowTimeMatch && borrowTimeMatch[1]) {
              const extractedBorrowTime = borrowTimeMatch[1].trim();
              console.log("【API提交前】从最新AI消息提取到借用时间:", extractedBorrowTime);

              if (deviceInfoFromAI) {
                deviceInfoFromAI.borrow_time = extractedBorrowTime;
              } else {
                deviceInfoFromAI = {
                  borrow_time: extractedBorrowTime
                };
              }
            }

            // 提取归还时间
            const returnTimeMatch = latestContent.match(/归还时间[：:]\s*([^,，。\n]+)/);
            if (returnTimeMatch && returnTimeMatch[1] && !returnTimeMatch[1].includes('现场使用不需要')) {
              const extractedReturnTime = returnTimeMatch[1].trim();
              console.log("【API提交前】从最新AI消息提取到归还时间:", extractedReturnTime);

              if (deviceInfoFromAI) {
                deviceInfoFromAI.return_time = extractedReturnTime;
              } else {
                deviceInfoFromAI = {
                  return_time: extractedReturnTime
                };
              }
            }

            // 提取用途说明
            const reasonMatch = latestContent.match(/用途说明[：:]\s*([^,，。\n]+)/);
            if (reasonMatch && reasonMatch[1]) {
              const extractedReason = reasonMatch[1].trim();
              console.log("【API提交前】从最新AI消息提取到用途说明:", extractedReason);

              if (deviceInfoFromAI) {
                deviceInfoFromAI.reason = extractedReason;
              } else {
                deviceInfoFromAI = {
                  reason: extractedReason
                };
              }
            }

            // 提取指导老师
            const teacherMatch = latestContent.match(/指导老师(?:姓名)?[：:]\s*([^,，。\n]+)/);
            if (teacherMatch && teacherMatch[1]) {
              const extractedTeacher = teacherMatch[1].trim();
              // 如果包含"可选"或为空，则设为null
              if (extractedTeacher.includes('可选') || extractedTeacher === '' || extractedTeacher === '无') {
                console.log("【API提交前】指导老师为可选或空，设为null");
                if (deviceInfoFromAI) {
                  deviceInfoFromAI.teacher_name = null;
                } else {
                  deviceInfoFromAI = {
                    teacher_name: null
                  };
                }
              } else {
                console.log("【API提交前】从最新AI消息提取到指导老师:", extractedTeacher);
                if (deviceInfoFromAI) {
                  deviceInfoFromAI.teacher_name = extractedTeacher;
                } else {
                  deviceInfoFromAI = {
                    teacher_name: extractedTeacher
                  };
                }
              }
            }
          }

          // 逐条分析最近的AI消息，优先使用最新的判断结果
          for (const msg of recentMessages) {
            const content = msg.content || '';

            // 检查是否包含现场使用的关键词
            if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(content)) {
              usageTypeFromAI = 'onsite';
              console.log("【API提交前】从AI消息识别为: 现场使用");
              break;
            }
            // 检查是否包含带走使用的关键词
            else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(content)) {
              usageTypeFromAI = 'takeaway';
              console.log("【API提交前】从AI消息识别为: 带走使用");
              break;
            }
          }

          // 如果单条消息没找到，尝试在所有最近消息中查找
          if (!usageTypeFromAI) {
            const latestAIContent = recentMessages.map(msg => msg.content).join(' ');

            if (/现场使用|在现场使用|不带走|不需要带走|在工坊使用|在创新工坊使用|在场地使用|在实验室使用|在工作室使用|在现场|不带出|留在现场|留在工坊|不带离|在工坊内使用|在创新工坊内使用|现场|在现场|在工坊|在创新工坊/.test(latestAIContent)) {
              usageTypeFromAI = 'onsite';
              console.log("【API提交前】从所有AI消息识别为: 现场使用");
            } else if (/带走使用|需要带走|带回|带回去|带离|带出|带回家|带回宿舍|带回实验室|带回工作室|带回教室|带回办公室|带离现场|带离工坊|带离创新工坊|带出工坊|带出创新工坊/.test(latestAIContent)) {
              usageTypeFromAI = 'takeaway';
              console.log("【API提交前】从所有AI消息识别为: 带走使用");
            }
          }
        } catch (e) {
          console.error("【API提交前】分析AI消息出错:", e);
        }

        // 如果从AI消息中提取到了设备信息，更新设备数据
        if (deviceInfoFromAI) {
          console.log("【API提交前】从AI消息提取到设备信息:", deviceInfoFromAI);

          // 更新设备名称
          if (deviceInfoFromAI.device_name) {
            deviceData.device_name = deviceInfoFromAI.device_name;
            originalData.device_name = deviceInfoFromAI.device_name;
            console.log("【API提交前】更新设备名称为:", deviceInfoFromAI.device_name);
          }

          // 更新借用时间
          if (deviceInfoFromAI.borrow_time) {
            deviceData.borrow_time = formatTimeStr(deviceInfoFromAI.borrow_time);
            originalData.borrow_time = deviceData.borrow_time;
            console.log("【API提交前】更新借用时间为:", deviceData.borrow_time);
          }

          // 更新归还时间
          if (deviceInfoFromAI.return_time) {
            deviceData.return_time = formatTimeStr(deviceInfoFromAI.return_time);
            originalData.return_time = deviceData.return_time;
            console.log("【API提交前】更新归还时间为:", deviceData.return_time);
          }

          // 更新用途说明
          if (deviceInfoFromAI.reason) {
            deviceData.reason = deviceInfoFromAI.reason;
            originalData.reason = deviceInfoFromAI.reason;
            console.log("【API提交前】更新用途说明为:", deviceInfoFromAI.reason);
          }

          // 更新指导老师
          if (deviceInfoFromAI.teacher_name) {
            deviceData.teacher_name = deviceInfoFromAI.teacher_name;
            originalData.teacher_name = deviceInfoFromAI.teacher_name;
            console.log("【API提交前】更新指导老师为:", deviceInfoFromAI.teacher_name);
          }
        }

        // 如果从AI消息中识别到了使用类型，使用它
        if (usageTypeFromAI) {
          deviceData.usage_type = usageTypeFromAI;
          originalData.usage_type = usageTypeFromAI;
          console.log("【API提交前】最终使用类型设置为:", usageTypeFromAI);
        } else {
          // 如果没有识别到，使用默认值
          deviceData.usage_type = 'takeaway'; // 默认为带走使用
          originalData.usage_type = 'takeaway';
          console.log("【API提交前】未识别到使用类型，默认设为带走使用");
        }

        // 根据最终确定的使用类型处理归还时间
        if (deviceData.usage_type === 'onsite') {
          // 现场使用，归还时间设为null
          deviceData.return_time = null;
          originalData.return_time = null;
          console.log("【API提交前】现场使用，归还时间设为null");
        } else {
          // 带走使用，确保有归还时间
          if (!deviceData.return_time && deviceData.borrow_time) {
            try {
              const borrowDate = new Date(deviceData.borrow_time);
              borrowDate.setHours(borrowDate.getHours() + 24); // 默认借用24小时
              const defaultReturnTime = borrowDate.toISOString().replace('Z', '').replace(/\.\d+/, '');
              deviceData.return_time = defaultReturnTime;
              originalData.return_time = defaultReturnTime;
              console.log("【API提交前】带走使用设置默认归还时间:", defaultReturnTime);
            } catch (e) {
              console.error("【API提交前】设置默认归还时间失败:", e);
              // 使用简单的方法设置归还时间
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const defaultReturnTime = tomorrow.toISOString().replace('Z', '').replace(/\.\d+/, '');
              deviceData.return_time = defaultReturnTime;
              originalData.return_time = defaultReturnTime;
              console.log("【API提交前】使用备用方法设置归还时间:", defaultReturnTime);
            }
          }
        }

        // 最终检查 - 确保使用类型和归还时间一致
        if (deviceData.usage_type === 'onsite' && deviceData.return_time !== null) {
          console.log("【API提交前最终检查】现场使用但归还时间不为null，强制修正");
          deviceData.return_time = null;
          originalData.return_time = null;
        } else if (deviceData.usage_type === 'takeaway' && deviceData.return_time === null) {
          console.log("【API提交前最终检查】带走使用但归还时间为null，设置默认值");
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const defaultReturnTime = tomorrow.toISOString().replace('Z', '').replace(/\.\d+/, '');
          deviceData.return_time = defaultReturnTime;
          originalData.return_time = defaultReturnTime;
        }

        // 再次记录最终提交的数据，确保一致性
        console.log("【API提交前最终数据】使用类型:", deviceData.usage_type, "归还时间:", deviceData.return_time);

        // 记录最终API提交数据
        console.log("【API最终提交】设备预约数据:", JSON.stringify(deviceData));

        apiPath = 'reservations/device';
        result = await post(apiPath, deviceData);
      } else if (type === 'printer') {
        // 确保打印机预约数据格式正确
        // 确保打印机名称符合后端要求
        let printerName = data.printer_name.trim();
        // 保存原始打印机名称，用于显示给用户
        originalData.printer_name = printerName;

        // 不进行打印机名称映射，直接使用原始名称
        console.log("使用原始打印机名称，不进行映射:", printerName);

        console.log("映射后的打印机名称:", printerName);

        const printerData = {
          printer_name: printerName,
          reservation_date: data.reservation_date.trim(),
          print_time: data.print_time.trim(),
          end_time: data.end_time.trim(),
          // 可选字段
          estimated_duration: data.estimated_duration || 60,
          model_name: data.model_name ? data.model_name.trim() : null,
          teacher_name: data.teacher_name ? data.teacher_name.trim() : null
        };

        console.log("提交打印机预约数据:", printerData);
        apiPath = 'reservations/printer';
        result = await post(apiPath, printerData);
      }

      wx.hideLoading();

      console.log(`API ${apiPath} 返回结果:`, result);

      if (result) {
        wx.showToast({
          title: '预约提交成功',
          icon: 'success',
          duration: 2000
        });

        // 添加成功消息，显示原始数据（中文名称）而不是ID
        let successMessage = '预约已成功提交喵～\n\n';

        // 根据预约类型添加不同的成功信息
        if (type === 'venue') {
          successMessage += `已成功预约场地：${originalData.venue_type}\n`;
          successMessage += `日期：${originalData.reservation_date}\n`;
          successMessage += `时间段：${this.translateBusinessTime(originalData.business_time)}\n`;
        } else if (type === 'device') {
          // 记录成功消息中的使用类型，用于调试
          console.log("成功消息中的使用类型:", originalData.usage_type);

          // 强制检查使用类型，确保值为 'onsite' 或 'takeaway'
          const usageType = (originalData.usage_type === 'onsite') ? 'onsite' : 'takeaway';

          // 根据最终确定的使用类型处理归还时间
          if (usageType === 'onsite') {
            // 现场使用，确保没有归还时间
            originalData.return_time = null;
            console.log("【成功消息】现场使用，确保没有归还时间");
          } else if (usageType === 'takeaway' && !originalData.return_time) {
            // 带走使用但没有归还时间，设置默认值
            try {
              const borrowDate = new Date(originalData.borrow_time);
              borrowDate.setHours(borrowDate.getHours() + 24);
              originalData.return_time = borrowDate.toISOString().replace('Z', '').replace(/\.\d+/, '');
              console.log("【成功消息】带走使用设置默认归还时间:", originalData.return_time);
            } catch (e) {
              console.error("【成功消息】设置默认归还时间失败:", e);
              // 使用当前时间加一天
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              originalData.return_time = tomorrow.toISOString().replace('Z', '').replace(/\.\d+/, '');
            }
          }

          successMessage += `已成功预约设备：${originalData.device_name}\n`;
          successMessage += `借用时间：${originalData.borrow_time}\n`;

          // 使用类型显示，加粗显示以引起注意
          const usageTypeDisplay = usageType === 'onsite' ? '【现场使用】' : '【带走使用】';
          successMessage += `使用类型：${usageTypeDisplay}\n`;

          // 根据使用类型决定是否显示归还时间
          if (usageType === 'takeaway') {
            // 带走使用，显示归还时间
            if (originalData.return_time) {
              successMessage += `归还时间：${originalData.return_time}\n`;
              console.log("【成功消息】带走使用，显示归还时间:", originalData.return_time);
            } else {
              // 理论上不应该发生，因为前面已经设置了默认值
              successMessage += `归还时间：未指定（请在审核通过后确认归还时间）\n`;
              console.log("【成功消息】带走使用但无归还时间，显示提示");
            }
          } else {
            // 现场使用显示无需归还
            successMessage += `归还时间：现场使用无需归还\n`;
            console.log("【成功消息】现场使用，显示无需归还");
          }

          // 显示用途说明
          successMessage += `用途说明：${originalData.reason}\n`;

          // 显示指导老师信息（如果有）
          if (originalData.teacher_name) {
            successMessage += `指导老师：${originalData.teacher_name}\n`;
            console.log("【成功消息】显示指导老师:", originalData.teacher_name);
          } else {
            successMessage += `指导老师：无\n`;
            console.log("【成功消息】无指导老师");
          }
        } else if (type === 'printer') {
          // 使用原始打印机名称（如果有）或当前打印机名称
          const displayPrinterName = originalData.original_printer_name || originalData.printer_name;
          successMessage += `已成功预约打印机：${displayPrinterName}\n`;
          successMessage += `预约日期：${originalData.reservation_date}\n`;
          successMessage += `时间段：${originalData.print_time} - ${originalData.end_time}\n`;
          if (originalData.model_name) {
            successMessage += `打印模型：${originalData.model_name}\n`;
          }
        }

        successMessage += '\n请在"我的预约"中查看审核状态哦！有什么问题随时问我喵～';

        // 先清除预约数据缓存，再添加成功消息
        this.clearReservationCache();

        // 清除所有临时变量和状态
        this._lastExtractedData = null;
        this._lastReservationType = null;
        this._lastSubmittedData = null;
        this._lastSubmittedType = null;

        // 重置所有相关状态
        this.setData({
          reservationData: null,
          reservationType: null,
          currentReservationData: null,
          currentReservationType: null,
          currentReservationTimestamp: null,
          currentRequestTimestamp: null,
          reservationState: {
            isCollecting: false,
            type: '',
            data: {},
            step: '',
            complete: false
          },
          isLoading: false
        });

        // 添加成功消息
        this.addMessage('assistant', successMessage);

        // 重新获取资源列表，确保下次预约时数据是最新的
        setTimeout(() => {
          this.fetchResourcesAndUpdatePrompt().catch(err => {
            console.error("重新获取资源列表失败:", err);
          });
        }, 1000);
      } else {
        throw new Error("服务器未返回有效结果");
      }
    } catch (error) {
      wx.hideLoading();
      console.error("提交预约失败:", error);

      wx.showToast({
        title: '预约提交失败',
        icon: 'error',
        duration: 2000
      });

      // 添加失败消息
      let errorMsg = error.message || '未知错误';
      // 处理常见错误
      if (errorMsg.includes('404')) {
        errorMsg = '接口不存在，请联系管理员检查API路径';
      } else if (errorMsg.includes('401')) {
        errorMsg = '未授权，请重新登录';
      } else if (errorMsg.includes('500')) {
        errorMsg = '服务器内部错误，请稍后再试';
      }

      // 先清除预约数据缓存
      this.clearReservationCache();

      // 清除所有临时变量和状态
      this._lastExtractedData = null;
      this._lastReservationType = null;
      this._lastSubmittedData = null;
      this._lastSubmittedType = null;

      // 重置所有相关状态
      this.setData({
        reservationData: null,
        reservationType: null,
        currentReservationData: null,
        currentReservationType: null,
        currentReservationTimestamp: null,
        currentRequestTimestamp: null,
        reservationState: {
          isCollecting: false,
          type: '',
          data: {},
          step: '',
          complete: false
        },
        isLoading: false
      });

      // 添加失败消息
      this.addMessage('assistant', `预约提交失败了喵～错误信息: ${errorMsg}。要不要检查一下信息是否正确，或者稍后再试试看？`);

      // 如果是接口错误，尝试重新获取资源列表
      if (errorMsg.includes('接口不存在') || errorMsg.includes('服务器内部错误')) {
        setTimeout(() => {
          this.fetchResourcesAndUpdatePrompt().catch(err => {
            console.error("重新获取资源列表失败:", err);
          });
        }, 1000);
      }
    }
  }
})