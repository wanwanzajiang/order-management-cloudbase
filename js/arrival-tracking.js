/* 产品到货数量追踪 - DOM后处理方式，不修改任何inline脚本 */
(function(){
  var page = (location.pathname.split('/').pop()||'');
  var role = page.indexOf('warehouse')>=0 ? 'warehouse'
    : page.indexOf('sales')>=0 ? 'sales'
    : page.indexOf('admin')>=0 ? 'admin' : '';
  if (!role) return;

  /* 全局弹窗 */
  var modal = document.createElement('div');
  modal.id = '__arrivalModal';
  modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9999;align-items:center;justify-content:center';
  modal.onclick = function(e){if(e.target===modal)modal.style.display='none'};
  document.body.appendChild(modal);

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
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

          var html = '<div style="font-size:11px;">';
          if (role === 'warehouse') {
            var row = cell.closest('tr[data-id]');
            var oid = row ? row.getAttribute('data-id') : '';
            var p0 = products[0];
            var aq0 = parseInt(p0.arrived_qty) || 0;
            var mq0 = parseInt(p0.qty) || 0;
            var dotColor0 = aq0>=mq0&&mq0>0 ? '#639922' : aq0>0 ? '#e67e22' : '#ccc';
            var totalGot = products.reduce(function(s,p){return s+(parseInt(p.arrived_qty)||0)},0);
            var totalAll = products.reduce(function(s,p){return s+(parseInt(p.qty)||0)},0);
            html += '<div style="cursor:pointer;padding:2px 0;word-break:break-word;max-width:250px" onclick="ARRIVAL.showModal(this)">';
            html += '<span style="color:'+dotColor0+';font-weight:700;margin-right:2px">'+(aq0>=mq0&&mq0>0?'●':'○')+'</span>';
            if (p0.brand) html += '<span style="background:#e8f0fe;color:#1a56db;padding:1px 4px;border-radius:3px;margin-right:2px;font-size:10px">'+esc(p0.brand)+'</span>';
            html += '<strong>'+esc(p0.model||'-')+'</strong>';
            if (mq0) html += '<span style="color:#e67e22"> ×'+mq0+'</span>';
            html += '<span style="color:#aaa;font-size:10px">('+aq0+'/'+mq0+')</span>';
            if (p0.delivery) html += '<span style="color:#888;font-size:10px;margin-left:2px">'+esc(p0.delivery)+'</span>';
            if (products.length > 1) html += '<span style="color:#667eea;font-size:10px;white-space:nowrap;margin-left:4px"> +'+(products.length-1)+'款</span>';
            if (totalAll > 0) html += '<span style="color:#888;font-size:9px;margin-left:2px">'+totalGot+'/'+totalAll+'</span>';
            html += '</div>';
          } else {
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
          }
          html += '</div>'; } catch(e) {}
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
          if (typeof loadOrders === 'function') loadOrders();
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
    },
    showModal: function(el) {
      var cell = el.closest('[data-pm]');
      if (!cell) return;
      var raw = cell.getAttribute('data-pm');
      var products;
      try { products = JSON.parse(raw); } catch(e) { return; }
      if (!Array.isArray(products)) return;
      var row = cell.closest('tr[data-id]');
      var oid = row ? row.getAttribute('data-id') : '';
      var inv = row ? (row.querySelector('td:first-child')||{}).textContent : '';
      var h = '<div style="background:#fff;border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.2)" onclick="event.stopPropagation()">';
      h += '<div style="font-size:16px;font-weight:600;margin-bottom:16px">'+esc(inv)+' 到货状态</div>';
      products.forEach(function(p, i) {
        var aq = parseInt(p.arrived_qty) || 0;
        var mq = parseInt(p.qty) || 0;
        var dc = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#ccc';
        var sep = i>0 ? 'border-top:1px solid #eee;' : '';
        h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;'+sep+'">';
        h += '<span style="color:'+dc+';font-weight:700;font-size:14px">'+(aq>=mq&&mq>0?'●':'○')+'</span>';
        if (p.brand) h += '<span style="background:#e8f0fe;color:#1a56db;padding:2px 6px;border-radius:4px;font-size:11px">'+esc(p.brand)+'</span>';
        h += '<strong>'+esc(p.model||'-')+'</strong>';
        if (mq) h += '<span style="color:#e67e22">×'+mq+'</span>';
        h += '<input type="number" min="0" max="'+mq+'" value="'+aq+'" style="width:50px;padding:4px 8px;font-size:13px;border:1px solid #667eea;border-radius:4px;text-align:center" onchange="ARRIVAL.updateQty(this)" data-oid="'+oid+'" data-idx="'+i+'" data-mq="'+mq+'">';
        h += '<span style="color:#aaa;font-size:12px">/'+mq+'</span>';
        if (p.delivery) h += '<span style="color:#888;font-size:11px">'+esc(p.delivery)+'</span>';
        h += '</div>';
      });
      h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">';
      h += '<button onclick="ARRIVAL.fillAll(this)" data-oid="'+oid+'" style="padding:6px 16px;background:#eaf3de;color:#639922;border:1px solid #b8d98a;border-radius:6px;cursor:pointer;font-size:13px">全部到货</button>';
      h += '<button onclick="document.getElementById(\'__arrivalModal\').style.display=\'none\'" style="padding:6px 16px;background:#f5f5f5;color:#888;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px">关闭</button>';
      h += '</div></div>';
      modal.innerHTML = h;
      modal.style.display = 'flex';
    }
  };

  /* 轮询增强：持续扫描DOM */
  var patchApplied = false;
  var pollCount = 0;
  enhanceProductCells();
  var pollTimer = setInterval(function(){
    pollCount++;
    enhanceProductCells();
    if (pollCount > 30) clearInterval(pollTimer);
  }, 300);

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
