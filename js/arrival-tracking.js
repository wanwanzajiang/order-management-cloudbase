/* 产品到货数量追踪 - DOM后处理方式，不修改任何inline脚本 */
(function(){
  var page = (location.pathname.split('/').pop()||'');
  var role = page.indexOf('warehouse')>=0 ? 'warehouse'
    : page.indexOf('sales')>=0 ? 'sales'
    : page.indexOf('admin')>=0 ? 'admin' : '';
  if (!role) return;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function buildPopupHTML(products, oid) {
    var h = '<div style="background:#fff;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);padding:14px;min-width:300px;max-width:450px">';
    h += '<div style="font-weight:600;margin-bottom:8px;font-size:13px">到货状态</div>';
    products.forEach(function(p, i) {
      var aq = parseInt(p.arrived_qty) || 0;
      var mq = parseInt(p.qty) || 0;
      var dotColor = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#ccc';
      var dot = '<span style="color:'+dotColor+';font-weight:700;margin-right:4px">'+(aq>=mq&&mq>0?'●':'○')+'</span>';
      var brand = p.brand ? '<span style="background:#e8f0fe;color:#1a56db;padding:1px 5px;border-radius:3px;margin-right:3px;font-size:10px">'+esc(p.brand)+'</span>' : '';
      var model = '<strong style="font-size:12px">'+esc(p.model||'-')+'</strong>';
      var sep = i>0 ? 'border-top:1px dotted #eee;' : '';
      h += '<div style="display:flex;align-items:center;gap:6px;padding:6px 0;'+sep+'">';
      h += dot + brand + model;
      if (mq) h += ' <span style="color:#e67e22;font-size:11px">×'+mq+'</span>';
      h += ' <input type="number" min="0" max="'+mq+'" value="'+aq+'" style="width:36px;padding:2px 4px;font-size:12px;border:1px solid #667eea;border-radius:4px;text-align:center" onchange="ARRIVAL.updateQty(this)" data-oid="'+oid+'" data-idx="'+i+'" data-mq="'+mq+'" onfocus="this.select()">';
      h += ' <span style="color:#aaa;font-size:11px">/'+mq+'</span>';
      if (p.delivery) h += ' <span style="color:#888;font-size:10px;margin-left:4px">'+esc(p.delivery)+'</span>';
      h += '</div>';
    });
    h += '<div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">';
    h += '<button onclick="ARRIVAL.fillAll(this)" data-oid="'+oid+'" style="font-size:11px;padding:3px 12px;background:#eaf3de;color:#639922;border:1px solid #b8d98a;border-radius:4px;cursor:pointer">全部到货</button>';
    h += '<button onclick="var p=this.closest(\'.arrival-popup\');if(p)p.style.display=\'none\'" style="font-size:11px;padding:3px 12px;background:#f5f5f5;color:#888;border:1px solid #ddd;border-radius:4px;cursor:pointer">关闭</button>';
    h += '</div></div>';
    return h;
  }

  function enhanceProductCells() {
    try {
      var cells = document.querySelectorAll('[data-pm]');
      cells.forEach(function(cell) {
        try {
          var raw = cell.getAttribute('data-pm');
          if (!raw || raw === 'null' || raw === 'undefined') return;
          var products;
          try { products = JSON.parse(raw); } catch(e) { return; }
          if (!Array.isArray(products)) return;

          /* 仓库模式：紧凑展示 + 点击弹窗 */
          if (role === 'warehouse') {
            var row = cell.closest('tr[data-id]');
            var oid = row ? row.getAttribute('data-id') : '';
            var p0 = products[0];
            var aq0 = parseInt(p0.arrived_qty) || 0;
            var mq0 = parseInt(p0.qty) || 0;
            var dotColor0 = aq0>=mq0&&mq0>0 ? '#639922' : aq0>0 ? '#e67e22' : '#ccc';
            var totalGot = products.reduce(function(s,p){return s+(parseInt(p.arrived_qty)||0)},0);
            var totalAll = products.reduce(function(s,p){return s+(parseInt(p.qty)||0)},0);

            var compact = '<div style="font-size:11px;cursor:pointer;padding:4px 0" onclick="var s=this.nextElementSibling;if(s&&s.classList.contains(\'arrival-popup\'))s.style.display=s.style.display==\'none\'?\'block\':\'none\'">';
            compact += '<span style="color:'+dotColor0+';font-weight:700;margin-right:2px">'+(aq0>=mq0&&mq0>0?'●':'○')+'</span>';
            if (p0.brand) compact += '<span style="background:#e8f0fe;color:#1a56db;padding:1px 4px;border-radius:3px;margin-right:2px;font-size:10px">'+esc(p0.brand)+'</span>';
            compact += '<strong>'+esc(p0.model||'-')+'</strong>';
            if (mq0) compact += ' <span style="color:#e67e22">×'+mq0+'</span>';
            compact += ' <input type="number" min="0" max="'+mq0+'" value="'+aq0+'" style="width:30px;padding:1px 3px;font-size:11px;border:1px solid #667eea;border-radius:3px;text-align:center" onchange="ARRIVAL.updateQty(this)" data-oid="'+oid+'" data-idx="0" data-mq="'+mq0+'" onfocus="this.select()" onclick="event.stopPropagation()">';
            compact += ' <span style="color:#aaa;font-size:10px">/'+mq0+'</span>';
            if (p0.delivery) compact += ' <span style="color:#888;font-size:10px;margin-left:2px">'+esc(p0.delivery)+'</span>';
            if (products.length > 1) {
              compact += ' <span style="color:#667eea;font-size:10px;text-decoration:underline;white-space:nowrap">+'+ (products.length-1) +'款</span>';
              compact += ' <span style="color:#888;font-size:9px">('+totalGot+'/'+totalAll+')</span>';
            }
            compact += '</div>';
            var popup = '<div class="arrival-popup" style="display:none;position:relative;z-index:99">'+buildPopupHTML(products, oid)+'</div>';
            cell.innerHTML = compact + popup;

          } else {
            /* 业务员/管理员模式：完整展示 */
            var html = '<div style="font-size:11px;">';
            products.forEach(function(p, i) {
              var aq = parseInt(p.arrived_qty) || 0;
              var mq = parseInt(p.qty) || 0;
              var dotColor = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#ccc';
              var dotTitle = aq>=mq&&mq>0 ? '全到' : aq>0 ? '到部分' : '未到';
              var dot = '<span style="color:'+dotColor+';font-weight:700;font-size:12px" title="'+dotTitle+'">'+(aq>=mq&&mq>0?'●':'○')+'</span> ';
              var brand = p.brand ? '<span style="background:#e8f0fe;color:#1a56db;padding:1px 5px;border-radius:3px;margin-right:3px;font-size:10px;">'+esc(p.brand)+'</span>' : '';
              var model = '<strong>'+esc(p.model||'-')+'</strong>';
              var qtySpan = mq ? '<span style="color:#e67e22;">×'+mq+'</span>' : '';
              var delivery = p.delivery ? '<span style="color:#888;font-size:10px;margin-left:4px;">'+esc(p.delivery)+'</span>' : '';
              var sep = i>0 ? 'border-top:1px dotted #eee;' : '';
              html += '<div style="padding:2px 0;'+sep+'">';
              html += dot + brand + model + ' ' + qtySpan + ' ';
              if (role === 'sales') {
                var txtColor = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#999';
                html += '<span style="font-size:11px;color:'+txtColor+'">'+aq+'/'+mq+'</span>';
              } else {
                var txtColor2 = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#999';
                html += '<span style="font-size:10px;color:'+txtColor2+'">('+aq+'/'+mq+')</span>';
              }
              html += delivery + '</div>';
            });
            html += '</div>';
            cell.innerHTML = html;
          }
        } catch(e) {}
      });
    } catch(e) {}
  }

  /* 全局工具函数 */
  window.ARRIVAL = {
    updateQty: function(el) {
      var oid = el.getAttribute('data-oid');
      var idx = parseInt(el.getAttribute('data-idx')) || 0;
      var val = parseInt(el.value) || 0;
      var max = parseInt(el.getAttribute('data-mq')) || 9999;
      if (val > max) val = max;
      if (val < 0) val = 0;
      el.value = val;
        DB.collection(COL.ORDERS).doc(oid).get().then(function(r) {
        if (!r.data || !r.data[0]) return;
        var pm = JSON.parse(r.data[0].product_model || '[]');
        if (idx >= 0 && idx < pm.length) pm[idx].arrived_qty = val;
        API.updateOrder(oid, {product_model: JSON.stringify(pm)}).then(function(){
          var cell = el.closest('[data-pm]');
          if (cell) { cell.setAttribute('data-pm', JSON.stringify(pm)); enhanceProductCells(); }
        }).catch(function(){});
      }).catch(function(){});
    },
    fillAll: function(el) {
      var oid = el.getAttribute('data-oid');
      DB.collection(COL.ORDERS).doc(oid).get().then(function(r) {
        if (!r.data || !r.data[0]) return;
        var pm = JSON.parse(r.data[0].product_model || '[]');
        pm.forEach(function(p) { p.arrived_qty = p.qty || 0; });
        API.updateOrder(oid, {product_model: JSON.stringify(pm)}).then(function(){
          if (typeof loadOrders === 'function') loadOrders();
        }).catch(function(){});
      }).catch(function(){});
    },
    completeOrder: function(oid) {
      if (!confirm('确认将此订单改为已完结？')) return;
      API.updateOrder(oid, {order_status: '已完结'}).then(function(r) {
        if (r.error) { if (typeof showToast === 'function') showToast('完结失败: '+r.error.message, 'error'); return; }
        if (typeof showToast === 'function') showToast('✅ 订单已完结', 'success');
        setTimeout(function() { if (typeof loadOrders === 'function') loadOrders(); }, 500);
      }).catch(function(e) {
        if (typeof showToast === 'function') showToast('完结失败: '+(e.message||''), 'error');
      });
    }
  };

  /* 轮询增强：持续扫描DOM */
  var patchApplied = false;
  var pollCount = 0;
  var pollTimer = setInterval(function(){
    pollCount++;
    var cells = document.querySelectorAll('[data-pm]');
    if (cells.length > 0) {
      enhanceProductCells();
    }
    if (pollCount > 20) clearInterval(pollTimer);
  }, 800);

  /* 猴子补丁：让后续渲染也能自动增强 */
  var patchTries = 0;
  var patchTimer = setInterval(function(){
    patchTries++;
    try {
      if (role === 'warehouse' && typeof loadOrders === 'function' && !patchApplied) {
        patchApplied = true;
        var origLO = loadOrders;
        window.loadOrders = async function() { await origLO(); setTimeout(enhanceProductCells, 100); };
      }
      if (role === 'sales' && typeof renderResults === 'function' && !patchApplied) {
        patchApplied = true;
        var origRR = renderResults;
        window.renderResults = function(d) { origRR(d); setTimeout(enhanceProductCells, 100); };
      }
      if (role === 'admin' && typeof renderOrders === 'function' && !patchApplied) {
        patchApplied = true;
        var origRO = renderOrders;
        window.renderOrders = function(e) { origRO(e); setTimeout(enhanceProductCells, 100); };
      }
    } catch(e) {}
    if (patchTries > 30) clearInterval(patchTimer);
  }, 200);
})();
