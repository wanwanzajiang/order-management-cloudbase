/* 管理员待完结筛选 */
(function(){
  if (location.pathname.indexOf('admin') < 0) return;

  /* 判断是否全部到货 */
  function isAllArrived(pm) {
    try {
      var arr = JSON.parse(pm || '[]');
      if (!Array.isArray(arr) || !arr.length) return false;
      return arr.every(function(p){ return (parseInt(p.arrived_qty)||0) >= (parseInt(p.qty)||0); });
    } catch(e) { return false; }
  }

  /* 猴子补丁loadOrders */
  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    try {
      if (typeof loadOrders === 'function' && document.getElementById('chkNeedComplete')) {
        clearInterval(timer);
        var orig = loadOrders;
        window.loadOrders = async function() {
          var filtered = await orig() || [];
          var checked = document.getElementById('chkNeedComplete').checked;
          if (checked) {
            [].forEach.call(document.querySelectorAll('[id^="chk"]'), function(el) {
              if (el.id !== 'chkNeedComplete') el.checked = false;
            });
          }
          return filtered;
        };

        /* 注入checkbox */
        var bar = document.querySelector('.filter-bar');
        if (bar) {
          var lbl = document.createElement('label');
          lbl.style.cssText = 'font-size:12px;display:flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap;margin-left:8px';
          lbl.innerHTML = '<input type="checkbox" id="chkNeedComplete" onchange="loadOrders()"> 待完结';
          bar.appendChild(lbl);
        }

        /* Hook renderOrders 来加过滤 */
        if (typeof renderOrders === 'function') {
          var origRO = renderOrders;
          window.renderOrders = function(data) {
            var filtered = data || [];
            var checked = document.getElementById('chkNeedComplete');
            if (checked && checked.checked) {
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
      }
    } catch(e) {}
    if (tries > 30) clearInterval(timer);
  }, 200);
})();
