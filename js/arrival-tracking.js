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
          products.forEach(function(p, i) {
            var aq = parseInt(p.arrived_qty) || 0;
            var mq = parseInt(p.qty) || 0;
            var dotColor = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#ccc';
            var dotTitle = aq>=mq&&mq>0 ? '全到' : aq>0 ? '到部分' : '未到';
            var dot = '<span style="color:'+dotColor+';font-weight:700;font-size:12px" title="'+dotTitle+'">'+(aq>=mq&&mq>0?'●':'○')+'</span> ';
            var brand = p.brand ? '<span style="background:#e8f0fe;color:#1a56db;padding:1px 5px;border-radius:3px;margin-right:3px;font-size:10px;">'+esc(p.brand)+'</span>' : '';
            var model = '<span style="display:inline-block;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom" title="'+esc(p.model||'-')+'"><strong>'+esc(p.model||'-')+'</strong></span>';
            var qtySpan = mq ? '<span style="color:#e67e22;">×'+mq+'</span>' : '';
            var delivery = p.delivery ? '<span style="color:#888;font-size:10px;margin-left:4px;">'+esc(p.delivery)+'</span>' : '';
            var sep = i>0 ? 'border-top:1px dotted #eee;' : '';

            html += '<div style="padding:2px 0;'+sep+'">';
            html += dot + brand + model + ' ' + qtySpan + ' ';

            if (role === 'warehouse') {
              var row = cell.closest('tr[data-id]');
              var oid = row ? row.getAttribute('data-id') : '';
              html += '<input type="number" min="0" max="'+mq+'" value="'+aq+'" style="width:38px;padding:1px 3px;font-size:11px;border:1px solid #667eea;border-radius:3px;text-align:center" onchange="ARRIVAL.updateQty(this)" data-oid="'+oid+'" data-idx="'+i+'" data-mq="'+mq+'" onfocus="this.select()">';
              html += ' <span style="color:#aaa;font-size:10px">/'+mq+'</span>';
            } else if (role === 'sales') {
              var txtColor = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#999';
              html += '<span style="font-size:11px;color:'+txtColor+'">'+aq+'/'+mq+'</span>';
            } else {
              var txtColor2 = aq>=mq&&mq>0 ? '#639922' : aq>0 ? '#e67e22' : '#999';
              html += '<span style="font-size:10px;color:'+txtColor2+'">('+aq+'/'+mq+')</span>';
            }
            html += delivery + '</div>';
          });

          if (role === 'warehouse') {
            var row = cell.closest('tr[data-id]');
            if (row) {
              var oid = row.getAttribute('data-id');
              html += '<button onclick="ARRIVAL.fillAll(this)" data-oid="'+oid+'" style="margin-top:4px;font-size:11px;padding:2px 10px;background:#eaf3de;color:#639922;border:1px solid #b8d98a;border-radius:4px;cursor:pointer" title="一键填满所有产品到货数量">全部到货</button>';
            }
          }
          html += '</div>';
          cell.innerHTML = html;
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
        var o = r.data[0];
        API.updateOrder(oid, {product_model: JSON.stringify(pm)}).then(function(){
          var cell = el.closest('[data-pm]');
          if (cell) { cell.setAttribute('data-pm', JSON.stringify(pm)); enhanceProductCells(); }
          if (typeof Notifications !== 'undefined') Notifications.create(o.salesperson_name, o.invoice_no, (pm[idx].model||'型号'+(idx+1))+'到'+val+'/'+(pm[idx].qty||0)+'件', oid);
        }).catch(function(){});
      }).catch(function(){});
    },
    fillAll: function(el) {
      var oid = el.getAttribute('data-oid');
      DB.collection(COL.ORDERS).doc(oid).get().then(function(r) {
        if (!r.data || !r.data[0]) return;
        var pm = JSON.parse(r.data[0].product_model || '[]');
        pm.forEach(function(p) { p.arrived_qty = p.qty || 0; });
        var o = r.data[0];
        API.updateOrder(oid, {product_model: JSON.stringify(pm)}).then(function(){
          var cell = el.closest('[data-pm]');
          if (cell) { cell.setAttribute('data-pm', JSON.stringify(pm)); enhanceProductCells(); }
          if (typeof Notifications !== 'undefined') Notifications.create(o.salesperson_name, o.invoice_no, pm.length+'款产品全部到齐', oid);
        }).catch(function(){});
      }).catch(function(){});
    },
    completeOrder: function(oid) {
      if (!confirm('确认将此订单改为已完结？')) return;
      DB.collection(COL.ORDERS).doc(oid).get().then(function(r){
        if (!r.data || !r.data[0]) return;
        var o = r.data[0];
        API.updateOrder(oid, {order_status: '已完结'}).then(function(r2) {
          if (r2.error) { if (typeof showToast === 'function') showToast('完结失败: '+r2.error.message, 'error'); return; }
          if (typeof showToast === 'function') showToast('✅ 订单已完结', 'success');
          if (typeof Notifications !== 'undefined') Notifications.create(o.salesperson_name, o.invoice_no, '已完结', oid);
          setTimeout(function() { if (typeof loadOrders === 'function') loadOrders(); }, 500);
        }).catch(function(e) {
          if (typeof showToast === 'function') showToast('完结失败: '+(e.message||''), 'error');
        });
      }).catch(function(){});
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
