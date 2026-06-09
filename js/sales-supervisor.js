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
      // 先查所有业务员，筛选下属
      var allSp = await API.getAllSalespeople(true);
      var subs = (allSp.data||[]).filter(function(s){
        return s.supervisor_id === window.currentSp.name;
      });
      if(!subs.length)return;
      // 有下属，显示主管栏
      showSupervisorBar();
      var subNames = subs.map(function(s){return s.name});
      // 加载团队订单（复用已有的订单查询）
      var allOrd = await API.getOrders();
      teamOrdersCache = (allOrd.data||[]).filter(function(o){
        return subNames.indexOf(o.salesperson_name)>=0;
      });
    }catch(e){
      console.log('主管检查失败:',e);
    }
  }

  // 显示主管切换栏
  function showSupervisorBar(){
    var container = document.getElementById('resultContainer');
    if(!container || document.getElementById('svBar')) return;

    var bar = document.createElement('div');
    bar.id = 'svBar';
    bar.style.cssText = 'padding:8px 12px;margin-bottom:12px;background:linear-gradient(135deg,#fef3e2,#fff8f0);border-radius:8px;border:1px solid #f0c060;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

    bar.innerHTML = '<b style="font-size:13px;color:#b8860b;">👑 主管模式</b>';

    var btnMy = document.createElement('button');
    btnMy.textContent = '📋 我的订单';
    btnMy.className = 'btn btn-sm';
    btnMy.style.cssText = 'background:#667eea;color:#fff;border-color:#667eea;font-size:12px;padding:4px 12px;';
    btnMy.onclick = function(){
      supervisorMode = false; overdueOnly = false;
      btnMy.style.background = '#667eea'; btnMy.style.color = '#fff';
      btnTeam.style.background = '#f0f0f0'; btnTeam.style.color = '#666';
      hideOverdueBtn(); window.searchOrders();
    };
    bar.appendChild(btnMy);

    var btnTeam = document.createElement('button');
    btnTeam.textContent = '👥 团队订单';
    btnTeam.className = 'btn btn-sm';
    btnTeam.style.cssText = 'background:#f0f0f0;color:#666;border-color:#ddd;font-size:12px;padding:4px 12px;';
    btnTeam.onclick = async function(){
      supervisorMode = true; overdueOnly = false;
      btnMy.style.background = '#f0f0f0'; btnMy.style.color = '#666';
      btnTeam.style.background = '#667eea'; btnTeam.style.color = '#fff';
      showOverdueBtn(); await loadTeamOrders();
    };
    bar.appendChild(btnTeam);

    container.parentNode.insertBefore(bar, container);

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

  function showOverdueBtn(){var b=document.getElementById('btnOverdue');if(b)b.style.display='';}
  function hideOverdueBtn(){var b=document.getElementById('btnOverdue');if(b)b.style.display='none';}

  async function loadTeamOrders(){
    var container = document.getElementById('resultContainer');
    if(!window.currentSp)return;
    App.showLoading(container);
    try{
      var allSp = await API.getAllSalespeople(true);
      var subs = (allSp.data||[]).filter(function(s){return s.supervisor_id===window.currentSp.name});
      var subNames = subs.map(function(s){return s.name});
      var allOrd = await API.getOrders();
      teamOrdersCache = (allOrd.data||[]).filter(function(o){return subNames.indexOf(o.salesperson_name)>=0});
      renderTeamOrders(teamOrdersCache);
    }catch(e){App.showError(container, '加载失败: '+e.message);}
  }

  function renderTeamOrders(orders){
    var container = document.getElementById('resultContainer');
    var filtered = orders;
    if(overdueOnly){
      var now = new Date();
      filtered = orders.filter(function(o){
        if(o.order_status!=='已到货'||!o.delivered_at||o.returned_at)return false;
        return (now-new Date(o.delivered_at))/86400000 > 5;
      });
    }
    var totalQty = filtered.reduce(function(s,o){return s+(o.quantity||0)},0);
    var html = '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:#fff8f0;border-radius:8px;">'+
      '<span style="font-size:15px;">👥 团队共 <strong style="color:#667eea;font-size:18px;">'+filtered.length+'</strong> 条'+(overdueOnly?' 逾期'+filtered.length+'单':'')+'</span>'+
      '<span style="font-size:15px;">📦 总数量：<strong style="color:#e67e22;font-size:18px;">'+totalQty+'</strong></span></div>';
    if(!filtered.length){container.innerHTML=html+'<div class="card" style="text-align:center;padding:30px;color:#999;">'+(overdueOnly?'🎉 无逾期':'📭 无团队订单')+'</div>';return;}
    filtered.forEach(function(o){
      var sc={'调货中':'#e67e22','路途中':'#3498db','已到货':'#27ae60','已完结':'#95a5a6'}[o.order_status]||'#999';
      var pt='';try{pt=typeof o.product_model==='string'&&o.product_model.startsWith('[')?JSON.parse(o.product_model).map(function(p){return(p.brand||'')+' '+p.model+' ×'+(p.qty||1)}).join(', '):(o.product_model||'')}catch(e){pt=o.product_model||''}
      html+='<div class="order-card" style="border-left-color:'+sc+';">'+
        '<div class="oc-header"><div><span class="oc-invoice">'+App.escapeHtml(o.invoice_no)+'</span></div>'+
        '<div style="display:flex;align-items:center;gap:8px;"><span class="oc-status" style="background:'+sc+';">'+(o.order_status||'待填写')+'</span>'+
        '<span class="oc-date">'+(o.order_date||'-')+'</span></div></div>'+
        '<div style="font-size:12px;color:#555;margin:4px 0;">📦 '+App.escapeHtml(pt)+'</div>'+
        '<div style="font-size:12px;color:#888;margin:4px 0;">👤 <strong>'+App.escapeHtml(o.salesperson_name||'-')+'</strong> | 数量：'+(o.quantity||'-')+'</div>'+
        '<div style="font-size:11px;color:#999;">'+(o.delivered_at?'已送：'+new Date(o.delivered_at).toLocaleDateString('zh-CN')+' ':'')+(o.returned_at?'已收：'+new Date(o.returned_at).toLocaleDateString('zh-CN'):'')+'</div></div>';
    });
    container.innerHTML=html;
  }

  // 监听 verifyCode
  var _vc = window.verifyCode;
  if(_vc){var ov=_vc;window.verifyCode=async function(){await ov.apply(this,arguments);setTimeout(checkSupervisor,500);}}

  setTimeout(function(){if(window.currentSp&&window.currentSp.name)checkSupervisor();},1000);
})();
