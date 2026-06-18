import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput as RNTextInput } from 'react-native';
import { Screen } from '@/components/Screen';
import { getMessages, getMessageStats, sendMessage, WeChatMessage } from '@/utils/api/messages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<WeChatMessage[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    withPhone: number;
    withoutPhone: number;
  }>({ total: 0, withPhone: 0, withoutPhone: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPhone, setFilterPhone] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testDeviceId, setTestDeviceId] = useState('test-device-001');
  const [testGroupName, setTestGroupName] = useState('测试群');
  const [testContent, setTestContent] = useState('');
  const [testSender, setTestSender] = useState('测试用户');

  // 加载消息
  const loadMessages = async () => {
    try {
      const result = await getMessages({
        hasPhone: filterPhone || undefined,
        limit: 50,
      });

      if (result.success && result.data) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const result = await getMessageStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([loadMessages(), loadStats()]);
    };
    fetchData();
  }, [filterPhone]);

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMessages(), loadStats()]);
    setRefreshing(false);
  };

  // 发送测试消息
  const handleSendTest = async () => {
    if (!testContent.trim()) {
      Alert.alert('提示', '请输入测试消息内容');
      return;
    }

    const result = await sendMessage({
      deviceId: testDeviceId,
      groupName: testGroupName,
      senderName: testSender,
      content: testContent,
      timestamp: Date.now(),
    });

    if (result.success) {
      Alert.alert(
        '发送成功',
        `消息${result.hasPhone ? '包含' : '不包含'}手机号${result.phoneNumber ? `: ${result.phoneNumber}` : ''}`
      );
      setTestContent('');
      loadMessages();
      loadStats();
    } else {
      Alert.alert('发送失败', result.error);
    }
  };

  // 渲染消息项
  const renderMessageItem = ({ item }: { item: WeChatMessage }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.groupTag}>
          <FontAwesome6 name="users" size={12} color="#4F46E5" />
          <Text style={styles.groupName}>{item.groupName || '未知群'}</Text>
        </View>
        {item.hasPhone && (
          <View style={styles.phoneTag}>
            <FontAwesome6 name="phone" size={10} color="#10B981" />
            <Text style={styles.phoneText}>{item.phoneNumber}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.messageContent}>{item.content}</Text>
      
      <View style={styles.messageFooter}>
        <Text style={styles.senderName}>{item.senderName || '未知用户'}</Text>
        <Text style={styles.timeText}>
          {new Date(item.receivedAt).toLocaleString('zh-CN')}
        </Text>
      </View>
    </View>
  );

  // 空状态
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome6 name="inbox" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>暂无消息</Text>
      <Text style={styles.emptyDesc}>
        {filterPhone 
          ? '没有包含手机号的消息' 
          : '开启通知权限后，微信群消息将自动显示在这里'}
      </Text>
      {!filterPhone && (
        <TouchableOpacity 
          style={styles.testButton}
          onPress={() => setShowTestPanel(!showTestPanel)}
        >
          <FontAwesome6 name="flask" size={16} color="#4F46E5" />
          <Text style={styles.testButtonText}>添加测试数据</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Screen>
      {/* 顶部统计卡片 */}
      <View style={[styles.statsContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.screenTitle}>微信群消息</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>总消息</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={[styles.statNumber, styles.statNumberHighlight]}>
              {stats.withPhone}
            </Text>
            <Text style={[styles.statLabel, styles.statLabelHighlight]}>
              含手机号
            </Text>
          </View>
        </View>

        {/* 过滤开关 */}
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setFilterPhone(!filterPhone)}
        >
          <FontAwesome6 
            name={filterPhone ? "check-square" : "square"} 
            size={16} 
            color={filterPhone ? "#4F46E5" : "#9CA3AF"} 
          />
          <Text style={[styles.filterText, filterPhone && styles.filterTextActive]}>
            只显示包含手机号的消息
          </Text>
        </TouchableOpacity>
      </View>

      {/* 测试面板 */}
      {showTestPanel && (
        <View style={styles.testPanel}>
          <Text style={styles.testPanelTitle}>测试消息发送</Text>
          
          <View style={styles.testInputRow}>
            <Text style={styles.testLabel}>设备ID:</Text>
            <RNTextInput
              style={styles.testInput}
              value={testDeviceId}
              onChangeText={setTestDeviceId}
              placeholder="设备ID"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.testInputRow}>
            <Text style={styles.testLabel}>群名称:</Text>
            <RNTextInput
              style={styles.testInput}
              value={testGroupName}
              onChangeText={setTestGroupName}
              placeholder="群名称"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.testInputRow}>
            <Text style={styles.testLabel}>发送者:</Text>
            <RNTextInput
              style={styles.testInput}
              value={testSender}
              onChangeText={setTestSender}
              placeholder="发送者"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.testInputRow}>
            <Text style={styles.testLabel}>内  容:</Text>
            <RNTextInput
              style={[styles.testInput, styles.testContentInput]}
              value={testContent}
              onChangeText={setTestContent}
              placeholder="输入测试消息（可包含手机号：13800138000）"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
          
          <TouchableOpacity style={styles.sendButton} onPress={handleSendTest}>
            <FontAwesome6 name="paper-plane" size={16} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>发送测试消息</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 消息列表 */}
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessageItem}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statCardHighlight: {
    backgroundColor: '#10B981',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statNumberHighlight: {
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statLabelHighlight: {
    color: '#FFFFFF',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  testPanel: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  testPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  testInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  testLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 60,
    paddingTop: 8,
  },
  testInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testContentInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupName: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  phoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phoneText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  messageContent: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 13,
    color: '#6B7280',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  testButtonText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
});
