/**
 * CloudBase 版 - 认证模块（匿名登录 + 数据库验证）
 * 不占用 CloudBase Auth 用户配额
 */
const Auth = {
  SESSION_KEY: 'cb_order_session',
  USER_KEY: 'cb_order_user',

  /**
   * 确保匿名登录已就绪
   */
  async _ensureAnon() {
    const auth = TCB.auth();
    try {
      const state = await auth.getLoginState();
      if (state && !state.isAnonymous) return true; // 已有邮箱登录
      if (state && state.isAnonymous) return true;  // 已匿名登录
    } catch(e) {}
    
    // 匿名登录
    try {
      await auth.signInAnonymously();
      return true;
    } catch(e) {
      console.error('[Auth] 匿名登录失败:', e);
      return false;
    }
  },

  /**
   * 邮箱密码登录（数据库验证版）
   * - 先用匿名登录连接 CloudBase
   * - 再查 users 集合验证密码
   */
  async login(email, password) {
    try {
      // Step 1: 确保匿名连接
      const connected = await this._ensureAnon();
      if (!connected) {
        return { success: false, error: '无法连接到服务器，请刷新重试' };
      }

      // Step 2: 查询用户记录
      const res = await DB.collection(COL.USERS)
        .where({ email: email.toLowerCase().trim() })
        .get();

      if (!res.data || res.data.length === 0) {
        return { success: false, error: '账号不存在' };
      }

      const profile = res.data[0];

      // Step 3: 验证密码
      // 兼容两种格式：password_hash（新）或 password（旧明文，过渡期用）
      let passwordValid = false;
      if (profile.password_hash) {
        // SHA256 哈希验证
        const hash = await hashPassword(password, profile.salt || '');
        passwordValid = (hash === profile.password_hash);
      } else if (profile.password) {
        // 明文对比（旧格式，过渡期用）
        passwordValid = (profile.password === password);
      }

      if (!passwordValid) {
        return { success: false, error: '密码错误' };
      }

      // Step 4: 构建会话
      const session = {
        uid: profile._id,
        user: {
          id: profile._id,
          email: profile.email,
          role: profile.role || 'sales',
          full_name: profile.full_name || email.split('@')[0]
        }
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(this.USER_KEY, JSON.stringify(session.user));

      return { success: true, user: session.user };

    } catch (err) {
      console.error('[Auth] 登录异常:', err);
      return { success: false, error: '登录失败：' + (err.message || '网络错误') };
    }
  },

  async logout() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = 'login.html';
  },

  getSession() {
    const s = localStorage.getItem(this.SESSION_KEY);
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  },

  getUser() {
    const u = localStorage.getItem(this.USER_KEY);
    if (!u) return null;
    try { return JSON.parse(u); } catch { return null; }
  },

  isLoggedIn() { return this.getSession() !== null; },

  isAdmin() {
    const user = this.getUser();
    return user && (user.role === CONFIG.ROLES.ADMIN || user.role === CONFIG.ROLES.SUPER);
  },

  isSuper() {
    const user = this.getUser();
    return user && user.role === CONFIG.ROLES.SUPER;
  },

  isWarehouse() {
    const user = this.getUser();
    return user && user.role === CONFIG.ROLES.WAREHOUSE;
  },

  isSales() {
    const user = this.getUser();
    return user && user.role === CONFIG.ROLES.SALES;
  },

  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
    return true;
  },

  requireRole(roles) {
    if (!this.requireAuth()) return false;
    const user = this.getUser();
    if (!roles.includes(user.role)) {
      alert('您没有权限访问此页面（当前角色：' + (user.role || '未知') + '）');
      this.redirectByRole();
      return false;
    }
    return true;
  },

  redirectByRole() {
    const user = this.getUser();
    if (!user) { window.location.href = 'login.html'; return; }
    switch (user.role) {
      case CONFIG.ROLES.SUPER:
      case CONFIG.ROLES.ADMIN:
        window.location.href = 'admin.html'; break;
      case CONFIG.ROLES.WAREHOUSE:
        window.location.href = 'warehouse.html'; break;
      case CONFIG.ROLES.SALES:
        window.location.href = 'sales.html'; break;
      default: window.location.href = 'login.html';
    }
  }
};

/** 简单的 SHA256 哈希 */
async function hashPassword(password, salt) {
  const msg = salt + password;
  const encoder = new TextEncoder();
  const data = encoder.encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
