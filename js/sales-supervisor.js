// 主管模式：团队订单 + 逾期筛选
;(function(){
  'use strict';

  var supervisorMode = false;
  var overdueOnly = false;
  var teamOrdersCache = [];
  var checked = false;

  async function checkSupervisor(){
    if(!currentSp||!currentSp.name)return;
    if(checked)return;
    checked = true;
    console.log('SV-CHECK name='+currentSp.name);
    try{
      var res = await API.getSupervisorTeam(currentSp.name);
      console.log('SV-RESULT err='+!!res.error+' subs='+(res.subordinates||[]).length+' data='+(res.data||[]).length);
      if(res.error){console.error('SV-ERR',res.error);return;}
      if(!res.subordinates || !res.subordinates.length)return;
      showSupervisorBar();
      teamOrdersCache = res.data || [];
    }catch(e){}
  }

  function showSupervisorBar(){
    var c = document.getElementById('resultContainer');
    if(!c || document.getElementById('svBar')) return;
    var b = document.createElement('div');
    b.id = 'svBar';
    b.style.cssText = 'padding:8px 12px;margin-bottom:12px;background:linear-gradient(135deg,#fef3e2,#fff8f0);border-radius:8px;border:1px solid #f0c060;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
    b.innerHTML = '<b style="font-size:13px;color:#b8860b;">👑 主管模式</b>';
    var bm = document.createElement('button');
    bm.textContent = '📋 我的订单'; bm.className = 'btn btn-sm';
    bm.style.cssText = 'background:#667eea;color:#fff;border-color:#667eea;font-size:12px;padding:4px 12px;';
    bm.onclick = function(){supervisorMode=false;overdueOnly=false;bm.style.background='#667eea';bm.style.color='#fff';bt.style.background='#f0f0f0';bt.style.color='#666';hideOverdueBtn();window.searchOrders();};
    b.appendChild(bm);
    var bt = document.createElement('button');
    bt.textContent = '👥 团队订单'; bt.className = 'btn btn-sm';
    bt.style.cssText = 'background:#f0f0f0;color:#666;border-color:#ddd;font-size:12px;padding:4px 12px;';
    bt.onclick = async function(){supervisorMode=true;overdueOnly=false;bm.style.background='#f0f0f0';bm.style.color='#666';bt.style.background='#667eea';bt.style.color='#fff';showOverdueBtn();await loadTeamOrders();};
    b.appendChild(bt);
    c.parentNode.insertBefore(b, c);
    var bo = document.createElement('button');
    bo.id = 'btnOverdue'; bo.textContent = '⚠️ 逾期未收回'; bo.className = 'btn btn-sm';
    bo.style.cssText = 'display:none;background:#e07a5f;color:#fff;border-color:#e07a5f;font-size:12px;padding:4px 12px;';
    bo.onclick = function(){overdueOnly=!overdueOnly;bo.style.background=overdueOnly?'#c0392b':'#e07a5f';renderTeamOrders(teamOrdersCache);};
    b.appendChild(bo);
  }

  function showOverdueBtn(){var b=document.getElementById('btnOverdue');if(b)b.style.display='';}
  function hideOverdueBtn(){var b=document.getElementById('btnOverdue');if(b)b.style.display='none';}

  async function loadTeamOrders(){
    var c=document.getElementById('resultContainer');if(!currentSp)return;
    App.showLoading(c);
    try{var r=await API.getSupervisorTeam(currentSp.name);teamOrdersCache=r.data||[];renderTeamOrders(teamOrdersCache);}
    catch(e){App.showError(c,'加载失败: '+e.message);}
  }

  function renderTeamOrders(o){
    var c=document.getElementById('resultContainer');
    var f=o;
    if(overdueOnly){var n=new Date();f=o.filter(function(x){if(x.order_status!=='已到货'||!x.delivered_at||x.returned_at)return false;return(n-new Date(x.delivered_at))/86400000>5;});}
    var q=f.reduce(function(s,x){return s+(x.quantity||0)},0);
    var h='<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:#fff8f0;border-radius:8px;"><span style="font-size:15px;">👥 团队共 <strong style="color:#667eea;font-size:18px;">'+f.length+'</strong> 条'+(overdueOnly?' 逾期'+f.length+'单':'')+'</span><span style="font-size:15px;">📦 总数量：<strong style="color:#e67e22;font-size:18px;">'+q+'</strong></span></div>';
    if(!f.length){c.innerHTML=h+'<div class="card" style="text-align:center;padding:30px;color:#999;">'+(overdueOnly?'🎉 无逾期':'📭 无团队订单')+'</div>';return;}
    f.forEach(function(x){var sc={'调货中':'#e67e22','路途中':'#3498db','已到货':'#27ae60','已完结':'#95a5a6'}[x.order_status]||'#999';var pt='';try{pt=typeof x.product_model==='string'&&x.product_model.startsWith('[')?JSON.parse(x.product_model).map(function(p){return(p.brand||'')+' '+p.model+' ×'+(p.qty||1)}).join(', '):(x.product_model||'')}catch(e){pt=x.product_model||''};h+='<div class="order-card" style="border-left-color:'+sc+';"><div class="oc-header"><div><span class="oc-invoice">'+App.escapeHtml(x.invoice_no)+'</span></div><div style="display:flex;align-items:center;gap:8px;"><span class="oc-status" style="background:'+sc+';">'+(x.order_status||'待填写')+'</span><span class="oc-date">'+(x.order_date||'-')+'</span></div></div><div style="font-size:12px;color:#555;margin:4px 0;">📦 '+App.escapeHtml(pt)+'</div><div style="font-size:12px;color:#888;margin:4px 0;">👤 <strong>'+App.escapeHtml(x.salesperson_name||'-')+'</strong> | 数量：'+(x.quantity||'-')+'</div><div style="font-size:11px;color:#999;">'+(x.delivered_at?'已送：'+new Date(x.delivered_at).toLocaleDateString('zh-CN')+' ':'')+(x.returned_at?'已收：'+new Date(x.returned_at).toLocaleDateString('zh-CN'):'')+'</div></div>';});
    c.innerHTML=h;
  }

  // 轮询检测 currentSp 变化
  var lastSp = null;
  console.log('SV-POLL start');
  setInterval(function(){
    if(currentSp && currentSp.name && (!lastSp || lastSp.name !== currentSp.name)){
      console.log('SV-POLL detect sp='+currentSp.name);
      lastSp = currentSp;
      checked = false;
      checkSupervisor();
    }
  }, 500);
})();
