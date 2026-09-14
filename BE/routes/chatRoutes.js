const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', chatController.getChats);
router.post('/', chatController.createChat);
router.get('/:chatId/messages', chatController.getChatMessages);
router.post('/:chatId/messages', chatController.sendMessage);
router.delete('/:chatId/messages', chatController.clearChatMessages);
router.patch('/:chatId/read', chatController.markAsRead);
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
