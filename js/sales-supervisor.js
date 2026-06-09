// 主管模式：团队订单 + 逾期筛选
;(function(){
  'use strict';

  var supervisorMode = false;
  var overdueOnly = false;
  var teamOrdersCache = [];

  // 检查当前业务员是否是主管
  async function checkSupervisor(){
    if(!window.currentSp||!window.currentSp.name)return;
    try{
      // 先查有没有下属（不管他们有没有订单）
      var spRes = await DB.collection(COL.SALESPEOPLE).where({supervisor_id:window.currentSp.name}).get();
      var subNames = (spRes.data||[]).map(function(s){return s.name});
      if(!subNames.length)return; // 没有下属，不是主管
      // 显示主管栏
      showSupervisorBar();
      // 异步加载团队订单
      var allRes = await DB.collection(COL.ORDERS).orderBy("created_at","desc").limit(1e3).get();
      teamOrdersCache = (allRes.data||[]).filter(function(o){return subNames.indexOf(o.salesperson_name)>=0});
    }catch(e){
      console.log('检查主管失败:', e);
    }
  }

  // 显示主管切换栏
  function showSupervisorBar(){
    var container = document.getElementById('resultContainer');
    if(!container || document.getElementById('svBar')) return;

    var bar = document.createElement('div');
    bar.id = 'svBar';
    bar.style.cssText = 'display:none;padding:8px 12px;margin-bottom:12px;background:linear-gradient(135deg,#fef3e2,#fff8f0);border-radius:8px;border:1px solid #f0c060;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

    bar.innerHTML = '<b style="font-size:13px;color:#b8860b;">👑 主管模式</b>';

    // 我的订单按钮
    var btnMy = document.createElement('button');
    btnMy.textContent = '📋 我的订单';
    btnMy.className = 'btn btn-sm';
    btnMy.style.cssText = 'background:#667eea;color:#fff;border-color:#667eea;font-size:12px;padding:4px 12px;';
    btnMy.onclick = function(){
      supervisorMode = false;
      overdueOnly = false;
      btnMy.style.background = '#667eea';
      btnTeam.style.background = '#f0f0f0';
      btnTeam.style.color = '#666';
      btnTeam.style.borderColor = '#ddd';
      hideOverdueBtn();
      window.searchOrders();
    };
    bar.appendChild(btnMy);

    // 团队订单按钮
    var btnTeam = document.createElement('button');
    btnTeam.textContent = '👥 团队订单';
    btnTeam.className = 'btn btn-sm';
    btnTeam.style.cssText = 'background:#f0f0f0;color:#666;border-color:#ddd;font-size:12px;padding:4px 12px;';
    btnTeam.onclick = async function(){
      supervisorMode = true;
      overdueOnly = false;
      btnMy.style.background = '#f0f0f0';
      btnMy.style.color = '#666';
      btnMy.style.borderColor = '#ddd';
      btnTeam.style.background = '#667eea';
      btnTeam.style.color = '#fff';
      btnTeam.style.borderColor = '#667eea';
      showOverdueBtn();
      await loadTeamOrders();
    };
    bar.appendChild(btnTeam);

    container.parentNode.insertBefore(bar, container);

    // 逾期按钮（初始隐藏）
    var btnOverdue = document.createElement('button');
    btnOverdue.id = 'btnOverdue';
    btnOverdue.textContent = '⚠️ 逾期未收回';
    btnOverdue.className = 'btn btn-sm';
    btnOverdue.style.cssText = 'display:none;background:#e07a5f;color:#fff;border-color:#e07a5f;font-size:12px;padding:4px 12px;';
    btnOverdue.onclick = function(){
      overdueOnly = !overdueOnly;
      btnOverdue.style.background = overdueOnly ? '#c0392b' : '#e07a5f';
      renderTeamOrders(teamOrdersCache);
    };
    bar.appendChild(btnOverdue);
  }

  function showOverdueBtn(){
    var b = document.getElementById('btnOverdue');
    if(b) b.style.display = '';
  }
  function hideOverdueBtn(){
    var b = document.getElementById('btnOverdue');
    if(b) b.style.display = 'none';
  }

  // 加载团队订单
  async function loadTeamOrders(){
    var container = document.getElementById('resultContainer');
    if(!window.currentSp)return;
    App.showLoading(container);
    try{
      var res = await API.getSupervisorTeam(window.currentSp.name);
      teamOrdersCache = res.data || [];
      renderTeamOrders(teamOrdersCache);
    }catch(e){
      App.showError(container, '加载团队订单失败: '+e.message);
    }
  }

  // 渲染团队订单
  function renderTeamOrders(orders){
    var container = document.getElementById('resultContainer');
    // 逾期筛选
    var filtered = orders;
    if(overdueOnly){
      var now = new Date();
      filtered = orders.filter(function(o){
        if(o.order_status !== '已到货') return false;
        if(!o.delivered_at) return false;
        if(o.returned_at) return false;
        var delivered = new Date(o.delivered_at);
        var days = (now - delivered) / 86400000;
        return days > 5;
      });
    }

    var totalQty = filtered.reduce(function(sum,o){return sum+(o.quantity||0)},0);
    var svCount = overdueOnly ? (' 逾期' + filtered.length + '单') : '';

    var html = '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:#fff8f0;border-radius:8px;">' +
      '<span style="font-size:15px;">👥 团队共 <strong style="color:#667eea;font-size:18px;">'+filtered.length+'</strong> 条'+svCount+'</span>' +
      '<span style="font-size:15px;">📦 总数量：<strong style="color:#e67e22;font-size:18px;">'+totalQty+'</strong></span>' +
      '</div>';

    if(filtered.length === 0){
      html += '<div class="card" style="text-align:center;padding:30px;color:#999;">' +
        (overdueOnly ? '🎉 没有逾期订单' : '📭 暂无团队订单') + '</div>';
      container.innerHTML = html;
      return;
    }

    filtered.forEach(function(order){
      var id = order._id || order.id;
      var sc = {'调货中':'#e67e22','路途中':'#3498db','已到货':'#27ae60','已完结':'#95a5a6'}[order.order_status] || '#999';
      var productsText = '';
      try{
        if(typeof order.product_model === 'string' && order.product_model.startsWith('[')){
          var prods = JSON.parse(order.product_model);
          productsText = prods.map(function(p){return (p.brand||'')+' '+p.model+' ×'+(p.qty||1)}).join(', ');
        }else{
          productsText = order.product_model || '';
        }
      }catch(e){productsText = order.product_model || '';}

      html += '<div class="order-card" style="border-left-color:'+sc+';">' +
        '<div class="oc-header">' +
        '<div><span class="oc-invoice">'+App.escapeHtml(order.invoice_no)+'</span></div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span class="oc-status" style="background:'+sc+';">'+(order.order_status||'待填写')+'</span>' +
        '<span class="oc-date">'+ (order.order_date||'-') +'</span>' +
        '</div></div>' +
        '<div style="font-size:12px;color:#555;margin:4px 0;">📦 '+App.escapeHtml(productsText)+'</div>' +
        '<div style="font-size:12px;color:#888;margin:4px 0;">👤 <strong>'+App.escapeHtml(order.salesperson_name||'-')+'</strong> | 数量：'+(order.quantity||'-')+'</div>' +
        '<div style="font-size:11px;color:#999;">' +
        (order.delivered_at ? '已送：'+new Date(order.delivered_at).toLocaleDateString('zh-CN')+' ' : '') +
        (order.returned_at ? '已收：'+new Date(order.returned_at).toLocaleDateString('zh-CN') : '') +
        '</div></div>';
    });

    container.innerHTML = html;
  }

  // 监听 currentSp 变化
  var _verifyCode = window.verifyCode;
  if(_verifyCode){
    var origVerify = _verifyCode;
    window.verifyCode = async function(){
      await origVerify.apply(this, arguments);
      setTimeout(checkSupervisor, 500);
    };
  }

  // 初始检查（如果已登录）
  setTimeout(function(){
    if(window.currentSp && window.currentSp.name){
      checkSupervisor();
    }
  }, 1000);
})();
