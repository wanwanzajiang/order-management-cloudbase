/**
 * CloudBase 云函数 - admin-ops
 * 数据库用户管理（不占用 Auth 配额）
 *
 * 支持：create-user / delete-user / reset-password / query-salespeople / query-orders
 */
const crypto = require('crypto');

const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'wanwan-d2gafa9gobac0b79b' });
const db = app.database();

function hashPw(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

function randomSalt() {
  return crypto.randomBytes(16).toString('hex');
}

exports.main = async (event, context) => {
  const { action, email, password, role, user_id, new_password, filter, limit } = event;
  try {
    switch (action) {
      case 'create-user': return await createUser(email, password, role);
      case 'delete-user': return await deleteUser(user_id);
      case 'reset-password': return await resetPassword(user_id, new_password);
      case 'query-salespeople': return await querySalespeople(filter);
      case 'query-orders': return await queryOrders(filter, limit);
      case 'update-order': return await updateOrder(user_id, filter);
      default: return { success: false, error: '未知操作: ' + action };
    }
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
};

async function createUser(email, password, role) {
  if (!email || !password || password.length < 6) {
    return { success: false, error: '邮箱和密码（至少6位）必填' };
  }
  try {
    const exist = await db.collection('users').where({ email }).get();
    if (exist.data.length > 0) {
      return { success: false, error: '该邮箱已存在' };
    }
    const salt = randomSalt();
    const r = await db.collection('users').add({
      email,
      role: role || 'sales',
      full_name: email.split('@')[0],
      password_hash: hashPw(password, salt),
      salt,
      created_at: new Date().toISOString()
    });
    return { success: true, uid: r.id, message: '用户创建成功' };
  } catch (err) {
    return { success: false, error: '创建失败: ' + (err.message || err) };
  }
}

async function deleteUser(userId) {
  if (!userId) return { success: false, error: '缺少 user_id' };
  try {
    await db.collection('users').doc(userId).remove();
    return { success: true, message: '用户已删除' };
  } catch (err) {
    return { success: false, error: '删除失败: ' + (err.message || err) };
  }
}

async function resetPassword(userId, newPassword) {
  if (!userId || !newPassword || newPassword.length < 6) {
    return { success: false, error: '用户ID和新密码（至少6位）必填' };
  }
  try {
    const salt = randomSalt();
    await db.collection('users').doc(userId).update({
      password_hash: hashPw(newPassword, salt),
      salt
    });
    return { success: true, message: '密码已重置' };
  } catch (err) {
    return { success: false, error: '重置失败: ' + (err.message || err) };
  }
}

async function querySalespeople(filter) {
  try {
    let query = db.collection('salespeople');
    if (filter) query = query.where(filter);
    const res = await query.get();
    return { success: true, data: res.data || [] };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

async function queryOrders(filter, limit) {
  try {
    let query = db.collection('orders').orderBy('created_at', 'desc');
    if (filter) query = query.where(filter);
    if (limit) query = query.limit(limit);
    const res = await query.get();
    return { success: true, data: res.data || [] };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

async function updateOrder(id, updates) {
  try {
    await db.collection('orders').doc(id).update(updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}
