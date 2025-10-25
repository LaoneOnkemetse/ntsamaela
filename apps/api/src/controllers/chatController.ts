import { Response } from 'express';
import { getRealtimeService } from '../services/realtimeService';
import { 
  ChatRoom, 
  ChatMessage, 
  // CreateChatMessageRequest,
  ChatRoomFilters,
  ApiResponse,
  PaginatedResponse,
  AuthenticatedRequest
} from '@ntsamaela/shared/types';
import { AppError } from '../utils/errors';

export class ChatController {
  private get realtimeService() {
    return getRealtimeService();
  }

  createChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { packageId, driverId } = req.body;
      const customerId = req.user!.id;

      if (!packageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PACKAGE_ID',
            message: 'Package ID is required'
          }
        });
        return;
      }

      const chatRoom = await this.realtimeService.createChatRoom(packageId, customerId, driverId);

      const response: ApiResponse<ChatRoom> = {
        success: true,
        data: chatRoom,
        message: 'Chat room created successfully'
      };

      res.status(201).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'CHAT_ROOM_CREATION_FAILED',
            message: 'Failed to create chat room'
          }
        });
      }
    }
  }

  getChatRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userType = req.user!.userType;
      
      const filters: ChatRoomFilters = {
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0
      };

      if (userType === 'CUSTOMER') {
        filters.customerId = userId;
      } else if (userType === 'DRIVER') {
        filters.driverId = userId;
      }

      // TODO: Implement getChatRooms method in realtimeService
      const chatRooms: ChatRoom[] = []; // Placeholder

      const response: PaginatedResponse<ChatRoom> = {
        success: true,
        data: chatRooms,
        pagination: {
          page: Math.floor(filters.offset! / filters.limit!) + 1,
          limit: filters.limit!,
          total: chatRooms.length,
          totalPages: Math.ceil(chatRooms.length / filters.limit!)
        }
      };

      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CHAT_ROOMS_FETCH_FAILED',
          message: 'Failed to fetch chat rooms'
        }
      });
    }
  }

  getChatMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { chatRoomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!chatRoomId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CHAT_ROOM_ID',
            message: 'Chat room ID is required'
          }
        });
        return;
      }

      const messages = await this.realtimeService.getChatMessages(chatRoomId, limit, offset);

      const response: ApiResponse<ChatMessage[]> = {
        success: true,
        data: messages,
        message: 'Chat messages retrieved successfully'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'MESSAGES_FETCH_FAILED',
            message: 'Failed to fetch chat messages'
          }
        });
      }
    }
  }

  sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { chatRoomId } = req.params;
      const { message, messageType } = req.body;
      const senderId = req.user!.id;
      const senderType = req.user!.userType;

      if (!chatRoomId || !message) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Chat room ID and message are required'
          }
        });
        return;
      }

      const chatMessage = await this.realtimeService.sendMessage(
        chatRoomId,
        senderId,
        senderType,
        message,
        messageType || 'TEXT'
      );

      const response: ApiResponse<ChatMessage> = {
        success: true,
        data: chatMessage,
        message: 'Message sent successfully'
      };

      res.status(201).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'MESSAGE_SEND_FAILED',
            message: 'Failed to send message'
          }
        });
      }
    }
  }

  markMessageAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_MESSAGE_ID',
            message: 'Message ID is required'
          }
        });
        return;
      }

      await this.realtimeService.markMessageAsRead(messageId);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Message marked as read'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'MESSAGE_READ_FAILED',
            message: 'Failed to mark message as read'
          }
        });
      }
    }
  }
}

export default new ChatController();
