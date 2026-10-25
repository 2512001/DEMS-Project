const Group = require('../model/groupModel');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const { isAdmin, httpError } = require('../services/accessControl');
const { writeAuditLog } = require('../services/auditService');

const createGroup = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only admins can create groups.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to create groups.' });
        }

        const { name, description } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Group name is required.' });
        }

        const existingGroup = await Group.findOne({
            organizationId: req.user.organizationId,
            name: name.trim()
        });

        if (existingGroup) {
            return res.status(409).json({ success: false, message: 'A group with this name already exists in your organization.' });
        }

        const group = await Group.create({
            name: name.trim(),
            description: description?.trim() || '',
            organizationId: req.user.organizationId,
            createdBy: req.user.id,
            members: []
        });

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'group_created',
            targetType: 'group',
            targetId: group._id,
            metadata: { groupName: group.name }
        });

        return res.status(201).json({
            success: true,
            message: 'Group created successfully.',
            data: group
        });
    } catch (err) {
        next(err);
    }
};

const getOrganizationGroups = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only admins can view groups.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to view groups.' });
        }

        const groups = await Group.find({
            organizationId: req.user.organizationId,
            isActive: true
        })
            .populate('createdBy', 'walletAddress profile.displayName')
            .populate('members', 'walletAddress profile.displayName email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });
    } catch (err) {
        next(err);
    }
};

const getUserGroups = async (req, res, next) => {
    try {
        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to view groups.' });
        }

        const groups = await Group.find({
            organizationId: req.user.organizationId,
            members: req.user.id,
            isActive: true
        })
            .select('name description organizationId createdAt')
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });
    } catch (err) {
        next(err);
    }
};

const addMemberToGroup = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only admins can add members to groups.' });
        }

        const { groupId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found.' });
        }

        if (group.organizationId.toString() !== req.user.organizationId.toString()) {
            return res.status(403).json({ success: false, message: 'You can only manage groups in your organization.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.organizationId.toString() !== req.user.organizationId.toString()) {
            return res.status(403).json({ success: false, message: 'User must belong to your organization.' });
        }

        // CRITICAL: Only active members can be assigned to groups
        if (user.membershipStatus !== 'active') {
            return res.status(409).json({ success: false, message: 'Only active organization members can be assigned to groups.' });
        }

        if (group.members.includes(userId)) {
            return res.status(409).json({ success: false, message: 'User is already a member of this group.' });
        }

        group.members.push(userId);
        await group.save();

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'group_member_added',
            targetType: 'group',
            targetId: group._id,
            metadata: { userId, groupName: group.name }
        });

        return res.status(200).json({
            success: true,
            message: 'Member added to group successfully.',
            data: group
        });
    } catch (err) {
        next(err);
    }
};

const removeMemberFromGroup = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only admins can remove members from groups.' });
        }

        const { groupId, userId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found.' });
        }

        if (group.organizationId.toString() !== req.user.organizationId.toString()) {
            return res.status(403).json({ success: false, message: 'You can only manage groups in your organization.' });
        }

        group.members = group.members.filter(id => id.toString() !== userId);
        await group.save();

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'group_member_removed',
            targetType: 'group',
            targetId: group._id,
            metadata: { userId, groupName: group.name }
        });

        return res.status(200).json({
            success: true,
            message: 'Member removed from group successfully.',
            data: group
        });
    } catch (err) {
        next(err);
    }
};

const deleteGroup = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only admins can delete groups.' });
        }

        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found.' });
        }

        if (group.organizationId.toString() !== req.user.organizationId.toString()) {
            return res.status(403).json({ success: false, message: 'You can only delete groups in your organization.' });
        }

        await Group.findByIdAndDelete(groupId);

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'group_deleted',
            targetType: 'group',
            targetId: groupId,
            metadata: { groupName: group.name }
        });

        return res.status(200).json({
            success: true,
            message: 'Group deleted successfully.'
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createGroup,
    getOrganizationGroups,
    getUserGroups,
    addMemberToGroup,
    removeMemberFromGroup,
    deleteGroup
};
