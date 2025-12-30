import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import apiService from '../services/apiService';
import socketService from '../services/socketService';

export const ChatScreen = ({ navigation, route }) => {
  const { roomId, packageId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [chatRoom, setChatRoom] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadChatRoom();
    loadMessages();
    setupSocketListeners();

    return () => {
      socketService.off('new_message');
      socketService.off('message_read');
    };
  }, [roomId]);

  const loadChatRoom = async () => {
    try {
      if (roomId) {
        const response = await apiService.getChatRoom(roomId);
        if (response.success) {
          setChatRoom(response.data);
        }
      } else if (packageId) {
        // Try to find or create chat room for package
        const roomsResponse = await apiService.getChatRooms();
        if (roomsResponse.success) {
          const room = roomsResponse.data?.find((r) => r.packageId === packageId);
          if (room) {
            setChatRoom(room);
            loadMessages(room.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chat room:', error);
    }
  };

  const loadMessages = async (roomIdToLoad = roomId) => {
    if (!roomIdToLoad) return;

    setLoading(true);
    try {
      const response = await apiService.getChatMessages(roomIdToLoad, { limit: 50 });
      if (response.success) {
        setMessages(response.data?.messages || []);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('new_message', (message) => {
      if (message.chatRoomId === roomId || message.chatRoomId === chatRoom?.id) {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    socketService.on('message_read', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, isRead: true } : msg
        )
      );
    });
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !roomId) return;

    const messageToSend = messageText.trim();
    setMessageText('');

    try {
      const response = await apiService.sendMessage(roomId, messageToSend);
      if (response.success) {
        // Message will be added via socket listener
        socketService.emit('send_message', {
          chatRoomId: roomId,
          message: messageToSend,
          messageType: 'TEXT',
        });
      } else {
        Alert.alert('Error', 'Failed to send message');
        setMessageText(messageToSend); // Restore message on error
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessageText(messageToSend); // Restore message on error
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {chatRoom?.package?.description || 'Chat'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Messages List */}
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {messages.map((message) => {
              const isMyMessage = message.senderType === 'CUSTOMER'; // Adjust based on user type
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessage : styles.otherMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMyMessage ? styles.myMessageText : styles.otherMessageText,
                    ]}
                  >
                    {message.message}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                    ]}
                  >
                    {formatTime(message.createdAt)}
                    {isMyMessage && (
                      <Text style={styles.readIndicator}>
                        {message.isRead ? ' ✓✓' : ' ✓'}
                      </Text>
                    )}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardBg,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.textLight,
  },
  otherMessageText: {
    color: colors.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: colors.textLight,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: colors.textTertiary,
  },
  readIndicator: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: colors.cardBgLight,
    color: colors.textPrimary,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

