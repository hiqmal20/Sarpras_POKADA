const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', chatController.getChats);
router.post('/', chatController.createChat);
router.get('/:chatId/messages', chatController.getChatMessages);
router.post('/:chatId/messages', chatController.sendMessage);
router.patch('/:chatId/read', chatController.markAsRead);
router.patch('/:chatId/status', chatController.updateChatStatus);
router.patch('/:chatId/messages/:messageId', chatController.updateMessage);
router.delete('/:chatId/messages/:messageId', chatController.deleteMessage);
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
