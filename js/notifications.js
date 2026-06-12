// ========== 通知中心（权限ADMINWRITE：只读不写，已读存localStorage）==========
var Notifications = {
  _key: function(sp) { return 'cb_read_notify_' + sp; },

  _getRead: function(sp) {
    try { return JSON.parse(localStorage.getItem(this._key(sp)) || '[]'); } catch(e) { return []; }
  },

  _setRead: function(sp, ids) {
    try { localStorage.setItem(this._key(sp), JSON.stringify(ids)); } catch(e) {}
  },

  async create(sp, invoice, msg, orderId) {
    if (!sp) return;
    try {
      await DB.collection('notifications').add({
        salesperson_name: sp, invoice_no: invoice, message: msg,
        order_id: orderId || '', created_at: new Date().toISOString()
      });
    } catch(e) { /* 非核心，静默失败 */ }
  },

  async getUnread(sp) {
    if (!sp) return 0;
    try {
      var readIds = this._getRead(sp);
      var list = await DB.collection('notifications').where({ salesperson_name: sp })
        .orderBy('created_at', 'desc').limit(50).get();
      if (!list.data) return 0;
      var unread = 0;
      for (var i = 0; i < list.data.length; i++) {
        if (readIds.indexOf(list.data[i]._id) < 0) unread++;
      }
      return unread;
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

  markRead(sp, nid) {
    var ids = this._getRead(sp);
    if (ids.indexOf(nid) < 0) ids.push(nid);
    if (ids.length > 200) ids = ids.slice(-100);
    this._setRead(sp, ids);
  },

  markAllRead(sp) {
    try {
      DB.collection('notifications').where({ salesperson_name: sp })
        .orderBy('created_at', 'desc').limit(50).get().then(function(r) {
          if (r.data) {
            var ids = [];
            for (var i = 0; i < r.data.length; i++) ids.push(r.data[i]._id);
            localStorage.setItem('cb_read_notify_' + sp, JSON.stringify(ids));
          }
        });
    } catch(e) {}
  },

  async clearAll(sp) {
    try {
      var r = await DB.collection('notifications').where({ salesperson_name: sp }).limit(100).get();
      var list = r.data || [];
      for (var i = 0; i < list.length; i++) {
        await DB.collection('notifications').doc(list[i]._id).remove();
      }
      localStorage.removeItem('cb_read_notify_' + sp);
      return true;
    } catch(e) { return false; }
  }
};
