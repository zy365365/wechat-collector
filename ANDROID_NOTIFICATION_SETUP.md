# 微信群消息采集 App - Android 原生模块配置指南

## 概述

本应用通过 Android 的 NotificationListenerService 来监听微信群消息通知，并将包含手机号的消息上传到后端服务器。

## Android 原生模块配置步骤

### 步骤 1：安装必要依赖

在 client 目录下执行：

```bash
cd /workspace/projects/client
npx expo install expo-device expo-crypto expo-application
```

### 步骤 2：生成原生代码

执行 prebuild 生成 Android 原生项目：

```bash
npx expo prebuild --platform android
```

这会在 client 目录下生成 `android` 文件夹。

### 步骤 3：创建 NotificationListenerService

在 `client/android/app/src/main/java/com/anonymous/x0/` 目录下创建以下文件：

**文件 1: WeChatNotificationService.kt**

```kotlin
package com.anonymous.x0

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import kotlinx.coroutines.*
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class WeChatNotificationService : NotificationListenerService() {
    
    private val TAG = "WeChatNotifyService"
    private val WECHAT_PACKAGE = "com.tencent.mm"
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    // API 基础地址（需要替换为实际的后端地址）
    private val API_BASE_URL = "http://YOUR_SERVER_IP:9091"
    
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        
        // 只处理微信消息
        if (sbn.packageName != WECHAT_PACKAGE) return
        
        try {
            val notification = sbn.notification
            val extras = notification.extras
            
            // 获取通知标题和内容
            val title = extras.getCharSequence("android.title")?.toString() ?: ""
            val content = extras.getCharSequence("android.text")?.toString() ?: ""
            
            // 判断是否为群消息（通常群消息标题包含群名）
            if (isGroupMessage(title, content)) {
                Log.d(TAG, "微信群消息: $title - $content")
                processAndUploadMessage(title, content, sbn.postTime)
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理通知失败", e)
        }
    }
    
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // 可选：处理通知移除事件
    }
    
    /**
     * 判断是否为群消息
     */
    private fun isGroupMessage(title: String, content: String): Boolean {
        // 群消息通常有以下特征：
        // 1. 标题包含"群"字
        // 2. 内容包含"："分隔符（表示群成员发言）
        // 3. 标题和内容都存在
        return (title.contains("群") || content.contains("：") || content.contains(":")) 
               && title.isNotEmpty() && content.isNotEmpty()
    }
    
    /**
     * 处理并上传消息到服务器
     */
    private fun processAndUploadMessage(title: String, content: String, timestamp: Long) {
        coroutineScope.launch {
            try {
                // 提取发送者和内容
                val (senderName, messageContent) = parseMessage(title, content)
                
                // 提取设备ID
                val deviceId = getDeviceId()
                
                // 构建请求数据
                val jsonBody = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("groupName", extractGroupName(title))
                    put("senderName", senderName)
                    put("content", messageContent)
                    put("timestamp", timestamp)
                }
                
                // 上传到服务器
                uploadToServer(jsonBody)
                
            } catch (e: Exception) {
                Log.e(TAG, "处理消息失败", e)
            }
        }
    }
    
    /**
     * 解析消息，获取发送者和内容
     */
    private fun parseMessage(title: String, content: String): Pair<String, String> {
        // 微信群消息格式通常是：
        // 标题: 群名称
        // 内容: 发送者：消息内容
        
        var senderName = "未知"
        var messageContent = content
        
        // 尝试解析发送者
        val colonIndex = content.indexOf("：")
        val colonIndexEn = content.indexOf(":")
        val splitIndex = if (colonIndex > 0) colonIndex else colonIndexEn
        
        if (splitIndex > 0 && splitIndex < content.length - 1) {
            senderName = content.substring(0, splitIndex)
            messageContent = content.substring(splitIndex + 1)
        }
        
        return Pair(senderName.trim(), messageContent.trim())
    }
    
    /**
     * 提取群名称
     */
    private fun extractGroupName(title: String): String {
        // 标题通常是"群名称"或"群名称(3)"
        return title.replace(Regex("\\(\\d+\\)"), "").trim()
    }
    
    /**
     * 获取设备ID
     */
    private fun getDeviceId(): String {
        // TODO: 实现设备ID获取
        return android.os.Build.SERIAL + "_" + android.os.Build.MODEL
    }
    
    /**
     * 上传到服务器
     */
    private suspend fun uploadToServer(jsonBody: JSONObject) {
        withContext(Dispatchers.IO) {
            try {
                val url = URL("$API_BASE_URL/api/v1/messages")
                val conn = url.openConnection() as HttpURLConnection
                
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                
                // 发送数据
                val os = conn.outputStream
                os.write(jsonBody.toString().toByteArray())
                os.flush()
                os.close()
                
                // 读取响应
                val responseCode = conn.responseCode
                Log.d(TAG, "上传响应码: $responseCode")
                
                conn.disconnect()
                
            } catch (e: Exception) {
                Log.e(TAG, "上传失败", e)
            }
        }
    }
}
```

