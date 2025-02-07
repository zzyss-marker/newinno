好的，我来帮你整理一个完整的API文档：

# 预约系统API文档

## 基础信息

- 基础URL: `http://localhost:8001/api`
- 所有需要认证的接口都需要在请求头中添加 `Authorization: Bearer {token}`

## 认证相关接口

### 1. 用户登录

```
POST /token
Content-Type: application/x-www-form-urlencoded

参数：
- username: 用户名/学号
- password: 密码
- grant_type: "password"

返回：
{
    "access_token": "string",
    "token_type": "bearer"
}
```

### 2. 导入用户

```
POST /users/import
Content-Type: multipart/form-data

参数：
- file: Excel文件（包含列：学号/工号、姓名、学院、身份证号后6位）

返回：
[
    {
        "username": "string",
        "name": "string",
        "role": "string",
        "department": "string"
    }
]
```

## 预约管理接口

### 1. 场地预约

```
POST /reservations/venue

请求体：
{
    "venue_type": "讲座|研讨室|会议室",
    "reservation_date": "YYYY-MM-DD",
    "business_time": "上午|下午|晚上",
    "purpose": "string",
    "devices_needed": {
        "screen": boolean,
        "laptop": boolean,
        "mic_handheld": boolean,
        "mic_gooseneck": boolean,
        "projector": boolean
    }
}
```

### 2. 设备预约

```
POST /reservations/device

请求体：
{
    "device_name": "string",
    "borrow_time": "YYYY-MM-DDTHH:mm:ss",
    "return_time": "YYYY-MM-DDTHH:mm:ss",
    "reason": "string"
}
```

### 3. 3D打印机预约

```
POST /reservations/printer

请求体：
{
    "printer_name": "printer_1|printer_2|printer_3",
    "reservation_date": "YYYY-MM-DD",
    "print_time": "YYYY-MM-DDTHH:mm:ss"
}
```

### 4. 查看个人预约记录

```
GET /reservations/my-reservations

返回：
{
    "venue_reservations": [...],
    "device_reservations": [...],
    "printer_reservations": [...]
}
```

## 管理员接口

### 1. 设备管理

#### 添加设备

```
POST /management/devices

请求体：
{
    "device_or_venue_name": "string",
    "category": "device|venue|printer",
    "quantity": int,
    "available_quantity": int,
    "status": "available|maintenance"
}
```

#### 更新设备信息

```
PUT /management/devices/{device_id}

请求体：
{
    "quantity": int,
    "available_quantity": int,
    "status": "string"
}
```

#### 更新设备数量

```
PUT /management/devices/{device_id}/quantity

请求体：
{
    "quantity": int
}
```

#### 更新可用数量

```
PUT /management/devices/{device_id}/available

请求体：
{
    "available_quantity": int
}
```

#### 查看设备状态

```
GET /management/devices/status
查询参数：
- category: "device|venue|printer"
```

### 2. 预约管理

#### 查看待审批预约

```
GET /admin/reservations/pending
```

#### 批量审批预约

```
POST /admin/reservations/batch-approve
查询参数：
- reservation_type: "venue|device|printer"

请求体：
{
    "reservation_ids": [int],
    "action": "approve|reject"
}
```

#### 确认设备归还

```
PUT /admin/device-return/{reservation_id}
```

### 3. 统计与导出

#### 导出预约记录

```
GET /admin/export-reservations
返回：Excel文件
```

#### 获取预约统计

```
GET /management/reservations/stats
```

#### 获取使用统计

```
GET /management/usage-stats
查询参数：
- start_date: "YYYY-MM-DD"
- end_date: "YYYY-MM-DD"
```

#### 查询设备历史

```
GET /management/devices/{device_name}/history
查询参数：
- start_date: "YYYY-MM-DD"
- end_date: "YYYY-MM-DD"
```

#### 查询用户借用历史

```
GET /management/users/{username}/borrow-history
```

## 数据模型

### 用户角色

- student: 学生
- teacher: 教师
- admin: 管理员

### 预约状态

- pending: 待审批
- approved: 已通过
- rejected: 已拒绝
- returned: 已归还（仅设备预约）

### 场地类型

- 讲座
- 研讨室
- 会议室

### 时间段

- 上午
- 下午
- 晚上

这个文档涵盖了系统的主要功能和接口。每个接口都包含了：

1. 请求方法和路径
2. 请求参数（如果有）
3. 返回数据格式
4. 所需权限

需要注意的是：

1. 所有需要认证的接口都需要有效的token
2. 管理员接口需要管理员权限
3. 时间格式统一使用ISO格式
4. 文件上传和下载使用multipart/form-data格式
