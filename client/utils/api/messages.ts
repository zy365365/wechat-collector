import { API_BASE } from '@/utils/index';

// 获取API基础URL
const API_BASE_URL = API_BASE || 'http://localhost:9091';

/**
 * 消息数据结构
 */
export interface WeChatMessage {
  id: string;
  deviceId: string;
  groupName?: string;
  senderName?: string;
  senderWxid?: string;
  content: string;
  hasPhone: boolean;
  phoneNumber?: string;
  receivedAt: number;
}

/**
 * 发送消息到服务器
 * POST /api/v1/messages
 */
export async function sendMessage(message: {
  deviceId: string;
  groupName?: string;
  senderName?: string;
  senderWxid?: string;
  content: string;
  timestamp?: number;
}): Promise<{
  success: boolean;
  data?: WeChatMessage;
  hasPhone?: boolean;
  phoneNumber?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * 批量发送消息
 * POST /api/v1/messages/batch
 */
export async function sendMessagesBatch(messages: Array<{
  deviceId: string;
  groupName?: string;
  senderName?: string;
  senderWxid?: string;
  content: string;
  timestamp?: number;
}>): Promise<{
  success: boolean;
  count?: number;
  withPhoneCount?: number;
  data?: WeChatMessage[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send messages batch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * 获取消息列表
 * GET /api/v1/messages
 */
export async function getMessages(params?: {
  deviceId?: string;
  hasPhone?: boolean;
  groupName?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  count?: number;
  data?: WeChatMessage[];
  pagination?: {
    limit: number;
    offset: number;
  };
  error?: string;
}> {
  try {
    const searchParams = new URLSearchParams();
    
    if (params?.deviceId) searchParams.append('deviceId', params.deviceId);
    if (params?.hasPhone !== undefined) searchParams.append('hasPhone', String(params.hasPhone));
    if (params?.groupName) searchParams.append('groupName', params.groupName);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/messages${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to get messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * 获取统计信息
 * GET /api/v1/messages/stats
 */
export async function getMessageStats(params?: {
  deviceId?: string;
  dateFrom?: number;
  dateTo?: number;
}): Promise<{
  success: boolean;
  data?: {
    total: number;
    withPhone: number;
    withoutPhone: number;
    byGroup: Record<string, number>;
    byDate: Record<string, number>;
  };
  error?: string;
}> {
  try {
    const searchParams = new URLSearchParams();
    
    if (params?.deviceId) searchParams.append('deviceId', params.deviceId);
    if (params?.dateFrom) searchParams.append('dateFrom', String(params.dateFrom));
    if (params?.dateTo) searchParams.append('dateTo', String(params.dateTo));

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/messages/stats${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to get stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