**文件 2: AndroidManifest.xml 配置**

在 `client/android/app/src/main/AndroidManifest.xml` 中添加服务声明：

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.anonymous.x0">

    <!-- 网络权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- 通知监听权限（无需在此声明，由系统自动管理）-->
    
    <application
        android:name=".MainApplication"
        ...>
        
        <!-- 其他Activity和服务 -->
        
        <!-- 添加NotificationListenerService -->
        <service
            android:name=".WeChatNotificationService"
            android:label="微信群消息采集"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="false">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>
        
    </application>
</manifest>
```

### 步骤 4：配置网络安全性

由于 Android 9+ 默认禁止明文HTTP请求，需要配置网络安全策略：

在 `client/android/app/src/main/res/xml/` 目录下创建 `network_security_config.xml`：

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

然后在 AndroidManifest.xml 的 application 标签中添加：

```xml
<application
    android:name=".MainApplication"
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### 步骤 5：重新构建 APK

```bash
npx expo run:android
```

或者在 Android Studio 中打开 `client/android` 目录，构建 Debug APK。

### 步骤 6：授予通知权限

1. 安装 APK 后，打开应用的"设置"页面
2. 引导用户进入系统设置：
   - 设置 → 应用 → 找到你的App → 通知 → 通知访问权限
   - 或者：设置 → 通知和状态栏 → 通知访问权限
3. 找到你的App，开启"允许读取通知"权限

### 步骤 7：配置服务器地址

在代码中替换 `API_BASE_URL` 为实际的后端服务器地址。

## 代码结构总结

```
client/
├── android/
│   └── app/src/main/
│       ├── java/com/anonymous/x0/
│       │   ├── WeChatNotificationService.kt  ← 新增
│       │   └── MainApplication.kt
│       ├── res/xml/
│       │   └── network_security_config.xml     ← 新增（如需要）
│       └── AndroidManifest.xml                 ← 修改
└── screens/messages/
    └── index.tsx                               ← 已实现
```

## 测试验证

### 1. 本地测试

在 App 中点击"添加测试数据"按钮，发送包含手机号的消息：
- 设备ID: test-device-001
- 群名称: 测试群
- 发送者: 测试用户
- 内容: 13800138000（这是手机号）

后端会自动识别并返回消息是否包含手机号。

### 2. 真机测试

1. 安装带有 NotificationListenerService 的 APK
2. 授予通知访问权限
3. 打开微信，发送包含手机号的群消息
4. 查看 App 中的消息列表

## 常见问题

### Q1: 为什么收不到微信通知？
A: 请检查：
1. 微信通知是否开启（微信 → 我 → 设置 → 新消息提醒）
2. 通知访问权限是否授予（系统设置 → 通知访问权限）
3. 应用是否在后台运行

### Q2: 为什么上传失败？
A: 请检查：
1. 手机网络是否正常
2. 后端服务是否启动
3. API 地址是否正确（注意区分 http 和 https）
4. 服务器防火墙是否放行 9091 端口

### Q3: 如何获取设备唯一ID？
A: 推荐使用设备序列号 + 随机UUID：
```kotlin
val deviceId = "${android.os.Build.SERIAL}_${java.util.UUID.randomUUID()}"
```

### Q4: 消息识别不准确怎么办？
A: 可以调整 `isGroupMessage()` 函数的判断逻辑，增加更多特征判断。

## 隐私合规提示

1. **用户知情同意**：首次使用时需要明确告知用户应用的功能和数据用途
2. **数据最小化**：只采集必要的消息数据
3. **本地存储**：考虑是否需要在本地存储消息
4. **数据传输安全**：生产环境建议使用 HTTPS
5. **数据删除**：提供用户删除数据的功能

## 注意事项

1. **仅Android支持**：iOS 无法实现此功能
2. **微信版本兼容**：不同版本的微信通知格式可能不同，需适配
3. **性能考虑**：避免频繁上传，控制网络请求频率
4. **权限管理**：NotificationListenerService 需要用户手动授权

## 下一步优化

1. 添加本地数据库存储（使用 SQLite 或 AsyncStorage）
2. 实现消息去重逻辑
3. 添加关键词过滤功能
4. 实现定时同步机制
5. 添加消息导出功能（Excel/CSV）
6. 实现消息分析统计功能
