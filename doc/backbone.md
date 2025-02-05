好的，我来详细介绍系统的功能和使用方法。

# 1. 用户认证系统

## 1.1 用户登录

```
POST /api/token
```

- 用途：获取访问令牌
- 请求格式（form-data）:

```json
{
    "username": "学号/工号",
    "password": "密码"
}
```

- 响应示例:

```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer",
    "role": "student"  // 或 "teacher" 或 "admin"
}
```

# 2. 预约功能（需要登录）

## 2.1 场地预约

```
POST /api/reservations/venue
```

- 必须提前3天预约
- 请求示例:

```json
{
    "venue_type": "lecture",  // 可选: lecture(讲座), seminar(研讨室), meeting_room(会议室)
    "reservation_date": "2024-03-20",
    "business_time": "afternoon",  // 可选: afternoon(下午), evening(晚上)
    "purpose": "举办学术讲座",
    "devices_needed": {
        "screen": true,
        "laptop": true,
        "microphone_handheld": true,
        "microphone_headset": false,
        "projector": true
    }
}
```

## 2.2 设备预约

```
POST /api/reservations/device
```

- 可以随时预约
- 请求示例:

```json
{
    "device_name": "electric_screwdriver",  // 可选: electric_screwdriver(电动螺丝刀), multimeter(万用表)
    "borrow_time": "2024-03-18T14:00:00",
    "return_time": "2024-03-18T17:00:00",
    "reason": "实验室项目需要"
}
```

## 2.3 3D打印机预约

```
POST /api/reservations/printer
```

- 必须提前1天预约
- 请求示例:

```json
{
    "printer_name": "printer_1",  // 可选: printer_1, printer_2, printer_3
    "reservation_date": "2024-03-19",
    "print_time": "2024-03-19T10:00:00"
}
```

## 2.4 查看个人预约记录

```
GET /api/reservations/my-reservations
```

- 返回所有类型的预约记录

# 3. 管理员功能

## 3.1 查看待审批预约

```
GET /api/admin/reservations/pending
```

- 返回所有待审批的预约记录

## 3.2 审批预约

```
PUT /api/admin/reservations/{reservation_type}/{reservation_id}/approve
```

- `reservation_type`: venue/device/printer
- `reservation_id`: 预约ID

## 3.3 确认设备归还

```
PUT /api/admin/device-return/{reservation_id}
```

- 用于确认设备已归还

## 3.4 导入用户数据

```
POST /api/admin/users/import-excel
```

- 上传Excel文件（.xlsx）
- Excel格式要求：
  - 列名：学号/工号、学院、身份证号后6位
  - 系统自动判断角色（学号长度>6为学生，否则为教师）

## 3.5 导出预约记录

```
GET /api/admin/export-reservations
```

- 导出Excel文件，包含所有预约记录
- 分三个sheet：场地预约、设备预约、3D打印机预约

# 4. 使用示例

1. 首先登录获取token：

```bash
curl -X POST "http://127.0.0.1:8001/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_username&password=your_password"
```

2. 使用token进行预约：

```bash
curl -X POST "http://127.0.0.1:8001/api/reservations/venue" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "venue_type": "lecture",
    "reservation_date": "2024-03-20",
    "business_time": "afternoon",
    "purpose": "学术讲座",
    "devices_needed": {
        "screen": true,
        "laptop": true
    }
}'
```

# 5. 状态说明

预约状态包括：

- pending: 待审批
- approved: 已批准
- rejected: 已拒绝
- returned: 已归还（仅设备预约）

# 6. 注意事项

1. 所有需要认证的接口都需要在请求头中加入：

```
Authorization: Bearer your_token
```

2. 时间限制：

   - 场地预约需提前3天
   - 3D打印机需提前1天
   - 设备可随时预约
3. 管理员功能只能由管理员账号访问
4. 密码在导入时会自动加密存储

你可以访问 `http://127.0.0.1:8001/docs` 查看交互式API文档，直接在网页上测试这些功能。

需要我详细解释某个具体功能吗？或者需要测试示例？
