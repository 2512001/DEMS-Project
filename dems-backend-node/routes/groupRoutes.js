const express = require('express');
const {
    createGroup,
    getOrganizationGroups,
    getUserGroups,
    addMemberToGroup,
    removeMemberFromGroup,
    deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('admin'), createGroup);
router.get('/organization', protect, authorizeRoles('admin'), getOrganizationGroups);
router.get('/my-groups', protect, getUserGroups);
router.post('/:groupId/members', protect, authorizeRoles('admin'), addMemberToGroup);
router.delete('/:groupId/members/:userId', protect, authorizeRoles('admin'), removeMemberFromGroup);
router.delete('/:groupId', protect, authorizeRoles('admin'), deleteGroup);

module.exports = router;
