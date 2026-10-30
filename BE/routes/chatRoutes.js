const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uuidParamHandler } = require('../middleware/validateUuid');
const validateRequest = require('../middleware/validateRequest');
const {
  sendMessageSchema,
  createChatSchema,
  updateMessageSchema,
  updateChatStatusSchema
} = require('../validations/chatValidation');

router.param('chatId', uuidParamHandler);
router.param('messageId', uuidParamHandler);

router.use(requireAuth);

router.get('/', chatController.getChats);
router.post('/', validateRequest(createChatSchema), chatController.createChat);
router.get('/:chatId/messages', chatController.getChatMessages);
router.post('/:chatId/messages', validateRequest(sendMessageSchema), chatController.sendMessage);
router.patch('/:chatId/read', chatController.markAsRead);
router.patch('/:chatId/status', validateRequest(updateChatStatusSchema), chatController.updateChatStatus);
router.patch('/:chatId/messages/:messageId', validateRequest(updateMessageSchema), chatController.updateMessage);
router.delete('/:chatId/messages/:messageId', chatController.deleteMessage);
router.delete('/:chatId/messages', chatController.clearChatMessages);
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
