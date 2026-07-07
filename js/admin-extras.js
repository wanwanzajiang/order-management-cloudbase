/* 管理员待完结筛选 */
(function(){
  if (location.pathname.indexOf('admin') < 0) return;

  function isAllArrived(pm) {
    try {
      var arr = JSON.parse(pm || '[]');
      if (!Array.isArray(arr) || !arr.length) return false;
      return arr.every(function(p){ return (parseInt(p.arrived_qty)||0) >= (parseInt(p.qty)||0); });
    } catch(e) { return false; }
  }

  /* 注入checkbox */
  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    var bar = document.querySelector('.filter-bar');
    if (bar && !document.getElementById('chkNeedComplete')) {
      var lbl = document.createElement('label');
      lbl.style.cssText = 'font-size:12px;display:flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap;margin-left:8px';
      lbl.innerHTML = '<input type="checkbox" id="chkNeedComplete" onchange="loadOrders()"> 待完结';
      bar.appendChild(lbl);
    }
    if (typeof renderOrders === 'function') {
      clearInterval(timer);
      var origRO = renderOrders;
      window.renderOrders = function(data) {
        var filtered = data || [];
        var cb = document.getElementById('chkNeedComplete');
        if (cb && cb.checked) {
          filtered = filtered.filter(function(o){
            return o.order_status === '已到货' && o.delivery_date && isAllArrived(o.product_model);
          });
        }
        origRO(filtered);
        setTimeout(function(){
          if (typeof enhanceProductCells === 'function') enhanceProductCells();
        }, 100);
      };
    }
    if (tries > 30) clearInterval(timer);
  }, 200);
})();
