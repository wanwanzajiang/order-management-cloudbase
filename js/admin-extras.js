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

  /* 注入checkbox + monkey-patch renderOrders */
  var tries = 0;
  var done = false;
  var timer = setInterval(function(){
    tries++;
    try {
      var bar = document.querySelector('.filter-bar');
      var ro = (typeof renderOrders === 'function');

      if (bar && ro && !done) {
        done = true;
        clearInterval(timer);

        /* 加checkbox */
        var lbl = document.createElement('label');
        lbl.style.cssText = 'font-size:12px;display:flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap;margin-left:8px';
        lbl.innerHTML = '<input type="checkbox" id="chkNeedComplete" onchange="loadOrders()"> 待完结';
        bar.appendChild(lbl);

        /* 猴子补丁renderOrders */
        var orig = renderOrders;
        window.renderOrders = function(data) {
          var f = data || [];
          var cb = document.getElementById('chkNeedComplete');
          if (cb && cb.checked) {
            f = f.filter(function(o){
              return o.order_status === '已到货' && o.delivery_date && isAllArrived(o.product_model);
            });
          }
          orig(f);
          if (typeof enhanceProductCells === 'function') setTimeout(enhanceProductCells, 100);
        };
      }
    } catch(e) {}
    if (tries > 50) clearInterval(timer);
  }, 100);
})();
