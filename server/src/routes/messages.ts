import { Router } from 'express';

const router = Router();

// 中国手机号正则表达式（11位，以1开头）
const PHONE_REGEX = /(?:^|[^1-9])(1[3-9]\d{9})(?:[^0-9]|$)/g;

/**
 * 从文本中提取手机号
 * @param text - 原始文本
 * @returns 提取的手机号或null
 */
function extractPhoneNumber(text: string): string | null {
  // 先去除所有非数字字符
  const cleanedText = text.replace(/[^\d]/g, '');
  
  // 然后匹配11位以1开头的手机号
  const phoneMatch = cleanedText.match(/1[3-9]\d{9}/);
  
  if (phoneMatch) {
    return phoneMatch[0];
  }
  
  return null;
}

/**
 * 接收微信群消息
 * POST /api/v1/messages
 * Body: {
 *   deviceId: string,        // 设备ID
 *   groupName?: string,     // 群名称
 *   senderName?: string,    // 发送者名称
 *   senderWxid?: string,    // 发送者微信ID
 *   content: string,        // 消息内容
 *   timestamp?: number      // 时间戳
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { deviceId, groupName, senderName, senderWxid, content, timestamp } = req.body;

    // 参数校验
    if (!deviceId || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: deviceId and content' 
      });
    }

    // 提取手机号
    const phoneNumber = extractPhoneNumber(content);
    const hasPhone = phoneNumber !== null;

    // TODO: 存储到数据库
    // 目前使用内存存储（生产环境应使用数据库）
    const message = {
      id: Date.now(),
      deviceId,
      groupName,
      senderName,
      senderWxid,
      content,
      hasPhone,
      phoneNumber,
      receivedAt: timestamp || Date.now(),
    };

    console.log('Received message:', message);

    res.status(200).json({ 
      success: true, 
      data: message,
      hasPhone,
      phoneNumber
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * 批量接收微信群消息
 * POST /api/v1/messages/batch
 * Body: {
 *   messages: Array<{
 *     deviceId: string,
 *     groupName?: string,
 *     senderName?: string,
 *     senderWxid?: string,
 *     content: string,
 *     timestamp?: number
 *   }>
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid messages array' 
      });
    }

    // 处理每条消息
    const results = messages.map(msg => {
      const phoneNumber = extractPhoneNumber(msg.content);
      return {
        ...msg,
        hasPhone: phoneNumber !== null,
        phoneNumber,
        receivedAt: msg.timestamp || Date.now(),
      };
    });

    // TODO: 批量存储到数据库
    console.log(`Received ${results.length} messages, ${results.filter(r => r.hasPhone).length} with phone numbers`);

    res.status(200).json({ 
      success: true, 
      count: results.length,
      withPhoneCount: results.filter(r => r.hasPhone).length,
      data: results
    });
  } catch (error) {
    console.error('Error processing batch messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * 查询消息列表
 * GET /api/v1/messages
 * Query: {
 *   deviceId?: string,      // 设备ID过滤
 *   hasPhone?: boolean,     // 只返回包含手机号的消息
 *   groupName?: string,     // 群名称过滤
 *   limit?: number,         // 返回数量限制
 *   offset?: number         // 偏移量
 * }
 */
router.get('/', async (req, res) => {
  try {
    const { deviceId, hasPhone, groupName, limit = 50, offset = 0 } = req.query;

    // TODO: 从数据库查询
    // 目前返回模拟数据（生产环境应使用数据库）
    const messages: any[] = [];

    res.status(200).json({ 
      success: true, 
      count: messages.length,
      data: messages,
      pagination: {
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('Error querying messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * 获取统计信息
 * GET /api/v1/messages/stats
 * Query: {
 *   deviceId?: string,      // 设备ID
 *   dateFrom?: number,      // 开始时间戳
 *   dateTo?: number         // 结束时间戳
 * }
 */
router.get('/stats', async (req, res) => {
  try {
    const { deviceId, dateFrom, dateTo } = req.query;

    // TODO: 从数据库统计
    // 目前返回模拟数据（生产环境应使用数据库）
    const stats = {
      total: 0,
      withPhone: 0,
      withoutPhone: 0,
      byGroup: {},
      byDate: {}
    };

    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;
