// pages/ai_chat/ai_chat.js
const app = getApp(); // 获取全局应用实例
const config = require('../../config.js'); // 导入系统配置
const aiConfig = require('../../utils/ai_config.js'); // 导入AI助手配置

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
    systemPrompt: `你是一只可爱的小猫咪，是创新工坊的场地和设备使用助手，喵～
1.你的主要任务是根据用户的需求,提供创新工坊的场地、设备和3D打印机使用的建议与相关信息,尽可能满足用户的请求。
2.你需要回答与创新工坊的场地使用、设备使用、3D打印机使用、预约流程以及相关设备场地有关知识点的问题喵～
3.你的语气要可爱、亲切，让用户感到轻松愉快喵～
4.回答要简洁明了，不要太长哦，但可以适度加点可爱小尾巴或者语气助词，比如"喵"、"呐"、"嘿嘿"等～
5.当用户表示有预约意图时，可以温柔地引导他们前往相关预约页面，轻轻告诉他们需要准备的信息，比如使用时间、使用项目等～不过喵，记得要告诉他们自己动爪爪操作预约页面才可以完成预约喔～
6.不要代替用户提交预约，也不要收集完整预约信息，只要帮助他们了解流程就好啦～
7.除了创新工坊的事情，你还可以和用户聊点轻松的话题哦～
8.请用纯文本回答，不要用markdown格式，也不要加特殊符号喵～
`,
    loadedAiConfig: null, // 将加载的配置存储在这里
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function(options) {
    console.log("AI Chat Page: onLoad triggered.");
    // 保留 onLoad 用于仅需执行一次的逻辑，如果未来有的话
    // 初始化消息（可以保留在这里，或者移到 onShow 也可以）
    // this.initWelcomeMessage(); 
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

         const [venues, equipment, printers] = await Promise.all([
             this.getVenueList(),
             this.getEquipmentList(),
             this.getPrinterList()
         ]);

         const venueNames = venues.length > 0 ? venues.map(v => v.name).join(', ') : '暂无场地信息';
         const equipmentNames = equipment.length > 0 ? equipment.map(e => e.name).join(', ') : '暂无设备信息';
         const printerNames = printers.length > 0 ? printers.map(p => p.name).join(', ') : '暂无打印机信息';

         console.log("Formatted Resource Strings:", { venueNames, equipmentNames, printerNames }); // Log formatted strings

         // 获取基础系统提示 (从 data 中获取初始定义的 prompt)
         const baseSystemPrompt = this.data.systemPrompt.split('\n\n以下是当前可用的资源参考：')[0]; // 获取初始定义的提示部分

         // 动态添加资源列表信息
         const resourceInfo = `\n\n以下是当前可用的资源参考：\n- 可用场地列表：${venueNames}\n- 可用设备列表：${equipmentNames}\n- 可用打印机列表：${printerNames}`;

         // 更新 data 中的 systemPrompt
         this.setData({
             systemPrompt: baseSystemPrompt + resourceInfo 
         });
         console.log("AI Chat Page: System prompt updated with resource lists.");
         console.log("Final System Prompt set in data:", baseSystemPrompt + resourceInfo); // Log the final prompt being set
         wx.hideLoading(); // 隐藏加载提示

     } catch (error) {
         console.error("AI Chat Page: Failed to fetch resources or update prompt:", error);
         wx.hideLoading(); // 隐藏加载提示
         wx.showToast({
             title: '资源列表加载失败',
             icon: 'none',
             duration: 2000
         });
         // 即使失败，也确保使用基础提示词
         this.setData({
             systemPrompt: this.data.systemPrompt.split('\n\n以下是当前可用的资源参考：')[0] // 回退到基础提示
         });
          // 可选: 向用户显示一个系统消息
          // this.addMessage('system', '抱歉，无法获取最新的场地和设备列表，部分信息可能不准确。');
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
  onInputFocus(e) {
    this.setData({
      inputFocus: true
    });
    this.scrollToBottom(100); // 输入框聚焦时尝试滚动，给键盘弹出留点时间
  },

  // 输入框失去焦点
  onInputBlur(e) {
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

    // 将用户消息添加到列表
    const userMessage = { role: 'user', content: userMessageContent };
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '', // 清空输入框
      isLoading: true, // 开始加载
    });
    this.scrollToBottom(); // 滚动到底部显示新消息

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
        success: (res) => {
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
}) 