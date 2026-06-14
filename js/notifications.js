// ========== 通知中心（已读状态存数据库，跨设备同步）==========
var Notifications = {

  async create(sp, invoice, msg, orderId) {
    if (!sp) return;
    try {
      await DB.collection('notifications').add({
        salesperson_name: sp, invoice_no: invoice, message: msg,
        order_id: orderId || '', read: false, created_at: new Date().toISOString()
      });
    } catch(e) { /* 非核心，静默失败 */ }
  },

  async getUnread(sp) {
    if (!sp) return 0;
    try {
      var r = await DB.collection('notifications').where({ salesperson_name: sp, read: false }).count();
      return r.total || 0;
    } catch(e) { return 0; }
  },

  async getList(sp, lim) {
    if (!sp) return [];
    try {
      var r = await DB.collection('notifications').where({ salesperson_name: sp })
        .orderBy('created_at', 'desc').limit(lim || 30).get();
      return r.data || [];
    } catch(e) { return []; }
  },

  async markRead(nid) {
    try {
      await DB.collection('notifications').doc(nid).update({ read: true });
    } catch(e) {}
  },

  async markAllRead(sp) {
    try {
      var r = await DB.collection('notifications').where({ salesperson_name: sp, read: false }).limit(50).get();
      var list = r.data || [];
      for (var i = 0; i < list.length; i++) {
        await DB.collection('notifications').doc(list[i]._id).update({ read: true });
      }
    } catch(e) {}
  },

  async clearAll(sp) {
    try {
      var r = await DB.collection('notifications').where({ salesperson_name: sp }).limit(100).get();
      var list = r.data || [];
      for (var i = 0; i < list.length; i++) {
        await DB.collection('notifications').doc(list[i]._id).remove();
      }
      return true;
    } catch(e) { return false; }
  }
};
