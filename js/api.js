/**
 * CloudBase 版 - 数据访问层（含权限校验）
 */
const API = {
  // ===== 权限检查辅助 =====
  _role() {
    const user = Auth.getUser();
    return user ? user.role : null;
  },

  _isAdmin() {
    const r = this._role();
    return r === 'admin' || r === 'super_admin';
  },

  _isSuper() {
    return this._role() === 'super_admin';
  },

  _isWarehouse() {
    const r = this._role();
    return r === 'warehouse' || r === 'admin' || r === 'super_admin';
  },

  _isSales() {
    return this._role() === 'sales';
  },

  /** 拒绝无权限操作 */
  _deny(msg) {
    return { data: null, error: { message: msg || '权限不足' } };
  },

  // ============================================
  // 业务员管理（仅 admin/super_admin 可写）
  // ============================================
  async getSalespeople() {
    try {
      const res = await DB.collection(COL.SALESPEOPLE)
        .where({ is_active: true })
        .orderBy('name', 'asc')
        .get();
      return { data: res.data || [], error: null };
    } catch (e) { return { data: [], error: e }; }
  },

  async getAllSalespeople(includeInactive = false) {
    try {
      let query = DB.collection(COL.SALESPEOPLE).orderBy('created_at', 'desc');
      if (!includeInactive) query = query.where({ is_active: true });
      const res = await query.get();
      return { data: res.data || [], error: null };
    } catch (e) { return { data: [], error: e }; }
  },

  async addSalesperson(spData) {
    if (!this._isAdmin()) return this._deny('仅管理员可添加业务员');
    try {
      const data = typeof spData === 'string'
        ? { name: spData.trim(), is_active: true, created_at: new Date().toISOString() }
        : { ...spData, is_active: spData.is_active !== false, created_at: spData.created_at || new Date().toISOString() };
      const res = await DB.collection(COL.SALESPEOPLE).add(data);
      return { data: { ...data, _id: res.id, id: res.id }, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async updateSalesperson(id, updates) {
    if (!this._isAdmin()) return this._deny('仅管理员可修改业务员');
    try {
      await DB.collection(COL.SALESPEOPLE).doc(id).update(updates);
      const res = await DB.collection(COL.SALESPEOPLE).doc(id).get();
      return { data: res.data?.[0] || null, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async deleteSalesperson(id) {
    if (!this._isAdmin()) return this._deny('仅管理员可停用业务员');
    try {
      await DB.collection(COL.SALESPEOPLE).doc(id).update({ is_active: false });
      return { error: null };
    } catch (e) { return { error: e }; }
  },

  // ============================================
  // 订单相关
  // ============================================
  async getOrders(filters = {}) {
    try {
      let query = DB.collection(COL.ORDERS).orderBy('created_at', 'desc').limit(1000);

      // 业务员只能看自己的订单
      const role = this._role();
      if (role === 'sales') {
        const user = Auth.getUser();
        // 通过 full_name 或 email 前缀匹配 salesperson_name
        // 实际上前端 sales.html 用识别码确定了 currentSp.name
        // 这里需要销售页面传入 salesperson_name 过滤
        if (filters._spName) {
          query = query.where({ salesperson_name: filters._spName });
        }
      }

      if (filters.invoice_no) query = query.where({ invoice_no: filters.invoice_no });
      if (filters.salesperson_name) query = query.where({ salesperson_name: filters.salesperson_name });
      if (filters.order_status) query = query.where({ order_status: filters.order_status });

      const res = await query.get();
      return { data: res.data || [], error: null };
    } catch (e) { return { data: [], error: e }; }
  },

  async getOrderByInvoice(invoiceNo) {
    try {
      const res = await DB.collection(COL.ORDERS).where({ invoice_no: invoiceNo }).get();
      return { data: res.data?.[0] || null, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async createOrder(orderData) {
    // 仅 admin/super_admin 可创建订单
    if (!this._isAdmin()) return this._deny('仅管理员可创建订单');
    try {
      const doc = {
        invoice_no: orderData.invoice_no, product_model: orderData.product_model,
        brand: orderData.brand || null, quantity: orderData.quantity || 1,
        order_date: orderData.order_date || null, delivery_date: orderData.delivery_date || null,
        order_status: orderData.order_status || null,
        salesperson_name: orderData.salesperson_name, sales_notes: orderData.sales_notes || '',
        sales_id: null, file_ids: [], photo_request: false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      };
      const res = await DB.collection(COL.ORDERS).add(doc);
      return { data: { ...doc, _id: res.id, id: res.id }, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async updateOrder(id, updates) {
    // 权限细分：
    // - 业务员只能更新 photo_request / bring_goods / inspection_date / return_date
    // - 仓库/admin 可以更新 order_status / shipping_date / warehouse_notes / file_ids
    // - admin 可以更新全部字段
    const role = this._role();
    if (!role) return this._deny('未登录');

    if (role === 'sales') {
      const allowed = ['photo_request', 'bring_goods', 'inspection_date', 'return_date'];
      const keys = Object.keys(updates).filter(k => k !== 'updated_at');
      if (keys.some(k => !allowed.includes(k))) {
        return this._deny('业务员仅可更新拍照/带来/验货/收回');
      }
    } else if (role === 'warehouse') {
      const allowed = ['order_status', 'shipping_date', 'warehouse_notes', 'file_ids'];
      const keys = Object.keys(updates).filter(k => k !== 'updated_at');
      if (keys.some(k => !allowed.includes(k))) {
        return this._deny('仓库仅可更新状态/发货时间/进度回复/文件');
      }
    }
    // admin/super_admin: 无限制

    try {
      updates.updated_at = new Date().toISOString();
      await DB.collection(COL.ORDERS).doc(id).update(updates);
      const res = await DB.collection(COL.ORDERS).doc(id).get();
      return { data: res.data?.[0] || null, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async deleteOrder(id) {
    if (!this._isAdmin()) return this._deny('仅管理员可删除订单');
    try {
      await DB.collection(COL.ORDERS).doc(id).remove();
      return { error: null };
    } catch (e) { return { error: e }; }
  },

  // ============================================
  // 用户管理（仅 admin/super_admin）
  // ============================================
  async getAllUsers() {
    if (!this._isAdmin()) return this._deny('仅管理员可查看用户列表');
    try {
      const res = await DB.collection(COL.USERS).orderBy('created_at', 'desc').limit(500).get();
      return { data: res.data || [], error: null };
    } catch (e) { return { data: [], error: e }; }
  },

  async updateUserProfile(userId, updates) {
    if (!this._isAdmin()) return this._deny('仅管理员可修改用户');
    try {
      await DB.collection(COL.USERS).doc(userId).update(updates);
      return { data: null, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async updateUserRole(userId, role) {
    if (!this._isSuper()) return this._deny('仅超管可修改用户角色');
    return this.updateUserProfile(userId, { role });
  },

  async updateUserName(userId, fullName) {
    if (!this._isAdmin()) return this._deny('仅管理员可修改用户');
    return this.updateUserProfile(userId, { full_name: fullName });
  },

  // ============================================
  // 统计（仅 admin/super_admin）
  // ============================================
  async getOrderStats() {
    if (!this._isAdmin()) {
      return { total: 0, by_status: { '调货中': 0, '路途中': 0, '已到货': 0, '已完结': 0 }, by_sales: [] };
    }
    const empty = { total: 0, by_status: { '调货中': 0, '路途中': 0, '已到货': 0, '已完结': 0 }, by_sales: [] };
    try {
      const res = await DB.collection(COL.ORDERS).limit(1000).get();
      const orders = res.data || [];
      const total = orders.length;
      const statusCounts = { '调货中': 0, '路途中': 0, '已到货': 0, '已完结': 0 };
      const salesCounts = {};
      orders.forEach(o => {
        if (o.order_status) statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
        if (o.salesperson_name) salesCounts[o.salesperson_name] = (salesCounts[o.salesperson_name] || 0) + 1;
      });
      let salesOrders = [];
      try {
        const { data: salesData } = await this.getSalespeople();
        salesOrders = (salesData || []).map(sp => ({ ...sp, order_count: salesCounts[sp.name] || 0 }));
      } catch(e) {}
      return { total, by_status: statusCounts, by_sales: salesOrders };
    } catch(e) { return empty; }
  },

  // ============================================
  // 文件操作（仓库/admin 可上传，所有人可读）
  // ============================================
  async _getFiles(orderId) {
    const res = await DB.collection(COL.ORDERS).doc(orderId).get();
    return Array.isArray(res.data?.[0]?.file_ids) ? res.data[0].file_ids : [];
  },

  async _setFiles(orderId, files) {
    await DB.collection(COL.ORDERS).doc(orderId).update({ file_ids: files, updated_at: new Date().toISOString() });
  },

  async attachFileToOrder(orderId, fileInfo) {
    if (!this._isWarehouse()) return this._deny('仅仓库/管理员可上传文件');
    try {
      const files = await this._getFiles(orderId);
      files.push({ ...fileInfo, uploaded_at: new Date().toISOString() });
      await this._setFiles(orderId, files);
      return { data: files, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async removeFileFromOrder(orderId, fileId) {
    if (!this._isWarehouse()) return this._deny('仅仓库/管理员可删除文件');
    try {
      const files = await this._getFiles(orderId);
      await this._setFiles(orderId, files.filter(f => f.id !== fileId));
      return { data: null, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  async replaceFile(orderId, oldFileId, newFileInfo) {
    if (!this._isWarehouse()) return this._deny('仅仓库/管理员可替换文件');
    try {
      const files = await this._getFiles(orderId);
      const idx = files.findIndex(f => f.id === oldFileId);
      if (idx !== -1) files[idx] = { ...newFileInfo, uploaded_at: new Date().toISOString() };
      await this._setFiles(orderId, files);
      return { data: files, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  // ============================================
  // 业务员识别码（所有角色可查，用于身份验证）
  // ============================================
  async getSalespersonByCode(accessCode) {
    try {
      const res = await DB.collection(COL.SALESPEOPLE)
        .where({ access_code: accessCode.toUpperCase() })
        .get();
      return { data: res.data?.[0] || null, error: null };
    } catch (e) { return { data: null, error: e }; }
  },

  // ============================================
  // CloudBase 云函数调用
  // ============================================
  async callFunction(name, params) {
    try {
      const res = await TCB.callFunction({ name, data: params });
      return res.result;
    } catch (e) { return { success: false, error: e.message }; }
  }
};
