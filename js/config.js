/**
 * CloudBase 版 - 全局配置
 * 完全替代 Supabase，使用腾讯云开发
 */
const CONFIG = {
  CLOUDBASE_ENV: 'wanwan-d2gafa9gobac0b79b',
  ROLES: {
    SUPER: 'super_admin',
    ADMIN: 'admin',
    WAREHOUSE: 'warehouse',
    SALES: 'sales'
  },
  ROLE_NAMES: {
    super_admin: '超级管理员',
    admin: '管理员',
    warehouse: '仓库人员',
    sales: '业务员'
  },
  ORDER_STATUSES: ['调货中', '路途中', '已到货', '已完结']
};

/** 全局 CloudBase 应用实例（匿名连接，身份自管） */
const TCB = window.cloudbase.init({
  env: CONFIG.CLOUDBASE_ENV,
  persistence: 'none'
});

/** 数据库引用 */
const DB = TCB.database();

/** 集合名常量 */
const COL = {
  USERS: 'users',        // 用户（CloudBase Auth uid → 角色/姓名）
  SALESPEOPLE: 'salespeople',  // 业务员
  ORDERS: 'orders'       // 订单
};
